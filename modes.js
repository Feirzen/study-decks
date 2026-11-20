/* ===================================================================
   modes.js: extra ways to play Battle
   - "More ways to play" tiles on the save menu.
   - Daily Dungeon: one short seeded run a day. Same rooms, foes, twist
     and question order on every device (for the same deck and chapters).
   - Boss Rush: back-to-back bosses that ask your misses first.
   These are quick arcade runs with their own small engine, so nothing
   here touches adventure saves or heroes. Records live in "fc:arcade".
   Answers still go through recordAnswer(), so progress, misses and
   stars update exactly like every other mode.
   Loaded after art.js. party.js adds the multiplayer tile to ARC.tiles.
   =================================================================== */
const ARC = (function () {
  const KEY = "fc:arcade";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { } };
  const pad = n => String(n).padStart(2, "0");
  const dayKey = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const today = () => dayKey(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
  const pickOf = (arr, R) => arr[Math.floor(R() * arr.length)];
  const GRADES = ["Fell", "C", "B", "A", "S"];
  const GRADE_COL = { S: "#fde047", A: "#6ee7b7", B: "#93c5fd", C: "#d6d3d1", Fell: "#fca5a5" };

  /* ---------- class perks (arcade runs use a class, not a saved hero) ---------- */
  const PERK = {
    knight: "Takes 30% less damage.",
    wizard: "Every third correct answer in a row is a triple-hit Fireball.",
    ranger: "30% of hits are critical and land twice.",
  };

  /* ---------- daily twists ---------- */
  const TWISTS = [
    { id: "glass", name: "Glass Cannon", text: "You hit twice as hard. So do they." },
    { id: "thick", name: "Thick Hides", text: "Foes have 1 extra HP. Every kill heals you 10." },
    { id: "wind", name: "Second Wind", text: "The first knockout puts you back up at 40% HP." },
    { id: "sharp", name: "Sharpshooter", text: "Every class crits 35% of the time." },
    { id: "iron", name: "Iron Skin", text: "You take 40% less damage." },
    { id: "blood", name: "Bloodthirst", text: "Each correct answer heals 8 HP. No rest between rooms." },
  ];

  /* ---------- soft new sounds ---------- */
  Object.assign(sfx, {
    arcOpen() { hush(0, 0.28, { f1: 260, f2: 2400, q: 1.2, vol: 0.05, atk: 0.12, wet: 0.2 }); [74, 81, 86].forEach((n, i) => mallet(NOTE(n), 0.12 + i * 0.05, { dur: 0.6, vol: 0.08 })); },
    arcTwist() { [79, 83, 86, 90].forEach((n, i) => bell(NOTE(n), i * 0.09, { vol: 0.04, dur: 0.9 })); },
    arcStreak(n) { const k = Math.min(n, 12); mallet(NOTE(76 + k), 0.22, { dur: 0.3, vol: 0.07 }); mallet(NOTE(83 + k), 0.28, { dur: 0.35, vol: 0.05 }); },
    arcRoom() { hush(0, 0.22, { f1: 500, f2: 1400, q: 1, vol: 0.045, atk: 0.08 }); mallet(NOTE(72), 0.1, { dur: 0.5, vol: 0.08 }); mallet(NOTE(79), 0.18, { dur: 0.6, vol: 0.07 }); },
    arcGrade(g) {
      const run = { S: [72, 76, 79, 84, 88], A: [72, 76, 79, 84], B: [72, 76, 79], C: [72, 76], Fell: [67, 63] }[g] || [72];
      run.forEach((n, i) => mallet(NOTE(n), i * 0.11, { dur: 0.6, vol: 0.11 }));
      if (g === "S" || g === "A") bell(NOTE(run[run.length - 1] + 12), run.length * 0.11, { vol: 0.05, dur: 1.4 });
    },
    arcRecord() { [84, 91, 96].forEach((n, i) => bell(NOTE(n), 0.5 + i * 0.1, { vol: 0.045, dur: 1.2 })); },
  });

  /* ---------- records ---------- */
  function rec(kind) { const d = load(); d[kind] = d[kind] || {}; const r = d[kind][S.set.id] || (d[kind][S.set.id] = {}); return [d, r]; }
  function dailyStatus() {
    const r = rec("daily")[1], t = today();
    const live = r.last === t || r.last === yesterday() ? (r.streak || 0) : 0;
    return { done: r.day === t ? r.grade : null, streak: live, best: r.bestStreak || 0 };
  }
  function rushBest() { return rec("rush")[1].best || 0; }

  /* ---------- the daily plan: everything comes off one seed ---------- */
  function dailyPlan() {
    const seed = "daily|" + today() + "|" + S.set.id;
    const R = rng32(hashStr(seed));
    const ids = Object.keys(STORIES).filter(k => !STORIES[k].season).sort();
    const story = pickOf(ids, R), st = STORIES[story];
    const twist = pickOf(TWISTS, R);
    const plan = [];
    [0, 1].forEach(fi => {
      const f = st.floors[fi + Math.floor(R() * 2) * 2] || st.floors[fi];
      shuffled(f.foes, R).slice(0, 2).forEach(x => plan.push({ key: x.key, name: x.name, boss: false, hits: 2, scale: 4, floor: fi + 1, area: f.name }));
    });
    const bf = st.floors[Math.floor(R() * 4)];
    plan.push({ key: bf.boss.key, name: bf.boss.name, boss: true, hits: 5, scale: bf.boss.scale || 5, floor: 3, area: bf.name });
    const qs = shuffled(playQs().slice().sort((a, b) => String(a.id) < String(b.id) ? -1 : 1), R);
    return { story, twist, plan, qs };
  }

  /* ---------- question supply ---------- */
  function rushQueue() {
    const pool = playQs(), rnd = () => Math.random();
    const wrong = shuffled(pool.filter(q => progress.results[q.id] === "incorrect"), rnd);
    const starred = shuffled(pool.filter(q => progress.starred[q.id] && progress.results[q.id] !== "incorrect"), rnd);
    const seen = new Set(wrong.concat(starred).map(q => q.id));
    return wrong.concat(starred, weightedOrder(pool.filter(q => !seen.has(q.id))));
  }
  function nextQuestion(A) {
    if (A.qi >= A.qs.length) { A.qs = A.mode === "rush" ? rushQueue() : A.qs; A.qi = 0; }
    A.q = A.qs[A.qi++];
    resetQ(); freshOrder(A.q);
  }

  /* ---------- run lifecycle ---------- */
  function start(mode, cls) {
    if (!playQs().length) return;
    const C = CLASSES[cls], max = 100 + C.hp;
    const A = { mode, cls, hp: max, max, shownHp: max, i: 0, qi: 0, qs: [], streak: 0, bestStreak: 0, right: 0, wrong: 0, kills: 0,
      t0: Date.now(), fx: { type: "enter" }, over: false, win: false, twist: null, revived: false, last: null };
    if (mode === "daily") { const p = dailyPlan(); A.plan = p.plan; A.qs = p.qs; A.story = p.story; A.twist = p.twist; }
    else { A.pool = shuffled(bossPool(), () => Math.random()); A.qs = rushQueue(); }
    S.arc = A;
    const d = load(); d.cls = cls; save(d);
    enter(A);
    nextQuestion(A);
    sfx.bStart();
    goto("arcade");
  }
  function enter(A) {
    let e;
    if (A.mode === "daily") e = Object.assign({}, A.plan[A.i]);
    else {
      const b = A.pool[A.i % A.pool.length];
      e = { key: b.key, name: b.name, boss: true, hits: Math.min(10, 4 + A.i), scale: b.scale || 5, floor: (A.i % 5) + 1 };
      A.story = b.home || Object.keys(STORIES)[A.i % Object.keys(STORIES).length];
    }
    if (A.twist && A.twist.id === "thick") e.hits += 1;
    e.max = e.hits; e.shown = e.hits;
    A.enemy = e;
  }
  const tw = (A, id) => A.twist && A.twist.id === id;
  function heal(A, n) { const before = A.hp; A.hp = Math.min(A.max, A.hp + Math.round(n)); return A.hp - before; }

  function submit(idk) {
    const A = S.arc; if (!A || S.feedback) return;
    if (!idk && !S.selected.length) return;
    const q = A.q, ok = !idk && grade(q, S.selected);
    recordAnswer(q, ok);
    S.feedback = ok ? "correct" : "incorrect"; S.idk = !!idk;
    A.shownHp = A.hp; A.enemy.shown = A.enemy.hits;
    const L = A.last = { ok };
    if (ok) {
      A.right++; A.streak++; A.bestStreak = Math.max(A.bestStreak, A.streak);
      let dmg = 1;
      if (A.cls === "wizard" && A.streak % 3 === 0) { dmg = 3; L.fire = true; }
      else if (Math.random() < (tw(A, "sharp") ? 0.35 : A.cls === "ranger" ? 0.3 : 0)) { dmg = 2; L.crit = true; }
      if (tw(A, "glass")) dmg *= 2;
      L.dmg = dmg;
      A.enemy.hits = Math.max(0, A.enemy.hits - dmg);
      if (tw(A, "blood")) L.heal = heal(A, 8);
      if (A.enemy.hits <= 0) {
        A.kills++; L.kill = true;
        if (tw(A, "thick")) L.heal = (L.heal || 0) + heal(A, 10);
        const lastOne = A.mode === "daily" && A.i >= A.plan.length - 1;
        if (lastOne) { A.over = true; A.win = true; }
        else if (A.mode === "rush") L.heal = (L.heal || 0) + heal(A, A.max * 0.2);
        else if (!tw(A, "blood") && A.plan[A.i + 1].floor !== A.enemy.floor) L.heal = (L.heal || 0) + heal(A, A.max * 0.15);
      }
      A.fx = { type: L.kill ? "kill" : "hit" };
    } else {
      A.wrong++; A.streak = 0;
      let dmg = A.mode === "rush" ? 14 + 3 * A.i : A.enemy.boss ? 20 : 14;
      if (idk) dmg *= 0.5;
      if (A.cls === "knight") dmg *= 0.7;
      if (tw(A, "iron")) dmg *= 0.6;
      if (tw(A, "glass")) dmg *= 2;
      dmg = Math.max(1, Math.round(dmg));
      L.dmg = dmg;
      A.hp = Math.max(0, A.hp - dmg);
      if (A.hp <= 0 && tw(A, "wind") && !A.revived) { A.revived = true; A.hp = Math.round(A.max * 0.4); L.saved = true; }
      if (A.hp <= 0) A.over = true;
      A.fx = { type: "hurt" };
    }
    render();
  }
  function next() {
    const A = S.arc; if (!A) return;
    if (A.over) return finish(A);
    if (A.last && A.last.kill) {
      const prevFloor = A.enemy.floor;
      A.i++; enter(A);
      A.fx = { type: "enter", room: A.mode === "daily" && A.enemy.floor !== prevFloor };
      if (A.enemy.boss) setTimeout(() => sfx.bBoss(), 380); else if (A.fx.room) sfx.arcRoom(); else sfx.tick();
    } else { A.fx = null; sfx.tick(); }
    A.shownHp = A.hp;
    nextQuestion(A);
    render(); window.scrollTo(0, 0);
  }
  function finish(A) {
    const secs = Math.round((Date.now() - A.t0) / 1000);
    const R = { mode: A.mode, win: A.win, right: A.right, wrong: A.wrong, kills: A.kills, streak: A.bestStreak, secs, cls: A.cls, twist: A.twist, notes: [] };
    if (A.mode === "rush") {
      const [d, r] = rec("rush");
      R.best = r.best || 0;
      if (A.kills > R.best) { r.best = A.kills; R.record = true; }
      r.runs = (r.runs || 0) + 1; save(d);
    } else {
      R.grade = !A.win ? "Fell" : A.wrong === 0 ? "S" : A.wrong <= 2 ? "A" : A.wrong <= 4 ? "B" : "C";
      const [d, r] = rec("daily"), t = today();
      const had = r.day === t ? r.grade : null;
      if (!had || GRADES.indexOf(R.grade) > GRADES.indexOf(had)) { r.day = t; r.grade = R.grade; r.secs = secs; R.record = !!had; }
      if (A.win && r.last !== t) {
        r.streak = r.last === yesterday() ? (r.streak || 0) + 1 : 1;
        r.last = t; r.bestStreak = Math.max(r.bestStreak || 0, r.streak);
        r.clears = (r.clears || 0) + 1;
      }
      R.dayStreak = r.last === t ? r.streak : 0; R.todayBest = r.grade;
      save(d);
    }
    S.arcResult = R; S.arc = null; resetQ();
    goto("arcResult");
    if (A.mode === "daily") sfx.arcGrade(R.grade); else sfx.arcGrade(A.kills >= 5 ? "A" : A.kills >= 2 ? "B" : "C");
    if (R.record || R.grade === "S") { sfx.arcRecord(); confettiBurst(true); }
  }

  /* ===================== VIEWS ===================== */
  const fmtTime = s => Math.floor(s / 60) + ":" + pad(s % 60);
  function tilesHtml() {
    const ds = dailyStatus(), best = rushBest(), plan = dailyPlan();
    const dailySub = ds.done ? `Today: <b style="color:${GRADE_COL[ds.done]}">${ds.done === "Fell" ? "fell" : "grade " + ds.done}</b>${ds.streak ? " · " + ds.streak + "-day streak" : ""}` : `Not run yet today${ds.streak ? " · " + ds.streak + "-day streak on the line" : ""}`;
    const extra = ARC.tiles.map(f => f()).join("");
    return `<div class="arc-head"><span class="eyebrow">More ways to play</span></div>
    <div class="arc-tiles">
      <button class="card arc-tile ${ds.done && ds.done !== "Fell" ? "done" : "fresh"}" data-act="arcOpen" data-id="daily" style="--tc:#fbbf24">
        <span class="arc-art">${spriteCanvas(plan.plan[plan.plan.length - 1].key, 2, true)}</span>
        <span class="arc-txt"><span class="eyebrow" style="color:#fbbf24">Daily Dungeon</span>
          <b>${esc(plan.twist.name)}</b>
          <span class="muted">${dailySub}</span></span>
      </button>
      <button class="card arc-tile" data-act="arcOpen" data-id="rush" style="--tc:#f87171">
        <span class="arc-art">${spriteCanvas("commander", 2, true)}</span>
        <span class="arc-txt"><span class="eyebrow" style="color:#f87171">Boss Rush</span>
          <b>Nothing but bosses</b>
          <span class="muted">${best ? "Best: " + best + (best === 1 ? " boss" : " bosses") : "They ask your misses first"}</span></span>
      </button>
      ${extra}
    </div>`;
  }
  function viewSetup() {
    const U = S.arcSetup, daily = U.mode === "daily", col = daily ? "#fbbf24" : "#f87171";
    const p = daily ? dailyPlan() : null, ds = daily ? dailyStatus() : null;
    const classes = Object.keys(CLASSES).map(k => {
      const C = CLASSES[k], on = U.cls === k;
      return `<button class="card arc-cls ${on ? "on" : ""}" data-act="arcCls" data-cls="${k}" style="--cc:${C.color}">
        <span class="arc-clsart">${spriteCanvas(C.sprite, 3)}</span>
        <b style="color:${C.color}">${esc(C.name)}</b>
        <span class="muted">${PERK[k]}</span>
      </button>`;
    }).join("");
    const rules = daily
      ? `<p>Five fights across three rooms, ending in <b>${esc(p.plan[p.plan.length - 1].name)}</b>. Everything about today's run comes from the date, so it is the same on every device.</p>
         <div class="arc-twist"><span class="eyebrow" style="color:${col}">Today's twist</span><b>${esc(p.twist.name)}</b><span>${esc(p.twist.text)}</span></div>
         <p class="muted">No misses earns an S. Clear it on back-to-back days to build a streak${ds.best ? " (your best is " + ds.best + ")" : ""}. You can rerun it; your best grade of the day is the one that counts.</p>`
      : `<p>Back-to-back bosses with no map and no breaks. Each one is tougher and hits harder than the last, and you only get 20% of your HP back between them.</p>
         <p class="muted">Questions you currently have wrong come first, then your starred ones, then your weakest. ${rushBest() ? "Your best is " + rushBest() + "." : "See how many you can drop."}</p>`;
    return `<div class="wrap">
      <div style="display:flex;align-items:center;gap:12px;margin:22px 0 18px">
        <button class="backbtn" data-act="arcBack">${I.chevL}</button>
        <div><div class="eyebrow" style="color:${col}">${daily ? "Daily Dungeon · " + today() : "Boss Rush"}</div>
        <div style="font-size:22px;font-weight:bold">${daily ? "Today's run" : "How far can you get?"}</div></div>
      </div>
      <div class="card arc-rules tex" style="--sc:${col}">${rules}</div>
      <div class="eyebrow" style="margin:18px 0 10px">Fight as</div>
      <div class="arc-clsrow">${classes}</div>
      <button class="primary" data-act="arcStart" style="background:${col};color:#1c1917;margin-top:16px">${daily ? (ds.done ? "Run it again" : "Enter the dungeon") : "Start the rush"}</button>
    </div>`;
  }
  function viewArcade() {
    const A = S.arc, C = CLASSES[A.cls], e = A.enemy, q = A.q, fx = A.fx || {}, L = A.last || {}, t = fx.type;
    const daily = A.mode === "daily", col = daily ? "#fbbf24" : "#f87171";
    /* ---- arena ---- */
    const heroAct = t === "hit" || t === "kill" ? "a-lunge" : t === "hurt" ? "a-hurtHero" : "";
    const enemyAct = t === "hit" || t === "kill" ? "a-hurt" : t === "hurt" ? "a-lungeL" : t === "enter" ? "a-enter" : "";
    const dmgHero = t === "hurt" ? `<div class="dmg" style="color:#fca5a5;--d:.25s">-${L.dmg}</div>` : L.heal ? `<div class="dmg heal" style="color:#6ee7b7">+${L.heal}</div>` : "";
    const dmgFoe = t === "hit" || t === "kill" ? `<div class="dmg ${L.crit || L.fire ? "crit" : ""}" style="color:#fff">-${L.dmg}</div>` : "";
    const plate = `<div class="nameplate" ${e.boss ? 'style="background:rgba(127,29,29,.75)"' : ""}>${esc(e.name)}</div>`;
    const hero = fighterHtml(C.sprite, { side: "hero", id: "heroSlot", scale: HERO_SCALE, act: heroAct, extra: dmgHero, cls: A.over && !A.win ? "arc-down" : "" });
    const foe = fighterHtml(e.key, { side: "enemy", id: "enemySlot", flip: true, scale: e.scale, act: enemyAct, plate, extra: dmgFoe, cls: t === "kill" ? "arc-dead" : "" });
    let dots = "";
    if (daily) A.plan.forEach((p, i) => { dots += `<i class="${p.boss ? "boss " : ""}${i < A.i || (i === A.i && L.kill && S.feedback) ? "done" : i === A.i ? "now" : ""}"></i>`; });
    const banner = t === "enter" && (e.boss || fx.room) ? `<div class="banner ${e.boss ? "boss" : "floor"}" style="animation-delay:.25s">${esc(e.boss ? e.name : e.area || "Room " + e.floor)}</div>`
      : t === "kill" && A.win ? `<div class="banner kill" style="animation-delay:.5s">Dungeon cleared</div>`
      : t === "hurt" && A.over ? `<div class="banner boss" style="animation-delay:.6s">Knocked out</div>`
      : t === "hurt" && L.saved ? `<div class="banner lvl" style="animation-delay:.6s">Second Wind!</div>`
      : L.fire && t ? `<div class="banner lvl" style="animation-delay:.1s">Fireball</div>` : "";
    const arena = `<div class="arena ${A.hp / A.max < 0.3 && !A.over ? "lowhp" : ""} ${t === "hurt" ? "shake" : ""}" id="arena" style="--d:.17s">
      <canvas class="arena-bg" id="arenaBg" data-story="${A.story}" data-floor="${e.floor || 1}" data-boss="${e.boss ? 1 : 0}"></canvas>
      <div class="arena-hud">
        <span class="ptag">${daily ? "Room " + e.floor + ' <span class="floordots">' + dots + "</span>" : "Boss " + (A.i + 1)}</span>
        <span class="ptag" style="color:${A.streak >= 3 ? "#fde047" : "#fff"}">${A.streak >= 2 ? "Streak " + A.streak : daily ? esc(A.twist.name) : "Dropped " + A.kills}</span>
      </div>
      <div class="stage">${hero}${foe}</div>
      ${banner}
    </div>`;
    /* ---- hud ---- */
    const hpF = A.hp / A.max, hpFrom = A.shownHp / A.max, eF = e.hits / e.max, eFrom = e.shown / e.max;
    const hud = `<div class="hud tex">
      <div class="hudcol">
        <div class="hudlabel"><span>HP · ${esc(C.name)}</span><b style="color:${hpColor(hpF)}">${A.hp} / ${A.max}</b></div>
        <div class="hpbar ${hpF < 0.3 && !A.over ? "low" : ""}">
          <div class="trail" data-from="${hpFrom * 100}" data-to="${hpF * 100}" style="width:${hpFrom * 100}%"></div>
          <div class="fillb" data-from="${hpFrom * 100}" data-to="${hpF * 100}" style="width:${hpFrom * 100}%;background:${hpColor(hpF)}"></div>
        </div>
        <div class="foesub" style="margin-top:6px">${PERK[A.cls]}</div>
      </div>
      <div class="hudcol">
        <div class="hudlabel"><span class="foename">${esc(e.name)}</span><b style="color:var(--bad)">${e.hits} / ${e.max}</b></div>
        <div class="hpbar foe ${e.boss ? "boss" : ""}">
          <div class="trail" data-from="${eFrom * 100}" data-to="${eF * 100}" style="width:${eFrom * 100}%"></div>
          <div class="fillb" data-from="${eFrom * 100}" data-to="${eF * 100}" style="width:${eFrom * 100}%"></div>
        </div>
        <div class="foesub" style="margin-top:6px">${daily && A.twist ? esc(A.twist.text) : "Boss · asks what you've missed"}</div>
      </div>
    </div>`;
    /* ---- question ---- */
    const order = optionOrder(q), cc = (q._cat && q._cat.color) || "var(--accent)";
    const opts = order.map((origIdx, pos) => {
      const isSel = S.selected.includes(pos);
      const isCorrect = q.type === "mc" ? q.answer === origIdx : (q.answers || []).includes(origIdx);
      let border = "var(--border)", bg = "var(--surface)";
      if (S.feedback && isCorrect) { border = "var(--ok)"; bg = "var(--okBg)"; }
      if (isSel && !S.feedback) { border = "var(--accent)"; bg = "var(--accBg)"; }
      if (S.feedback === "incorrect" && isSel && !isCorrect) { border = "var(--bad)"; bg = "var(--badBg)"; }
      return `<button class="opt tex" data-act="arcPick" data-pos="${pos}" style="border-color:${border};background:${bg}">
        <span class="box ${q.type}" style="border-color:${isSel ? "var(--accent)" : "color-mix(in srgb, var(--text) 32%, transparent)"};background:${isSel ? "var(--accent)" : "transparent"}">${isSel ? '<span class="dot"></span>' : ""}</span>
        <span>${esc(q.options[origIdx])}</span>
      </button>`;
    }).join("");
    let fb = "";
    if (S.feedback) {
      const ok = S.feedback === "correct";
      const head = ok
        ? (L.fire ? "Fireball! " + L.dmg + " damage." : L.crit ? "Critical hit! " + L.dmg + " damage." : L.dmg > 1 ? "Hit for " + L.dmg + "!" : "Hit!") + (L.kill ? " " + esc(e.name) + " is down." : "") + (L.heal ? " +" + L.heal + " HP." : "")
        : A.over ? "Knocked out" : (S.idk ? "Logged as \"don't know\". " : "") + "You took " + L.dmg + " damage" + (L.saved ? ". Second Wind kept you standing!" : "");
      fb = `<div class="fb tex fbpop" style="background:${ok ? "var(--okBg)" : "var(--badBg)"};border:1px solid ${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:14px">
        ${ok ? I.check("var(--ok)") : I.x("var(--bad)")}
        <div><div style="font-weight:bold;color:${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:4px">${head}</div>
        <div class="dim" style="font-size:14px;line-height:1.6">${esc(q.explanation || "")}</div></div>
      </div>`;
    }
    const btn = !S.feedback
      ? `<div style="display:flex;gap:10px"><button class="ghost idk" data-act="arcIdk" title="Half damage. Counts as a miss so your progress stays honest">I don't know</button><button class="primary" data-act="arcSubmit" style="flex:1;background:${S.selected.length ? "var(--accent)" : "var(--border)"};color:${S.selected.length ? "#fff" : "var(--muted)"}" ${S.selected.length ? "" : "disabled"}>${I.sword} Attack</button></div>`
      : `<button class="primary" data-act="arcNext" style="background:${A.over ? (A.win ? "var(--ok)" : "var(--bad)") : "var(--accent)"}">${A.over ? "See results →" : L.kill ? "Next foe →" : "Next →"}</button>`;
    return `<div class="wrap battle">
      <div class="bhead" style="display:flex;align-items:center;gap:12px;margin:14px 0 12px">
        <button class="backbtn" data-act="arcExit" title="Leave this run">${I.chevL}</button>
        <div class="eyebrow" style="color:${col};flex:1;text-align:center">${daily ? "Daily Dungeon · " + today() : "Boss Rush"}</div>
        <span style="width:36px"></span>
      </div>
      <div class="bgrid">
        <div class="bleft">${arena}${hud}</div>
        <div class="bright">
          <div class="card qcard tex">
            <div class="eyebrow" style="color:${cc};margin-bottom:10px">${q.type === "mc" ? "Multiple Choice" : "Select All That Apply"}${q._cat ? " · " + esc(q._cat.category) : ""}</div>
            <div class="qtext">${esc(q.question)}</div>${typeof qFig === "function" ? qFig(q) : ""}
          </div>
          <div class="bopts">${opts}</div>${fb}<div>${btn}</div>
        </div>
      </div>
    </div>`;
  }
  function viewResult() {
    const R = S.arcResult, daily = R.mode === "daily", C = CLASSES[R.cls];
    const total = R.right + R.wrong, acc = total ? Math.round(R.right / total * 100) : 0;
    const g = daily ? R.grade : null, col = daily ? GRADE_COL[g] : "#f87171";
    const big = daily ? (g === "Fell" ? "✕" : g) : String(R.kills);
    const title = daily ? (R.win ? "Dungeon cleared" : "You fell today") : R.kills ? "The rush ends here" : "Stopped at the first boss";
    const line = daily
      ? (R.win ? (g === "S" ? "A flawless run." : R.wrong + (R.wrong === 1 ? " miss" : " misses") + " along the way.") : "The run is still open. Go again whenever you like.")
      : (R.record ? "A new best!" : R.best ? "Your best is still " + R.best + "." : "");
    const stat = (k, v) => `<div class="arc-stat"><b>${v}</b><span>${k}</span></div>`;
    return `<div class="wrap">
      <div class="card arc-result tex" style="--sc:${col}">
        <div class="eyebrow" style="color:${col}">${daily ? "Daily Dungeon · " + today() : "Boss Rush"}</div>
        <div class="arc-big" style="color:${col}">${big}</div>
        <div class="arc-biglabel">${daily ? (g === "Fell" ? "no grade" : "grade") : R.kills === 1 ? "boss dropped" : "bosses dropped"}</div>
        <div style="font-size:21px;font-weight:bold;margin-top:10px">${title}</div>
        <div class="muted" style="margin-top:4px">${line}</div>
        <div class="arc-stats">
          ${stat("accuracy", acc + "%")}${stat("best streak", R.streak)}${stat("time", fmtTime(R.secs))}${daily ? stat("day streak", R.dayStreak || 0) : stat("questions", total)}
        </div>
        <div class="arc-hero">${spriteCanvas(C.sprite, 3)}</div>
        ${daily && R.twist ? `<div class="muted" style="font-size:13px">Twist: <b>${esc(R.twist.name)}</b>${R.todayBest && R.todayBest !== g ? " · best today: " + R.todayBest : ""}</div>` : ""}
      </div>
      <button class="primary" data-act="arcAgain" style="background:var(--accent);margin-top:14px">${daily ? (R.win ? "Run it again" : "Try again") : "Go again"}</button>
      <button class="ghost" data-act="arcBack" style="width:100%;margin-top:10px">Back to Battle</button>
    </div>`;
  }

  /* one-shot effects after the arena is on the page */
  function afterArcade() {
    const A = S.arc; if (!A || !A.fx) return;
    const t = A.fx.type, L = A.last || {};
    A.fx = Object.assign({}, A.fx, { type: A.fx.type }); const fx = A.fx; A.fx = null; A._lastFx = fx;
    if (t === "hit" || t === "kill") {
      sfx.bSwing && sfx.bSwing();
      setTimeout(() => (L.crit || L.fire) && sfx.bCrit ? sfx.bCrit() : sfx.bHit(), 170);
      if (A.streak >= 3 && !L.kill) sfx.arcStreak(A.streak);
      if (t === "kill") setTimeout(() => {
        const cv = document.querySelector("#enemySlot canvas[data-sprite]");
        if (cv && cv.isConnected) { spriteBurst(cv, A.enemy.key, A.enemy.scale, true, 0); cv.style.opacity = "0"; }
        try { sfx.bKill(0, false); } catch (e) { }
      }, 330);
    } else if (t === "hurt") {
      setTimeout(() => sfx.bHurt(), 200);
      if (A.over) setTimeout(() => sfx.bOver(), 650);
    }
  }

  /* ===================== WIRING ===================== */
  const SCREENS = { arcSetup: { view: viewSetup }, arcade: { view: viewArcade, after: afterArcade }, arcResult: { view: viewResult } };
  const _render = render;
  render = function () {
    _render();
    const sc = SCREENS[S.screen]; if (!sc) return;
    const el = document.getElementById("app");
    el.innerHTML = sc.view();
    mountSprites();
    if (document.body.classList.contains("kbd")) paintNav();
    if (sc.after) sc.after();
  };
  const _menu = viewAdvMenu;
  viewAdvMenu = function () {
    const html = _menu(), mark = '<div class="muted" style="font-size:12.5px', i = html.lastIndexOf(mark);
    let tiles = ""; try { tiles = tilesHtml(); } catch (e) { tiles = ""; }
    return i < 0 ? html : html.slice(0, i) + tiles + html.slice(i);
  };
  BACK_ACTS.push("arcBack", "arcExit");
  document.addEventListener("click", ev => {
    const t = ev.target.closest("[data-act]"); if (!t) return;
    const act = t.dataset.act;
    if (act === "arcOpen") {
      if (!playQs().length) return;
      const d = load();
      S.arcSetup = { mode: t.dataset.id, cls: CLASSES[d.cls] ? d.cls : "knight" };
      sfx.arcOpen(); if (t.dataset.id === "daily") setTimeout(() => sfx.arcTwist(), 380);
      return goto("arcSetup");
    }
    if (act === "arcCls") { S.arcSetup.cls = t.dataset.cls; sfx.select(); return render(); }
    if (act === "arcStart") return start(S.arcSetup.mode, S.arcSetup.cls);
    if (act === "arcBack") { sfx.tick(); S.arc = null; S.arcResult = null; resetQ(); return openAdvMenu(); }
    if (act === "arcExit") {
      return showModal(`<h2>Leave this run?</h2><p>${S.arc && S.arc.mode === "daily" ? "Today's dungeon stays open, but this attempt won't count." : "This rush ends here and won't count toward your best."} Your answers are already saved to your progress.</p>
        <div class="btns"><button class="ghost" data-act="arcStay">Keep fighting</button><button class="primary" data-act="arcQuit" style="background:var(--bad)">Leave</button></div>`);
    }
    if (act === "arcStay") return closeModal();
    if (act === "arcQuit") { closeModal(); S.arc = null; resetQ(); return openAdvMenu(); }
    if (act === "arcAgain") { const R = S.arcResult; S.arcSetup = { mode: R.mode, cls: R.cls }; sfx.arcOpen(); return goto("arcSetup"); }
    if (act === "arcPick") {
      const A = S.arc; if (!A || S.feedback) return;
      const pos = +t.dataset.pos;
      if (A.q.type === "mc") S.selected = [pos];
      else S.selected = S.selected.includes(pos) ? S.selected.filter(i => i !== pos) : S.selected.concat(pos);
      sfx.select(); return render();
    }
    if (act === "arcSubmit") return submit(false);
    if (act === "arcIdk") return submit(true);
    if (act === "arcNext") return next();
  });

  /* ===================== STYLES ===================== */
  const css = document.createElement("style");
  css.textContent = `
  .arc-head { margin: 22px 0 10px; display: flex; align-items: center; gap: 10px; }
  .arc-head::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--border2), transparent); }
  .arc-tiles { display: grid; gap: 10px; grid-template-columns: 1fr; }
  @media (min-width: 560px) { .arc-tiles { grid-template-columns: 1fr 1fr; } }
  .arc-tile { position: relative; overflow: hidden; display: flex; gap: 12px; align-items: center; text-align: left; padding: 12px 14px; cursor: pointer;
    border-color: color-mix(in srgb, var(--tc) 38%, var(--border));
    background: linear-gradient(135deg, color-mix(in srgb, var(--tc) 13%, var(--surface)), var(--surface) 62%);
    transition: transform var(--t-std) var(--ease-out), border-color var(--t-std), box-shadow var(--t-std); }
  .arc-tile:hover, .arc-tile.kbfocus { transform: translateY(-2px); border-color: var(--tc); box-shadow: 0 10px 28px -14px var(--tc); }
  .arc-tile:active { transform: scale(.985); }
  .arc-tile::before { content: ""; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(105deg, transparent 38%, color-mix(in srgb, var(--tc) 26%, transparent) 50%, transparent 62%);
    transform: translateX(-120%); animation: arcsheen 6.5s var(--ease-out) infinite; }
  .arc-tile:nth-child(2)::before { animation-delay: 2.1s; } .arc-tile:nth-child(3)::before { animation-delay: 4.2s; }
  @keyframes arcsheen { 0%, 62% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
  .arc-tile.fresh .arc-art::after { content: ""; position: absolute; top: 5px; right: 5px; width: 8px; height: 8px; border-radius: 50%; background: var(--tc); box-shadow: 0 0 10px var(--tc); animation: arcpulse 2.4s ease-in-out infinite; }
  @keyframes arcpulse { 50% { opacity: .35; transform: scale(.8); } }
  .arc-art { position: relative; flex: 0 0 64px; height: 64px; border-radius: 12px; display: grid; place-items: center; overflow: hidden;
    background: radial-gradient(circle at 50% 78%, color-mix(in srgb, var(--tc) 30%, transparent), rgba(0,0,0,.28) 72%); }
  .arc-art canvas { width: auto !important; height: auto !important; max-width: 60px; max-height: 60px; image-rendering: pixelated; }
  .arc-txt { display: grid; gap: 2px; min-width: 0; }
  .arc-txt b { font-size: 16px; } .arc-txt .muted { font-size: 12.5px; line-height: 1.4; }
  .arc-rules { padding: 16px 18px; line-height: 1.6; } .arc-rules p { margin: 0 0 10px; } .arc-rules p:last-child { margin: 0; }
  .arc-twist { display: grid; gap: 2px; margin: 4px 0 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid color-mix(in srgb, #fbbf24 45%, transparent);
    background: color-mix(in srgb, #fbbf24 9%, transparent); }
  .arc-twist b { font-size: 17px; } .arc-twist span:last-child { font-size: 14px; }
  .arc-clsrow { display: grid; gap: 10px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .arc-cls { display: grid; justify-items: center; gap: 4px; text-align: center; padding: 12px 8px; cursor: pointer; transition: transform var(--t-std) var(--ease-out), border-color var(--t-std), background var(--t-std); }
  .arc-cls .muted { font-size: 11.5px; line-height: 1.35; }
  .arc-cls.on { border-color: var(--cc); background: color-mix(in srgb, var(--cc) 12%, var(--surface)); transform: translateY(-2px); }
  .arc-clsart { height: 96px; display: grid; place-items: end center; } .arc-clsart canvas { image-rendering: pixelated; }
  .arc-down .body { transform: rotate(-82deg) translateY(8px); filter: grayscale(1) brightness(.7); transition: transform .5s var(--ease-out) .5s, filter .5s .5s; animation: none !important; }
  .arc-dead .shadow, .arc-dead .nameplate { opacity: 0; transition: opacity .3s .35s; }
  .arc-result { text-align: center; padding: 26px 18px 20px; margin-top: 28px; overflow: hidden; position: relative; }
  .arc-result::before { content: ""; position: absolute; left: 50%; top: -90px; width: 320px; height: 320px; transform: translateX(-50%); pointer-events: none;
    background: radial-gradient(circle, color-mix(in srgb, var(--sc) 30%, transparent), transparent 66%); animation: arcglow 4s ease-in-out infinite; }
  @keyframes arcglow { 50% { opacity: .55; transform: translateX(-50%) scale(1.12); } }
  .arc-big { position: relative; font: 900 84px/1 ui-monospace, 'SF Mono', Menlo, Consolas, monospace; margin-top: 10px; text-shadow: 0 0 34px color-mix(in srgb, currentColor 55%, transparent);
    animation: arcpop .7s var(--ease-pop) .15s both; }
  @keyframes arcpop { from { opacity: 0; transform: scale(.4); } }
  .arc-biglabel { position: relative; font: 800 10.5px ui-monospace, 'SF Mono', Menlo, Consolas, monospace; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
  .arc-stats { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 18px 0 10px; }
  .arc-stat { display: grid; gap: 2px; padding: 9px 4px; border-radius: 10px; background: var(--surface2); border: 1px solid var(--border); animation: arcpop .5s var(--ease-out) both; }
  .arc-stat:nth-child(2) { animation-delay: .08s; } .arc-stat:nth-child(3) { animation-delay: .16s; } .arc-stat:nth-child(4) { animation-delay: .24s; }
  .arc-stat b { font: 800 17px ui-monospace, 'SF Mono', Menlo, Consolas, monospace; } .arc-stat span { font-size: 10.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
  .arc-hero { display: grid; place-items: center; margin: 6px 0 8px; } .arc-hero canvas { image-rendering: pixelated; }
  @media (prefers-reduced-motion: reduce) { .arc-tile::before, .arc-result::before, .arc-big, .arc-stat { animation: none; } }
  `;
  document.head.appendChild(css);

  return { tiles: [], screens: SCREENS, load, save, today, dailyPlan, dailyStatus, PERK };
})();
