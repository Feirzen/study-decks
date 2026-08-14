/* ===================================================================
   game.js — Battle Mode
   Reuses the same question pool, grading and progress rules as Shuffle.
   Every answer is an attack. Five enemies then a boss, floor after floor,
   until your HP runs out.
   =================================================================== */

/* ===================== PIXEL SPRITES =====================
   12x12 grids. Each character indexes a palette; anything not in the
   palette (".") is transparent. Drawn to canvas so the repo stays
   free of image assets.                                              */
const SPRITES = {
  hero: {
    pal: { a: "#c9d1e0", b: "#f2c9a0", c: "#3b6fd4", d: "#161620", e: "#3f3f4d", f: "#eef2ff", g: "#c98f5e" },
    rows: [
      "....aaaa....",
      "...aaaaaa...",
      "...abbbba...",
      "...abdbda...",
      "...abbbba...",
      "....aaaa..f.",
      "..gcccccg.f.",
      "..gcccccgff.",
      "...cccccc.f.",
      "...cc..cc...",
      "...ee..ee...",
      "............",
    ],
  },
  slime: {
    pal: { a: "#5ee6a8", b: "#2fa87a", c: "#0b3d2c" },
    rows: [
      "............",
      "............",
      "....aaaa....",
      "...aaaaaa...",
      "..aaaaaaaa..",
      "..acaaaaca..",
      "..aaaaaaaa..",
      ".aaaaaaaaaa.",
      ".aaaaaaaaaa.",
      ".abbbbbbbba.",
      "..bbbbbbbb..",
      "............",
    ],
  },
  bat: {
    pal: { a: "#a78bfa", b: "#6d28d9", c: "#fbbf24" },
    rows: [
      "............",
      "............",
      "....a..a....",
      ".b..aaaa..b.",
      ".bb.aaaa.bb.",
      "bbbbacacbbbb",
      "bbbbaaaabbbb",
      ".bbbaaaabbb.",
      "..bb.aa.bb..",
      "....a..a....",
      "............",
      "............",
    ],
  },
  ghost: {
    pal: { a: "#e2e8f0", b: "#94a3b8", c: "#1e293b" },
    rows: [
      "............",
      "....aaaa....",
      "...aaaaaaa..",
      "..aaaaaaaaa.",
      "..acaaaacaa.",
      "..aaaaaaaaa.",
      "..aaaaaaaaa.",
      "..aaaaaaaaa.",
      "..aaaaaaaaa.",
      "..abaabaaba.",
      "..b..b..b...",
      "............",
    ],
  },
  knight: {
    pal: { a: "#94a3b8", b: "#ef4444", c: "#1e293b", d: "#475569" },
    rows: [
      ".....bb.....",
      "....abba....",
      "...aaaaaa...",
      "...acccca...",
      "...aaaaaa...",
      "....aaaa....",
      "..daaaaaad..",
      "..daaaaaad..",
      "...aaaaaa...",
      "...aa..aa...",
      "...dd..dd...",
      "............",
    ],
  },
  dragon: {
    pal: { a: "#ef4444", b: "#7f1d1d", c: "#fde68a", d: "#fbbf24", e: "#1a0505" },
    rows: [
      ".c........c.",
      ".ac......ca.",
      ".aaa....aaa.",
      "baaaaaaaaaab",
      "baaeaaaaeaab",
      "baaaaaaaaaab",
      ".aaddddddaa.",
      ".aaddddddaa.",
      "..aaaaaaaa..",
      "..aa....aa..",
      "..bb....bb..",
      "............",
    ],
  },
};

function drawSprite(canvas, name, scale, flip) {
  const sp = SPRITES[name];
  if (!sp || !canvas) return;
  const rows = sp.rows, n = rows.length, m = rows[0].length;
  canvas.width = m * scale;
  canvas.height = n * scale;
  canvas.style.width = (m * scale) + "px";
  canvas.style.height = (n * scale) + "px";
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < m; x++) {
      const col = sp.pal[rows[y][x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect((flip ? m - 1 - x : x) * scale, y * scale, scale, scale);
    }
  }
}

/* ===================== BALANCE ===================== */
const ENEMIES = [
  { key: "slime",  name: "Slime" },
  { key: "bat",    name: "Bat" },
  { key: "ghost",  name: "Wraith" },
  { key: "knight", name: "Dark Knight" },
];
const BOSS = { key: "dragon", name: "Dragon" };
const PER_FLOOR = 5;                          // normal enemies before the boss

function maxHpFor(level) { return 100 + (level - 1) * 10; }
function levelFor(xp) { return 1 + Math.floor(xp / 100); }
function xpIntoLevel(xp) { return xp % 100; }
function hitsFor(floor, boss) {
  return boss ? 4 + Math.floor(floor / 2) : 2 + Math.floor(floor / 3);
}
function damageFrom(floor, boss) {
  return Math.min(32, (boss ? 18 : 12) + floor * 2);
}

function makeEnemy(floor, idx) {
  const boss = idx >= PER_FLOOR;
  const def = boss ? BOSS : ENEMIES[(floor + idx) % ENEMIES.length];
  const hits = hitsFor(floor, boss);
  return {
    key: def.key,
    name: boss ? "Floor " + floor + " " + def.name : def.name,
    boss, hits, maxHits: hits,
  };
}

/* ===================== RUN LIFECYCLE ===================== */
function startBattle() {
  const pool = buildPool();
  if (!pool.length) return;
  const b = progress.battle;
  const level = levelFor(b.xp);
  S.battle = {
    level, xp: b.xp,
    maxHp: maxHpFor(level), hp: maxHpFor(level),
    floor: 1, idx: 0,
    enemy: makeEnemy(1, 0),
    queue: weightedOrder(pool), qIdx: 0,
    over: false, won: false,
    anim: "enter", pending: null, note: null,
  };
  S.screen = "battle";
  resetQ();
  freshOrder(S.battle.queue[0]);
  sfx.modeStart();
  render();
}
function battleQuestion() {
  const b = S.battle;
  if (!b) return null;
  if (b.qIdx >= b.queue.length) {              // endless: rebuild the pass
    b.queue = weightedOrder(buildPool());
    b.qIdx = 0;
  }
  return b.queue[b.qIdx];
}
function battleNextQuestion() {
  const b = S.battle;
  b.qIdx++;
  if (b.qIdx >= b.queue.length) { b.queue = weightedOrder(buildPool()); b.qIdx = 0; }
  resetQ();
  freshOrder(battleQuestion());
  b.anim = null;
  b.note = null;
  render();
}

function submitBattle() {
  const b = S.battle;
  const q = battleQuestion();
  const ok = grade(q, S.selected);
  recordAnswer(q, ok);
  S.feedback = ok ? "correct" : "incorrect";
  if (!ok) S.showAnswer = true;

  if (ok) {
    b.enemy.hits--;
    b.anim = "heroAttack";
    if (b.enemy.hits <= 0) {
      const wasBoss = b.enemy.boss;
      b.xp += wasBoss ? 40 : 10;
      b.hp = Math.min(b.maxHp, b.hp + (wasBoss ? 30 : 6));
      const newLevel = levelFor(b.xp);
      const leveled = newLevel > b.level;
      b.level = newLevel;
      b.maxHp = maxHpFor(newLevel);
      if (leveled) b.hp = b.maxHp;

      progress.battle.xp = b.xp;
      progress.battle.level = b.level;

      b.idx++;
      if (wasBoss) {
        b.floor++;
        b.idx = 0;
        progress.battle.bestFloor = Math.max(progress.battle.bestFloor || 0, b.floor - 1);
        b.note = { kind: "floor", text: "Floor " + (b.floor - 1) + " cleared" };
      } else {
        b.note = { kind: "kill", text: b.enemy.name + " defeated" };
      }
      if (leveled) b.note = { kind: "level", text: "Level " + b.level + "!  Max HP " + b.maxHp };
      saveProgress();
      b.enemy = makeEnemy(b.floor, b.idx);
      b.anim = "kill";
      sfx.enemyDie();
      if (leveled) setTimeout(() => sfx.levelUp(), 320);
      confettiBurst();
      flashGlow("var(--ok)", 700);
    } else {
      sfx.enemyHit();
      sfx.correct();
    }
  } else {
    const dmg = damageFrom(b.floor, b.enemy.boss);
    b.hp = Math.max(0, b.hp - dmg);
    b.anim = "enemyAttack";
    b.pending = dmg;
    sfx.wrong();
    sfx.hit();
    shakeApp();
    if (b.hp <= 0) {
      b.over = true;
      progress.battle.bestFloor = Math.max(progress.battle.bestFloor || 0, b.floor - 1);
      saveProgress();
      setTimeout(() => sfx.gameOver(), 260);
    }
  }
  render();
  if (!ok && !b.over) flashGlow("var(--bad)", 600);
  checkCompletion();
}

/* ===================== VIEW ===================== */
function hpColor(frac) {
  return frac > 0.5 ? "var(--ok)" : frac > 0.25 ? "var(--star)" : "var(--bad)";
}

function viewBattle() {
  const b = S.battle;
  if (!b) return `<div class="wrap"><div class="empty">No battle running.</div></div>`;

  if (b.over) {
    return `<div class="wrap">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:26px">
        <button class="backbtn" data-act="backToSet">${I.chevL}</button>
        <div><div class="eyebrow" style="color:var(--bad)">Battle</div>
        <div style="font-size:22px;font-weight:bold">Defeated</div></div>
      </div>
      <div class="card" style="cursor:default;text-align:center;padding:34px 22px;margin-bottom:16px">
        <canvas data-sprite="dragon" data-scale="7" style="margin:0 auto 16px;opacity:.5"></canvas>
        <div style="font-size:26px;font-weight:bold;margin-bottom:6px">Floor ${b.floor}</div>
        <div class="dim" style="font-size:15px">You fell on floor ${b.floor}${b.enemy.boss ? " to the boss" : ""}.</div>
        <div class="dim" style="font-size:15px;margin-top:8px">Level ${b.level} · Best floor cleared: ${progress.battle.bestFloor || 0}</div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="ghost" data-act="backToSet">Exit</button>
        <button class="primary" data-act="battleRestart" style="background:var(--accent);flex:1">Fight again ↻</button>
      </div>
    </div>`;
  }

  const q = battleQuestion();
  if (!q) return `<div class="wrap"><div class="empty">Nothing in this pool to fight with.</div></div>`;

  const hpFrac = b.hp / b.maxHp;
  const eFrac = b.enemy.hits / b.enemy.maxHits;
  const starred = !!progress.starred[q.id];
  const cc = q._cat ? ck(q._cat.color) : "var(--accent)";

  const heroAnim = b.anim === "heroAttack" ? "spr-attack" : b.anim === "enemyAttack" ? "spr-hit" : "spr-idle";
  const enemyAnim = b.anim === "kill" ? "spr-enter" : b.anim === "heroAttack" ? "spr-hit"
                  : b.anim === "enemyAttack" ? "spr-attack-l" : b.anim === "enter" ? "spr-enter" : "spr-idle";

  const arena = `<div class="arena" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span class="floortag">Floor ${b.floor} · ${b.enemy.boss ? "BOSS" : (b.idx + 1) + " / " + PER_FLOOR}</span>
      <span class="floortag" style="color:var(--accent)">Lv ${b.level}</span>
    </div>
    <div class="ground"></div>
    <div class="fighters">
      <div class="fighter" id="heroSlot">
        <canvas data-sprite="hero" data-scale="6" class="${heroAnim}"></canvas>
      </div>
      <div class="fighter" id="enemySlot">
        <div class="nm" style="color:${b.enemy.boss ? "var(--bad)" : "var(--muted)"}">${esc(b.enemy.name)}</div>
        <canvas data-sprite="${b.enemy.key}" data-scale="${b.enemy.boss ? 7 : 6}" data-flip="1" class="${enemyAnim}"></canvas>
      </div>
    </div>
  </div>`;

  const bars = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
    <div class="hpwrap">
      <div class="hplabel"><span>HP</span><span style="color:${hpColor(hpFrac)}">${b.hp} / ${b.maxHp}</span></div>
      <div class="hpbar"><div style="width:${hpFrac * 100}%;background:${hpColor(hpFrac)}"></div></div>
      <div class="xpbar" title="XP"><div style="width:${xpIntoLevel(b.xp)}%"></div></div>
    </div>
    <div class="hpwrap">
      <div class="hplabel"><span>${b.enemy.boss ? "Boss" : "Enemy"}</span><span style="color:var(--bad)">${b.enemy.hits} / ${b.enemy.maxHits}</span></div>
      <div class="hpbar"><div style="width:${eFrac * 100}%;background:var(--bad)"></div></div>
    </div>
  </div>`;

  const note = b.note
    ? `<div class="fb fbpop" style="background:var(--surface);border:1px solid ${b.note.kind === "level" ? "var(--star)" : "var(--ok)"};margin-bottom:14px;justify-content:center;color:${b.note.kind === "level" ? "var(--star)" : "var(--ok)"};font-weight:bold">${esc(b.note.text)}</div>`
    : "";

  const order = optionOrder(q);
  const opts = order.map((origIdx, pos) => {
    const isSel = S.selected.includes(pos);
    const isCorrect = q.type === "mc" ? q.answer === origIdx : (q.answers || []).includes(origIdx);
    let border = "var(--border)", bg = "var(--surface)";
    if (S.feedback && isCorrect) { border = "var(--ok)"; bg = "var(--okBg)"; }
    if (isSel && !S.feedback) { border = "var(--accent)"; bg = "var(--accBg)"; }
    if (S.feedback === "incorrect" && isSel && !isCorrect) { border = "var(--bad)"; bg = "var(--badBg)"; }
    return `<button class="opt" data-act="pick" data-pos="${pos}" style="border-color:${border};background:${bg}">
      <span class="box ${q.type}" style="border-color:${isSel ? "var(--accent)" : "var(--border2)"};background:${isSel ? "var(--accent)" : "transparent"}">${isSel ? '<span class="dot"></span>' : ""}</span>
      <span>${esc(q.options[origIdx])}</span>
    </button>`;
  }).join("");

  let fb = "";
  if (S.feedback) {
    const ok = S.feedback === "correct";
    fb = `<div class="fb fbpop" style="background:${ok ? "var(--okBg)" : "var(--badBg)"};border:1px solid ${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:18px">
      ${ok ? I.check("var(--ok)") : I.x("var(--bad)")}
      <div><div style="font-weight:bold;color:${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:4px">${ok ? "Hit!" : "You took " + b.pending + " damage"}</div>
      <div class="dim" style="font-size:14px;line-height:1.6">${esc(q.explanation || "")}</div></div>
    </div>`;
  }

  const btn = !S.feedback
    ? `<button class="primary" data-act="submitBattle" style="background:${S.selected.length ? "var(--accent)" : "var(--border)"};color:${S.selected.length ? "#fff" : "var(--muted)"}" ${S.selected.length ? "" : "disabled"}>Attack</button>`
    : `<button class="primary" data-act="battleNext" style="background:var(--accent)">Next →</button>`;

  return `<div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <button class="backbtn" data-act="backToSet">${I.chevL}</button>
      <span class="eyebrow" style="color:var(--accent)">Battle${filterLabel()}</span>
      <button class="star" data-act="star" data-id="${q.id}" style="color:${starred ? "var(--star)" : "var(--muted)"}">${I.star(starred, 20)}</button>
    </div>
    ${arena}
    ${bars}
    ${note}
    <div class="card" style="cursor:default;margin-bottom:16px">
      <div class="eyebrow" style="color:${cc};margin-bottom:10px">${q.type === "mc" ? "Multiple Choice" : "Select All That Apply"}${q._cat ? " · " + esc(q._cat.category) : ""}</div>
      <div style="font-size:18px;line-height:1.55">${esc(q.question)}</div>
    </div>
    <div style="display:grid;gap:10px;margin-bottom:18px">${opts}</div>
    ${fb}
    <div>${btn}</div>
  </div>`;
}

/* Canvases are wiped by every innerHTML render, so redraw after each one. */
function mountSprites() {
  document.querySelectorAll("canvas[data-sprite]").forEach(cv => {
    drawSprite(cv, cv.dataset.sprite, +(cv.dataset.scale || 6), cv.hasAttribute("data-flip"));
  });
  const b = S.battle;
  if (b && b.anim === "enemyAttack" && b.pending) {
    floatNum(document.getElementById("heroSlot"), "-" + b.pending, "var(--bad)");
  }
}
