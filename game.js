/* ===================================================================
   game.js — Battle Mode
   Reuses the same question pool, grading and progress rules as Shuffle.
   Every answer is an attack. Five enemies then a boss, floor after floor,
   until your HP runs out.

   Visual layer: 16x16 pixel sprites (auto-outlined), a procedurally drawn
   pixel backdrop that follows the active theme, one-shot action
   animations, and canvas particle bursts from core.js.
   =================================================================== */

/* ===================== PIXEL SPRITES =====================
   16x16 grids, authored facing right. Each character indexes a palette;
   "." is transparent. A 1px dark outline is added automatically.      */
const SPRITES = {
  hero: {
    pal: { r: "#e2574c", h: "#d6deeb", H: "#8b97ad", s: "#f2c49b", S: "#d39a73", e: "#1b1b24",
           c: "#e3b341", C: "#b7862c", b: "#3b6fd4", B: "#274a96", l: "#7a4a2c",
           w: "#f1f5ff", W: "#a9b6d0", g: "#e3b341", k: "#3a3542" },
    rows: [
      ".....rrr........",
      "....rhhhh....w..",
      "...hhhhhhh...wW.",
      "...hHhhhhhh..wW.",
      "...hHssssesh.wW.",
      "...hHsSsssss.wW.",
      "....HhhhhhH..wW.",
      "...cbbbbbbbB.wW.",
      "..ccbbbbbbbbggg.",
      "..cCbbBbbbbsss..",
      "..cCbbllllllb...",
      "..cCbbbbbbbB....",
      "...cBbbbBbbB....",
      "....kkk..kkk....",
      "....kkk..kkk....",
      "...kkkk..kkkk...",
    ],
  },
  slime: {
    pal: { a: "#5ee6a8", b: "#2fa87a", W: "#e9fff5", e: "#0b3d2c" },
    rows: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "......aaaa......",
      "....aaaaaaaa....",
      "...aaWWaaaaaa...",
      "..aaaWaaaaaaaa..",
      "..aaaaaaaaaaaa..",
      ".aaaaeaaaaeaaaa.",
      ".aaaaeaaaaeaaaa.",
      ".aaaaaaaeeaaaaa.",
      ".baaaaaaaaaaaab.",
      ".bbaaaaaaaaaabb.",
      "..bbbbbbbbbbbb..",
    ],
  },
  bat: {
    pal: { a: "#8b5cf6", e: "#fde047", f: "#ffffff", w: "#5b21b6", W: "#a78bfa" },
    rows: [
      "................",
      "................",
      ".....a....a.....",
      ".....aa..aa.....",
      "w....aaaaaa....w",
      "ww...aeaaea...ww",
      "www..aaffaa..www",
      "wwwwwaaaaaawwwww",
      ".wwwwwaaaawwwww.",
      "..wWwWaaaaWwWw..",
      "..W..W.aa.W..W..",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  ghost: {
    pal: { a: "#e2e8f0", b: "#94a3b8", c: "#1e1b3a", e: "#67e8f9" },
    rows: [
      "................",
      "......aaaa......",
      "....aaaaaaaa....",
      "...aaaaaaaaaa...",
      "..aaacccccccaa..",
      "..aaccecccecaa..",
      "..aaccccccccaa..",
      ".aaaacccccccaaa.",
      ".aaaaaaaaaaaaaa.",
      ".abaaaaaaaaaaba.",
      "..aaaaaaaaaaaa..",
      "..abaaaabaaaba..",
      "..aaaaaaaaaaaa..",
      "..aa.aaa.aaa.a..",
      "..a...a...a.....",
      "................",
    ],
  },
  knight: {
    pal: { A: "#8e97a8", a: "#586173", d: "#2d3443", v: "#0b0b12", r: "#f43f5e", p: "#be123c", P: "#881337",
           k: "#5b2177", K: "#33124a", s: "#f1f5f9", S: "#94a3b8", g: "#c9a227", G: "#8a6d12" },
    rows: [
      "......ppP.......",
      ".....AAAAa...s..",
      "....AAaaaad..sS.",
      "....Avvvvvd..sS.",
      "....Avrvrvd..sS.",
      "....aaaaaad..sS.",
      "...kAAaaadda.sS.",
      "..kAAaaaaaddggg.",
      "..kAaaaraaad.a..",
      "..kdAaaaaaddaa..",
      ".kkdgggGgggd....",
      ".kKdaaaaaaad....",
      ".kKdaad.daad....",
      "kkKdAad.dAad....",
      "kK.daad.daad....",
      "...dddd.dddd....",
    ],
  },
  dragon: {
    pal: { a: "#ef4444", b: "#991b1b", W: "#7f1d1d", w: "#b91c1c", h: "#fde68a", e: "#fde047",
           m: "#450a0a", f: "#ffffff", g: "#fbbf24", t: "#dc2626", c: "#fde68a" },
    rows: [
      "W..............W",
      "WW...h....h...WW",
      "WWw..aaaaaa..wWW",
      "WWww.aeaaea.wwWW",
      "WWwwwaaaaaawwwWW",
      ".WwwwamffmawwwW.",
      "..wwaaaaaaaaww..",
      "...waaggggaaw...",
      "....aaggggaa....",
      "...aaaggggaaa...",
      "..aaaaggggaaaa..",
      "..aaaaggggaaaat.",
      "..aaaaaggaaaaatt",
      "..bbb.....bbb.t.",
      "..bbb.....bbb...",
      ".cbcb.....bcbc..",
    ],
  },
};
const OUTLINE = "#0f0d16";
const IDLE = { hero: "breathe", slime: "squish", bat: "flap", ghost: "float", knight: "breathe", dragon: "heavy" };
const FLYING = { bat: true, ghost: true };

/* Pad by one cell and paint an outline around every filled pixel. */
const _gridCache = {};
function spriteGrid(name) {
  if (_gridCache[name]) return _gridCache[name];
  const sp = SPRITES[name];
  const n = sp.rows.length, m = sp.rows[0].length;
  const at = (y, x) => (y >= 0 && y < n && x >= 0 && x < m && sp.pal[sp.rows[y][x]]) ? sp.pal[sp.rows[y][x]] : null;
  const out = [];
  for (let y = -1; y <= n; y++) {
    const row = [];
    for (let x = -1; x <= m; x++) {
      const c = at(y, x);
      if (c) { row.push(c); continue; }
      const edge = at(y - 1, x) || at(y + 1, x) || at(y, x - 1) || at(y, x + 1);
      row.push(edge ? OUTLINE : null);
    }
    out.push(row);
  }
  return (_gridCache[name] = out);
}
function drawSprite(canvas, name, scale, flip) {
  if (!SPRITES[name] || !canvas) return;
  const grid = spriteGrid(name), n = grid.length, m = grid[0].length;
  canvas.width = m * scale;
  canvas.height = n * scale;
  canvas.style.width = (m * scale) + "px";
  canvas.style.height = (n * scale) + "px";
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < m; x++) {
      const col = grid[y][x];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect((flip ? m - 1 - x : x) * scale, y * scale, scale, scale);
    }
  }
}
/* Shatter a drawn sprite into its own pixels (client coords). */
function spriteBurst(canvas, name, scale, flip, delay) {
  if (!canvas || !canvas.isConnected) return;
  const r = canvas.getBoundingClientRect();
  const grid = spriteGrid(name), n = grid.length, m = grid[0].length;
  const cx = r.left + r.width / 2, cy = r.top + r.height * 0.55;
  const list = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < m; x++) {
    const col = grid[y][x];
    if (!col || (col === OUTLINE && Math.random() < 0.6)) continue;
    const px = r.left + ((flip ? m - 1 - x : x) + 0.5) * scale;
    const py = r.top + (y + 0.5) * scale;
    const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1;
    const sp = 90 + Math.random() * 190;
    list.push({ x: px, y: py, vx: (dx / d) * sp + (Math.random() - 0.5) * 60, vy: (dy / d) * sp - 120 - Math.random() * 120,
      life: 0.65 + Math.random() * 0.45, size: scale, color: col, g: 700, drag: 0.95, shape: "px", shrink: true, delay: delay || 0 });
  }
  fxAdd(list);
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
    over: false, dying: false,
    pending: null, note: null,
    fx: { type: "enter" },
    shown: { hp: maxHpFor(level), maxHp: maxHpFor(level), xp: b.xp },
  };
  S.screen = "battle";
  S.navIdx = 0;
  resetQ();
  freshOrder(S.battle.queue[0]);
  sfx.bStart();
  render();
  window.scrollTo(0, 0);
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
  if (b.dying) {                                // knocked out: now show the results screen
    b.dying = false;
    b.fx = null;
    sfx.tick();
    render();
    window.scrollTo(0, 0);
    return;
  }
  b.qIdx++;
  if (b.qIdx >= b.queue.length) { b.queue = weightedOrder(buildPool()); b.qIdx = 0; }
  resetQ();
  freshOrder(battleQuestion());
  b.fx = null;
  b.note = null;
  sfx.tick();
  render();
}

function submitBattle() {
  const b = S.battle;
  const q = battleQuestion();
  const ok = grade(q, S.selected);
  recordAnswer(q, ok);
  S.feedback = ok ? "correct" : "incorrect";
  if (!ok) S.showAnswer = true;

  if (ok) sfx.bSwing();
  if (ok) {
    b.enemy.hits--;
    b.fx = { type: "heroAttack", lost: b.enemy.hits };
    if (b.enemy.hits <= 0) {
      const dead = b.enemy;
      const wasBoss = dead.boss;
      const hpBefore = b.hp;
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
        b.note = { kind: "kill", text: dead.name + " defeated" };
      }
      if (leveled) b.note = { kind: "level", text: "Level " + b.level + "!  Max HP " + b.maxHp };
      saveProgress();
      b.enemy = makeEnemy(b.floor, b.idx);
      if (b.enemy.boss && !leveled) b.note = { kind: "boss", text: "Boss incoming" };
      b.fx = { type: "kill", dead, leveled, heal: b.hp - hpBefore, bossNext: b.enemy.boss };

      sfx.bKill();
      if (b.hp > hpBefore) sfx.bHeal();
      if (leveled) setTimeout(() => sfx.bLevel(), 420);
      if (b.enemy.boss) setTimeout(() => sfx.bBoss(), leveled ? 1000 : 640);
    } else {
      sfx.bHit();
    }
  } else {
    const dmg = damageFrom(b.floor, b.enemy.boss);
    b.hp = Math.max(0, b.hp - dmg);
    b.pending = dmg;
    b.fx = { type: "enemyAttack", dmg };
    sfx.bHurt();
    if (b.hp <= 0) {
      b.over = true;
      b.dying = true;
      b.fx.ko = true;
      progress.battle.bestFloor = Math.max(progress.battle.bestFloor || 0, b.floor - 1);
      saveProgress();
      setTimeout(() => sfx.bOver(), 650);
    }
  }
  render();
  checkCompletion();
}

/* ===================== ARENA BACKDROP =====================
   Drawn at a chunky pixel resolution from the active theme's colors,
   so every theme (including chameleon) gets a matching scene. Each
   floor reseeds the mountains and stars.                               */
const _rgbCache = {};
function toRgb(css) {
  if (_rgbCache[css]) return _rgbCache[css];
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillStyle = css; g.fillRect(0, 0, 1, 1);
  const d = g.getImageData(0, 0, 1, 1).data;
  return (_rgbCache[css] = [d[0], d[1], d[2]]);
}
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000"; }
function mix(a, b, t) { return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)); }
function rgb(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }
function seeded(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

function drawArenaBg(cv, floor, boss) {
  if (!cv || !cv.isConnected) return;
  const PX = 4;
  const W = Math.max(40, Math.ceil(cv.clientWidth / PX)), H = Math.max(20, Math.ceil(cv.clientHeight / PX));
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  const light = themeMode() === "light";
  const bg = toRgb(cssVar("--bg")), s1 = toRgb(cssVar("--surface")), s2 = toRgb(cssVar("--surface2"));
  const bd = toRgb(cssVar("--border")), bd2 = toRgb(cssVar("--border2")), acc = toRgb(cssVar("--accent"));
  const txt = toRgb(cssVar("--text"));
  const red = [190, 40, 40];
  const rnd = seeded(floor * 7 + (boss ? 3 : 0));

  // sky: banded gradient
  let top = light ? mix(s1, acc, 0.22) : mix(bg, acc, 0.2);
  let hor = light ? mix(s2, acc, 0.06) : mix(s1, acc, 0.12);
  if (boss) { top = mix(top, red, light ? 0.18 : 0.32); hor = mix(hor, red, light ? 0.22 : 0.4); }
  const groundY = H - Math.ceil(30 / PX);
  const bands = 7;
  for (let i = 0; i < bands; i++) {
    g.fillStyle = rgb(mix(top, hor, i / (bands - 1)));
    const y0 = Math.floor((groundY * i) / bands), y1 = Math.floor((groundY * (i + 1)) / bands);
    g.fillRect(0, y0, W, y1 - y0);
  }
  // stars (dark) or soft clouds (light)
  if (!light) {
    const starC = mix(txt, acc, 0.15);
    for (let i = 0; i < W * 0.35; i++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * groundY * 0.6);
      g.fillStyle = rgb(mix(top, starC, 0.35 + rnd() * 0.5));
      g.fillRect(x, y, 1, 1);
    }
  } else {
    g.fillStyle = rgb(mix(s1, [255, 255, 255], 0.6));
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(rnd() * W), y = 3 + Math.floor(rnd() * groundY * 0.35), w = 8 + Math.floor(rnd() * 10);
      g.fillRect(x, y, w, 2); g.fillRect(x + 2, y - 1, w - 5, 1);
    }
  }
  // moon / sun
  const mx = Math.floor(W * (0.55 + rnd() * 0.15)), my = Math.floor(groundY * 0.28), mr = 4;
  g.fillStyle = rgb(boss ? mix(red, [255, 200, 120], 0.35) : light ? mix([255, 236, 170], acc, 0.1) : mix(txt, acc, 0.12));
  for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++)
    if (x * x + y * y <= mr * mr + 1) g.fillRect(mx + x, my + y, 1, 1);
  if (!light && !boss) {                                    // crescent bite
    g.fillStyle = rgb(mix(top, hor, 0.25));
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++)
      if ((x - 2) * (x - 2) + (y + 1) * (y + 1) <= mr * mr - 3) g.fillRect(mx + x, my + y, 1, 1);
  }
  // two mountain layers, blocky random walk
  const ridge = (base, rough, col) => {
    g.fillStyle = rgb(col);
    let h = base + Math.floor(rnd() * rough);
    for (let x = 0; x < W; x += 2) {
      h += Math.floor(rnd() * 3) - 1;
      h = Math.max(base - rough, Math.min(base + rough, h));
      g.fillRect(x, groundY - h, 2, h);
    }
  };
  let far = light ? mix(bd, acc, 0.18) : mix(bd2, acc, 0.12);
  let near = light ? mix(bd2, acc, 0.1) : mix(bd, bg, 0.2);
  if (boss) { far = mix(far, red, 0.25); near = mix(near, red, 0.18); }
  ridge(Math.floor(groundY * 0.42), 5, far);
  ridge(Math.floor(groundY * 0.22), 3, near);
  // ground
  const gTop = light ? mix(bd2, acc, 0.1) : mix(bd2, s1, 0.3);
  const gFill = light ? mix(s2, bd, 0.5) : mix(s1, bg, 0.2);
  g.fillStyle = rgb(gFill); g.fillRect(0, groundY, W, H - groundY);
  g.fillStyle = rgb(gTop); g.fillRect(0, groundY, W, 1);
  g.fillStyle = rgb(mix(gFill, gTop, 0.45));
  for (let x = 0; x < W; x += 6) g.fillRect(x + ((Math.floor(x / 6) % 2) ? 3 : 0), groundY + 3, 2, 1);
  for (let i = 0; i < W / 5; i++) g.fillRect(Math.floor(rnd() * W), groundY + 2 + Math.floor(rnd() * (H - groundY - 2)), 1, 1);
}

/* ===================== VIEW ===================== */
function hpColor(frac) {
  return frac > 0.5 ? "var(--ok)" : frac > 0.25 ? "var(--star)" : "var(--bad)";
}
let _battleFx = null;                           // one-shot effect handed to mountSprites

function fighterHtml(key, opts) {
  const scale = opts.scale || 4;
  const fly = FLYING[key] ? " flying" : "";
  return `<div class="fighter ${opts.side}${fly}" ${opts.id ? `id="${opts.id}"` : ""}>
    ${opts.plate || ""}
    <div class="act ${opts.act || ""}">
      <div class="body ${opts.idle === false ? "" : "idle-" + IDLE[key]}">
        <canvas data-sprite="${key}" data-scale="${scale}" ${opts.flip ? 'data-flip="1"' : ""} ${opts.ghost ? 'data-ghost="1"' : ""}></canvas>
      </div>
    </div>
    <div class="shadow"></div>
    ${opts.extra || ""}
  </div>`;
}
const SLASH = `<svg class="slash" viewBox="0 0 64 64" width="70" height="70" aria-hidden="true">
  <path class="s1" d="M10 54 Q 26 22 56 8" /><path class="s2" d="M10 54 Q 26 22 56 8" /></svg>`;
const CLAW = `<svg class="claw" viewBox="0 0 64 64" width="60" height="60" aria-hidden="true">
  <path d="M14 10 L 34 54"/><path d="M26 8 L 46 52"/><path d="M38 10 L 56 46"/></svg>`;

function viewBattle() {
  const b = S.battle;
  if (!b) return `<div class="wrap"><div class="empty">No battle running.</div></div>`;

  if (b.over && !b.dying) {
    _battleFx = null;
    return `<div class="wrap">
      <div style="display:flex;align-items:center;gap:12px;margin:22px 0 22px">
        <button class="backbtn" data-act="backToSet">${I.chevL}</button>
        <div><div class="eyebrow" style="color:var(--bad)">Battle</div>
        <div style="font-size:22px;font-weight:bold">Defeated</div></div>
      </div>
      <div class="card overcard fbpop" style="margin-bottom:16px">
        <div class="fallen"><canvas data-sprite="hero" data-scale="5"></canvas></div>
        <div style="font-size:24px;font-weight:bold;margin-top:6px">You fell on floor ${b.floor}</div>
        <div class="dim" style="font-size:14.5px;margin-top:6px">${b.enemy.boss ? "The dragon held the stairs." : "Taken down by a " + esc(b.enemy.name) + "."}</div>
        <div class="tiles">
          <div class="tile"><div class="n">${b.floor}</div><div class="l">Floor</div></div>
          <div class="tile"><div class="n" style="color:var(--accent)">${b.level}</div><div class="l">Level</div></div>
          <div class="tile"><div class="n" style="color:var(--star)">${progress.battle.bestFloor || 0}</div><div class="l">Best cleared</div></div>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="ghost" data-act="backToSet">Exit</button>
        <button class="primary" data-act="battleRestart" style="background:var(--accent);flex:1">Fight again ↻</button>
      </div>
    </div>`;
  }

  const q = battleQuestion();
  if (!q) return `<div class="wrap"><div class="empty">Nothing in this pool to fight with.</div></div>`;

  // consume the one-shot effect so star taps / theme changes don't replay it
  const fx = b.fx; b.fx = null; _battleFx = fx;
  const t = fx ? fx.type : null;

  const starred = !!progress.starred[q.id];
  const cc = q._cat ? ck(q._cat.color) : "var(--accent)";

  /* ---- fighters ---- */
  let heroAct = "";
  if (t === "enter") heroAct = "a-enterL";
  else if (t === "heroAttack" || t === "kill") heroAct = "a-lunge";
  else if (t === "enemyAttack") heroAct = fx.ko ? "a-dieHero" : "a-hurtHero";
  else if (b.dying) heroAct = "a-dead";
  const heroExtra =
    (t === "enemyAttack" ? CLAW + `<div class="dmg" style="color:#ff6b6b">-${fx.dmg}</div>` : "") +
    (t === "kill" && fx.heal > 0 ? `<div class="dmg heal" style="color:#4ade80">+${fx.heal}</div>` : "");
  const hero = fighterHtml("hero", { side: "hero", id: "heroSlot", act: heroAct, idle: !b.dying, extra: heroExtra });

  let enemyAct = "";
  if (t === "enter") enemyAct = "a-enter";
  else if (t === "heroAttack") enemyAct = "a-hurt";
  else if (t === "enemyAttack") enemyAct = "a-lungeL";
  else if (t === "kill") enemyAct = (fx.bossNext ? "a-bossdrop" : "a-enter") + " a-delay";
  const plate = `<div class="nameplate ${b.enemy.boss ? "boss" : ""}">${esc(b.enemy.name)}</div>`;
  const enemy = fighterHtml(b.enemy.key, {
    side: "enemy", id: "enemySlot", flip: true, scale: b.enemy.boss ? 5 : 4, act: enemyAct, plate,
    extra: t === "heroAttack" ? SLASH : "",
  });
  const corpse = t === "kill"
    ? fighterHtml(fx.dead.key, { side: "enemy", flip: true, scale: fx.dead.boss ? 5 : 4, ghost: true, idle: false,
        act: "", extra: SLASH })
    : "";

  /* ---- floor progress dots ---- */
  let dots = "";
  for (let i = 0; i <= PER_FLOOR; i++) {
    const cls = (i === PER_FLOOR ? "boss " : "") + (i < b.idx ? "done" : i === b.idx ? "now" : "");
    dots += `<i class="${cls}"></i>`;
  }
  const banner = fx && b.note && (t === "kill") ? `<div class="banner ${b.note.kind}">${esc(b.note.text)}</div>`
    : fx && fx.ko ? `<div class="banner boss" style="animation-delay:.7s">Knocked out</div>` : "";

  const arena = `<div class="arena" id="arena">
    <canvas class="arena-bg" id="arenaBg" data-floor="${b.floor}" data-boss="${b.enemy.boss ? 1 : 0}"></canvas>
    <div class="arena-hud">
      <span class="ptag">Floor ${b.floor} <span class="floordots">${dots}</span></span>
      <span class="ptag" style="color:#fde047">Lv ${b.level}</span>
    </div>
    <div class="stage">${hero}${corpse}${enemy}</div>
    <div class="flashlayer ${t === "heroAttack" || t === "kill" ? "go" : ""}" style="background:${t === "enemyAttack" ? "#ef4444" : "#fff"}"></div>
    ${banner}
  </div>`;

  /* ---- HUD: hero HP (with damage trail) + XP, enemy hit pips ---- */
  const sh = b.shown || { hp: b.hp, maxHp: b.maxHp, xp: b.xp };
  const prevFrac = Math.min(1, sh.hp / b.maxHp), hpFrac = b.hp / b.maxHp;
  const healing = hpFrac > prevFrac;
  const fillFrom = fx && healing ? prevFrac : hpFrac;
  const trailFrom = fx && !healing ? prevFrac : hpFrac;
  const xpFrom = fx ? (levelFor(sh.xp) < b.level ? 0 : xpIntoLevel(sh.xp)) : xpIntoLevel(b.xp);
  b.shown = { hp: b.hp, maxHp: b.maxHp, xp: b.xp };

  let pips = "";
  for (let i = 0; i < b.enemy.maxHits; i++) {
    const gone = i >= b.enemy.hits;
    const popping = t === "heroAttack" && i === fx.lost;
    pips += `<span class="pip ${gone ? "gone" : ""} ${popping ? "popping" : ""}"></span>`;
  }

  const hud = `<div class="hud">
    <div class="hudcol">
      <div class="hudlabel"><span>HP</span><b style="color:${hpColor(hpFrac)}">${b.hp} / ${b.maxHp}</b></div>
      <div class="hpbar">
        <div class="trail" data-from="${trailFrom * 100}" data-to="${hpFrac * 100}" style="width:${trailFrom * 100}%"></div>
        <div class="fillb" data-from="${fillFrom * 100}" data-to="${hpFrac * 100}" style="width:${fillFrom * 100}%;background:${hpColor(hpFrac)}"></div>
      </div>
      <div class="xpbar" title="XP ${xpIntoLevel(b.xp)} / 100"><div data-from="${xpFrom}" data-to="${xpIntoLevel(b.xp)}" style="width:${xpFrom}%"></div></div>
    </div>
    <div class="hudcol">
      <div class="hudlabel"><span>${b.enemy.boss ? "Boss" : "Enemy"}</span><b style="color:var(--bad)">${b.enemy.hits} / ${b.enemy.maxHits}</b></div>
      <div class="pips">${pips}</div>
    </div>
  </div>`;

  /* ---- question ---- */
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
    const head = ok ? (b.enemy.hits === b.enemy.maxHits && b.note ? "Finishing blow!" : "Hit!")
      : b.dying ? "Knocked out, took " + b.pending + " damage" : "You took " + b.pending + " damage";
    fb = `<div class="fb ${fx ? "fbpop" : ""}" style="background:${ok ? "var(--okBg)" : "var(--badBg)"};border:1px solid ${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:18px">
      ${ok ? I.check("var(--ok)") : I.x("var(--bad)")}
      <div><div style="font-weight:bold;color:${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:4px">${head}</div>
      <div class="dim" style="font-size:14px;line-height:1.6">${esc(q.explanation || "")}</div></div>
    </div>`;
  }

  const btn = !S.feedback
    ? `<button class="primary" data-act="submitBattle" style="background:${S.selected.length ? "var(--accent)" : "var(--border)"};color:${S.selected.length ? "#fff" : "var(--muted)"}" ${S.selected.length ? "" : "disabled"}>${I.sword} Attack</button>`
    : b.dying
      ? `<button class="primary" data-act="battleNext" style="background:var(--bad)">See results →</button>`
      : `<button class="primary" data-act="battleNext" style="background:var(--accent)">Next →</button>`;

  return `<div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin:22px 0 14px">
      <button class="backbtn" data-act="backToSet">${I.chevL}</button>
      <span class="eyebrow" style="color:var(--accent)">Battle${filterLabel()}</span>
      <button class="star" data-act="star" data-id="${q.id}" style="color:${starred ? "var(--star)" : "var(--muted)"}">${I.star(starred, 20)}</button>
    </div>
    ${arena}
    ${hud}
    <div class="card" style="cursor:default;margin-bottom:16px">
      <div class="eyebrow" style="color:${cc};margin-bottom:10px">${q.type === "mc" ? "Multiple Choice" : "Select All That Apply"}${q._cat ? " · " + esc(q._cat.category) : ""}</div>
      <div style="font-size:18px;line-height:1.55">${esc(q.question)}</div>
    </div>
    <div style="display:grid;gap:10px;margin-bottom:18px">${opts}</div>
    ${fb}
    <div>${btn}</div>
  </div>`;
}

/* Canvases are wiped by every innerHTML render, so redraw after each one,
   then fire whatever one-shot effect the last action queued.            */
function mountSprites() {
  document.querySelectorAll("canvas[data-sprite]").forEach(cv => {
    drawSprite(cv, cv.dataset.sprite, +(cv.dataset.scale || 4), cv.hasAttribute("data-flip"));
  });
  const bgc = document.getElementById("arenaBg");
  if (bgc) drawArenaBg(bgc, +bgc.dataset.floor, bgc.dataset.boss === "1");

  // animate bars from their previous values
  const bars = document.querySelectorAll("#app [data-from]");
  if (bars.length) {
    requestAnimationFrame(() => requestAnimationFrame(() =>
      bars.forEach(el => { el.style.width = el.dataset.to + "%"; })));
  }

  const fx = _battleFx; _battleFx = null;
  if (!fx || S.screen !== "battle") return;
  const arena = document.getElementById("arena");
  const shake = (cls, ms) => setTimeout(() => {
    if (!arena.isConnected) return;
    arena.classList.remove("shake", "shake-lg"); void arena.offsetWidth; arena.classList.add(cls);
  }, ms);
  const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  if (fx.type === "heroAttack" || fx.type === "kill") {
    const target = fx.type === "kill"
      ? document.querySelector('#arena canvas[data-ghost]')
      : document.querySelector("#enemySlot canvas");
    if (target) {
      const [x, y] = centerOf(target);
      fxPixels(x, y, ["#ffffff", "#fde68a", "#fbbf24"], 14, { speed: 300, life: 0.45, size: 3, g: 200, delay: 0.17, shape: "spark" });
    }
    shake("shake", 170);
    if (fx.type === "kill") {
      const ghost = document.querySelector("#arena canvas[data-ghost]");
      if (ghost) {
        spriteBurst(ghost, fx.dead.key, +(ghost.dataset.scale || 4), true, 0.3);
        setTimeout(() => { if (ghost.isConnected) ghost.style.visibility = "hidden"; }, 320);
      }
      if (fx.leveled) {
        const hero = document.querySelector("#heroSlot .body");
        if (hero) {
          hero.parentElement.classList.add("a-hop");
          const r = hero.getBoundingClientRect();
          const list = [];
          for (let i = 0; i < 26; i++) list.push({ x: r.left + Math.random() * r.width, y: r.bottom - Math.random() * 10,
            vx: (Math.random() - 0.5) * 30, vy: -80 - Math.random() * 140, life: 0.9 + Math.random() * 0.5, size: 3 + (i % 2),
            color: i % 3 ? "#fde047" : "#ffffff", g: -40, drag: 0.98, shape: "px", shrink: true, delay: 0.45 + Math.random() * 0.4 });
          fxAdd(list);
        }
      }
      if (fx.bossNext) shake("shake-lg", fx.leveled ? 1300 : 1230);
    }
  } else if (fx.type === "enemyAttack") {
    const hero = document.querySelector("#heroSlot canvas");
    if (hero) {
      const [x, y] = centerOf(hero);
      fxPixels(x, y, ["#ef4444", "#fca5a5", "#ffffff"], 16, { speed: 260, life: 0.5, size: 4, g: 500, delay: 0.2, angle: Math.PI, spread: Math.PI * 1.1 });
    }
    shake("shake-lg", 200);
    setTimeout(() => flashGlow("var(--bad)", 520), 200);
  }
}
