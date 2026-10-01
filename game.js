/* ===================================================================
   game.js — Battle Mode: saved adventures
   Every answer is an attack. Pick a class, fight through five themed
   floors (four foes then a boss each), beat the final dragon, then keep
   going in Endless. Three save slots per deck, saved after every answer
   under their own key ("fc:adv:<deck>") so deck progress is untouched.

   Grading, misses and stars all go through the same recordAnswer() as
   Quiz and Shuffle. Bosses lean on questions you have missed before.
   Sprite art lives in sprites.js.
   =================================================================== */

const OUTLINE = "#0f0d16";
const IDLE = {
  hero_knight: "breathe", hero_wizard: "breathe", hero_ranger: "breathe",
  slime: "squish", slime_ice: "squish", slime_magma: "squish", slimeking: "squish",
  bat: "flap", bat_blood: "flap", ghost: "float", ghost_violet: "float", lich: "float",
  knight: "breathe", commander: "heavy", golem: "heavy", dragon: "heavy",
};
const FLYING = { bat: 1, bat_blood: 1, ghost: 1, ghost_violet: 1 };
const SCALE = { slimeking: 5, golem: 5, lich: 5, commander: 5, dragon: 4 };
const HERO_SCALE = 3;
BACK_ACTS.push("toAdvMenu");

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


/* ===================== CLASSES =====================
   gain = charge earned per normal correct answer. Specials don't earn
   charge. A special armed on a wrong answer fizzles and the charge is lost. */
const CLASSES = {
  knight: {
    name: "Knight", sprite: "hero_knight", color: "#60a5fa", hp: 20, maxCharge: 6, gain: 1,
    blurb: "Tough and steady. Built to survive bad streaks.",
    passive: { name: "Iron Guard", text: "Takes 30% less damage and has +20 max HP." },
    specials: [
      { id: "bash", name: "Shield Bash", cost: 3, hits: 2, text: "2 hits, then blocks the next attack completely." },
      { id: "holy", name: "Holy Strike", cost: 6, hits: 4, text: "4 hits and heals 35% of your HP." },
    ],
  },
  wizard: {
    name: "Wizard", sprite: "hero_wizard", color: "#a78bfa", hp: -10, maxCharge: 8, gain: 2,
    blurb: "Fragile, but hits the hardest when you're on a roll.",
    passive: { name: "Arcane Flow", text: "Correct answers charge specials twice as fast. 10 less max HP." },
    specials: [
      { id: "fire", name: "Fireball", cost: 4, hits: 3, text: "3 hits." },
      { id: "meteor", name: "Meteor", cost: 8, hits: 7, text: "7 hits. Flattens almost anything." },
    ],
  },
  ranger: {
    name: "Ranger", sprite: "hero_ranger", color: "#4ade80", hp: 0, maxCharge: 6, gain: 1,
    blurb: "Lucky crits, and overkill damage carries forward.",
    passive: { name: "Keen Eye", text: "Any correct answer has a 30% chance to crit for 2 hits." },
    specials: [
      { id: "pierce", name: "Piercing Shot", cost: 3, hits: 3, text: "3 hits. Extra damage carries into the next foe." },
      { id: "rain", name: "Arrow Rain", cost: 6, hits: 5, text: "5 hits. Extra damage carries over." },
    ],
  },
};
/* when the special's hit lands, in seconds (drives CSS, particles, sound) */
const IMPACT = { none: 0.17, bash: 0.17, holy: 0.32, fire: 0.42, meteor: 0.55, pierce: 0.28, rain: 0.5 };

/* ===================== FLOORS ===================== */
const FOE_NAMES = {
  slime: "Slime", slime_ice: "Frost Slime", slime_magma: "Magma Slime", bat: "Bat", bat_blood: "Blood Bat",
  ghost: "Wraith", ghost_violet: "Phantom", knight: "Dark Knight",
};
const FLOORS = [
  { name: "Greenwood",     tint: [70, 150, 90],  foes: ["slime", "bat", "slime", "bat"],
    boss: { key: "slimeking", name: "Slime King", hits: 6 } },
  { name: "Stone Peaks",   tint: [100, 125, 170], foes: ["bat", "slime_ice", "ghost", "slime_ice"],
    boss: { key: "golem", name: "Stone Golem", hits: 8 } },
  { name: "Haunted Crypt", tint: [125, 80, 180],  foes: ["ghost", "bat_blood", "ghost_violet", "knight"],
    boss: { key: "lich", name: "The Lich", hits: 10 } },
  { name: "Dark Keep",     tint: [135, 60, 75],   foes: ["knight", "ghost_violet", "bat_blood", "knight"],
    boss: { key: "commander", name: "Dread Commander", hits: 12 } },
  { name: "Dragon's Lair", tint: [215, 80, 30],   foes: ["slime_magma", "knight", "slime_magma"],
    boss: { key: "dragon", name: "Ashmaw the Dragon", hits: 16, final: true } },
];
const STORY = FLOORS.length;
const BOSS_ROTA = ["slimeking", "golem", "lich", "commander", "dragon"];
const ALL_FOES = Object.keys(FOE_NAMES);

function floorInfo(floor) {
  if (floor <= STORY) return FLOORS[floor - 1];
  const n = floor - STORY, theme = FLOORS[(n - 1) % STORY], rnd = seeded(floor * 13 + 5);
  const foes = [0, 1, 2, 3].map(() => ALL_FOES[Math.floor(rnd() * ALL_FOES.length)]);
  const key = BOSS_ROTA[(n - 1) % BOSS_ROTA.length];
  const def = FLOORS.find(f => f.boss.key === key).boss;
  return { name: "Endless " + n, sub: theme.name, tint: theme.tint, foes, endless: true,
           boss: { key, name: def.name, hits: Math.min(30, 12 + 2 * n) } };
}
function floorTitle(floor) {
  const f = floorInfo(floor);
  return f.endless ? f.name + " · " + f.sub : "Floor " + floor + " · " + f.name;
}
function foeHits(floor) { return Math.min(6, 2 + Math.floor((floor - 1) / 2)); }
function damageFrom(floor, boss) { return boss ? Math.min(40, 16 + 3 * floor) : Math.min(30, 10 + 2 * floor); }
function levelFor(xp) { return 1 + Math.floor(xp / 100); }
function xpIntoLevel(xp) { return xp % 100; }
function maxHpOf(cls, level) { return 100 + (level - 1) * 10 + CLASSES[cls].hp; }

function makeEnemy(floor, idx) {
  const f = floorInfo(floor);
  if (idx >= f.foes.length) {
    return { key: f.boss.key, name: f.boss.name, boss: true, final: !!f.boss.final,
             hits: f.boss.hits, maxHits: f.boss.hits };
  }
  const key = f.foes[idx], h = foeHits(floor);
  return { key, name: FOE_NAMES[key], boss: false, hits: h, maxHits: h };
}

/* ===================== SAVE SLOTS ===================== */
function loadAdv(setId) {
  try {
    const raw = localStorage.getItem("fc:adv:" + setId);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.slots)) { while (d.slots.length < 3) d.slots.push(null); return d; }
    }
  } catch (e) {}
  return { v: 1, slots: [null, null, null] };
}
function saveAdv() {
  if (!S.set || !S.adv) return;
  try { localStorage.setItem("fc:adv:" + S.set.id, JSON.stringify(S.adv)); } catch (e) {}
}
function newSlot(cls) {
  return { cls, level: 1, xp: 0, hp: maxHpOf(cls, 1), floor: 1, idx: 0, enemyHits: null,
           charge: 0, guard: false, cleared: false, deaths: 0, kills: 0, best: 0,
           created: Date.now(), updated: Date.now() };
}
/* write the live run into its slot */
function persist() {
  const b = S.battle; if (!b) return;
  b.s.enemyHits = b.enemy.hits;
  b.s.updated = Date.now();
  progress.battle.bestFloor = Math.max(progress.battle.bestFloor || 0, b.s.best);
  saveAdv();
  saveProgress();
}
/* Most recently played slot, for the deck screen's Battle button. */
function advSummary(setId) {
  const live = loadAdv(setId).slots.filter(Boolean).sort((a, b) => b.updated - a.updated)[0];
  if (!live) return "3 save slots · pick a class";
  const f = floorInfo(live.floor);
  return CLASSES[live.cls].name + " Lv " + live.level + " · " + (f.endless ? f.name : "Floor " + live.floor);
}

/* ===================== MENUS ===================== */
function openAdvMenu() {
  if (!buildPool().length) return;
  S.adv = loadAdv(S.set.id);
  S.battle = null;
  resetQ();
  sfx.tick();
  goto("advMenu");
}
function advNew(i) { S.advPick = i; sfx.select(); goto("advClass"); }
function advPickClass(cls) {
  S.adv.slots[S.advPick] = newSlot(cls);
  saveAdv();
  openSlot(S.advPick);
}
function advAskDelete(i) {
  const s = S.adv.slots[i]; if (!s) return;
  showModal(`<h2>Delete slot ${i + 1}?</h2>
    <p>Your level ${s.level} ${esc(CLASSES[s.cls].name)} on ${esc(floorTitle(s.floor))} will be gone for good. Your deck progress stays.</p>
    <div class="btns">
      <button class="ghost" data-act="closeModal">Cancel</button>
      <button class="primary" data-act="advDelYes" data-i="${i}" style="background:var(--bad);flex:1">Delete</button>
    </div>`);
}
function advDelete(i) {
  S.adv.slots[i] = null;
  saveAdv();
  closeModal();
  sfx.select();
  render();
}

/* ===================== RUN LIFECYCLE ===================== */
function openSlot(i) {
  const s = S.adv.slots[i];
  if (!s) return;
  const enemy = makeEnemy(s.floor, s.idx);
  if (s.enemyHits != null) enemy.hits = Math.max(1, Math.min(enemy.maxHits, s.enemyHits));
  s.hp = Math.min(s.hp, maxHpOf(s.cls, s.level));
  if (s.hp <= 0) s.hp = maxHpOf(s.cls, s.level);
  S.battle = {
    slot: i, s, enemy, armed: null,
    queue: null, qIdx: 0, bq: null, bqi: 0, cur: null, curMiss: false,
    fx: { type: "enter" }, note: null,
    shown: { hp: s.hp, xp: s.xp },
    over: false, dying: false, victory: false, showVictory: false,
  };
  pickQuestion();
  resetQ();
  freshOrder(S.battle.cur);
  S.screen = "battle";
  S.navIdx = 0;
  sfx.bStart();
  render();
  window.scrollTo(0, 0);
}

/* Bosses pull from questions you've missed about two times in three. */
function missedPool() {
  const has = q => (progress.missCount[q.id] || 0) > 0;
  const m = buildPool().filter(has);
  return m.length ? m : allQuestions(S.set).filter(has);
}
function pickQuestion() {
  const b = S.battle, last = b.cur ? b.cur.id : null;
  if (b.enemy.boss) {
    const miss = missedPool();
    if (miss.length && Math.random() < 0.67) {
      if (!b.bq || b.bqi >= b.bq.length) { b.bq = weightedOrder(miss); b.bqi = 0; }
      const q = b.bq[b.bqi++];
      if (q.id !== last || miss.length === 1 && buildPool().length === 1) { b.cur = q; b.curMiss = true; return; }
    }
  }
  if (!b.queue || b.qIdx >= b.queue.length) { b.queue = weightedOrder(buildPool()); b.qIdx = 0; }
  let q = b.queue[b.qIdx++];
  if (q.id === last && b.queue.length > 1) {
    if (b.qIdx >= b.queue.length) { b.queue = weightedOrder(buildPool()); b.qIdx = 0; }
    q = b.queue[b.qIdx++];
  }
  b.cur = q; b.curMiss = false;
}
function battleQuestion() { return S.battle ? S.battle.cur : null; }

function battleNextQuestion() {
  const b = S.battle;
  if (b.dying) { b.dying = false; b.fx = null; sfx.tick(); render(); window.scrollTo(0, 0); return; }
  if (b.victory) { b.victory = false; b.showVictory = true; b.fx = null; render(); window.scrollTo(0, 0); sfx.bVictory(); confettiBurst(true); return; }
  pickQuestion();
  resetQ();
  freshOrder(b.cur);
  b.fx = null; b.note = null;
  sfx.tick();
  render();
}
function advContinueEndless() {
  const b = S.battle;
  b.showVictory = false;
  pickQuestion(); resetQ(); freshOrder(b.cur);
  b.fx = { type: "enter" };
  sfx.bStart();
  render(); window.scrollTo(0, 0);
}
function armSpecial(id) {
  const b = S.battle; if (!b || S.feedback) return;
  const sp = CLASSES[b.s.cls].specials.find(x => x.id === id);
  if (!sp || b.s.charge < sp.cost) return;
  b.armed = b.armed === id ? null : id;
  if (b.armed) sfx.bArm(); else sfx.tick();
  render();
}

function submitBattle() {
  const b = S.battle, s = b.s, C = CLASSES[s.cls], q = b.cur;
  const ok = grade(q, S.selected);
  recordAnswer(q, ok);
  S.feedback = ok ? "correct" : "incorrect";
  if (!ok) S.showAnswer = true;

  const sp = b.armed ? C.specials.find(x => x.id === b.armed) : null;
  b.armed = null;
  if (sp) s.charge = Math.max(0, s.charge - sp.cost);
  const mx = () => maxHpOf(s.cls, s.level);

  if (ok) {
    let dmg = 1, crit = false;
    if (sp) dmg = sp.hits;
    else {
      if (s.cls === "ranger" && Math.random() < 0.3) { dmg = 2; crit = true; }
      s.charge = Math.min(C.maxCharge, s.charge + C.gain);
    }
    const before = b.enemy.hits;
    b.enemy.hits = Math.max(0, before - dmg);
    const overkill = Math.max(0, dmg - before);
    let healed = 0;
    if (sp && sp.id === "bash") s.guard = true;
    if (sp && sp.id === "holy") { const h0 = s.hp; s.hp = Math.min(mx(), s.hp + Math.round(mx() * 0.35)); healed = s.hp - h0; }
    const special = sp ? sp.id : null;
    b.fx = { type: "heroAttack", special, crit, dmg, healed, popFrom: b.enemy.hits, popTo: before };
    b.lastHit = { special, crit, dmg, name: sp ? sp.name : null };

    if (b.enemy.hits <= 0) {
      const dead = b.enemy, hpBefore = s.hp - healed;
      s.kills++;
      s.xp += dead.boss ? 40 + 5 * Math.min(s.floor, 10) : 10;
      const newLevel = levelFor(s.xp), leveled = newLevel > s.level;
      s.level = newLevel;
      s.hp = Math.min(mx(), s.hp + (dead.boss ? Math.round(mx() * 0.4) : 5));
      if (leveled) s.hp = mx();
      const carry = sp && (sp.id === "pierce" || sp.id === "rain") ? overkill : 0;
      s.idx++;
      let newFloor = false;
      if (dead.boss) {
        if (dead.final && !s.cleared) { s.cleared = true; b.victory = true; }
        s.floor++; s.idx = 0; newFloor = true;
        s.best = Math.max(s.best, s.floor - 1);
      }
      b.enemy = makeEnemy(s.floor, s.idx);
      if (carry) b.enemy.hits = Math.max(1, b.enemy.maxHits - carry);

      if (leveled) b.note = { kind: "lvl", text: "Level " + s.level + "!  Max HP " + mx() };
      else if (b.victory) b.note = { kind: "lvl", text: dead.name + " falls!" };
      else if (newFloor) b.note = { kind: "floor", text: floorTitle(s.floor) };
      else if (b.enemy.boss) b.note = { kind: "boss", text: "Boss: " + b.enemy.name };
      else b.note = { kind: "kill", text: dead.name + " defeated" };

      b.fx = { type: "kill", special, crit, dmg, dead, leveled, heal: s.hp - hpBefore,
               bossNext: b.enemy.boss && !newFloor, newFloor, carry, popFrom: 0, popTo: 0 };
      sfx.bKill(IMPACT[special || "none"] - 0.17, !special);
      if (special) sfx["bSp_" + special]();
      else { sfx.bSwing(); if (crit) sfx.bCrit(); }
      if (s.hp > hpBefore) sfx.bHeal();
      if (leveled) setTimeout(() => sfx.bLevel(), 420);
      if (b.enemy.boss && !newFloor) setTimeout(() => sfx.bBoss(), leveled ? 1000 : 640);
    } else {
      if (special) sfx["bSp_" + special]();
      else { sfx.bSwing(); sfx.bHit(); if (crit) sfx.bCrit(); }
    }
  } else {
    let dmg = damageFrom(s.floor, b.enemy.boss);
    if (s.cls === "knight") dmg = Math.round(dmg * 0.7);
    let blocked = false;
    if (s.guard) { blocked = true; dmg = 0; s.guard = false; }
    s.hp = Math.max(0, s.hp - dmg);
    b.fx = { type: "enemyAttack", dmg, blocked, fizzle: sp ? sp.name : null };
    b.lastHit = { dmg, blocked, fizzle: sp ? sp.name : null };
    if (sp) sfx.bFizzle();
    if (blocked) sfx.bBlock(); else sfx.bHurt();
    if (s.hp <= 0) {
      b.over = true; b.dying = true; b.fx.ko = true;
      b.koFloor = s.floor; b.koEnemy = b.enemy.name; b.koBoss = b.enemy.boss;
      // respawn at the floor entrance; the run screen still shows the KO
      s.deaths++;
      s.hp = mx(); s.idx = 0; s.enemyHits = null; s.charge = 0; s.guard = false;
      s.updated = Date.now();
      saveAdv();
      setTimeout(() => sfx.bOver(), 650);
    }
  }
  if (!b.over) persist();
  render();
  checkCompletion();
}

/* ===================== BATTLE SOUNDS (chip kit from core.js) ===================== */
Object.assign(sfx, {
  bKill(off, withHit) {
    off = off || 0;
    if (withHit !== false) sfx.bHit();
    [79, 76, 72, 67, 64].forEach((n, i) => chip(NOTE(n), off + 0.3 + i * 0.035, 0.05, { vol: 0.08 }));
    crunch(off + 0.3, 0.42, { f1: 5000, f2: 180, vol: 0.13, step: 8 });
    chip(110, off + 0.3, 0.3, { wave: "tri", to: 40, vol: 0.18 });
    chip(NOTE(83), off + 0.72, 0.07, { vol: 0.08, duty: 0.5 });
    chip(NOTE(88), off + 0.79, 0.22, { vol: 0.08, duty: 0.5, hold: 0.3 });
  },
  bArm() { chip(NOTE(72), 0, 0.05, { vol: 0.07 }); chip(NOTE(79), 0.05, 0.05, { vol: 0.07 }); chip(NOTE(84), 0.1, 0.12, { vol: 0.07, vib: 9 }); },
  bCrit() { chip(NOTE(96), 0.17, 0.05, { vol: 0.07, duty: 0.125 }); chip(NOTE(100), 0.22, 0.12, { vol: 0.06, duty: 0.125 }); },
  bBlock() {
    chip(NOTE(91), 0.19, 0.04, { vol: 0.09, duty: 0.125 }); chip(NOTE(86), 0.19, 0.25, { wave: "square", vol: 0.05, lp: 4000, vib: 18 });
    crunch(0.19, 0.06, { f1: 8000, f2: 3000, vol: 0.08, step: 2 });
  },
  bFizzle() { [76, 72, 67, 60].forEach((n, i) => chip(NOTE(n), 0.02 + i * 0.05, 0.06, { vol: 0.05, duty: 0.125 })); },
  bSp_bash() {
    sfx.bSwing();
    crunch(0.17, 0.12, { f1: 6000, f2: 900, vol: 0.15, step: 3 });
    chip(160, 0.17, 0.16, { wave: "square", to: 50, vol: 0.12, lp: 1800 });
    chip(NOTE(88), 0.17, 0.3, { vol: 0.06, vib: 20, duty: 0.125 });
  },
  bSp_holy() {
    [72, 76, 79, 84].forEach((n, i) => chip(NOTE(n), i * 0.04, 0.4, { vol: 0.045, duty: 0.5, hold: 0.7, vib: 6 }));
    crunch(0.32, 0.18, { f1: 9000, f2: 1500, vol: 0.12, step: 2 });
    chip(NOTE(96), 0.32, 0.5, { vol: 0.06, vib: 7, hold: 0.6 });
    chip(90, 0.32, 0.25, { wave: "tri", to: 40, vol: 0.18 });
  },
  bSp_fire() {
    crunch(0, 0.42, { f1: 600, f2: 3000, vol: 0.07, step: 3 });
    chip(300, 0, 0.42, { to: 900, vol: 0.04, duty: 0.25 });
    crunch(0.42, 0.35, { f1: 4000, f2: 150, vol: 0.18, step: 7 });
    chip(120, 0.42, 0.3, { wave: "tri", to: 38, vol: 0.22 });
  },
  bSp_meteor() {
    chip(1600, 0, 0.55, { to: 220, vol: 0.06, wave: "square", lp: 3000 });
    crunch(0, 0.55, { f1: 800, f2: 4000, vol: 0.05, step: 4 });
    crunch(0.55, 0.7, { f1: 3000, f2: 80, vol: 0.22, step: 12 });
    chip(80, 0.55, 0.6, { wave: "tri", to: 30, vol: 0.28 });
    chip(55, 0.6, 0.5, { wave: "square", to: 30, vol: 0.08, lp: 400 });
  },
  bSp_pierce() {
    chip(NOTE(64), 0, 0.06, { vol: 0.08, duty: 0.5, to: NOTE(52) });          // bow twang
    crunch(0.02, 0.24, { f1: 7000, f2: 2000, vol: 0.05, step: 1 });           // whizz
    crunch(0.28, 0.07, { f1: 3000, f2: 600, vol: 0.14, step: 5 });            // thunk
    chip(200, 0.28, 0.1, { wave: "square", to: 70, vol: 0.09, lp: 1500 });
  },
  bSp_rain() {
    [0, 0.06, 0.12].forEach(t => chip(NOTE(64), t, 0.06, { vol: 0.06, duty: 0.5, to: NOTE(52) }));
    for (let i = 0; i < 7; i++) crunch(0.5 + i * 0.04, 0.05, { f1: 3500, f2: 700, vol: 0.09, step: 4 });
    chip(150, 0.5, 0.25, { wave: "tri", to: 45, vol: 0.18 });
  },
  bVictory() {
    const mel = [[72, .12], [72, .12], [72, .12], [76, .36], [74, .12], [77, .12], [76, .12], [79, .6]];
    let t = 0;
    mel.forEach(([n, d]) => { chip(NOTE(n), t, d, { vol: 0.08, hold: 0.7 }); chip(NOTE(n - 12), t, d, { wave: "tri", vol: 0.14, hold: 0.7 }); t += d; });
    [84, 88, 91, 96].forEach((n, i) => chip(NOTE(n), t + i * 0.05, 0.4, { vol: 0.05, duty: 0.5, vib: 7 }));
  },
});

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
  const bd = toRgb(cssVar("--border")), bd2 = toRgb(cssVar("--border2")), acc = floorInfo(floor).tint;
  const txt = toRgb(cssVar("--text"));
  const red = [190, 40, 40];
  const rnd = seeded(floor * 7 + (boss ? 3 : 0));
  const lair = !floorInfo(floor).endless && floor === STORY;

  // sky: banded gradient
  let top = light ? mix(s1, acc, 0.3) : mix(bg, acc, 0.34);
  let hor = light ? mix(s2, acc, 0.12) : mix(s1, acc, 0.22);
  if (boss || lair) { top = mix(top, red, light ? 0.18 : 0.32); hor = mix(hor, red, light ? 0.22 : 0.4); }
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
  let far = light ? mix(bd, acc, 0.3) : mix(bd2, acc, 0.3);
  let near = light ? mix(bd2, acc, 0.2) : mix(mix(bd, bg, 0.2), acc, 0.14);
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

/* ===================== VIEW HELPERS ===================== */
function hpColor(frac) {
  return frac > 0.5 ? "var(--ok)" : frac > 0.25 ? "var(--star)" : "var(--bad)";
}
let _battleFx = null;                           // one-shot effect handed to mountSprites

function spriteCanvas(key, scale, flip, extra) {
  return `<canvas data-sprite="${key}" data-scale="${scale}" ${flip ? 'data-flip="1"' : ""} ${extra || ""}></canvas>`;
}
function fighterHtml(key, opts) {
  const scale = opts.scale || SCALE[key] || 4;
  const fly = FLYING[key] ? " flying" : "";
  return `<div class="fighter ${opts.side}${fly}" ${opts.id ? `id="${opts.id}"` : ""}>
    <div class="act ${opts.act || ""}" ${opts.actStyle ? `style="${opts.actStyle}"` : ""}>
      ${opts.plate || ""}
      <div class="body ${opts.idle === false ? "" : "idle-" + (IDLE[key] || "breathe")}">
        ${spriteCanvas(key, scale, opts.flip, opts.ghost ? 'data-ghost="1"' : "")}
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
const BOLT = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>';
const SHIELD = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/></svg>';
const TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

function campaignPct(s) {
  if (s.cleared || s.floor > STORY) return 100;
  const f = floorInfo(s.floor);
  return Math.round(((s.floor - 1) + s.idx / (f.foes.length + 1)) / STORY * 100);
}

/* ===================== SLOT MENU ===================== */
function viewAdvMenu() {
  const slots = S.adv.slots.map((s, i) => {
    if (!s) {
      return `<button class="card slotcard empty" data-act="advNew" data-i="${i}">
        <div class="slotart"><span class="plus">+</span></div>
        <div style="flex:1">
          <div class="eyebrow">Slot ${i + 1}</div>
          <div style="font-size:17px;font-weight:bold;margin-top:3px">New adventure</div>
          <div class="muted" style="font-size:13px;margin-top:3px">Pick a class and start on Floor 1</div>
        </div>
      </button>`;
    }
    const C = CLASSES[s.cls], pct = campaignPct(s);
    const where = s.floor > STORY ? floorTitle(s.floor) : floorTitle(s.floor);
    return `<div class="card slotcard" style="cursor:default">
      <div class="slotart">${spriteCanvas(C.sprite, 2)}</div>
      <div style="flex:1;min-width:0">
        <div class="eyebrow" style="color:${C.color}">Slot ${i + 1} · ${C.name} · Lv ${s.level}</div>
        <div style="font-size:16px;font-weight:bold;margin-top:3px">${esc(where)}</div>
        <div class="segbar" style="margin-top:8px"><span style="width:${pct}%;background:${s.cleared ? "var(--star)" : "var(--accent)"}"></span></div>
        <div class="muted" style="font-size:12px;margin-top:5px">${s.cleared ? "Dragon slain · Endless" : pct + "% to the dragon"} · ${s.kills} foes · ${s.deaths} ${s.deaths === 1 ? "fall" : "falls"}</div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="primary" data-act="advCont" data-i="${i}" style="background:var(--accent);padding:11px;font-size:15px;flex:1">Continue</button>
          <button class="ghost" data-act="advDel" data-i="${i}" title="Delete slot" aria-label="Delete slot ${i + 1}" style="flex:0 0 48px;padding:11px">${TRASH}</button>
        </div>
      </div>
    </div>`;
  }).join("");
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 22px">
      <button class="backbtn" data-act="backToSet">${I.chevL}</button>
      <div><div class="eyebrow" style="color:var(--accent)">Battle${filterLabel()}</div>
      <div style="font-size:22px;font-weight:bold">Choose a save</div></div>
    </div>
    ${slots}
    <div class="muted" style="font-size:12.5px;line-height:1.6;margin-top:16px">
      Five floors stand between you and the dragon. Each floor ends in a boss, and bosses love asking questions you've missed. Saves are on this device and update after every answer.
    </div>
  </div>`;
}

function viewAdvClass() {
  const cards = Object.keys(CLASSES).map(k => {
    const C = CLASSES[k];
    const sps = C.specials.map(sp => `<div class="clsp"><b>${esc(sp.name)}</b> <span class="cost">${BOLT}${sp.cost}</span><div>${esc(sp.text)}</div></div>`).join("");
    return `<button class="card classcard" data-act="advPickClass" data-cls="${k}">
      <div class="accentbar" style="background:${C.color}"></div>
      <div class="clshead">
        <div class="slotart">${spriteCanvas(C.sprite, 2)}</div>
        <div>
          <div style="font-size:19px;font-weight:bold;color:${C.color}">${C.name}</div>
          <div class="muted" style="font-size:13px;margin-top:2px;line-height:1.45">${esc(C.blurb)}</div>
          <div class="muted" style="font-size:11.5px;margin-top:4px">Max HP ${maxHpOf(k, 1)}</div>
        </div>
      </div>
      <div class="clpass"><span class="tagp">Passive</span><b>${esc(C.passive.name)}</b>: ${esc(C.passive.text)}</div>
      <div class="clsps">${sps}</div>
    </button>`;
  }).join("");
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 22px">
      <button class="backbtn" data-act="toAdvMenu">${I.chevL}</button>
      <div><div class="eyebrow" style="color:var(--accent)">Slot ${S.advPick + 1}</div>
      <div style="font-size:22px;font-weight:bold">Pick your class</div></div>
    </div>
    ${cards}
    <div class="muted" style="font-size:12.5px;line-height:1.6;margin-top:8px">
      Correct answers fill your ${BOLT} charge. When a special is ready, tap it before you answer. Land it and it hits hard. Miss and it fizzles.
    </div>
  </div>`;
}

/* ===================== DEFEAT / VICTORY ===================== */
function viewDefeat() {
  const b = S.battle, s = b.s, C = CLASSES[s.cls];
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 22px">
      <button class="backbtn" data-act="toAdvMenu">${I.chevL}</button>
      <div><div class="eyebrow" style="color:var(--bad)">Slot ${b.slot + 1} · ${C.name}</div>
      <div style="font-size:22px;font-weight:bold">Knocked out</div></div>
    </div>
    <div class="card overcard fbpop" style="margin-bottom:16px">
      <div class="fallen">${spriteCanvas(C.sprite, 4)}</div>
      <div style="font-size:23px;font-weight:bold;margin-top:6px">${esc(floorTitle(b.koFloor))}</div>
      <div class="dim" style="font-size:14.5px;margin-top:6px">${b.koBoss ? esc(b.koEnemy) + " held the stairs." : "Taken down by a " + esc(b.koEnemy) + "."}
        You keep your level and XP, and start back at the floor entrance.</div>
      <div class="tiles">
        <div class="tile"><div class="n" style="color:${C.color}">${s.level}</div><div class="l">Level</div></div>
        <div class="tile"><div class="n">${s.kills}</div><div class="l">Foes</div></div>
        <div class="tile"><div class="n" style="color:var(--bad)">${s.deaths}</div><div class="l">Falls</div></div>
      </div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="ghost" data-act="toAdvMenu">Save & exit</button>
      <button class="primary" data-act="advRetry" style="background:var(--accent);flex:1">Back in ↻</button>
    </div>
  </div>`;
}
function viewVictory() {
  const b = S.battle, s = b.s, C = CLASSES[s.cls];
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 22px">
      <button class="backbtn" data-act="toAdvMenu">${I.chevL}</button>
      <div><div class="eyebrow" style="color:var(--star)">Slot ${b.slot + 1} · ${C.name}</div>
      <div style="font-size:22px;font-weight:bold">Adventure complete</div></div>
    </div>
    <div class="card overcard fbpop" style="margin-bottom:16px">
      <div class="victorypair">${spriteCanvas(C.sprite, 4)}<span class="vdragon">${spriteCanvas("dragon", 2, true)}</span></div>
      <div style="font-size:25px;font-weight:bold;margin-top:10px;color:var(--star)">The dragon has fallen</div>
      <div class="dim" style="font-size:14.5px;margin-top:6px;line-height:1.6">Ashmaw is beaten and the lair is quiet. Endless mode is unlocked for this slot: floors keep coming and keep getting tougher.</div>
      <div class="tiles">
        <div class="tile"><div class="n" style="color:${C.color}">${s.level}</div><div class="l">Level</div></div>
        <div class="tile"><div class="n">${s.kills}</div><div class="l">Foes</div></div>
        <div class="tile"><div class="n" style="color:var(--bad)">${s.deaths}</div><div class="l">Falls</div></div>
      </div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="ghost" data-act="toAdvMenu">Save & exit</button>
      <button class="primary" data-act="advEndless" style="background:var(--star);flex:1">Into Endless →</button>
    </div>
  </div>`;
}

/* ===================== BATTLE ===================== */
function viewBattle() {
  const b = S.battle;
  if (!b) return `<div class="wrap"><div class="empty">No battle running.</div></div>`;
  if (b.showVictory) { _battleFx = null; return viewVictory(); }
  if (b.over && !b.dying) { _battleFx = null; return viewDefeat(); }

  const q = b.cur;
  if (!q) return `<div class="wrap"><div class="empty">Nothing in this pool to fight with.</div></div>`;
  const s = b.s, C = CLASSES[s.cls], fl = floorInfo(b.over ? b.koFloor : s.floor);

  // consume the one-shot effect so star taps / theme changes don't replay it
  const fx = b.fx; b.fx = null; _battleFx = fx;
  const t = fx ? fx.type : null;
  const sp = fx && fx.special;
  const D = IMPACT[sp || "none"];
  const ranged = sp === "fire" || sp === "meteor" || sp === "pierce" || sp === "rain";

  const starred = !!progress.starred[q.id];
  const cc = q._cat ? ck(q._cat.color) : "var(--accent)";

  /* ---- fighters ---- */
  let heroAct = "";
  if (t === "enter") heroAct = "a-enterL";
  else if (t === "heroAttack" || t === "kill") heroAct = ranged ? "a-cast" : "a-lunge";
  else if (t === "enemyAttack") heroAct = fx.ko ? "a-dieHero" : fx.blocked ? "a-guard" : "a-hurtHero";
  else if (b.dying) heroAct = "a-dead";
  let heroExtra = "";
  if (t === "enemyAttack") heroExtra = fx.blocked
    ? `<div class="blockfx">${SHIELD}</div><div class="dmg" style="color:#93c5fd">BLOCK</div>`
    : CLAW + `<div class="dmg" style="color:#ff6b6b">-${fx.dmg}</div>`;
  if ((t === "kill" && fx.heal > 0) || (t === "heroAttack" && fx.healed > 0))
    heroExtra += `<div class="dmg heal" style="color:#4ade80">+${t === "kill" ? fx.heal : fx.healed}</div>`;
  if (sp === "holy") heroExtra += `<div class="holyglow"></div>`;
  if (sp === "bash") heroExtra += `<div class="blockfx up">${SHIELD}</div>`;
  const hero = fighterHtml(C.sprite, { side: "hero", id: "heroSlot", scale: HERO_SCALE, act: heroAct, idle: !b.dying, extra: heroExtra });

  const hitTag = fx && (t === "heroAttack" || t === "kill")
    ? `<div class="dmg" style="color:${fx.crit ? "#fde047" : sp ? C.color : "#ffffff"}">${fx.crit ? "CRIT " : ""}-${fx.dmg}</div>` : "";
  const strike = fx && (t === "heroAttack" || t === "kill") && !ranged ? SLASH : "";

  let enemyAct = "", enemyStyle = "";
  if (t === "enter") enemyAct = "a-enter";
  else if (t === "heroAttack") enemyAct = "a-hurt";
  else if (t === "enemyAttack") enemyAct = "a-lungeL";
  else if (t === "kill") { enemyAct = fx.bossNext ? "a-bossdrop" : "a-enter"; enemyStyle = `animation-delay:${(D + 0.6).toFixed(2)}s`; }
  const plate = `<div class="nameplate ${b.enemy.boss ? "boss" : ""}">${esc(b.enemy.name)}</div>`;
  const enemy = fighterHtml(b.enemy.key, {
    side: "enemy", id: "enemySlot", flip: true, act: enemyAct, actStyle: enemyStyle, plate,
    extra: t === "heroAttack" ? strike + hitTag : "",
  });
  const corpse = t === "kill"
    ? fighterHtml(fx.dead.key, { side: "enemy", flip: true, ghost: true, idle: false, extra: strike + hitTag })
    : "";

  /* special effect layers */
  let sfxLayer = "";
  if (sp === "fire") sfxLayer = `<div class="proj fireball"></div>`;
  else if (sp === "meteor") sfxLayer = `<div class="proj meteor"></div>`;
  else if (sp === "pierce") sfxLayer = `<div class="proj arrow"></div>`;
  else if (sp === "rain") sfxLayer = [0, 1, 2, 3, 4, 5].map(i => `<div class="proj rainarrow" style="--x:${(i - 2.5) * 13}px;animation-delay:${(0.22 + i * 0.045).toFixed(3)}s"></div>`).join("");
  else if (sp === "holy") sfxLayer = `<div class="holybeam"></div>`;
  else if (sp === "bash") sfxLayer = `<div class="bashring"></div>`;

  /* ---- floor progress dots ---- */
  const nFoes = fl.foes.length;
  let dots = "";
  for (let i = 0; i <= nFoes; i++) {
    const cls = (i === nFoes ? "boss " : "") + (i < s.idx ? "done" : i === s.idx ? "now" : "");
    dots += `<i class="${cls}"></i>`;
  }
  const banner = fx && b.note && t === "kill" ? `<div class="banner ${b.note.kind}" style="animation-delay:${(D + 0.3).toFixed(2)}s">${esc(b.note.text)}</div>`
    : fx && fx.ko ? `<div class="banner boss" style="animation-delay:.7s">Knocked out</div>` : "";
  const floorLabel = fl.endless ? fl.name : "Floor " + (b.over ? b.koFloor : s.floor);

  const arena = `<div class="arena" id="arena" style="--d:${D}s">
    <canvas class="arena-bg" id="arenaBg" data-floor="${b.over ? b.koFloor : s.floor}" data-boss="${b.enemy.boss ? 1 : 0}"></canvas>
    <div class="arena-hud">
      <span class="ptag">${esc(floorLabel)} <span class="floordots">${dots}</span></span>
      <span class="ptag" style="color:#fde047">Lv ${s.level}</span>
    </div>
    <div class="stage">${hero}${corpse}${enemy}${sfxLayer}</div>
    <div class="flashlayer ${t === "heroAttack" || t === "kill" ? "go" : ""}" style="background:${t === "enemyAttack" ? "#ef4444" : sp === "meteor" || sp === "fire" ? "#f97316" : "#fff"}"></div>
    ${banner}
  </div>`;

  /* ---- HUD: hero HP (with damage trail) + XP, enemy hit pips ---- */
  const mxHp = maxHpOf(s.cls, s.level);
  const hpNow = b.dying ? 0 : s.hp;
  const sh = b.shown || { hp: hpNow, xp: s.xp };
  const prevFrac = Math.min(1, sh.hp / mxHp), hpFrac = hpNow / mxHp;
  const healing = hpFrac > prevFrac;
  const fillFrom = fx && healing ? prevFrac : hpFrac;
  const trailFrom = fx && !healing ? prevFrac : hpFrac;
  const xpFrom = fx ? (levelFor(sh.xp) < s.level ? 0 : xpIntoLevel(sh.xp)) : xpIntoLevel(s.xp);
  b.shown = { hp: hpNow, xp: s.xp };

  let pips = "";
  const popFrom = fx ? fx.popFrom : -1, popTo = fx ? fx.popTo : -1;
  for (let i = 0; i < b.enemy.maxHits; i++) {
    const gone = i >= b.enemy.hits;
    const popping = t === "heroAttack" && i >= popFrom && i < popTo;
    pips += `<span class="pip ${gone ? "gone" : ""} ${popping ? "popping" : ""}" ${popping ? `style="animation-delay:${(D + (i - popFrom) * 0.05).toFixed(2)}s"` : ""}></span>`;
  }

  const hud = `<div class="hud">
    <div class="hudcol">
      <div class="hudlabel"><span>HP${s.guard ? ` <span class="guardtag">${SHIELD}Guard</span>` : ""}</span><b style="color:${hpColor(hpFrac)}">${hpNow} / ${mxHp}</b></div>
      <div class="hpbar">
        <div class="trail" data-from="${trailFrom * 100}" data-to="${hpFrac * 100}" style="width:${trailFrom * 100}%"></div>
        <div class="fillb" data-from="${fillFrom * 100}" data-to="${hpFrac * 100}" style="width:${fillFrom * 100}%;background:${hpColor(hpFrac)}"></div>
      </div>
      <div class="xpbar" title="XP ${xpIntoLevel(s.xp)} / 100"><div data-from="${xpFrom}" data-to="${xpIntoLevel(s.xp)}" style="width:${xpFrom}%"></div></div>
    </div>
    <div class="hudcol">
      <div class="hudlabel"><span>${b.enemy.boss ? "Boss" : "Enemy"}</span><b style="color:var(--bad)">${b.enemy.hits} / ${b.enemy.maxHits}</b></div>
      <div class="pips ${b.enemy.maxHits > 8 ? "sm" : ""}">${pips}</div>
    </div>
  </div>`;

  /* ---- special bar ---- */
  let seg = "";
  for (let i = 0; i < C.maxCharge; i++) seg += `<i class="${i < s.charge ? "on" : ""}" style="${i < s.charge ? `background:${C.color}` : ""}"></i>`;
  const specs = C.specials.map(x => {
    const ready = s.charge >= x.cost, armed = b.armed === x.id;
    return `<button class="spec ${ready ? "ready" : ""} ${armed ? "armed" : ""}" data-act="armSpecial" data-id="${x.id}"
      ${ready && !S.feedback ? "" : "disabled"} style="--cc:${C.color}">
      <span class="spn">${esc(x.name)}</span><span class="spc">${BOLT}${x.cost}</span>
    </button>`;
  }).join("");
  const armedSp = b.armed ? C.specials.find(x => x.id === b.armed) : null;
  const specbar = `<div class="specbar">
    <div class="chargewrap"><span class="chargelbl" style="color:${C.color}">${BOLT}${s.charge}/${C.maxCharge}</span><div class="charge">${seg}</div></div>
    <div class="specbtns">${specs}</div>
    ${armedSp ? `<div class="armnote"><b style="color:${C.color}">${esc(armedSp.name)} armed.</b> ${esc(armedSp.text)} Miss and it fizzles.</div>` : ""}
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
    const ok = S.feedback === "correct", lh = b.lastHit || {};
    let head;
    if (ok) head = lh.name ? lh.name + " hit for " + lh.dmg + "!" : lh.crit ? "Critical hit! 2 damage" : "Hit!";
    else if (b.dying) head = "Knocked out" + (lh.fizzle ? ". " + lh.fizzle + " fizzled" : "");
    else if (lh.blocked) head = (lh.fizzle ? lh.fizzle + " fizzled, but your" : "Your") + " shield blocked the hit";
    else head = (lh.fizzle ? lh.fizzle + " fizzled. " : "") + "You took " + lh.dmg + " damage";
    fb = `<div class="fb ${fx ? "fbpop" : ""}" style="background:${ok ? "var(--okBg)" : "var(--badBg)"};border:1px solid ${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:18px">
      ${ok ? I.check("var(--ok)") : I.x("var(--bad)")}
      <div><div style="font-weight:bold;color:${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:4px">${head}</div>
      <div class="dim" style="font-size:14px;line-height:1.6">${esc(q.explanation || "")}</div></div>
    </div>`;
  }

  const atkLabel = armedSp ? `${BOLT} Cast ${esc(armedSp.name)}` : `${I.sword} Attack`;
  const btn = !S.feedback
    ? `<button class="primary" data-act="submitBattle" style="background:${S.selected.length ? (armedSp ? `color-mix(in srgb, ${C.color} 62%, #000)` : "var(--accent)") : "var(--border)"};color:${S.selected.length ? "#fff" : "var(--muted)"}" ${S.selected.length ? "" : "disabled"}>${atkLabel}</button>`
    : b.dying
      ? `<button class="primary" data-act="battleNext" style="background:var(--bad)">See results →</button>`
      : b.victory
        ? `<button class="primary" data-act="battleNext" style="background:var(--star)">Claim victory →</button>`
        : `<button class="primary" data-act="battleNext" style="background:var(--accent)">Next →</button>`;

  return `<div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin:22px 0 14px">
      <button class="backbtn" data-act="toAdvMenu" title="Save & exit">${I.chevL}</button>
      <span class="eyebrow" style="color:${C.color}">Slot ${b.slot + 1} · ${C.name}${filterLabel()}</span>
      <button class="star" data-act="star" data-id="${q.id}" style="color:${starred ? "var(--star)" : "var(--muted)"}">${I.star(starred, 20)}</button>
    </div>
    ${arena}
    ${hud}
    ${specbar}
    <div class="card" style="cursor:default;margin-bottom:16px">
      <div class="eyebrow" style="color:${cc};margin-bottom:10px">${q.type === "mc" ? "Multiple Choice" : "Select All That Apply"}${q._cat ? " · " + esc(q._cat.category) : ""}</div>
      ${b.curMiss ? `<div class="qtag">${b.enemy.boss ? esc(b.enemy.name) + " remembers" : "From"} your misses</div>` : ""}
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
  const D = IMPACT[fx.special || "none"];
  const shake = (cls, sec) => setTimeout(() => {
    if (!arena.isConnected) return;
    arena.classList.remove("shake", "shake-lg"); void arena.offsetWidth; arena.classList.add(cls);
  }, sec * 1000);
  const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const SP_COLORS = {
    bash: ["#ffffff", "#93c5fd", "#fde68a"], holy: ["#fef9c3", "#fde047", "#ffffff"],
    fire: ["#fde047", "#f97316", "#ef4444", "#7c2d12"], meteor: ["#fde047", "#f97316", "#ef4444", "#57534e", "#292524"],
    pierce: ["#ffffff", "#d9f99d", "#4ade80"], rain: ["#ffffff", "#bbf7d0", "#a3e635"],
  };

  if (fx.type === "heroAttack" || fx.type === "kill") {
    const target = fx.type === "kill"
      ? document.querySelector("#arena canvas[data-ghost]")
      : document.querySelector("#enemySlot canvas");
    if (target) {
      const [x, y] = centerOf(target);
      const big = fx.special === "meteor" || fx.special === "holy" || fx.special === "fire";
      const cols = fx.special ? SP_COLORS[fx.special] : fx.crit ? ["#fde047", "#ffffff", "#facc15"] : ["#ffffff", "#fde68a", "#fbbf24"];
      fxPixels(x, y, cols, big ? 34 : fx.special || fx.crit ? 22 : 14,
        { speed: big ? 420 : 300, life: big ? 0.7 : 0.45, size: big ? 4 : 3, g: big ? 380 : 200, delay: D, shape: big ? "px" : "spark" });
      if (fx.special === "meteor") fxPixels(x, y + 20, ["#57534e", "#78716c", "#292524"], 20, { speed: 260, life: 0.9, size: 5, g: 700, delay: D + 0.05, angle: -Math.PI / 2, spread: Math.PI });
    }
    shake(fx.special === "meteor" ? "shake-lg" : "shake", D);
    if (fx.special === "holy" || (fx.type === "kill" && fx.heal > 0) || (fx.type === "heroAttack" && fx.healed > 0)) {
      const hero = document.querySelector("#heroSlot .body");
      if (hero) {
        const r = hero.getBoundingClientRect(), list = [];
        for (let i = 0; i < 14; i++) list.push({ x: r.left + Math.random() * r.width, y: r.bottom - Math.random() * r.height * 0.6,
          vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 70, life: 0.8 + Math.random() * 0.4, size: 3,
          color: i % 2 ? "#4ade80" : "#bbf7d0", g: -30, drag: 0.98, shape: "px", shrink: true, delay: D + 0.2 + Math.random() * 0.3 });
        fxAdd(list);
      }
    }
    if (fx.type === "kill") {
      const ghost = document.querySelector("#arena canvas[data-ghost]");
      if (ghost) {
        spriteBurst(ghost, fx.dead.key, +(ghost.dataset.scale || 4), true, D + 0.13);
        setTimeout(() => { if (ghost.isConnected) ghost.style.visibility = "hidden"; }, (D + 0.15) * 1000);
      }
      if (fx.dead.boss) {
        shake("shake-lg", D + 0.1);
        setTimeout(() => flashGlow("var(--ok)", 900), (D + 0.1) * 1000);
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
      if (fx.bossNext) shake("shake-lg", D + (fx.leveled ? 1.13 : 1.06));
    }
  } else if (fx.type === "enemyAttack") {
    const hero = document.querySelector("#heroSlot canvas");
    if (hero) {
      const [x, y] = centerOf(hero);
      if (fx.blocked) fxPixels(x + 14, y, ["#ffffff", "#93c5fd", "#e0f2fe"], 14, { speed: 260, life: 0.4, size: 3, g: 100, delay: 0.2, shape: "spark", angle: 0, spread: Math.PI });
      else fxPixels(x, y, ["#ef4444", "#fca5a5", "#ffffff"], 16, { speed: 260, life: 0.5, size: 4, g: 500, delay: 0.2, angle: Math.PI, spread: Math.PI * 1.1 });
    }
    shake(fx.blocked ? "shake" : "shake-lg", 0.2);
    if (!fx.blocked) setTimeout(() => flashGlow("var(--bad)", 520), 200);
  }
}
