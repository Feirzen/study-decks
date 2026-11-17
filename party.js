/* ===================================================================
   party.js: phone-controlled multiplayer (the big-screen side)
   - This device hosts: it shows the arena and the question and runs the
     whole game. Phones join by scanning a QR code (play.html) and just
     send answers.
   - Raid: everyone fights one boss together.
     Duel: right answers hit whoever got it wrong; last one standing wins.
   - Messages go through a tiny Cloudflare Worker (the party/ folder).
     Its address is saved once on this device in "fc:party".
   - Party answers never touch your own progress: several people are
     answering, so nothing here calls recordAnswer().
   Loaded after modes.js.
   =================================================================== */
(function () {
  if (typeof ARC === "undefined") return;
  const DEFAULT_URL = "";                          // filled in once the Worker is deployed
  const KEY = "fc:party";
  const cfg = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const setCfg = o => { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(cfg(), o))); } catch (e) { } };
  const serverUrl = () => (cfg().url || DEFAULT_URL || "").replace(/\/+$/, "");
  const cleanUrl = v => { v = String(v || "").trim().replace(/\/+$/, ""); if (v && !/^https?:\/\//i.test(v)) v = "https://" + v; return v; };
  const LETTERS = "ABCDEFGH", OPT_COL = ["#60a5fa", "#f59e0b", "#34d399", "#f472b6", "#a78bfa", "#f87171", "#22d3ee", "#facc15"];
  const HEARTS = { raid: 3, duel: 4 }, DUEL_ROUNDS = 15, RAID_BOSSES = 3;
  const rnd = () => Math.random();
  const names = ps => { const n = ps.map(p => p.name); return n.length < 2 ? n.join("") : n.slice(0, -1).join(", ") + " and " + n[n.length - 1]; };
  const code4 = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join("");
  let P = null, tick = 0, pingT = 0;

  Object.assign(sfx, {
    partyJoin() { mallet(NOTE(84), 0, { dur: 0.25, vol: 0.09 }); mallet(NOTE(91), 0.07, { dur: 0.35, vol: 0.07 }); },
    partyLeave() { mallet(NOTE(76), 0, { dur: 0.25, vol: 0.06 }); mallet(NOTE(69), 0.08, { dur: 0.3, vol: 0.05 }); },
    partyLock() { mallet(NOTE(88), 0, { dur: 0.09, vol: 0.05, wet: 0.02, bright: 0.4 }); },
    partyGo() { [72, 79, 84, 91].forEach((n, i) => mallet(NOTE(n), i * 0.08, { dur: 0.5, vol: 0.1 })); bell(NOTE(96), 0.34, { vol: 0.045, dur: 1.2 }); },
    partyAsk() { hush(0, 0.2, { f1: 400, f2: 1800, q: 1, vol: 0.04, atk: 0.07 }); mallet(NOTE(79), 0.08, { dur: 0.4, vol: 0.07 }); },
    partyHurry() { mallet(NOTE(93), 0, { dur: 0.05, vol: 0.035, wet: 0, bright: 0.3 }); },
    partyReveal() { mallet(NOTE(76), 0, { dur: 0.3, vol: 0.08 }); mallet(NOTE(83), 0.09, { dur: 0.45, vol: 0.08 }); },
  });

  /* ===================== CONNECTION ===================== */
  function connect() {
    if (!P) return;
    const base = serverUrl().replace(/^http/i, "ws");
    let ws;
    try { ws = new WebSocket(`${base}/r/${P.code}?role=host&key=${encodeURIComponent(P.key)}`); } catch (e) { P.status = "down"; return paint(); }
    P.ws = ws; P.status = "connecting";
    ws.onopen = () => { if (P && P.ws === ws) { P.status = "open"; P.tries = 0; paint(); broadcast(); } };
    ws.onmessage = ev => { if (P && P.ws === ws) onMessage(ev.data); };
    ws.onclose = () => {
      if (!P || P.ws !== ws) return;
      P.status = "down"; paint();
      if (P.taken) return;
      P.tries = (P.tries || 0) + 1;
      setTimeout(() => { if (P && P.ws === ws) connect(); }, Math.min(8000, 800 * P.tries));
    };
    ws.onerror = () => { };
  }
  function send(to, d) { if (P && P.ws && P.ws.readyState === 1) P.ws.send(JSON.stringify({ to, d })); }
  function onMessage(raw) {
    if (raw === "pong") return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.sys === "taken") {                       // someone else is hosting that code: pick another
      P.taken = true; try { P.ws.close(); } catch (e) { }
      P.code = code4(); P.taken = false; P.qr = null; return connect();
    }
    if (m.sys === "roster") { Object.values(P.players).forEach(p => { p.on = m.ids.includes(p.id); }); return paint(); }
    if (m.sys === "leave") {
      const p = P.players[m.id]; if (!p) return;
      if (P.phase === "lobby") delete P.players[m.id]; else p.on = false;
      sfx.partyLeave(); paint(); if (P.phase === "q") checkAll(); return;
    }
    if (m.sys === "join") return;                  // wait for their hello
    if (!m.from || !m.d) return;
    const d = m.d;
    if (d.t === "hello") {
      const name = String(d.name || "").replace(/[<>&"']/g, "").trim().slice(0, 14) || "Player";
      const cls = CLASSES[d.cls] ? d.cls : "knight";
      let p = P.players[m.from];
      if (!p) {
        if (Object.keys(P.players).length >= 12) return send(m.from, { t: "full" });
        p = P.players[m.from] = { id: m.from, name, cls, on: true, hearts: HEARTS[P.mode], down: false, score: 0, right: 0, wrong: 0, streak: 0, ans: null, last: null, joined: Date.now() };
        sfx.partyJoin();
      } else { p.on = true; if (P.phase === "lobby") { p.name = name; p.cls = cls; } }
      if (P.phase === "lobby") broadcast(); else sendState(p);
      return paint();
    }
    if (d.t === "ans") {
      const p = P.players[m.from];
      if (!p || P.phase !== "q" || d.round !== P.round || p.ans) return;
      const sel = Array.isArray(d.sel) ? d.sel.filter(n => Number.isInteger(n) && n >= 0 && n < P.order.length).slice(0, 8) : [];
      if (!sel.length) return;
      p.ans = { sel, at: Date.now() - P.tStart };
      sfx.partyLock(); sendState(p); paintAnswered(); checkAll();
    }
  }

  /* ===================== GAME ===================== */
  const list = () => Object.values(P.players).sort((a, b) => a.joined - b.joined);
  const active = () => list().filter(p => p.on);
  const alive = () => active().filter(p => P.mode === "raid" || p.hearts > 0);
  function newBoss() {
    const b = P.bossPool[P.bossN % P.bossPool.length], n = Math.max(1, active().length);
    P.boss = { key: b.key, name: b.name, scale: b.scale || 5, max: (4 + 2 * P.bossN) * n, home: b.home };
    P.boss.hits = P.boss.shown = P.boss.max;
    P.story = b.home || P.story;
  }
  function startGame() {
    if (!active().length || (P.mode === "duel" && active().length < 2)) return;
    P.round = 0; P.bossN = 0; P.result = null;
    P.qs = shuffled(playQs(), rnd); P.qi = 0;
    P.bossPool = shuffled(bossPool(), rnd);
    P.story = Object.keys(STORIES).filter(k => !STORIES[k].season)[Math.floor(Math.random() * 9)] || "classic";
    list().forEach(p => Object.assign(p, { hearts: HEARTS[P.mode], down: false, score: 0, right: 0, wrong: 0, streak: 0, ans: null, last: null }));
    if (P.mode === "raid") newBoss(); else P.boss = null;
    sfx.partyGo();
    S.screen = "partyGame";
    ask(true);
  }
  function ask(first) {
    if (P.qi >= P.qs.length) { P.qs = shuffled(playQs(), rnd); P.qi = 0; }
    P.q = P.qs[P.qi++]; P.round++;
    P.order = shuffle(P.q.options.map((_, i) => i));
    P.phase = "q"; P.tStart = Date.now(); P.tEnd = P.tStart + P.secs * 1000; P.fx = first ? "enter" : P.fx === "bossIn" ? "bossIn" : null;
    if (P.boss) P.boss.shown = P.boss.hits;
    list().forEach(p => { p.ans = null; p.last = null; });
    if (!first) sfx.partyAsk();
    broadcast(); render(); window.scrollTo(0, 0);
  }
  function checkAll() {
    const need = alive();
    if (P.phase === "q" && need.length && need.every(p => p.ans)) reveal();
  }
  const goodSet = () => { const q = P.q, good = q.type === "mc" ? [q.answer] : (q.answers || []); return P.order.map((orig, pos) => good.includes(orig) ? pos : -1).filter(x => x >= 0); };
  function reveal() {
    if (P.phase !== "q") return;
    const good = goodSet(), key = good.slice().sort().join(",");
    const ps = active();
    ps.forEach(p => { p.ok = !!p.ans && p.ans.sel.slice().sort().join(",") === key; p.last = { ok: p.ok, dmg: 0, lost: 0, note: "" }; if (p.ok) p.right++; else p.wrong++; });
    const fastest = ps.filter(p => p.ok).sort((a, b) => a.ans.at - b.ans.at)[0];
    P.note = "";
    if (P.mode === "raid") {
      let total = 0;
      ps.forEach(p => {
        if (p.ok) {
          p.streak++;
          if (p.down) { p.down = false; p.hearts = 1; p.last.note = "Back on your feet!"; p.last.revived = true; return; }
          let dmg = 1;
          if (p.streak % 3 === 0) { dmg++; p.last.crit = true; }
          if (p === fastest && ps.length > 1) { dmg++; p.last.first = true; }
          p.last.dmg = dmg; p.score += dmg; total += dmg;
          p.last.note = (p.last.crit ? "Critical! " : "") + (p.last.first ? "First strike! " : "") + "You hit for " + dmg + ".";
        } else {
          p.streak = 0;
          if (!p.down) { p.hearts--; p.last.lost = 1; if (p.hearts <= 0) { p.down = true; p.last.note = "You're down. Get the next one right to get back up."; } else p.last.note = p.ans ? "Wrong. The boss hits you." : "Out of time. The boss hits you."; }
          else p.last.note = "Still down. A right answer gets you back up.";
        }
      });
      P.boss.shown = P.boss.hits; P.boss.hits = Math.max(0, P.boss.hits - total);
      P.dealt = total;
      if (P.boss.hits <= 0) { P.fx = "kill"; P.note = P.boss.name + " falls!"; }
      else P.fx = total ? "hit" : "hurt";
      if (P.boss.hits > 0 && ps.every(p => p.down)) P.wipe = true;
    } else {
      const inGame = ps.filter(p => p.hearts > 0), C = inGame.filter(p => p.ok), W = inGame.filter(p => !p.ok);
      ps.forEach(p => { if (p.ok) p.streak++; else p.streak = 0; });
      if (C.length && W.length) {
        W.forEach(p => { p.hearts--; p.last.lost = 1; p.last.note = p.hearts <= 0 ? "Knocked out!" : "Wrong. You take a hit."; });
        C.forEach(p => { p.score += W.length; p.last.dmg = W.length; p.last.note = "Right! You hit " + (W.length === 1 ? W[0].name : W.length + " rivals") + "."; });
        P.note = names(C) + " hit" + (C.length === 1 ? "s " : " ") + names(W) + ".";
      } else if (C.length > 1) {
        const slow = C.slice().sort((a, b) => b.ans.at - a.ans.at)[0], fast = C.slice().sort((a, b) => a.ans.at - b.ans.at)[0];
        slow.hearts--; slow.last.lost = 1; slow.last.note = slow.hearts <= 0 ? "Right, but slowest. Knocked out!" : "Right, but slowest. " + fast.name + " clips you.";
        fast.score++; fast.last.dmg = 1; fast.last.first = true; fast.last.note = "Fastest! You clip " + slow.name + ".";
        C.forEach(p => { if (p !== slow && p !== fast) p.last.note = "Right. Safe this round."; });
        P.note = "Everyone got it. " + fast.name + " was fastest and clips " + slow.name + ".";
      } else if (C.length === 1 && !W.length) { C[0].last.note = "Right!"; }
      else { inGame.forEach(p => { p.last.note = "Nobody got it. No damage."; }); P.note = "Nobody got it. No damage."; }
      ps.filter(p => p.hearts <= 0 && !p.last.note).forEach(p => { p.last.note = p.ok ? "Right (spectating)." : "Wrong (spectating)."; });
      P.fx = "duel";
    }
    P.phase = "reveal";
    sfx.partyReveal();
    if (P.mode === "raid") { if (P.fx === "kill") setTimeout(() => { try { sfx.bKill(0, true); } catch (e) { } }, 350); else if (P.fx === "hit") setTimeout(() => sfx.bHit(), 250); else setTimeout(() => sfx.bHurt(), 250); }
    else if (ps.some(p => p.last.lost)) setTimeout(() => sfx.bHit(), 250);
    broadcast(); render();
  }
  function advance() {
    if (P.phase !== "reveal") return;
    if (P.mode === "raid") {
      if (P.wipe) return end(false);
      if (P.boss.hits <= 0) {
        P.bossN++;
        if (P.bossN >= RAID_BOSSES) return end(true);
        newBoss(); P.fx = "bossIn"; setTimeout(() => sfx.bBoss(), 380);
        list().forEach(p => { if (!p.down && p.hearts < HEARTS.raid) p.hearts++; });
      }
    } else {
      const left = active().filter(p => p.hearts > 0);
      if (left.length <= 1 || P.round >= DUEL_ROUNDS) return end(true);
    }
    ask(false);
  }
  function end(won) {
    const ps = list();
    let order;
    if (P.mode === "raid") order = ps.slice().sort((a, b) => b.score - a.score || b.right - a.right);
    else order = ps.slice().sort((a, b) => b.hearts - a.hearts || b.score - a.score || b.right - a.right);
    order.forEach((p, i) => { p.rank = i + 1; });
    P.result = { won, order: order.map(p => p.id), bosses: P.bossN, rounds: P.round };
    P.phase = "end"; P.wipe = false; P.fx = null;
    S.screen = "partyEnd";
    broadcast(); render(); window.scrollTo(0, 0);
    if (P.mode === "duel" || won) { sfx.bVictory(); confettiBurst(true); } else setTimeout(() => sfx.bOver(), 200);
  }

  /* what each phone needs to draw its screen */
  function stateFor(p) {
    const s = { t: "state", phase: P.phase, mode: P.mode, code: P.code, n: active().length,
      you: { name: p.name, cls: p.cls, hearts: p.hearts, max: HEARTS[P.mode], down: p.down || (P.mode === "duel" && p.hearts <= 0 && P.phase !== "lobby"), score: p.score, streak: p.streak, right: p.right, wrong: p.wrong } };
    if (P.phase === "q" || P.phase === "reveal") {
      s.q = { round: P.round, text: P.q.question, type: P.q.type, opts: P.order.map(i => P.q.options[i]), left: Math.max(0, P.tEnd - Date.now()), total: P.secs * 1000 };
      s.answered = p.ans ? p.ans.sel : null;
      if (P.boss) s.boss = { name: P.boss.name, hp: P.boss.hits, max: P.boss.max };
    }
    if (P.phase === "reveal") s.reveal = { ok: !!(p.last && p.last.ok), good: goodSet(), note: (p.last && p.last.note) || "", lost: (p.last && p.last.lost) || 0, dmg: (p.last && p.last.dmg) || 0, why: P.q.explanation || "" };
    if (P.phase === "end") s.end = { won: P.result.won, rank: p.rank, total: list().length, top: P.players[P.result.order[0]] ? P.players[P.result.order[0]].name : "" };
    return s;
  }
  function sendState(p) { send(p.id, stateFor(p)); }
  function broadcast() { if (P) active().forEach(sendState); }

  /* ===================== OPEN / CLOSE ===================== */
  function openParty() {
    if (!playQs().length) return;
    if (!serverUrl()) return goto("partySetup");
    if (!P) {
      P = S.party = { code: code4(), key: Math.random().toString(36).slice(2) + Date.now().toString(36), players: {}, phase: "lobby", mode: cfg().mode === "duel" ? "duel" : "raid", secs: [15, 20, 30].includes(cfg().secs) ? cfg().secs : 20, status: "connecting", round: 0 };
      connect();
      clearInterval(tick); tick = setInterval(onTick, 250);
      clearInterval(pingT); pingT = setInterval(() => { if (P && P.ws && P.ws.readyState === 1) P.ws.send("ping"); }, 25000);
    }
    sfx.arcOpen();
    goto("partyLobby");
  }
  function closeParty() {
    clearInterval(tick); clearInterval(pingT);
    if (P) { send("*", { t: "closed" }); const ws = P.ws; P.ws = null; setTimeout(() => { try { ws && ws.close(); } catch (e) { } }, 150); }
    P = S.party = null;
  }
  function onTick() {
    if (!P || P.phase !== "q" || S.screen !== "partyGame") return;
    const left = P.tEnd - Date.now(), bar = document.getElementById("ptTimer"), num = document.getElementById("ptSecs");
    if (bar) bar.style.transform = `scaleX(${Math.max(0, left / (P.secs * 1000))})`;
    const s = Math.max(0, Math.ceil(left / 1000));
    if (num && num.textContent !== String(s)) { num.textContent = s; if (s <= 5 && s > 0) { sfx.partyHurry(); num.classList.add("hurry"); } }
    if (left <= 0) reveal();
  }
  function joinUrl() {
    const u = new URL("play.html", location.href);
    u.search = "?r=" + P.code + "&s=" + encodeURIComponent(serverUrl().replace(/^https?:\/\//i, ""));
    return u.toString();
  }
  function drawQr() {
    const cv = document.getElementById("ptQr"); if (!cv || !P) return;
    const go = () => {
      if (!P || !cv.isConnected) return;
      const qr = qrcode(0, "M"); qr.addData(joinUrl()); qr.make();
      const n = qr.getModuleCount(), k = Math.max(2, Math.floor(232 / (n + 4))), size = (n + 4) * k;
      cv.width = cv.height = size; cv.style.width = cv.style.height = size + "px";
      const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, size, size); g.fillStyle = "#0b0a12";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect((c + 2) * k, (r + 2) * k, k, k);
    };
    if (typeof qrcode === "function") return go();
    if (!document.getElementById("qrLib")) { const s = document.createElement("script"); s.id = "qrLib"; s.src = "qrcode.js?v=1"; s.onload = go; document.head.appendChild(s); }
    else document.getElementById("qrLib").addEventListener("load", go);
  }

  /* ===================== VIEWS ===================== */
  const hearts = (n, max) => Array.from({ length: max }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
  function paint() { if (P && /^party/.test(S.screen) && !modalOpen()) render(); }
  function paintAnswered() {
    list().forEach(p => { const el = document.querySelector(`[data-pid="${p.id}"]`); if (el) el.classList.toggle("locked", !!p.ans); });
    const c = document.getElementById("ptCount"); if (c) c.textContent = alive().filter(p => p.ans).length + " / " + alive().length + " locked in";
  }
  function viewSetup() {
    return `<div class="wrap">
      <div style="display:flex;align-items:center;gap:12px;margin:22px 0 18px">
        <button class="backbtn" data-act="ptBack">${I.chevL}</button>
        <div><div class="eyebrow" style="color:#a78bfa">Party · one-time setup</div>
        <div style="font-size:22px;font-weight:bold">Connect the party server</div></div>
      </div>
      <div class="card arc-rules tex" style="--sc:#a78bfa">
        <p>Party mode lets friends join from their phones. The phones and this screen talk through a small relay on your Cloudflare account. It needs to be switched on once (the steps are in <b>party/README.md</b> in the repo), then paste its address here.</p>
        <div class="namerow" style="max-width:none;margin-top:6px">
          <input id="ptUrl" class="nameinput" data-enter="ptSaveUrl" placeholder="study-decks-party.your-name.workers.dev" value="${esc(cfg().url || "")}" autocapitalize="off" autocomplete="off" spellcheck="false" style="flex:1;min-width:0;padding:12px 14px;border-radius:10px;border:1.5px solid var(--border2);background:var(--surface2);color:var(--text);font-size:15px">
          <button class="primary" data-act="ptSaveUrl" style="background:#a78bfa;color:#1c1917;flex:0 0 auto;width:auto;padding:12px 18px">Connect</button>
        </div>
        <p class="muted" id="ptUrlMsg" style="margin-top:10px;min-height:1.4em">${esc(S.partyMsg || "")}</p>
      </div>
    </div>`;
  }
  function viewLobby() {
    const ps = list(), need = P.mode === "duel" ? 2 : 1, ready = ps.filter(p => p.on).length >= need;
    const short = joinUrl().replace(/^https?:\/\//, "").replace(/\?.*$/, "");
    const who = ps.map(p => `<div class="pt-seat ${p.on ? "" : "off"}" style="--cc:${CLASSES[p.cls].color}">${spriteCanvas(CLASSES[p.cls].sprite, 3)}<b>${esc(p.name)}</b></div>`).join("")
      || `<div class="pt-empty">Waiting for the first player<span class="pt-dots"><i></i><i></i><i></i></span></div>`;
    const modeCard = (id, name, text, col) => `<button class="card pt-mode ${P.mode === id ? "on" : ""}" data-act="ptMode" data-id="${id}" style="--cc:${col}"><b style="color:${col}">${name}</b><span class="muted">${text}</span></button>`;
    const status = P.status === "open" ? `<span class="pt-live"><i></i>Room open</span>` : P.status === "connecting" ? `<span class="pt-live wait"><i></i>Connecting…</span>` : `<span class="pt-live bad"><i></i>Can't reach the party server. Retrying…</span>`;
    return `<div class="wrap battle pt-wrap">
      <div style="display:flex;align-items:center;gap:12px;margin:18px 0 14px">
        <button class="backbtn" data-act="ptBack" title="Close the room">${I.chevL}</button>
        <div style="flex:1"><div class="eyebrow" style="color:#a78bfa">Party · ${esc(S.set.title || "")}</div>
        <div style="font-size:22px;font-weight:bold">Gather your party</div></div>
        ${status}
      </div>
      <div class="pt-lobby">
        <div class="card pt-join tex" style="--sc:#a78bfa">
          <div class="eyebrow">Scan to join</div>
          <canvas id="ptQr" class="pt-qr" width="232" height="232"></canvas>
          <div class="pt-code">${P.code.split("").map(c => `<span>${c}</span>`).join("")}</div>
          <div class="muted" style="font-size:12.5px;word-break:break-all">or open <b>${esc(short)}</b> and type the code</div>
        </div>
        <div class="pt-side">
          <div class="eyebrow" style="margin-bottom:8px">Players · ${ps.length}</div>
          <div class="pt-seats">${who}</div>
          <div class="eyebrow" style="margin:16px 0 8px">Mode</div>
          <div class="pt-modes">
            ${modeCard("raid", "Raid", "Everyone against three bosses. Right answers are hits, the fastest one hits harder, and a miss costs you a heart.", "#f87171")}
            ${modeCard("duel", "Duel", "Every player for themselves. Right answers hit whoever missed. Last one standing wins.", "#60a5fa")}
          </div>
          <div class="eyebrow" style="margin:16px 0 8px">Time per question</div>
          <div class="pt-chips">${[15, 20, 30].map(n => `<button class="chip ${P.secs === n ? "on" : ""}" data-act="ptSecs" data-id="${n}">${n}s</button>`).join("")}</div>
          <button class="primary" data-act="ptStart" ${ready ? "" : "disabled"} style="margin-top:18px;background:${ready ? "#a78bfa" : "var(--border)"};color:${ready ? "#1c1917" : "var(--muted)"}">${ready ? "Start the " + (P.mode === "raid" ? "raid" : "duel") : P.mode === "duel" ? "Duel needs 2 players" : "Waiting for players"}</button>
        </div>
      </div>
    </div>`;
  }
  function seat(p, i, n) {
    const C = CLASSES[p.cls], L = p.last || {}, rev = P.phase === "reveal";
    const out = P.mode === "duel" ? p.hearts <= 0 : p.down;
    const act = rev && L.ok && L.dmg ? "a-lunge" : rev && L.lost ? "a-hurtHero" : P.fx === "enter" ? "a-enterL" : "";
    const pop = rev && L.lost ? `<div class="dmg" style="color:#fca5a5;--d:.3s">-♥</div>` : rev && L.dmg ? `<div class="dmg ${L.crit || L.first ? "crit" : ""}" style="color:#fde047;--d:.1s">${P.mode === "raid" ? "+" + L.dmg : "HIT"}</div>` : rev && L.revived ? `<div class="dmg heal" style="color:#6ee7b7">UP!</div>` : "";
    const flip = P.mode === "duel" && i >= Math.ceil(n / 2);
    return `<div class="pt-f ${p.ans ? "locked" : ""} ${out ? "out" : ""} ${p.on ? "" : "off"} ${rev ? (L.ok ? "ok" : "no") : ""}" data-pid="${p.id}" style="--cc:${C.color};--i:${i}">
      <div class="act ${act}" style="animation-delay:${(i * 0.05).toFixed(2)}s">${pop}
        <div class="body">${spriteCanvas(C.sprite, n > 6 ? 2 : 3, flip)}</div>
      </div>
      <div class="pt-plate"><b>${esc(p.name)}</b><span class="pt-hearts">${hearts(p.hearts, HEARTS[P.mode])}</span></div>
    </div>`;
  }
  function viewGame() {
    const ps = list(), n = ps.length, raid = P.mode === "raid", rev = P.phase === "reveal", q = P.q, good = goodSet();
    const b = P.boss;
    const bossAct = !raid ? "" : rev && P.fx === "hit" ? "a-hurt" : rev && P.fx === "kill" ? "a-hurt" : rev && P.fx === "hurt" ? "a-lungeL" : P.fx === "enter" || P.fx === "bossIn" ? "a-enter" : "";
    const boss = raid ? fighterHtml(b.key, { side: "enemy", id: "enemySlot", flip: true, scale: b.scale, act: bossAct, cls: rev && P.fx === "kill" ? "arc-dead" : "",
      plate: `<div class="nameplate" style="background:rgba(127,29,29,.75)">${esc(b.name)}</div>`,
      extra: rev && P.dealt ? `<div class="dmg crit" style="color:#fff;--d:.2s">-${P.dealt}</div>` : "" }) : "";
    const banner = P.fx === "enter" && raid ? `<div class="banner boss" style="animation-delay:.25s">${esc(b.name)}</div>` : P.fx === "bossIn" ? `<div class="banner boss" style="animation-delay:.25s">${esc(b.name)}</div>`
      : rev && P.fx === "kill" ? `<div class="banner kill" style="animation-delay:.5s">${esc(P.note)}</div>` : rev && P.wipe ? `<div class="banner boss" style="animation-delay:.5s">The party is down</div>` : "";
    const arena = `<div class="arena pt-arena ${raid ? "raid" : "duel"} ${rev && P.fx === "hurt" ? "shake" : ""}" id="arena" style="--d:.2s">
      <canvas class="arena-bg" id="arenaBg" data-story="${P.story}" data-floor="${(P.bossN % 5) + 1}" data-boss="${raid ? 1 : 0}"></canvas>
      <div class="arena-hud">
        <span class="ptag">${raid ? "Boss " + (P.bossN + 1) + " of " + RAID_BOSSES : "Round " + P.round + " of " + DUEL_ROUNDS}</span>
        <span class="ptag">Join · ${P.code}</span>
      </div>
      <div class="stage"><div class="pt-row n${Math.min(n, 12)}">${ps.map((p, i) => seat(p, i, n)).join("")}</div>${boss}</div>
      ${banner}
    </div>`;
    const bossBar = raid ? `<div class="pt-bossbar"><span>${esc(b.name)}</span><div class="hpbar foe boss"><div class="trail" data-from="${b.shown / b.max * 100}" data-to="${b.hits / b.max * 100}" style="width:${b.shown / b.max * 100}%"></div><div class="fillb" data-from="${b.shown / b.max * 100}" data-to="${b.hits / b.max * 100}" style="width:${b.shown / b.max * 100}%"></div></div><b>${b.hits} / ${b.max}</b></div>` : "";
    const opts = P.order.map((orig, pos) => {
      const isGood = good.includes(pos), picks = rev ? ps.filter(p => p.ans && p.ans.sel.includes(pos)) : [];
      return `<div class="pt-opt ${rev ? (isGood ? "good" : "dim") : ""}" style="--oc:${OPT_COL[pos % 8]}"><span class="pt-let">${LETTERS[pos]}</span><span class="pt-otxt">${esc(q.options[orig])}</span>
        ${picks.length ? `<span class="pt-picks">${picks.map(p => `<i style="background:${CLASSES[p.cls].color}" title="${esc(p.name)}">${esc(p.name[0].toUpperCase())}</i>`).join("")}</span>` : ""}</div>`;
    }).join("");
    const left = Math.max(0, Math.ceil((P.tEnd - Date.now()) / 1000));
    const foot = rev
      ? `<div class="pt-foot"><div class="pt-why">${P.note ? `<b>${esc(P.note)}</b> ` : ""}${esc(q.explanation || "")}</div><button class="primary" data-act="ptNext" style="background:#a78bfa;color:#1c1917;width:auto;padding:13px 26px;flex:0 0 auto">${P.wipe ? "See results →" : raid && b.hits <= 0 ? (P.bossN + 1 >= RAID_BOSSES ? "Victory →" : "Next boss →") : "Next question →"}</button></div>`
      : `<div class="pt-foot"><span class="pt-secs" id="ptSecs">${left}</span><div class="pt-timer"><div id="ptTimer" style="transform:scaleX(${Math.max(0, (P.tEnd - Date.now()) / (P.secs * 1000))})"></div></div><span class="muted" id="ptCount">${alive().filter(p => p.ans).length} / ${alive().length} locked in</span><button class="ghost" data-act="ptReveal" style="width:auto;padding:9px 14px">Reveal now</button></div>`;
    return `<div class="wrap battle pt-wrap">
      <div class="bhead" style="display:flex;align-items:center;gap:12px;margin:12px 0 10px">
        <button class="backbtn" data-act="ptQuit" title="End the game">${I.chevL}</button>
        <div class="eyebrow" style="color:#a78bfa;flex:1;text-align:center">${raid ? "Raid" : "Duel"} · ${esc(S.set.title || "")}</div><span style="width:36px"></span>
      </div>
      ${arena}${bossBar}
      <div class="card qcard tex pt-q"><div class="eyebrow" style="margin-bottom:8px">${q.type === "mc" ? "Pick one" : "Select all that apply"}${q._cat ? " · " + esc(q._cat.category) : ""}</div><div class="qtext">${esc(q.question)}</div></div>
      <div class="pt-opts">${opts}</div>
      ${foot}
    </div>`;
  }
  function viewEnd() {
    const R = P.result, raid = P.mode === "raid", order = R.order.map(id => P.players[id]).filter(Boolean), top = order[0];
    const title = raid ? (R.won ? "The raid is won" : "The party fell") : top ? top.name + " wins the duel" : "Duel over";
    const sub = raid ? (R.won ? "All " + RAID_BOSSES + " bosses down in " + R.rounds + " questions." : "Stopped at boss " + (R.bosses + 1) + " of " + RAID_BOSSES + ".") : R.rounds + " rounds.";
    const rows = order.map((p, i) => {
      const tot = p.right + p.wrong, acc = tot ? Math.round(p.right / tot * 100) : 0;
      return `<div class="pt-rank ${i === 0 ? "first" : ""}" style="--cc:${CLASSES[p.cls].color};animation-delay:${(0.15 + i * 0.08).toFixed(2)}s">
        <span class="pt-pos">${i + 1}</span><span class="pt-rart">${spriteCanvas(CLASSES[p.cls].sprite, 2)}</span>
        <b>${esc(p.name)}${i === 0 ? ` <em>${raid ? "MVP" : "Winner"}</em>` : ""}</b>
        <span class="muted">${raid ? p.score + " damage" : p.hearts + " hearts left · " + p.score + " hits"} · ${acc}% right</span></div>`;
    }).join("");
    return `<div class="wrap">
      <div class="card arc-result tex" style="--sc:${raid && !R.won ? "#f87171" : "#a78bfa"}">
        <div class="eyebrow" style="color:#a78bfa">${raid ? "Raid" : "Duel"} · ${esc(S.set.title || "")}</div>
        ${top ? `<div class="arc-hero" style="margin-top:14px">${spriteCanvas(CLASSES[top.cls].sprite, 4)}</div>` : ""}
        <div style="font-size:24px;font-weight:bold;margin-top:6px">${esc(title)}</div>
        <div class="muted" style="margin-top:4px">${sub}</div>
        <div class="pt-ranks">${rows}</div>
      </div>
      <button class="primary" data-act="ptAgain" style="background:#a78bfa;color:#1c1917;margin-top:14px">Back to the lobby</button>
      <button class="ghost" data-act="ptBack" style="width:100%;margin-top:10px">Close the room</button>
    </div>`;
  }
  function afterGame() {
    if (P && P.phase === "reveal" && P.fx === "kill") setTimeout(() => {
      const cv = document.querySelector("#enemySlot canvas[data-sprite]");
      if (cv && cv.isConnected && P && P.boss) { spriteBurst(cv, P.boss.key, P.boss.scale, true, 0); cv.style.opacity = "0"; }
    }, 380);
    if (P && P.phase === "q") P.fx = null;
  }

  Object.assign(ARC.screens, { partySetup: { view: viewSetup }, partyLobby: { view: viewLobby, after: drawQr }, partyGame: { view: viewGame, after: afterGame }, partyEnd: { view: viewEnd } });
  ARC.tiles.push(() => `<button class="card arc-tile" data-act="ptOpen" style="--tc:#a78bfa">
      <span class="arc-art pt-tileart">${spriteCanvas("hero_wizard", 2)}${spriteCanvas("hero_knight", 2)}</span>
      <span class="arc-txt"><span class="eyebrow" style="color:#a78bfa">Party · Raid &amp; Duel</span>
        <b>Play together</b>
        <span class="muted">${serverUrl() ? "Friends join from their phones" : "One-time setup needed"}</span></span>
    </button>`);
  BACK_ACTS.push("ptBack", "ptQuit");

  document.addEventListener("click", ev => {
    const t = ev.target.closest("[data-act]"); if (!t) return;
    const act = t.dataset.act;
    if (act === "ptOpen") return openParty();
    if (act === "ptSaveUrl") {
      const url = cleanUrl(document.getElementById("ptUrl").value);
      if (!url) return;
      S.partyMsg = "Checking…"; render();
      return fetch(url + "/", { cache: "no-store" }).then(r => r.json()).then(j => {
        if (!j || j.service !== "study-decks-party") throw new Error("not it");
        setCfg({ url }); S.partyMsg = ""; openParty();
      }).catch(() => { S.partyMsg = "That address didn't answer like the party server. Check it and try again."; render(); });
    }
    if (act === "ptBack") {
      if (P && (P.phase !== "lobby" || Object.keys(P.players).length)) {
        return showModal(`<h2>Close the room?</h2><p>Everyone's phone will be disconnected.</p><div class="btns"><button class="ghost" data-act="ptStay">Stay</button><button class="primary" data-act="ptClose" style="background:var(--bad)">Close the room</button></div>`);
      }
      closeParty(); sfx.tick(); return openAdvMenu();
    }
    if (act === "ptStay") return closeModal();
    if (act === "ptClose") { closeModal(); closeParty(); return openAdvMenu(); }
    if (!P) return;
    if (act === "ptMode") { P.mode = t.dataset.id === "duel" ? "duel" : "raid"; setCfg({ mode: P.mode }); list().forEach(p => { p.hearts = HEARTS[P.mode]; }); sfx.select(); broadcast(); return render(); }
    if (act === "ptSecs") { P.secs = +t.dataset.id; setCfg({ secs: P.secs }); sfx.select(); return render(); }
    if (act === "ptStart") return startGame();
    if (act === "ptReveal") return reveal();
    if (act === "ptNext") return advance();
    if (act === "ptQuit") return showModal(`<h2>End this game?</h2><p>You'll go back to the lobby. Everyone stays connected.</p><div class="btns"><button class="ghost" data-act="ptStay">Keep playing</button><button class="primary" data-act="ptAgain" style="background:var(--bad)">End game</button></div>`);
    if (act === "ptAgain") { closeModal(); P.phase = "lobby"; P.fx = null; P.wipe = false; list().forEach(p => { if (!p.on) delete P.players[p.id]; else Object.assign(p, { hearts: HEARTS[P.mode], down: false, ans: null, last: null }); }); broadcast(); return goto("partyLobby"); }
  });
  window.addEventListener("pagehide", () => { if (P) send("*", { t: "closed" }); });

  const css = document.createElement("style");
  css.textContent = `
  .pt-tileart canvas:first-child { margin-right: -14px; filter: brightness(.8); }
  .pt-wrap { max-width: 1240px; }
  .pt-live { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--ok); }
  .pt-live i { width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 10px currentColor; animation: arcpulse 2s ease-in-out infinite; }
  .pt-live.wait { color: var(--star); } .pt-live.bad { color: var(--bad); }
  .pt-lobby { display: grid; gap: 16px; grid-template-columns: 1fr; }
  @media (min-width: 820px) { .pt-lobby { grid-template-columns: minmax(280px, 340px) 1fr; align-items: start; } }
  .pt-join { text-align: center; padding: 20px 16px; display: grid; justify-items: center; gap: 12px; position: relative; overflow: hidden; }
  .pt-join::before { content: ""; position: absolute; inset: -40% -20% auto; height: 80%; pointer-events: none; background: radial-gradient(closest-side, color-mix(in srgb, #a78bfa 24%, transparent), transparent); animation: arcglow 5s ease-in-out infinite; }
  .pt-qr { position: relative; border-radius: 12px; image-rendering: pixelated; box-shadow: 0 12px 40px -18px #a78bfa; background: #fff; }
  .pt-code { position: relative; display: flex; gap: 8px; }
  .pt-code span { font: 900 34px/1 ui-monospace, 'SF Mono', Menlo, Consolas, monospace; width: 50px; padding: 10px 0; border-radius: 10px; background: var(--surface2); border: 1.5px solid color-mix(in srgb, #a78bfa 55%, var(--border)); color: #c4b5fd; text-shadow: 0 0 18px rgba(167,139,250,.5); animation: arcpop .5s var(--ease-pop) both; }
  .pt-code span:nth-child(2) { animation-delay: .06s; } .pt-code span:nth-child(3) { animation-delay: .12s; } .pt-code span:nth-child(4) { animation-delay: .18s; }
  .pt-seats { display: flex; flex-wrap: wrap; gap: 10px; min-height: 118px; }
  .pt-seat { display: grid; justify-items: center; gap: 4px; padding: 10px 10px 8px; min-width: 84px; border-radius: 12px; border: 1.5px solid color-mix(in srgb, var(--cc) 45%, var(--border)); background: color-mix(in srgb, var(--cc) 9%, var(--surface)); animation: arcpop .45s var(--ease-pop) both; }
  .pt-seat canvas { image-rendering: pixelated; } .pt-seat b { font-size: 13.5px; max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pt-seat.off { opacity: .45; }
  .pt-empty { align-self: center; color: var(--muted); font-style: italic; }
  .pt-dots i { display: inline-block; width: 4px; height: 4px; margin-left: 4px; border-radius: 50%; background: currentColor; animation: arcpulse 1.2s ease-in-out infinite; }
  .pt-dots i:nth-child(2) { animation-delay: .2s; } .pt-dots i:nth-child(3) { animation-delay: .4s; }
  .pt-modes { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; }
  .pt-mode { display: grid; gap: 4px; text-align: left; padding: 12px 14px; cursor: pointer; transition: transform var(--t-std) var(--ease-out), border-color var(--t-std), background var(--t-std); }
  .pt-mode b { font-size: 17px; } .pt-mode .muted { font-size: 12.5px; line-height: 1.45; }
  .pt-mode.on { border-color: var(--cc); background: color-mix(in srgb, var(--cc) 11%, var(--surface)); transform: translateY(-2px); }
  .pt-chips { display: flex; gap: 8px; } .pt-chips .chip { flex: 0 0 auto; width: auto; padding: 9px 18px; }
  .pt-chips .chip.on { border-color: #a78bfa; color: #c4b5fd; background: color-mix(in srgb, #a78bfa 14%, transparent); }
  .pt-arena, .battle .pt-arena { height: clamp(250px, 40vh, 400px); }
  .battle .pt-arena .stage { left: 0; right: 0; transform: none; bottom: 30px; height: auto; top: 44px; }
  @media (min-width: 1000px) { .battle .pt-arena .stage { left: 14%; right: 14%; transform: scale(1.38); transform-origin: 50% 100%; top: auto; height: 200px; } }
  .pt-row { position: absolute; left: 2%; bottom: 0; display: flex; align-items: flex-end; justify-content: space-evenly; gap: 2px; }
  .pt-arena.raid .pt-row { width: 62%; } .pt-arena.duel .pt-row { width: 96%; }
  .pt-arena.raid .fighter.enemy { left: 84%; }
  .pt-f { position: relative; display: grid; justify-items: center; flex: 0 1 auto; min-width: 0; transition: filter .4s, opacity .4s; }
  .pt-f:nth-child(even) { margin-bottom: 14px; }
  .pt-f canvas { image-rendering: pixelated; display: block; }
  .pt-f .act { position: relative; } .pt-f .dmg { bottom: calc(100% + 30px); }
  .pt-f .body { transform-origin: 50% 100%; transition: transform .5s var(--ease-out) .3s; }
  .pt-f.out .body { transform: rotate(-82deg) translateY(6px); } .pt-f.out { filter: grayscale(1) brightness(.72); }
  .pt-f.off { opacity: .35; }
  .pt-plate { position: absolute; bottom: 100%; margin-bottom: 4px; display: grid; justify-items: center; gap: 2px; padding: 3px 6px; border-radius: 6px; background: rgba(10,10,16,.6); border: 1px solid transparent; white-space: nowrap; transition: border-color .2s, box-shadow .2s; }
  .pt-plate b { font: 800 10px ui-monospace, 'SF Mono', Menlo, Consolas, monospace; letter-spacing: 1px; text-transform: uppercase; color: #fff; max-width: 84px; overflow: hidden; text-overflow: ellipsis; }
  .pt-f.locked .pt-plate { border-color: var(--cc); box-shadow: 0 0 12px -2px var(--cc); }
  .pt-f.ok .pt-plate { border-color: #34d399; } .pt-f.no .pt-plate { border-color: #f87171; }
  .pt-hearts { display: inline-flex; gap: 2px; }
  .pt-hearts i { width: 7px; height: 7px; background: rgba(255,255,255,.2); clip-path: polygon(50% 100%, 0 38%, 0 14%, 20% 0, 50% 22%, 80% 0, 100% 14%, 100% 38%); }
  .pt-hearts i.on { background: #f87171; }
  .pt-bossbar { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; margin: 10px 2px 0; font: 800 11px ui-monospace, 'SF Mono', Menlo, Consolas, monospace; letter-spacing: 1.2px; text-transform: uppercase; }
  .pt-bossbar b { color: var(--bad); }
  .pt-q { margin-top: 12px; } .pt-q .qtext { font-size: clamp(19px, 2.3vw, 30px); line-height: 1.35; }
  .pt-opts { display: grid; gap: 10px; grid-template-columns: 1fr; margin-bottom: 12px; }
  @media (min-width: 700px) { .pt-opts { grid-template-columns: 1fr 1fr; } }
  .pt-opt { position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--surface); font-size: clamp(16px, 1.7vw, 22px); transition: opacity .35s, border-color .35s, background .35s, transform .35s var(--ease-out); animation: arcpop .4s var(--ease-out) both; }
  .pt-opt:nth-child(2) { animation-delay: .05s; } .pt-opt:nth-child(3) { animation-delay: .1s; } .pt-opt:nth-child(4) { animation-delay: .15s; }
  .pt-let { flex: 0 0 34px; height: 34px; display: grid; place-items: center; border-radius: 9px; background: var(--oc); color: #14121c; font: 900 17px ui-monospace, 'SF Mono', Menlo, Consolas, monospace; }
  .pt-otxt { flex: 1; min-width: 0; }
  .pt-opt.good { border-color: var(--ok); background: var(--okBg); transform: scale(1.012); } .pt-opt.dim { opacity: .45; }
  .pt-picks { display: inline-flex; gap: 3px; } .pt-picks i { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font: 800 10px ui-monospace, monospace; color: #14121c; font-style: normal; }
  .pt-foot { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .pt-secs { font: 900 26px ui-monospace, 'SF Mono', Menlo, Consolas, monospace; min-width: 38px; text-align: center; transition: color .2s; } .pt-secs.hurry { color: var(--bad); }
  .pt-timer { flex: 1; min-width: 120px; height: 8px; border-radius: 6px; background: var(--surface2); overflow: hidden; }
  .pt-timer div { height: 100%; background: linear-gradient(90deg, #a78bfa, #60a5fa); transform-origin: 0 50%; transition: transform .26s linear; }
  .pt-why { flex: 1; min-width: 200px; font-size: 15px; line-height: 1.55; color: var(--dim); } .pt-why b { color: var(--text); }
  .pt-ranks { position: relative; display: grid; gap: 8px; margin-top: 16px; text-align: left; }
  .pt-rank { display: grid; grid-template-columns: 26px 44px 1fr; column-gap: 10px; align-items: center; padding: 8px 12px; border-radius: 12px; background: var(--surface2); border: 1.5px solid var(--border); animation: arcpop .45s var(--ease-out) both; }
  .pt-rank.first { border-color: var(--cc); background: color-mix(in srgb, var(--cc) 12%, var(--surface2)); }
  .pt-rank .muted { grid-column: 3; font-size: 12.5px; } .pt-rank b { font-size: 16px; } .pt-rank em { font: 800 10px ui-monospace, monospace; letter-spacing: 1px; text-transform: uppercase; color: #fde047; font-style: normal; margin-left: 6px; }
  .pt-pos { grid-row: span 2; font: 900 18px ui-monospace, monospace; color: var(--muted); } .pt-rart { grid-row: span 2; display: grid; place-items: center; } .pt-rart canvas { image-rendering: pixelated; max-height: 48px; width: auto !important; height: auto !important; }
  `;
  document.head.appendChild(css);
})();
