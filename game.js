/* ===================================================================
   game.js — Battle Mode
   Every answer is an attack. Heroes live across decks (hall.js keeps
   them); each deck has its own story (stories.js) and three save slots
   of adventures ("fc:adv:<deck>", v2). Heroes level forever: every level
   gives a pick (more HP, a new technique, or a boon roll). One boon at a
   time, and it stays with the hero. Beating a story's final boss earns
   a trophy with a small permanent perk.

   Grading, misses and stars all go through the same recordAnswer() as
   Quiz and Shuffle. Bosses lean on questions you have missed before.
   =================================================================== */

const OUTLINE = "#0f0d16";
const HERO_SCALE = 3;
BACK_ACTS.push("toAdvMenu", "toAdvHero", "toAdvClass", "home2");

/* Pad by one cell and paint an outline around every filled pixel. */
const _gridCache = {};
function spriteGrid(name) {
  if (_gridCache[name]) return _gridCache[name];
  const sp = getSprite(name);
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
  if (!getSprite(name) || !canvas) return;
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
  const k = r.width / (m * scale) || 1;                 // stage may be scaled
  const cx = r.left + r.width / 2, cy = r.top + r.height * 0.55;
  const list = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < m; x++) {
    const col = grid[y][x];
    if (!col || (col === OUTLINE && Math.random() < 0.6)) continue;
    const px = r.left + ((flip ? m - 1 - x : x) + 0.5) * scale * k;
    const py = r.top + (y + 0.5) * scale * k;
    const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1;
    const sp = 90 + Math.random() * 190;
    list.push({ x: px, y: py, vx: (dx / d) * sp + (Math.random() - 0.5) * 60, vy: (dy / d) * sp - 120 - Math.random() * 120,
      life: 0.65 + Math.random() * 0.45, size: scale * k, color: col, g: 700, drag: 0.95, shape: "px", shrink: true, delay: delay || 0 });
  }
  fxAdd(list);
}

/* ===================== CLASSES & TECHNIQUES =====================
   Techniques are learned one level-up pick at a time. Once all four
   are known, the pick becomes Hone (+1 hit on every technique).      */
const CLASSES = {
  knight: {
    name: "Knight", sprite: "hero_knight", color: "#60a5fa", hp: 20, maxCharge: 9, gain: 1, basic: "slash", crit: 0.05,
    blurb: "Tough and steady. Built to survive bad streaks.",
    passive: { name: "Iron Guard", text: "Takes 30% less damage and has +20 max HP." },
    specials: [
      { id: "bash", name: "Shield Bash", cost: 3, hits: 2, guard: 1, text: "2 hits, then blocks the next attack." },
      { id: "whirl", name: "Whirlwind", cost: 4, hits: 3, carry: 1, text: "3 hits. Extra damage carries into the next foe." },
      { id: "holy", name: "Holy Strike", cost: 6, hits: 4, heal: 0.35, text: "4 hits and heals 35% of your HP." },
      { id: "judgment", name: "Judgment", cost: 9, hits: 8, text: "8 hits of falling light." },
    ],
  },
  wizard: {
    name: "Wizard", sprite: "hero_wizard", color: "#a78bfa", hp: -10, maxCharge: 8, gain: 2, basic: "bolt", crit: 0.05,
    blurb: "Fragile, but hits the hardest when you're on a roll.",
    passive: { name: "Arcane Flow", text: "Correct answers charge techniques twice as fast. 10 less max HP." },
    specials: [
      { id: "frost", name: "Frost Lance", cost: 3, hits: 2, freeze: 1, text: "2 hits and freezes the foe. Its next attack does nothing." },
      { id: "fire", name: "Fireball", cost: 4, hits: 3, text: "3 hits." },
      { id: "chain", name: "Chain Lightning", cost: 5, hits: 4, carry: 1, text: "4 hits. Extra damage jumps to the next foe." },
      { id: "meteor", name: "Meteor", cost: 8, hits: 7, text: "7 hits. Flattens almost anything." },
    ],
  },
  ranger: {
    name: "Ranger", sprite: "hero_ranger", color: "#4ade80", hp: 0, maxCharge: 6, gain: 1, basic: "arrow", crit: 0.3,
    blurb: "Lucky crits, and overkill damage carries forward.",
    passive: { name: "Keen Eye", text: "30% crit chance on regular shots. Crits deal double." },
    specials: [
      { id: "volley", name: "Volley", cost: 2, hits: 2, text: "Two quick arrows." },
      { id: "pierce", name: "Piercing Shot", cost: 3, hits: 3, carry: 1, text: "3 hits. Extra damage carries into the next foe." },
      { id: "snipe", name: "Snipe", cost: 5, hits: 3, sure: 1, text: "Always crits, for 6 damage." },
      { id: "rain", name: "Arrow Rain", cost: 6, hits: 5, carry: 1, text: "5 hits. Extra damage carries over." },
    ],
  },
};
/* when the hit lands, in seconds (drives CSS, particles, sound). Basic
   attacks are keyed by style: knights swing, rangers shoot, wizards bolt. */
const IMPACT = { none: 0.17, slash: 0.17, arrow: 0.27, bolt: 0.3, bash: 0.17, whirl: 0.22, holy: 0.32, judgment: 0.42,
  frost: 0.3, fire: 0.46, chain: 0.3, meteor: 0.6, volley: 0.3, pierce: 0.34, snipe: 0.36, rain: 0.62 };
const RANGED = { arrow: 1, bolt: 1, frost: 1, fire: 1, chain: 1, meteor: 1, volley: 1, pierce: 1, snipe: 1, rain: 1 };
const BOWS = { arrow: 1, volley: 1, pierce: 1, snipe: 1, rain: 1 };
/* glow color behind the hero while a technique winds up */
const AURA = { bash: "#93c5fd", whirl: "#e0f2fe", holy: "#fde047", judgment: "#fef08a", frost: "#7dd3fc", fire: "#f97316",
  chain: "#c4b5fd", meteor: "#ef4444", volley: "#bbf7d0", pierce: "#4ade80", snipe: "#fde047", rain: "#a3e635" };
const SP_SOUND = { bash: "bash", whirl: "bash", holy: "holy", judgment: "holy", frost: "frost", fire: "fire", chain: "chain",
  meteor: "meteor", volley: "volley", pierce: "pierce", snipe: "pierce", rain: "rain" };
function specialOf(cls, id) { return CLASSES[cls].specials.find(x => x.id === id); }

/* ===================== BOONS =====================
   One at a time per hero. Rolled by rarity; the chaos tier is silly on
   purpose but always comes with a small upside.                        */
const RARITY = {
  common:    { w: 46, color: "#cbd5e1", label: "Common" },
  uncommon:  { w: 26, color: "#4ade80", label: "Uncommon" },
  rare:      { w: 12, color: "#60a5fa", label: "Rare" },
  legendary: { w: 4,  color: "#fbbf24", label: "Legendary" },
  chaos:     { w: 12, color: "#e879f9", label: "Chaos" },
};
const BOONS = [
  { id: "keen",     r: "common",    name: "Keen Edge",        text: "+10% crit chance.", m: { crit: 0.10 } },
  { id: "nimble",   r: "common",    name: "Nimble",           text: "12% chance enemies miss you.", m: { dodge: 0.12 } },
  { id: "mend",     r: "common",    name: "Second Wind",      text: "Heal 4 HP on every correct answer.", m: { mend: 4 } },
  { id: "quick",    r: "common",    name: "Quick Study",      text: "+1 extra charge on every correct answer.", m: { plusCharge: 1 } },
  { id: "tough",    r: "common",    name: "Thick Skin",       text: "Take 15% less damage.", m: { armor: 0.15 } },
  { id: "bookworm", r: "common",    name: "Bookworm",         text: "+15% XP.", m: { xp: 0.15 } },
  { id: "surge",    r: "uncommon",  name: "Mana Surge",       text: "10% chance a correct answer refills your charge completely.", m: { refill: 0.10 } },
  { id: "vamp",     r: "uncommon",  name: "Vampiric",         text: "Defeating a foe heals 20% of your max HP.", m: { killHeal: 0.2 } },
  { id: "bulwark",  r: "uncommon",  name: "Bulwark",          text: "Start every floor with your guard up.", m: { floorGuard: 1 } },
  { id: "lucky",    r: "uncommon",  name: "Lucky Charm",      text: "+8% crit chance and +8% chance enemies miss.", m: { crit: 0.08, dodge: 0.08 } },
  { id: "sage",     r: "rare",      name: "Sage's Insight",   text: "1.5x XP.", m: { xp: 0.5 } },
  { id: "giant",    r: "rare",      name: "Giant Slayer",     text: "1.5x attack damage.", m: { dmg: 0.5 } },
  { id: "phoenix",  r: "rare",      name: "Phoenix Feather",  text: "Once per floor, survive a knockout with 30% HP.", m: { phoenix: 1 } },
  { id: "avatar",   r: "legendary", name: "Avatar of War",    text: "Double damage, and enemies miss 15% more often.", m: { dmg: 1, dodge: 0.15 } },
  { id: "archmage", r: "legendary", name: "Archmage's Gift",  text: "Double XP, and every technique costs 1 less charge.", m: { xp: 1, costCut: 1 } },
  { id: "rainbow",  r: "chaos",     name: "Rainbow Mode",     text: "You won't stop changing colors. +10% XP.", m: { xp: 0.1 }, fx: "rainbow" },
  { id: "noodle",   r: "chaos",     name: "Noodle Body",      text: "You stretch and wobble like taffy. +10% dodge.", m: { dodge: 0.1 }, fx: "noodle" },
  { id: "inverted", r: "chaos",     name: "Upside-Down World", text: "The arena's colors flip inside out. +10% crit chance.", m: { crit: 0.1 }, fx: "inverted" },
  { id: "kazoo",    r: "chaos",     name: "Kazoo Orchestra",  text: "Every hit honks. Heal 2 HP on correct answers.", m: { mend: 2 }, fx: "kazoo" },
  { id: "tiny",     r: "chaos",     name: "Pocket-Sized",     text: "You're tiny now. Enemies miss 20% more.", m: { dodge: 0.2 }, fx: "tiny" },
  { id: "disco",    r: "chaos",     name: "Disco Fever",      text: "The arena won't stop partying. +5% crit and dodge.", m: { crit: 0.05, dodge: 0.05 }, fx: "disco" },
  { id: "mirror",   r: "chaos",     name: "Mirror Mirror",    text: "The whole fight is flipped backwards. +15% XP.", m: { xp: 0.15 }, fx: "mirror" },
];
function boonById(id) { return BOONS.find(b => b.id === id) || null; }
function rollBoon(currentId) {
  let total = 0;
  for (const k in RARITY) total += RARITY[k].w;
  let x = Math.random() * total, tier = "common";
  for (const k in RARITY) { x -= RARITY[k].w; if (x <= 0) { tier = k; break; } }
  const pool = BOONS.filter(b => b.r === tier && b.id !== currentId);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* trophy perks: each story's perk counts once, however many times won */
function perksOf(hero) {
  const p = {};
  (hero && hero.trophies || []).forEach(t => { const st = STORIES[t.story]; if (st) p[st.trophy.perk] = true; });
  return p;
}
/* Everything that tweaks a fight, folded into one object. */
function mods(run, hero) {
  const C = CLASSES[hero.cls], p = perksOf(hero), b = boonById(hero.boon);
  const m = { crit: C.crit, dodge: 0, dmg: 0, xp: 0, mend: 0, plusCharge: 0, refill: 0, killHeal: 0, armor: 0,
              floorGuard: 0, phoenix: 0, costCut: 0, fx: b && b.fx || null };
  if (b) for (const k in b.m) m[k] += b.m[k];
  if (p.dodge) m.dodge += 0.05;
  if (p.crit) m.crit += 0.05;
  if (p.xp) m.xp += 0.10;
  if (p.mend) m.mend += 3;
  if (p.armor) m.armor += 0.05;
  m.crit = Math.min(0.9, m.crit); m.dodge = Math.min(0.6, m.dodge); m.armor = Math.min(0.6, m.armor);
  m.perks = p;
  return m;
}

/* ===================== LEVELS =====================
   Flat curve: every level costs the same, so levels keep coming forever
   and the number on a hero is a running record of everything they did. */
const XPL = 50;
function levelOf(xp) { return 1 + Math.floor((xp || 0) / XPL); }
function xpInto(xp) { return (xp || 0) % XPL; }
function maxHpOf(run, hero) {
  return 100 + CLASSES[hero.cls].hp + 20 * (run.hpPicks || 0) + (perksOf(hero).maxhp ? 10 : 0);
}
function costOf(sp, m) { return Math.max(1, sp.cost - (m.costCut || 0)); }

/* ===================== FLOORS ===================== */
const STORY_LEN = 5;
function storyOf(run) { return STORIES[run.story] || STORIES.classic; }
function floorInfo(run, floor) {
  const st = storyOf(run);
  if (floor <= STORY_LEN) return st.floors[floor - 1];
  const n = floor - STORY_LEN, theme = st.floors[(n - 1) % STORY_LEN], rnd = seeded(floor * 13 + 5);
  const all = st.floors.flatMap(f => f.foes);
  const foes = [0, 1, 2, 3].map(() => all[Math.floor(rnd() * all.length)]);
  const b = theme.boss;
  return { name: "Endless " + n, sub: theme.name, tint: theme.tint, foes, endless: true,
           boss: { key: b.key, name: b.name, hits: Math.min(30, 12 + 2 * n), scale: b.scale } };
}
function floorTitle(run, floor) {
  const f = floorInfo(run, floor);
  return f.endless ? f.name + " · " + f.sub : "Floor " + floor + " · " + f.name;
}
function foeHits(floor) { return Math.min(6, 2 + Math.floor((floor - 1) / 2)); }
function damageFrom(floor, boss) { return boss ? Math.min(40, 16 + 3 * floor) : Math.min(30, 10 + 2 * floor); }

function makeEnemy(run) {
  const f = floorInfo(run, run.floor);
  if (run.idx >= f.foes.length) {
    return { key: f.boss.key, name: f.boss.name, boss: true, final: run.floor === STORY_LEN,
             hits: f.boss.hits, maxHits: f.boss.hits, scale: f.boss.scale || 5 };
  }
  const foe = f.foes[run.idx], h = foeHits(run.floor);
  return { key: foe.key, name: foe.name, boss: false, hits: h, maxHits: h, scale: 4 };
}

/* ===================== SAVE SLOTS (per deck, v2) ===================== */
function loadAdv(setId) {
  try {
    const raw = localStorage.getItem("fc:adv:" + setId);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.v === 2 && Array.isArray(d.slots)) { while (d.slots.length < 3) d.slots.push(null); return d; }
    }
  } catch (e) {}
  return { v: 2, slots: [null, null, null] };
}
function saveAdv() {
  if (!S.set || !S.adv) return;
  try { localStorage.setItem("fc:adv:" + S.set.id, JSON.stringify(S.adv)); } catch (e) {}
}
function newRun(hero, story) {
  const run = { v: 2, heroId: hero.id, story, floor: 1, idx: 0, enemyHits: null, hp: 0, hpPicks: 0,
    learned: [], hone: 0, charge: 0, guard: false, frozen: false, cleared: false, deaths: 0, kills: 0, best: 0,
    seen: [], picks: perksOf(hero).pick ? 1 : 0, phoenixFloor: 0, ankhUsed: false, xpRun: 0,
    created: Date.now(), updated: Date.now() };
  run.hp = maxHpOf(run, hero);
  floorStart(run, hero);
  return run;
}
/* perks and boons that kick in at the start of every floor */
function floorStart(run, hero) {
  const m = mods(run, hero);
  if (m.floorGuard) run.guard = true;
  if (m.perks.charge) run.charge = Math.max(run.charge, 2);
}
/* write the live run (and its hero) back to storage */
function persist() {
  const b = S.battle; if (!b) return;
  b.s.enemyHits = b.enemy.hits;
  b.s.updated = Date.now();
  progress.battle.bestFloor = Math.max(progress.battle.bestFloor || 0, b.s.best);
  saveAdv();
  saveHeroes();
  saveProgress();
}
/* Most recent adventure, for the deck screen's Battle button. */
function advSummary(setId) {
  const live = loadAdv(setId).slots.filter(Boolean).sort((a, b) => b.updated - a.updated)[0];
  const st = STORIES[storyForDeck({ id: setId, story: S.set && S.set._storyId })];
  if (!live) return (st ? st.title + " · " : "") + "pick a hero";
  const h = heroById(live.heroId);
  const f = floorInfo(live, live.floor);
  return (h ? esc(h.name) + " Lv " + levelOf(h.xp) : "Adventure") + " · " + (f.endless ? f.name : "Floor " + live.floor);
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
function advNew(i) { S.advPick = i; sfx.select(); goto("advHero"); }
function advAskDelete(i) {
  const s = S.adv.slots[i]; if (!s) return;
  const h = heroById(s.heroId);
  showModal(`<h2>Delete slot ${i + 1}?</h2>
    <p>This adventure on ${esc(floorTitle(s, s.floor))} will be gone for good.${h ? " " + esc(h.name) + " keeps their level, boon and trophies." : ""} Your deck progress stays.</p>
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
/* hero chosen for an empty slot: start the deck's story */
function startAdventure(hero) {
  const run = newRun(hero, S.set._storyId || storyForDeck({ id: S.set.id }));
  S.adv.slots[S.advPick] = run;
  saveAdv();
  S.introSlot = S.advPick;
  sfx.select();
  goto("advIntro");
}

/* ===================== RUN LIFECYCLE ===================== */
function openSlot(i) {
  const s = S.adv.slots[i];
  if (!s) return;
  const h = heroById(s.heroId);
  if (!h) return;
  S.battle = {
    slot: i, s, h, enemy: null, armed: null, pend: null, lvl: null,
    bq: null, bqi: 0, cur: null, curMiss: false, curStar: false,
    fx: { type: "enter" }, note: null,
    shown: null,
    over: false, dying: false, victory: false, showVictory: false,
  };
  const b = S.battle;
  b.enemy = makeEnemy(s);
  if (s.enemyHits != null) b.enemy.hits = Math.max(1, Math.min(b.enemy.maxHits, s.enemyHits));
  const mx = maxHpOf(s, h);
  s.hp = Math.min(s.hp, mx);
  if (s.hp <= 0) s.hp = mx;
  b.shown = { hp: s.hp, xp: h.xp };
  pickQuestion();
  resetQ();
  freshOrder(b.cur);
  if (s.picks > 0) b.lvl = { stage: "choose" };
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
/* Regular foes never repeat a question until you've seen the whole pool
   (tracked per save in s.seen, so it survives closing the app). Bosses
   still throw your old misses at you, and a starred question can sneak
   back in now and then on purpose. */
function pickQuestion() {
  const b = S.battle, s = b.s, last = b.cur ? b.cur.id : null;
  b.curMiss = false; b.curStar = false;
  if (b.enemy.boss) {
    const miss = missedPool();
    if (miss.length && Math.random() < 0.67) {
      if (!b.bq || b.bqi >= b.bq.length) { b.bq = weightedOrder(miss); b.bqi = 0; }
      const q = b.bq[b.bqi++];
      if (q.id !== last || miss.length === 1 && buildPool().length === 1) { b.cur = q; b.curMiss = true; return; }
    }
  }
  const pool = buildPool();
  if (activeFilter() !== "starred" && Math.random() < 0.12) {
    const stars = pool.filter(q => progress.starred[q.id] && q.id !== last);
    if (stars.length) { b.cur = stars[Math.floor(Math.random() * stars.length)]; b.curStar = true; return; }
  }
  if (!Array.isArray(s.seen)) s.seen = [];
  const seen = new Set(s.seen);
  let fresh = pool.filter(q => !seen.has(q.id) && q.id !== last);
  if (!fresh.length) {                       // whole pool seen: start a new cycle
    s.seen = [];
    fresh = pool.filter(q => q.id !== last);
    if (!fresh.length) fresh = pool;
  }
  b.cur = weightedOrder(fresh)[0];
}
function freshLeft() {
  const s = S.battle && S.battle.s; if (!s) return 0;
  const seen = new Set(s.seen || []);
  return buildPool().filter(q => !seen.has(q.id)).length;
}
function battleQuestion() { return S.battle && !S.battle.lvl ? S.battle.cur : null; }

function battleNextQuestion() {
  const b = S.battle;
  if (b.dying) { b.dying = false; b.fx = null; sfx.tick(); render(); window.scrollTo(0, 0); return; }
  if (b.victory) { b.victory = false; b.showVictory = true; b.fx = null; render(); window.scrollTo(0, 0); sfx.bVictory(); confettiBurst(true); return; }
  if (b.s.picks > 0) { b.lvl = { stage: "choose" }; b.fx = null; sfx.bLevel(); render(); return; }
  proceedNext();
}
function proceedNext() {
  const b = S.battle;
  pickQuestion();
  resetQ();
  freshOrder(b.cur);
  b.note = null;
  if (b.pend) {
    // the next foe only walks in once you're ready for it
    const p = b.pend; b.pend = null;
    b.fx = { type: "foeEnter", carry: p.carry, newFloor: p.floor !== b.s.floor };
    if (b.fx.newFloor) sfx.bStart();
    else if (b.enemy.boss) setTimeout(() => sfx.bBoss(), 380);
    else sfx.tick();
  } else { b.fx = null; sfx.tick(); }
  render();
}
function advContinueEndless() {
  const b = S.battle;
  b.showVictory = false; b.pend = null;
  pickQuestion(); resetQ(); freshOrder(b.cur);
  b.fx = { type: "enter" };
  if (b.s.picks > 0) b.lvl = { stage: "choose" };
  sfx.bStart();
  render(); window.scrollTo(0, 0);
}
function armSpecial(id) {
  const b = S.battle; if (!b || S.feedback || b.lvl) return;
  const sp = specialOf(b.s.cls || b.h.cls, id), m = mods(b.s, b.h);
  if (!sp || !b.s.learned.includes(id) || b.s.charge < costOf(sp, m)) return;
  b.armed = b.armed === id ? null : id;
  if (b.armed) sfx.bArm(); else sfx.tick();
  render();
}

/* ===================== LEVEL-UP PICKS ===================== */
function lvlPick(kind, id) {
  const b = S.battle, s = b.s, h = b.h, C = CLASSES[h.cls];
  if (!b.lvl || s.picks <= 0) return;
  if (kind === "learnMenu") { b.lvl = { stage: "learn" }; sfx.tick(); return render(); }
  if (kind === "back") { b.lvl = { stage: "choose" }; sfx.tick(); return render(); }
  if (kind === "hp") {
    s.hpPicks = (s.hpPicks || 0) + 1; s.hp = maxHpOf(s, h);
    s.picks--; sfx.bHeal();
    b.lvl = { stage: "done", text: "Max HP is now " + s.hp + ", and you're fully healed." };
  } else if (kind === "learn") {
    const sp = specialOf(h.cls, id);
    if (!sp || s.learned.includes(id)) return;
    s.learned.push(id); s.picks--; sfx.bArm();
    b.lvl = { stage: "done", text: "Learned " + sp.name + ". " + sp.text };
  } else if (kind === "hone") {
    s.hone = (s.hone || 0) + 1; s.picks--; sfx.bArm();
    b.lvl = { stage: "done", text: "Every technique now hits +" + s.hone + "." };
  } else if (kind === "boon") {
    const old = h.boon, nb = rollBoon(old);
    h.boon = nb.id; s.picks--;
    b.lvl = { stage: "reveal", boon: nb.id, old };
    sfx.bReel(nb.r);
  }
  saveAdv(); saveHeroes();
  render();
}
function lvlDone() {
  const b = S.battle;
  if (b.s.picks > 0) { b.lvl = { stage: "choose" }; sfx.tick(); return render(); }
  b.lvl = null;
  proceedNext();
}

/* ===================== ANSWERING ===================== */
function gainXp(amount) {
  const b = S.battle, h = b.h, s = b.s;
  const before = levelOf(h.xp);
  h.xp = (h.xp || 0) + amount;
  s.xpRun = (s.xpRun || 0) + amount;
  const after = levelOf(h.xp);
  if (after > before) s.picks = (s.picks || 0) + (after - before);
  return after > before;
}
function submitBattle() {
  const b = S.battle, s = b.s, h = b.h, C = CLASSES[h.cls], q = b.cur, m = mods(s, h);
  const ok = grade(q, S.selected);
  recordAnswer(q, ok);
  if (!b.curMiss) {
    if (!Array.isArray(s.seen)) s.seen = [];
    if (!s.seen.includes(q.id)) s.seen.push(q.id);
  }
  S.feedback = ok ? "correct" : "incorrect";
  if (!ok) S.showAnswer = true;

  const sp = b.armed ? specialOf(h.cls, b.armed) : null;
  b.armed = null;
  if (sp) s.charge = Math.max(0, s.charge - costOf(sp, m));
  const mx = () => maxHpOf(s, h);
  b.note = null;

  if (ok) {
    let dmg = 1, crit = false;
    if (sp) { dmg = sp.hits + (s.hone || 0); if (sp.sure) { crit = true; dmg *= 2; } }
    else {
      if (Math.random() < m.crit) { crit = true; dmg = 2; }
      s.charge = Math.min(C.maxCharge, s.charge + C.gain + m.plusCharge);
      if (m.refill && Math.random() < m.refill) { s.charge = C.maxCharge; b.surged = true; } else b.surged = false;
    }
    if (m.dmg) dmg = Math.max(1, Math.round(dmg * (1 + m.dmg)));
    const before = b.enemy.hits;
    b.enemy.hits = Math.max(0, before - dmg);
    const overkill = Math.max(0, dmg - before);
    const hp0 = s.hp;
    if (m.mend) s.hp = Math.min(mx(), s.hp + m.mend);
    if (sp && sp.guard) s.guard = true;
    if (sp && sp.freeze) s.frozen = true;
    if (sp && sp.heal) s.hp = Math.min(mx(), s.hp + Math.round(mx() * sp.heal));
    let healed = s.hp - hp0;
    const special = sp ? sp.id : null;
    const style = special || C.basic;
    let xpGot = Math.round(5 * (1 + m.xp));
    let leveled = gainXp(xpGot);
    const wasFrozen = s.frozen && !(sp && sp.freeze);
    b.fx = { type: "heroAttack", special, style, crit, dmg, healed, popFrom: b.enemy.hits, popTo: before, max: b.enemy.maxHits, leveled, kazoo: m.fx === "kazoo", frozenHit: wasFrozen };
    b.lastHit = { special, crit, dmg, name: sp ? sp.name : null, surged: b.surged };

    if (b.enemy.hits <= 0) {
      const dead = b.enemy, hpBefore = s.hp - healed, oldFloor = s.floor, oldIdx = s.idx;
      s.kills++; h.kills = (h.kills || 0) + 1;
      const killXp = Math.round((dead.boss ? 25 + 3 * Math.min(s.floor, 10) : 8) * (1 + m.xp));
      xpGot += killXp;
      if (gainXp(killXp)) leveled = true;
      s.frozen = false;
      s.hp = Math.min(mx(), s.hp + (dead.boss ? Math.round(mx() * 0.4) : 5) + Math.round(mx() * m.killHeal));
      const carry = sp && sp.carry ? overkill : 0;
      s.idx++;
      let newFloor = false;
      if (dead.boss) {
        if (dead.final && !s.cleared) {
          s.cleared = true; b.victory = true;
          h.trophies = h.trophies || [];
          h.trophies.push({ story: s.story, deck: S.set.id, deckTitle: S.set._deckTitle || S.set.title || S.set.id, date: Date.now() });
        }
        s.floor++; s.idx = 0; newFloor = true;
        s.best = Math.max(s.best, s.floor - 1);
        s.frozen = false;
        floorStart(s, h);
      }
      b.enemy = makeEnemy(s);
      const carried = carry ? Math.min(carry, b.enemy.maxHits - 1) : 0;
      if (carried) b.enemy.hits = b.enemy.maxHits - carried;
      // the fallen foe stays "on stage" until Next, then the new one enters
      b.pend = { dead: { key: dead.key, name: dead.name, boss: dead.boss, maxHits: dead.maxHits, scale: dead.scale },
                 floor: oldFloor, done: oldIdx + 1, carry: carried };

      if (leveled) b.note = { kind: "lvl", text: "Level " + levelOf(h.xp) + "!" };
      else if (b.victory) b.note = { kind: "lvl", text: dead.name + " falls!" };
      else if (newFloor) b.note = { kind: "floor", text: "Floor cleared!" };
      else if (b.enemy.boss) b.note = { kind: "boss", text: "Boss ahead: " + b.enemy.name };
      else b.note = { kind: "kill", text: dead.name + " defeated" };

      b.fx = Object.assign(b.fx, { type: "kill", dead, heal: s.hp - hpBefore, newFloor, carry: carried, popFrom: 0, max: dead.maxHits, leveled });
      const off = IMPACT[style] - 0.17;
      sfx.bKill(off, style === "slash");
      if (special) sfx["bSp_" + SP_SOUND[special]]();
      else basicSound(style, false, crit);
      if (s.hp > hpBefore) sfx.bHeal();
    } else {
      if (leveled) b.note = { kind: "lvl", text: "Level " + levelOf(h.xp) + "!" };
      if (special) sfx["bSp_" + SP_SOUND[special]]();
      else basicSound(style, true, crit);
    }
    b.fx.xp = xpGot; b.fx.leveled = leveled;
    if (leveled) setTimeout(() => sfx.bLevel(), (IMPACT[style] + 0.3) * 1000);
    if (m.fx === "kazoo") sfx.honk(IMPACT[style]);
  } else {
    let dmg = damageFrom(s.floor, b.enemy.boss);
    if (h.cls === "knight") dmg = Math.round(dmg * 0.7);
    dmg = Math.round(dmg * (1 - m.armor));
    let blocked = false, missed = false, frozen = false, saved = null;
    if (s.frozen) { frozen = true; dmg = 0; s.frozen = false; }
    else if (s.guard) { blocked = true; dmg = 0; s.guard = false; }
    else if (Math.random() < m.dodge) { missed = true; dmg = 0; }
    s.hp = Math.max(0, s.hp - dmg);
    if (s.hp <= 0) {
      if (m.phoenix && s.phoenixFloor !== s.floor) { s.phoenixFloor = s.floor; s.hp = Math.round(mx() * 0.3); saved = "Phoenix Feather"; }
      else if (m.perks.ankh && !s.ankhUsed) { s.ankhUsed = true; s.hp = Math.round(mx() * 0.25); saved = "Ankh of Ra"; }
    }
    b.fx = { type: "enemyAttack", dmg, blocked, missed, frozen, saved, fizzle: sp ? sp.name : null, kazoo: m.fx === "kazoo" };
    b.lastHit = { dmg, blocked, missed, frozen, saved, fizzle: sp ? sp.name : null };
    if (sp) sfx.bFizzle();
    if (blocked || frozen) sfx.bBlock(); else if (missed) sfx.bWhiff(); else sfx.bHurt();
    if (saved) setTimeout(() => sfx.bHeal(), 500);
    if (m.fx === "kazoo") sfx.honk(0.2);
    if (s.hp <= 0) {
      b.over = true; b.dying = true; b.fx.ko = true;
      b.koFloor = s.floor; b.koEnemy = b.enemy.name; b.koBoss = b.enemy.boss;
      // respawn at the floor entrance; the run screen still shows the KO
      s.deaths++; h.deaths = (h.deaths || 0) + 1;
      s.hp = mx(); s.idx = 0; s.enemyHits = null; s.charge = 0; s.guard = false; s.frozen = false;
      floorStart(s, h);
      s.updated = Date.now();
      saveAdv(); saveHeroes();
      setTimeout(() => sfx.bOver(), 650);
    }
  }
  if (!b.over) persist();
  render();
  checkCompletion();
}

/* ===================== BATTLE SOUNDS (chip kit from core.js) ===================== */
function basicSound(style, withHit, crit) {
  const t = IMPACT[style] - 0.17;
  if (style === "arrow") sfx.bShot(withHit);
  else if (style === "bolt") sfx.bZap(withHit);
  else { sfx.bSwing(); if (withHit) sfx.bHit(); }
  if (crit) setTimeout(() => sfx.bCrit(), Math.max(0, t) * 1000);
}
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
  bShot(withHit) {
    chip(NOTE(67), 0, 0.05, { vol: 0.07, duty: 0.5, to: NOTE(55) });           // twang
    crunch(0.04, 0.2, { f1: 6000, f2: 2500, vol: 0.035, step: 1 });          // whizz
    if (withHit) { crunch(0.27, 0.06, { f1: 2800, f2: 600, vol: 0.13, step: 5 }); chip(190, 0.27, 0.09, { wave: "square", to: 70, vol: 0.08, lp: 1500 }); }
  },
  bZap(withHit) {
    chip(NOTE(84), 0, 0.22, { vol: 0.045, duty: 0.25, to: NOTE(96), vib: 14 });
    chip(NOTE(79), 0.04, 0.2, { vol: 0.03, duty: 0.5, to: NOTE(91) });
    if (withHit) { crunch(0.3, 0.12, { f1: 7000, f2: 1200, vol: 0.1, step: 3 }); chip(NOTE(72), 0.3, 0.14, { vol: 0.06, duty: 0.125, to: NOTE(60) }); }
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
    crunch(0, 0.46, { f1: 600, f2: 3000, vol: 0.07, step: 3 });
    chip(300, 0.1, 0.36, { to: 900, vol: 0.04, duty: 0.25 });
    crunch(0.46, 0.35, { f1: 4000, f2: 150, vol: 0.18, step: 7 });
    chip(120, 0.46, 0.3, { wave: "tri", to: 38, vol: 0.22 });
  },
  bSp_meteor() {
    chip(1600, 0.05, 0.55, { to: 220, vol: 0.06, wave: "square", lp: 3000 });
    crunch(0, 0.6, { f1: 800, f2: 4000, vol: 0.05, step: 4 });
    crunch(0.6, 0.7, { f1: 3000, f2: 80, vol: 0.22, step: 12 });
    chip(80, 0.6, 0.6, { wave: "tri", to: 30, vol: 0.28 });
    chip(55, 0.65, 0.5, { wave: "square", to: 30, vol: 0.08, lp: 400 });
  },
  bSp_pierce() {
    chip(NOTE(64), 0, 0.06, { vol: 0.08, duty: 0.5, to: NOTE(52) });          // bow twang
    crunch(0.02, 0.4, { f1: 7000, f2: 2000, vol: 0.05, step: 1 });            // whizz
    crunch(0.34, 0.07, { f1: 3000, f2: 600, vol: 0.14, step: 5 });            // thunk
    chip(200, 0.34, 0.1, { wave: "square", to: 70, vol: 0.09, lp: 1500 });
  },
  bSp_rain() {
    [0.05, 0.11, 0.17].forEach(t => chip(NOTE(64), t, 0.06, { vol: 0.06, duty: 0.5, to: NOTE(52) }));
    for (let i = 0; i < 7; i++) crunch(0.62 + i * 0.04, 0.05, { f1: 3500, f2: 700, vol: 0.09, step: 4 });
    chip(150, 0.62, 0.25, { wave: "tri", to: 45, vol: 0.18 });
  },
  bVictory() {
    const mel = [[72, .12], [72, .12], [72, .12], [76, .36], [74, .12], [77, .12], [76, .12], [79, .6]];
    let t = 0;
    mel.forEach(([n, d]) => { chip(NOTE(n), t, d, { vol: 0.08, hold: 0.7 }); chip(NOTE(n - 12), t, d, { wave: "tri", vol: 0.14, hold: 0.7 }); t += d; });
    [84, 88, 91, 96].forEach((n, i) => chip(NOTE(n), t + i * 0.05, 0.4, { vol: 0.05, duty: 0.5, vib: 7 }));
  },
});

Object.assign(sfx, {
  bSp_frost() {
    chip(NOTE(91), 0, 0.25, { vol: 0.04, duty: 0.125, to: NOTE(100), vib: 20 });
    crunch(0.05, 0.25, { f1: 9000, f2: 4000, vol: 0.04, step: 1 });
    crunch(0.3, 0.12, { f1: 9000, f2: 2500, vol: 0.12, step: 2 });
    [96, 100, 103].forEach((n, i) => chip(NOTE(n), 0.3 + i * 0.03, 0.08, { vol: 0.04, duty: 0.125 }));
  },
  bSp_chain() {
    for (let i = 0; i < 5; i++) crunch(0.02 + i * 0.05, 0.04, { f1: 9000, f2: 3000, vol: 0.06, step: 1 });
    chip(NOTE(84), 0, 0.3, { vol: 0.05, duty: 0.25, vib: 30 });
    crunch(0.3, 0.2, { f1: 8000, f2: 600, vol: 0.14, step: 3 });
    chip(110, 0.3, 0.2, { wave: "square", to: 50, vol: 0.08, lp: 1600 });
  },
  bSp_volley() {
    [0, 0.07].forEach(t => chip(NOTE(67), t, 0.05, { vol: 0.07, duty: 0.5, to: NOTE(55) }));
    crunch(0.3, 0.05, { f1: 2800, f2: 600, vol: 0.12, step: 5 });
    crunch(0.36, 0.05, { f1: 2800, f2: 600, vol: 0.12, step: 5 });
  },
  bWhiff() {
    crunch(0.18, 0.16, { f1: 1200, f2: 5000, vol: 0.06, step: 2 });
    chip(NOTE(79), 0.3, 0.05, { vol: 0.05, duty: 0.125 }); chip(NOTE(84), 0.35, 0.08, { vol: 0.05, duty: 0.125 });
  },
  /* slot-machine reel for a boon roll; the landing note rises with rarity */
  bReel(r) {
    for (let i = 0; i < 16; i++) chip(NOTE(72 + (i % 4) * 3), i * (0.05 + i * 0.004), 0.03, { vol: 0.045, duty: 0.125 });
    const t = 1.55, top = { common: 79, uncommon: 84, rare: 88, legendary: 91, chaos: 86 }[r] || 79;
    [top - 12, top - 5, top].forEach((n, i) => chip(NOTE(n), t + i * 0.08, 0.14, { vol: 0.07, duty: 0.5, hold: 0.5 }));
    if (r === "legendary" || r === "chaos") chip(NOTE(top + 12), t + 0.3, 0.5, { vol: 0.05, vib: 9, hold: 0.6 });
  },
  honk(at) {
    const t = (at || 0) + 0.02, base = 52 + Math.floor(Math.random() * 14);
    chip(NOTE(base), t, 0.18, { vol: 0.08, duty: 0.5, vib: 38, to: NOTE(base - 4) });
    chip(NOTE(base + 7), t + 0.02, 0.16, { vol: 0.05, duty: 0.25, vib: 30 });
  },
});

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


/* ===================== ARENA BACKDROP =====================
   Drawn at a chunky pixel resolution from the active theme's colors,
   so every theme (including chameleon) gets a matching scene. Each
   story has its own scenery; each floor its own tint and seed.        */
function drawArenaBg(cv, storyId, floor, boss) {
  if (!cv || !cv.isConnected) return;
  const PX = 4;
  const W = Math.max(40, Math.ceil(cv.clientWidth / PX)), H = Math.max(20, Math.ceil(cv.clientHeight / PX));
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  const run = { story: storyId }, st = storyOf(run), fi = floorInfo(run, floor);
  const light = themeMode() === "light";
  const bg = toRgb(cssVar("--bg")), s1 = toRgb(cssVar("--surface")), s2 = toRgb(cssVar("--surface2"));
  const bd = toRgb(cssVar("--border")), bd2 = toRgb(cssVar("--border2")), acc = fi.tint;
  const txt = toRgb(cssVar("--text"));
  const red = [190, 40, 40];
  const rnd = seeded(floor * 7 + (boss ? 3 : 0) + storyId.length * 31);
  const lair = !fi.endless && floor === STORY_LEN;
  const scene = st.scene;

  // sky: banded gradient
  let top = light ? mix(s1, acc, 0.3) : mix(bg, acc, 0.34);
  let hor = light ? mix(s2, acc, 0.12) : mix(s1, acc, 0.22);
  if (scene === "sea") { top = mix(top, [10, 40, 90], light ? 0.2 : 0.35); }
  if (boss || lair) { top = mix(top, red, light ? 0.14 : 0.26); hor = mix(hor, red, light ? 0.18 : 0.32); }
  const groundY = H - Math.ceil(30 / PX);
  const bands = 7;
  for (let i = 0; i < bands; i++) {
    g.fillStyle = rgb(mix(top, hor, i / (bands - 1)));
    const y0 = Math.floor((groundY * i) / bands), y1 = Math.floor((groundY * (i + 1)) / bands);
    g.fillRect(0, y0, W, y1 - y0);
  }
  const indoor = scene === "cells" || scene === "sea" || scene === "gears";
  if (!indoor) {
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
    g.fillStyle = rgb(boss ? mix(red, [255, 200, 120], 0.35) : light || scene === "desert" ? mix([255, 236, 170], acc, 0.1) : mix(txt, acc, 0.12));
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++)
      if (x * x + y * y <= mr * mr + 1) g.fillRect(mx + x, my + y, 1, 1);
    if (!light && !boss && scene !== "desert") {
      g.fillStyle = rgb(mix(top, hor, 0.25));
      for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++)
        if ((x - 2) * (x - 2) + (y + 1) * (y + 1) <= mr * mr - 3) g.fillRect(mx + x, my + y, 1, 1);
    }
  }
  let far = light ? mix(bd, acc, 0.3) : mix(bd2, acc, 0.3);
  let near = light ? mix(bd2, acc, 0.2) : mix(mix(bd, bg, 0.2), acc, 0.14);
  if (boss) { far = mix(far, red, 0.2); near = mix(near, red, 0.14); }
  drawScene(g, scene, W, H, groundY, { far, near, light, acc, top, hor }, rnd);
  // ground
  let gTop = light ? mix(bd2, acc, 0.1) : mix(bd2, s1, 0.3);
  let gFill = light ? mix(s2, bd, 0.5) : mix(s1, bg, 0.2);
  if (scene === "lava") { gFill = mix(gFill, [60, 20, 10], 0.5); gTop = [230, 90, 30]; }
  if (scene === "ice") { gFill = mix(gFill, [220, 235, 250], light ? 0.5 : 0.25); gTop = mix(gTop, [255, 255, 255], 0.5); }
  if (scene === "desert" || scene === "sea") { gFill = mix(gFill, [200, 170, 110], light ? 0.45 : 0.25); gTop = mix(gTop, [230, 200, 140], 0.4); }
  if (scene === "cells") { gFill = mix(gFill, acc, 0.25); gTop = mix(gTop, acc, 0.5); }
  g.fillStyle = rgb(gFill); g.fillRect(0, groundY, W, H - groundY);
  g.fillStyle = rgb(gTop); g.fillRect(0, groundY, W, 1);
  g.fillStyle = rgb(mix(gFill, gTop, 0.45));
  for (let x = 0; x < W; x += 6) g.fillRect(x + ((Math.floor(x / 6) % 2) ? 3 : 0), groundY + 3, 2, 1);
  for (let i = 0; i < W / 5; i++) g.fillRect(Math.floor(rnd() * W), groundY + 2 + Math.floor(rnd() * (H - groundY - 2)), 1, 1);
  if (scene === "lava") {
    g.fillStyle = rgb([250, 120, 30]);
    for (let x = 0; x < W; x += 9) g.fillRect(x + Math.floor(rnd() * 4), groundY + 4 + Math.floor(rnd() * 3), 3, 1);
  }
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
  const base = baseOf(key);
  const scale = opts.scale || 4;
  const fly = FLYING_BASE[base] ? " flying" : "";
  return `<div class="fighter ${opts.side}${fly} ${opts.cls || ""}" ${opts.id ? `id="${opts.id}"` : ""} ${opts.style ? `style="${opts.style}"` : ""}>
    <div class="act ${opts.act || ""}" ${opts.actStyle ? `style="${opts.actStyle}"` : ""}>
      ${opts.plate || ""}
      <div class="body ${opts.idle === false ? "" : "idle-" + (IDLE_BASE[base] || "breathe")}">
        ${spriteCanvas(key, scale, opts.flip, opts.ghost ? 'data-ghost="1"' : "")}
      </div>
    </div>
    <div class="shadow"></div>
    ${opts.extra || ""}
  </div>`;
}
function heroSprite(h) { return CLASSES[h.cls].sprite; }
function boonChip(h, small) {
  const bn = boonById(h && h.boon);
  if (!bn) return `<span class="boonchip none">${small ? "No boon" : "No boon yet"}</span>`;
  const R = RARITY[bn.r];
  return `<span class="boonchip" style="--rc:${R.color}" title="${esc(bn.text)}">${esc(bn.name)}</span>`;
}
function campaignPct(s) {
  if (s.cleared || s.floor > STORY_LEN) return 100;
  const f = floorInfo(s, s.floor);
  return Math.round(((s.floor - 1) + s.idx / (f.foes.length + 1)) / STORY_LEN * 100);
}

/* ===================== SLOT MENU ===================== */
function viewAdvMenu() {
  const story = STORIES[S.set._storyId] || STORIES.classic;
  const slots = S.adv.slots.map((s, i) => {
    if (!s) {
      return `<button class="card slotcard empty" data-act="advNew" data-i="${i}">
        <div class="slotart"><span class="plus">+</span></div>
        <div style="flex:1">
          <div class="eyebrow">Slot ${i + 1}</div>
          <div style="font-size:17px;font-weight:bold;margin-top:3px">New adventure</div>
          <div class="muted" style="font-size:13px;margin-top:3px">Bring a hero or make a new one</div>
        </div>
      </button>`;
    }
    const h = heroById(s.heroId), st = storyOf(s);
    if (!h) {
      return `<div class="card slotcard" style="cursor:default"><div class="slotart"></div><div style="flex:1">
        <div class="eyebrow">Slot ${i + 1}</div><div style="font-weight:bold;margin-top:3px">This hero has retired</div>
        <div style="display:flex;gap:8px;margin-top:10px"><button class="ghost" data-act="advDel" data-i="${i}" style="flex:1">Clear slot</button></div></div></div>`;
    }
    const C = CLASSES[h.cls], pct = campaignPct(s);
    return `<div class="card slotcard" style="cursor:default">
      <div class="slotart">${spriteCanvas(C.sprite, 2)}</div>
      <div style="flex:1;min-width:0">
        <div class="eyebrow" style="color:${C.color}">Slot ${i + 1} · ${esc(h.name)} · Lv ${levelOf(h.xp)}</div>
        <div style="font-size:16px;font-weight:bold;margin-top:3px">${esc(floorTitle(s, s.floor))}</div>
        <div class="segbar" style="margin-top:8px"><span style="width:${pct}%;background:${s.cleared ? "var(--star)" : st.color}"></span></div>
        <div class="muted" style="font-size:12px;margin-top:5px">${s.cleared ? "Story complete · Endless" : pct + "% through " + esc(st.title)} · ${s.kills} foes · ${s.deaths} ${s.deaths === 1 ? "fall" : "falls"}</div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="primary" data-act="advCont" data-i="${i}" style="background:var(--accent);padding:11px;font-size:15px;flex:1">Continue</button>
          <button class="ghost" data-act="advDel" data-i="${i}" title="Delete slot" aria-label="Delete slot ${i + 1}" style="flex:0 0 48px;padding:11px">${TRASH}</button>
        </div>
      </div>
    </div>`;
  }).join("");
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 18px">
      <button class="backbtn" data-act="backToSet">${I.chevL}</button>
      <div><div class="eyebrow" style="color:${story.color}">Battle${filterLabel()} · ${esc(story.title)}</div>
      <div style="font-size:22px;font-weight:bold">Choose a save</div></div>
    </div>
    <div class="storyblurb tex" style="--sc:${story.color}"><b>${esc(story.title)}.</b> ${esc(story.goal)}</div>
    ${slots}
    <div class="muted" style="font-size:12.5px;line-height:1.6;margin-top:16px">
      Five floors, a boss at the end of each, and bosses love asking questions you've missed. Heroes keep their level, boon and trophies between adventures and decks.
    </div>
  </div>`;
}

/* ===================== NEW HERO: CLASS ===================== */
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
          <div class="muted" style="font-size:11.5px;margin-top:4px">Max HP ${100 + C.hp}</div>
        </div>
      </div>
      <div class="clpass"><span class="tagp">Passive</span><b>${esc(C.passive.name)}</b>: ${esc(C.passive.text)}</div>
      <div class="clpass" style="margin-top:8px"><span class="tagp">Learnable</span>One technique per level-up pick, in any order.</div>
      <div class="clsps">${sps}</div>
    </button>`;
  }).join("");
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 22px">
      <button class="backbtn" data-act="toAdvHero">${I.chevL}</button>
      <div><div class="eyebrow" style="color:var(--accent)">New hero</div>
      <div style="font-size:22px;font-weight:bold">Pick a class</div></div>
    </div>
    ${cards}
  </div>`;
}

/* ===================== STORY INTRO ===================== */
function viewAdvIntro() {
  const s = S.adv.slots[S.introSlot];
  if (!s) return `<div class="wrap"><div class="empty">No adventure here.</div></div>`;
  const h = heroById(s.heroId), st = storyOf(s), C = CLASSES[h.cls];
  const path = st.floors.map((f, i) => i === 0
    ? `<div class="pathstep"><span class="pathn" style="background:${rgb(f.tint)}">1</span><div><b>${esc(f.name)}</b><div class="muted" style="font-size:12px">Where it begins. Something guards the way out.</div></div></div>`
    : `<div class="pathstep locked"><span class="pathn">${i + 1}</span><div><b>???</b><div class="muted" style="font-size:12px">${i === 4 ? "The final confrontation" : "Unknown"}</div></div></div>`).join("");
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 18px">
      <button class="backbtn" data-act="toAdvMenu">${I.chevL}</button>
      <div><div class="eyebrow" style="color:${st.color}">A new adventure</div>
      <div style="font-size:24px;font-weight:bold">${esc(st.title)}</div></div>
    </div>
    <div class="card intro tex" style="cursor:default;--sc:${st.color}">
      <div class="introhero">${spriteCanvas(C.sprite, 3)}<span class="introboss">${spriteCanvas(st.floors[4].boss.key, 3, true)}</span></div>
      <p class="introtext">${esc(st.premise)}</p>
      <div class="introgoal"><span class="tagp" style="color:${st.color};border-color:${st.color}">Quest</span> ${esc(st.goal)}</div>
      <div class="path">${path}</div>
      <div class="muted" style="font-size:12.5px;margin-top:14px">Reward: <b style="color:var(--star)">${esc(st.trophy.name)}</b>, a trophy for ${esc(h.name)} that grants ${esc(st.trophy.text.toLowerCase())}.</div>
    </div>
    <button class="primary" data-act="advBegin" style="background:${st.color};color:#111;margin-top:16px">Begin as ${esc(h.name)} →</button>
  </div>`;
}

/* ===================== DEFEAT / VICTORY ===================== */
function viewDefeat() {
  const b = S.battle, s = b.s, h = b.h, C = CLASSES[h.cls];
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 22px">
      <button class="backbtn" data-act="toAdvMenu">${I.chevL}</button>
      <div><div class="eyebrow" style="color:var(--bad)">Slot ${b.slot + 1} · ${esc(h.name)}</div>
      <div style="font-size:22px;font-weight:bold">Knocked out</div></div>
    </div>
    <div class="card overcard fbpop tex" style="margin-bottom:16px">
      <div class="fallen">${spriteCanvas(C.sprite, 4)}</div>
      <div style="font-size:23px;font-weight:bold;margin-top:6px">${esc(floorTitle(s, b.koFloor))}</div>
      <div class="dim" style="font-size:14.5px;margin-top:6px">${b.koBoss ? esc(b.koEnemy) + " held the stairs." : "Taken down by a " + esc(b.koEnemy) + "."}
        You keep your level, picks and boon, and start back at the floor entrance.</div>
      <div class="tiles">
        <div class="tile"><div class="n" style="color:${C.color}">${levelOf(h.xp)}</div><div class="l">Level</div></div>
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
  const b = S.battle, s = b.s, h = b.h, C = CLASSES[h.cls], st = storyOf(s);
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 22px">
      <button class="backbtn" data-act="toAdvMenu">${I.chevL}</button>
      <div><div class="eyebrow" style="color:var(--star)">${esc(h.name)} · ${esc(st.title)}</div>
      <div style="font-size:22px;font-weight:bold">Adventure complete</div></div>
    </div>
    <div class="card overcard fbpop tex" style="margin-bottom:16px">
      <div class="victorypair">${spriteCanvas(C.sprite, 4)}<span class="vdragon">${spriteCanvas(st.floors[4].boss.key, 2, true)}</span></div>
      <div style="font-size:25px;font-weight:bold;margin-top:10px;color:var(--star)">${esc(st.floors[4].boss.name)} is defeated</div>
      <div class="dim" style="font-size:14.5px;margin-top:6px;line-height:1.6">${esc(st.victory)}</div>
      <div class="trophygot">
        <div class="trophybox">${trophyCanvas(s.story, 5)}</div>
        <div><div class="eyebrow" style="color:var(--star)">Trophy earned</div>
        <div style="font-size:18px;font-weight:bold;margin-top:3px">${esc(st.trophy.name)}</div>
        <div class="muted" style="font-size:13px;margin-top:3px">${esc(h.name)} keeps it forever: ${esc(st.trophy.text.toLowerCase())}.</div></div>
      </div>
      <div class="tiles">
        <div class="tile"><div class="n" style="color:${C.color}">${levelOf(h.xp)}</div><div class="l">Level</div></div>
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

/* ===================== LEVEL-UP PANEL (replaces the question) ===================== */
function viewLevelUp() {
  const b = S.battle, s = b.s, h = b.h, C = CLASSES[h.cls], L = b.lvl;
  const head = `<div class="lvlhead"><div class="eyebrow" style="color:var(--star)">Level ${levelOf(h.xp)} · ${esc(h.name)}</div>
    <div class="lvltitle">Level up!</div>
    <div class="muted" style="font-size:13px">${s.picks > 1 ? s.picks + " picks waiting" : "Choose one"}</div></div>`;
  const cur = boonById(h.boon);
  if (L.stage === "reveal") {
    const bn = boonById(L.boon), R = RARITY[bn.r];
    const reel = [];
    for (let i = 0; i < 14; i++) reel.push(BOONS[Math.floor(Math.random() * BOONS.length)]);
    reel.push(bn);
    return `<div class="lvlpanel tex">
      <div class="lvlhead"><div class="eyebrow" style="color:var(--star)">Boon roll</div><div class="lvltitle"><span class="rolling">Rolling…</span><span class="rolled" style="color:${R.color}">${R.label}!</span></div></div>
      <div class="reel"><div class="reelstrip">${reel.map(x => `<div class="reelitem" style="color:${RARITY[x.r].color}">${esc(x.name)}</div>`).join("")}</div></div>
      <div class="boonresult" style="--rc:${R.color}">
        <div class="eyebrow" style="color:${R.color}">${R.label}${bn.fx ? " · chaos" : ""}</div>
        <div class="boonname">${esc(bn.name)}</div>
        <div class="dim" style="font-size:14px;line-height:1.5">${esc(bn.text)}</div>
        ${L.old && L.old !== bn.id ? `<div class="muted" style="font-size:12px;margin-top:6px">Replaced ${esc(boonById(L.old).name)}.</div>` : ""}
        <button class="primary" data-act="lvlDone" style="background:${R.color};color:#111;margin-top:14px">Continue →</button>
      </div>
    </div>`;
  }
  if (L.stage === "done") {
    return `<div class="lvlpanel tex">${head.replace("Level up!", "Got it!")}
      <div class="dim" style="font-size:15px;line-height:1.6;margin:6px 0 16px">${esc(L.text)}</div>
      <button class="primary" data-act="lvlDone" style="background:var(--accent)">${s.picks > 0 ? "Next pick →" : "Continue →"}</button></div>`;
  }
  if (L.stage === "learn") {
    const opts = C.specials.filter(x => !s.learned.includes(x.id)).map(x => `<button class="card lvlopt" data-act="lvlLearn" data-id="${x.id}" style="--cc:${C.color}">
        <div class="lvloptname">${esc(x.name)} <span class="cost">${BOLT}${x.cost}</span></div>
        <div class="muted" style="font-size:13px;line-height:1.45">${esc(x.text)}</div></button>`).join("");
    return `<div class="lvlpanel tex">${head}
      <div class="lvlopts">${opts}</div>
      <button class="ghost" data-act="lvlBack" style="margin-top:10px">← Back</button></div>`;
  }
  const allKnown = C.specials.every(x => s.learned.includes(x.id));
  const nLeft = C.specials.filter(x => !s.learned.includes(x.id)).length;
  const learnCard = allKnown
    ? `<button class="card lvlopt" data-act="lvlPick" data-k="hone"><div class="lvloptname">⚔ Hone your techniques</div>
        <div class="muted" style="font-size:13px">Every technique hits +1 harder${s.hone ? " (now +" + s.hone + ")" : ""}.</div></button>`
    : `<button class="card lvlopt" data-act="lvlPick" data-k="learnMenu"><div class="lvloptname">✦ Learn a technique</div>
        <div class="muted" style="font-size:13px">${nLeft} left to learn: ${C.specials.filter(x => !s.learned.includes(x.id)).map(x => esc(x.name)).join(", ")}.</div></button>`;
  return `<div class="lvlpanel tex">${head}
    <div class="lvlopts">
      <button class="card lvlopt" data-act="lvlPick" data-k="hp"><div class="lvloptname">♥ Toughen up</div>
        <div class="muted" style="font-size:13px">+20 max HP (now ${maxHpOf(s, h)}) and a full heal.</div></button>
      ${learnCard}
      <button class="card lvlopt" data-act="lvlPick" data-k="boon"><div class="lvloptname">🎲 ${cur ? "Reroll your boon" : "Roll a boon"}</div>
        <div class="muted" style="font-size:13px">${cur ? `Gamble <b style="color:${RARITY[cur.r].color}">${esc(cur.name)}</b> for a random new one. Rarer boons are stronger, chaos ones are weird.` : "A random perk that stays with " + esc(h.name) + ". Rarer is stronger, and chaos boons get weird."}</div></button>
    </div></div>`;
}

const SLASH = `<div class="slashpx"></div>`;
const CLAW = `<div class="clawpx"></div>`;
const BOLT = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>';
const SHIELD = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/></svg>';
const TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';


/* ===================== BATTLE ===================== */
function projectiles(style, crit) {
  if (style === "arrow") return `<div class="proj arrow"></div>` + (crit ? `<div class="proj arrow two"></div>` : "");
  if (style === "bolt") return `<div class="proj bolt"></div>` + (crit ? `<div class="proj bolt two"></div>` : "");
  if (style === "fire") return `<div class="proj fireball"></div>`;
  if (style === "meteor") return `<div class="proj meteor"></div><div class="meteordark"></div>`;
  if (style === "pierce") return `<div class="proj arrow pierce"></div>`;
  if (style === "rain") return [0, 1, 2].map(i => `<div class="proj uparrow" style="--x:${(i - 1) * 9}px;animation-delay:${(0.05 + i * 0.06).toFixed(2)}s"></div>`).join("")
    + [0, 1, 2, 3, 4, 5, 6].map(i => `<div class="proj rainarrow" style="--x:${(i - 3) * 12}px;animation-delay:${(0.4 + i * 0.035).toFixed(3)}s"></div>`).join("");
  if (style === "volley") return `<div class="proj arrow"></div><div class="proj arrow two"></div><div class="proj arrow three"></div>`;
  if (style === "snipe") return `<div class="proj arrow snipe"></div>`;
  if (style === "frost") return `<div class="proj bolt frost"></div>`;
  if (style === "chain") return `<div class="zap"></div>`;
  if (style === "whirl") return `<div class="whirlring"></div>` + SLASH;
  if (style === "judgment") return `<div class="holybeam gold"></div><div class="holybeam gold two"></div>`;
  if (style === "holy") return `<div class="holybeam"></div>`;
  if (style === "bash") return `<div class="bashring"></div>`;
  return "";
}

function viewBattle() {
  const b = S.battle;
  if (!b) return `<div class="wrap"><div class="empty">No battle running.</div></div>`;
  if (b.showVictory) { _battleFx = null; return viewVictory(); }
  if (b.over && !b.dying) { _battleFx = null; return viewDefeat(); }

  const q = b.cur;
  if (!q) return `<div class="wrap"><div class="empty">Nothing in this pool to fight with.</div></div>`;
  const s = b.s, h = b.h, C = CLASSES[h.cls], pend = b.pend, m = mods(s, h);
  const viewFloor = b.over ? b.koFloor : pend ? pend.floor : s.floor;
  const fl = floorInfo(s, viewFloor);

  // consume the one-shot effect so star taps / theme changes don't replay it
  const fx = b.fx; b.fx = null; _battleFx = fx;
  const t = fx ? fx.type : null;
  const attacking = t === "heroAttack" || t === "kill";
  const sp = fx && fx.special;
  const style = attacking ? fx.style : null;
  const D = IMPACT[style || "none"];
  const ranged = !!RANGED[style];

  const starred = !!progress.starred[q.id];
  const cc = q._cat ? ck(q._cat.color) : "var(--accent)";

  /* ---- hero ---- */
  let heroAct = "";
  if (t === "enter") heroAct = "a-enterL";
  else if (attacking) heroAct = ranged ? (BOWS[style] ? "a-draw" : "a-cast") : "a-lunge";
  else if (t === "enemyAttack") heroAct = fx.ko ? "a-dieHero" : fx.blocked ? "a-guard" : "a-hurtHero";
  else if (b.dying) heroAct = "a-dead";
  let heroExtra = "";
  if (t === "enemyAttack") heroExtra = fx.frozen ? `<div class="dmg" style="color:#7dd3fc">FROZEN</div>`
    : fx.missed ? `<div class="dmg" style="color:#e5e7eb">MISS</div>`
    : fx.blocked ? `<div class="blockfx">${SHIELD}</div><div class="dmg" style="color:#93c5fd">BLOCK</div>`
    : CLAW + `<div class="dmg" style="color:#ff6b6b">-${fx.dmg}</div>`;
  if (t === "enemyAttack" && fx.saved) heroExtra += `<div class="dmg heal" style="color:#fde047;--d:.9s">${esc(fx.saved)}!</div>`;
  if ((t === "kill" && fx.heal > 0) || (t === "heroAttack" && fx.healed > 0))
    heroExtra += `<div class="dmg heal" style="color:#4ade80">+${t === "kill" ? fx.heal : fx.healed}</div>`;
  if (sp) heroExtra += `<div class="aura" style="--ac:${AURA[sp]}"></div>`;
  if (sp === "holy" || sp === "judgment") heroExtra += `<div class="holyglow"></div>`;
  if (sp === "bash") heroExtra += `<div class="blockfx up">${SHIELD}</div>`;
  if (attacking && fx.xp) heroExtra += `<div class="xppop">+${fx.xp} XP</div>`;
  if (attacking && fx.leveled) heroExtra += `<div class="lvlrays"></div>`;
  if (s.guard && !b.dying) heroExtra += `<div class="guardicon">${SHIELD}</div>`;
  const armedNow = b.armed && !S.feedback && !b.lvl ? b.armed : null;
  const hero = fighterHtml(C.sprite, { side: "hero", id: "heroSlot", scale: m.fx === "tiny" ? 2 : HERO_SCALE, act: heroAct, idle: !b.dying,
    extra: heroExtra, cls: (m.fx ? "cx-" + m.fx : "") + (armedNow ? " armed" : ""), style: armedNow ? `--ac:${AURA[armedNow]}` : "" });

  /* ---- enemy (hidden while the fallen foe's spot waits for Next) ---- */
  const hitTag = attacking
    ? `<div class="dmg ${fx.crit ? "crit" : ""}" style="color:${fx.crit ? "#fde047" : sp ? C.color : "#ffffff"}">${fx.crit ? "CRIT " : ""}-${fx.dmg}</div>` + (fx.crit ? `<div class="critstar"></div>` : "") : "";
  const strike = attacking && style === "slash" ? SLASH : "";
  const stuck = t === "heroAttack" && style === "arrow" ? `<div class="stuck"></div>` + (fx.crit ? `<div class="stuck two"></div>` : "") : "";

  let enemy = "";
  if (!pend) {
    let enemyAct = "", enemyStyle = "";
    if (t === "enter") enemyAct = "a-enter";
    else if (t === "foeEnter") { enemyAct = b.enemy.boss ? "a-bossdrop" : "a-enter"; enemyStyle = "animation-delay:.08s"; }
    else if (t === "heroAttack") enemyAct = "a-hurt";
    else if (t === "enemyAttack") enemyAct = "a-lungeL";
    const frozen = s.frozen && t !== "foeEnter";
    const plate = `<div class="nameplate ${b.enemy.boss ? "boss" : ""} ${frozen ? "frozen" : ""}">${frozen ? "❄ " : ""}${esc(b.enemy.name)}</div>`;
    let ex = t === "heroAttack" ? strike + hitTag + stuck : "";
    if (t === "foeEnter" && fx.carry) ex += `<div class="dmg" style="color:${C.color};--d:.75s">-${fx.carry} carried</div>`;
    if (t === "foeEnter" && b.enemy.boss) ex += `<div class="bossbang">!</div>`;
    if (frozen) ex += `<div class="iceblock"></div>`;
    enemy = fighterHtml(b.enemy.key, { side: "enemy", id: "enemySlot", flip: true, act: enemyAct, actStyle: enemyStyle, plate, extra: ex, scale: b.enemy.scale, cls: frozen ? "frozen" : "" });
  }
  const corpse = t === "kill"
    ? fighterHtml(fx.dead.key, { side: "enemy", flip: true, ghost: true, idle: false, extra: strike + hitTag, scale: fx.dead.scale })
    : "";
  const sfxLayer = attacking ? projectiles(style, fx.crit && !sp) : "";

  /* ---- floor progress dots ---- */
  const nFoes = fl.foes.length, doneIdx = pend ? pend.done : s.idx;
  let dots = "";
  for (let i = 0; i <= nFoes; i++) {
    const cls = (i === nFoes ? "boss " : "") + (i < doneIdx ? "done" : i === doneIdx ? "now" : "");
    dots += `<i class="${cls}"></i>`;
  }
  const banner = fx && b.note && t === "kill" ? `<div class="banner ${b.note.kind}" style="animation-delay:${(D + 0.3).toFixed(2)}s">${esc(b.note.text)}</div>`
    : fx && fx.ko ? `<div class="banner boss" style="animation-delay:.7s">Knocked out</div>`
    : t === "foeEnter" && (b.enemy.boss || fx.newFloor) ? `<div class="banner ${b.enemy.boss ? "boss" : "floor"}" style="animation-delay:.25s">${esc(b.enemy.boss ? b.enemy.name : floorTitle(s, s.floor))}</div>` : "";
  const floorLabel = fl.endless ? fl.name : "Floor " + viewFloor;
  const bossBg = pend ? pend.dead.boss : b.enemy.boss;
  const flashCol = t === "enemyAttack" ? "#ef4444" : sp === "meteor" || sp === "fire" ? "#f97316" : sp === "pierce" || sp === "rain" ? "#bbf7d0" : "#fff";

  const lowHp = !b.dying && s.hp / maxHpOf(s, h) < 0.3;
  const arena = `<div class="arena ${m.fx ? "cx-" + m.fx : ""} ${lowHp ? "lowhp" : ""}" id="arena" style="--d:${D}s">
    <canvas class="arena-bg" id="arenaBg" data-story="${s.story}" data-floor="${viewFloor}" data-boss="${bossBg ? 1 : 0}"></canvas>
    ${m.fx === "disco" ? '<div class="discolayer"></div>' : ""}
    <div class="arena-hud">
      <span class="ptag">${esc(floorLabel)} <span class="floordots">${dots}</span></span>
      <span class="ptag" style="color:#fde047">Lv ${levelOf(h.xp)}</span>
    </div>
    <div class="stage">${hero}${corpse}${enemy}${sfxLayer}</div>
    <canvas class="ambient" id="ambient"></canvas>
    <div class="flashlayer ${attacking ? "go" : ""}" style="background:${flashCol}"></div>
    ${banner}
  </div>`;

  /* ---- HUD: hero HP (with damage trail) + XP, enemy HP bar ---- */
  const mxHp = maxHpOf(s, h);
  const hpNow = b.dying ? 0 : s.hp;
  const sh = b.shown || { hp: hpNow, xp: h.xp };
  const prevFrac = Math.min(1, sh.hp / mxHp), hpFrac = hpNow / mxHp;
  const healing = hpFrac > prevFrac;
  const fillFrom = fx && healing ? prevFrac : hpFrac;
  const trailFrom = fx && !healing ? prevFrac : hpFrac;
  const xpPct = x => xpInto(x) / XPL * 100;
  const xpFrom = fx ? (levelOf(sh.xp) < levelOf(h.xp) ? 0 : xpPct(sh.xp)) : xpPct(h.xp);
  b.shown = { hp: hpNow, xp: h.xp };

  const foe = pend ? { name: pend.dead.name, boss: pend.dead.boss, hits: 0, max: pend.dead.maxHits }
                   : { name: b.enemy.name, boss: b.enemy.boss, hits: b.enemy.hits, max: b.enemy.maxHits };
  const eNow = foe.hits / foe.max * 100;
  let eFill = eNow, eTrail = eNow, eDelay = "";
  if (attacking) { eTrail = fx.popTo / fx.max * 100; eFill = eTrail; eDelay = `transition-delay:${D.toFixed(2)}s`; }
  if (t === "foeEnter") { eFill = 0; eTrail = 0; eDelay = "transition-delay:.45s"; }
  const hud = `<div class="hud tex">
    <div class="hudcol">
      <div class="hudlabel"><span>HP${s.guard ? ` <span class="guardtag">${SHIELD}Guard</span>` : ""}</span><b style="color:${hpColor(hpFrac)}">${hpNow} / ${mxHp}</b></div>
      <div class="hpbar ${hpFrac < 0.3 && !b.dying ? "low" : ""}">
        <div class="trail" data-from="${trailFrom * 100}" data-to="${hpFrac * 100}" style="width:${trailFrom * 100}%"></div>
        <div class="fillb" data-from="${fillFrom * 100}" data-to="${hpFrac * 100}" style="width:${fillFrom * 100}%;background:${hpColor(hpFrac)}"></div>
      </div>
      <div class="xpbar" title="XP ${xpInto(h.xp)} / ${XPL}"><div data-from="${xpFrom}" data-to="${xpPct(h.xp)}" style="width:${xpFrom}%"></div></div>
      <div class="hudboon">${boonChip(b.lvl && b.lvl.stage === "reveal" ? Object.assign({}, h, { boon: b.lvl.old }) : h, true)}${s.frozen ? '<span class="boonchip" style="--rc:#7dd3fc">Foe frozen</span>' : ""}</div>
    </div>
    <div class="hudcol">
      <div class="hudlabel"><span class="foename">${esc(foe.name)}</span><b style="color:var(--bad)">${foe.hits} / ${foe.max}</b></div>
      <div class="hpbar foe ${foe.boss ? "boss" : ""}">
        <div class="trail" data-from="${eTrail}" data-to="${eNow}" style="width:${eTrail}%"></div>
        <div class="fillb" data-from="${eFill}" data-to="${eNow}" style="width:${eFill}%;${eDelay}"></div>
      </div>
      <div class="foesub">${foe.boss ? "Boss" : "Foe"}${b.enemy.boss && !pend ? " · remembers your misses" : ""}</div>
    </div>
  </div>`;

  /* ---- technique bar (only what this run has learned) ---- */
  let seg = "";
  for (let i = 0; i < C.maxCharge; i++) seg += `<i class="${i < s.charge ? "on" : ""}" style="${i < s.charge ? `background:${C.color}` : ""}"></i>`;
  const known = C.specials.filter(x => s.learned.includes(x.id));
  const specs = known.map(x => {
    const cost = costOf(x, m), ready = s.charge >= cost, armed = b.armed === x.id;
    return `<button class="spec ${ready ? "ready" : ""} ${armed ? "armed" : ""}" data-act="armSpecial" data-id="${x.id}"
      ${ready && !S.feedback && !b.lvl ? "" : "disabled"} style="--cc:${C.color}">
      <span class="spn">${esc(x.name)}${s.hone ? ` <small>+${s.hone}</small>` : ""}</span><span class="spc">${BOLT}${cost}</span>
    </button>`;
  }).join("");
  const armedSp = b.armed ? specialOf(h.cls, b.armed) : null;
  const specbar = `<div class="specbar tex ${s.charge >= C.maxCharge && known.length ? "full" : ""}">
    <div class="chargewrap"><span class="chargelbl" style="color:${C.color}">${BOLT}${s.charge}/${C.maxCharge}</span><div class="charge">${seg}</div></div>
    ${known.length ? `<div class="specbtns">${specs}</div>` : `<div class="armnote">No techniques yet. Level up to learn your first one.</div>`}
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
    return `<button class="opt tex" data-act="pick" data-pos="${pos}" style="border-color:${border};background:${bg}">
      <span class="box ${q.type}" style="border-color:${isSel ? "var(--accent)" : "color-mix(in srgb, var(--text) 32%, transparent)"};background:${isSel ? "var(--accent)" : "transparent"}">${isSel ? '<span class="dot"></span>' : ""}</span>
      <span>${esc(q.options[origIdx])}</span>
    </button>`;
  }).join("");

  let fb = "";
  if (S.feedback) {
    const ok = S.feedback === "correct", lh = b.lastHit || {};
    let head;
    if (ok) head = (lh.name ? lh.name + " hit for " + lh.dmg + "!" : lh.crit ? "Critical hit! " + lh.dmg + " damage" : lh.dmg > 1 ? "Hit for " + lh.dmg + "!" : "Hit!") + (lh.surged ? " Mana Surge refilled your charge." : "");
    else if (b.dying) head = "Knocked out" + (lh.fizzle ? ". " + lh.fizzle + " fizzled" : "");
    else if (lh.frozen) head = (lh.fizzle ? lh.fizzle + " fizzled, but the" : "The") + " frozen foe couldn't swing";
    else if (lh.missed) head = (lh.fizzle ? lh.fizzle + " fizzled, but the" : "Wrong, but the") + " attack missed you";
    else if (lh.blocked) head = (lh.fizzle ? lh.fizzle + " fizzled, but your" : "Your") + " shield blocked the hit";
    else head = (lh.fizzle ? lh.fizzle + " fizzled. " : "") + "You took " + lh.dmg + " damage" + (lh.saved ? ". " + lh.saved + " kept you standing!" : "");
    fb = `<div class="fb tex ${fx ? "fbpop" : ""}" style="background:${ok ? "var(--okBg)" : "var(--badBg)"};border:1px solid ${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:14px">
      ${ok ? I.check("var(--ok)") : I.x("var(--bad)")}
      <div><div style="font-weight:bold;color:${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:4px">${head}</div>
      <div class="dim" style="font-size:14px;line-height:1.6">${esc(q.explanation || "")}</div></div>
    </div>`;
  }

  const atkLabel = armedSp ? `${BOLT} Cast ${esc(armedSp.name)}` : `${I.sword} Attack`;
  const nextLabel = pend && b.enemy.boss && pend.floor === s.floor ? "Face " + esc(b.enemy.name) + " →"
    : pend && pend.floor !== s.floor ? "Onward to " + esc(floorInfo(s, s.floor).name) + " →" : "Next →";
  const btn = !S.feedback
    ? `<button class="primary" data-act="submitBattle" style="background:${S.selected.length ? (armedSp ? `color-mix(in srgb, ${C.color} 62%, #000)` : "var(--accent)") : "var(--border)"};color:${S.selected.length ? "#fff" : "var(--muted)"}" ${S.selected.length ? "" : "disabled"}>${atkLabel}</button>`
    : b.dying
      ? `<button class="primary" data-act="battleNext" style="background:var(--bad)">See results →</button>`
      : b.victory
        ? `<button class="primary" data-act="battleNext" style="background:var(--star)">Claim victory →</button>`
        : s.picks > 0
          ? `<button class="primary" data-act="battleNext" style="background:var(--star);color:#111">★ Level up! Choose your pick →</button>`
          : `<button class="primary" data-act="battleNext" style="background:${pend && b.enemy.boss ? "var(--bad)" : "var(--accent)"}">${nextLabel}</button>`;

  const tag = b.curMiss ? `<div class="qtag">${esc(b.enemy.name)} remembers your misses</div>`
    : b.curStar ? `<div class="qtag star">Starred · back for another round</div>` : "";
  const left = freshLeft();

  return `<div class="wrap battle">
    <div class="bhead">
      <button class="backbtn" data-act="toAdvMenu" title="Save & exit">${I.chevL}</button>
      <span class="eyebrow" style="color:${C.color}">${esc(h.name)} · ${C.name}${filterLabel()}</span>
      <div style="display:flex;align-items:center;gap:12px">
        ${typeof lessonBtn === "function" && !b.lvl ? lessonBtn(q) : ""}
        <button class="star" ${b.lvl ? 'data-hide="1"' : ""} data-act="star" data-id="${q.id}" style="color:${starred ? "var(--star)" : "var(--muted)"}">${I.star(starred, 20)}</button>
      </div>
    </div>
    <div class="bgrid">
      <div class="bleft">${arena}${hud}${specbar}</div>
      <div class="bright">
        ${b.lvl ? viewLevelUp() : `<div class="card qcard tex" style="cursor:default">
          <div class="eyebrow" style="color:${cc};margin-bottom:10px">${q.type === "mc" ? "Multiple Choice" : "Select All That Apply"}${q._cat ? " · " + esc(q._cat.category) : ""}</div>
          ${tag}
          <div class="qtext">${esc(q.question)}</div>
          <div class="qleft">${left} new question${left === 1 ? "" : "s"} left before repeats</div>
        </div>
        <div class="bopts">${opts}</div>
        ${fb}
        <div>${btn}</div>`}
      </div>
    </div>
  </div>`;
}

/* Canvases are wiped by every innerHTML render, so redraw after each one,
   then fire whatever one-shot effect the last action queued.            */
function mountSprites() {
  document.querySelectorAll("canvas[data-sprite]").forEach(cv => {
    drawSprite(cv, cv.dataset.sprite, +(cv.dataset.scale || 4), cv.hasAttribute("data-flip"));
  });
  const bgc = document.getElementById("arenaBg");
  if (bgc) drawArenaBg(bgc, bgc.dataset.story || "classic", +bgc.dataset.floor, bgc.dataset.boss === "1");
  if (typeof mountTrophies === "function") mountTrophies();

  // animate bars from their previous values
  const bars = document.querySelectorAll("#app [data-from]");
  if (bars.length) {
    requestAnimationFrame(() => requestAnimationFrame(() =>
      bars.forEach(el => { el.style.width = el.dataset.to + "%"; })));
  }

  if (S.screen === "battle" && document.getElementById("ambient")) ambientStart();
  const fx = _battleFx; _battleFx = null;
  if (!fx || S.screen !== "battle") return;
  const arena = document.getElementById("arena");
  const style = fx.style || "none";
  const D = IMPACT[style] || IMPACT.none;
  const shake = (cls, sec) => setTimeout(() => {
    if (!arena.isConnected) return;
    arena.classList.remove("shake", "shake-lg"); void arena.offsetWidth; arena.classList.add(cls);
  }, sec * 1000);
  const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const rand = (a, b) => a + Math.random() * (b - a);
  /* a stream of particles laid along a path over time (projectile trails) */
  const trail = (x0, y0, x1, y1, t0, dur, cols, n, o) => {
    o = o || {};
    const list = [];
    for (let i = 0; i < n; i++) {
      const k = i / Math.max(1, n - 1);
      list.push({ x: x0 + (x1 - x0) * k + rand(-3, 3), y: y0 + (y1 - y0) * k + rand(-3, 3),
        vx: rand(-25, 25) + (o.vx || 0), vy: rand(-25, 25) + (o.vy || 0), life: o.life || rand(0.25, 0.45), size: o.size || 3,
        color: cols[i % cols.length], g: o.g == null ? -40 : o.g, drag: 0.94, shape: "px", shrink: true, delay: t0 + dur * k });
    }
    fxAdd(list);
  };
  /* flames / sparkles swirling up around the hero while a special winds up */
  const windup = (cols, n, dur, o) => {
    const hb = document.querySelector("#heroSlot .body");
    if (!hb) return;
    o = o || {};
    const r = hb.getBoundingClientRect(), list = [];
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      list.push({ x: r.left + r.width / 2 + side * rand(r.width * 0.2, r.width * 0.65), y: r.bottom - rand(0, r.height * 0.5),
        vx: -side * rand(5, 25) + (o.vx || 0), vy: -rand(40, 110) * (o.rise || 1), life: rand(0.35, 0.7), size: o.size || rand(2.5, 4.5),
        color: cols[i % cols.length], g: o.g == null ? -60 : o.g, drag: 0.96, shape: o.shape || "px", shrink: true, delay: rand(0, dur) });
    }
    fxAdd(list);
  };
  const SP_COLORS = {
    bash: ["#ffffff", "#93c5fd", "#fde68a"], holy: ["#fef9c3", "#fde047", "#ffffff"],
    fire: ["#fde047", "#f97316", "#ef4444", "#7c2d12"], meteor: ["#fde047", "#f97316", "#ef4444", "#57534e", "#292524"],
    pierce: ["#ffffff", "#d9f99d", "#4ade80"], rain: ["#ffffff", "#bbf7d0", "#a3e635"],
    arrow: ["#ffffff", "#e5e7eb", "#cbd5e1"], bolt: ["#ffffff", "#ddd6fe", "#a78bfa"], slash: ["#ffffff", "#fde68a", "#fbbf24"],
    whirl: ["#ffffff", "#e0f2fe", "#93c5fd"], judgment: ["#ffffff", "#fef08a", "#fde047", "#facc15"],
    frost: ["#ffffff", "#e0f2fe", "#7dd3fc", "#38bdf8"], chain: ["#ffffff", "#ede9fe", "#c4b5fd", "#facc15"],
    volley: ["#ffffff", "#e5e7eb", "#bbf7d0"], snipe: ["#ffffff", "#fde047", "#facc15"],
  };

  if (fx.type === "heroAttack" || fx.type === "kill") {
    const target = fx.type === "kill"
      ? document.querySelector("#arena canvas[data-ghost]")
      : document.querySelector("#enemySlot canvas");
    const heroC = document.querySelector("#heroSlot canvas");
    const sp = fx.special;
    if (target && heroC) {
      const [x, y] = centerOf(target), [hx, hy] = centerOf(heroC);
      const big = sp === "meteor" || sp === "holy" || sp === "fire" || sp === "judgment";
      const cols = sp ? SP_COLORS[sp] : fx.crit ? ["#fde047", "#ffffff", "#facc15"] : SP_COLORS[style] || SP_COLORS.slash;
      fxPixels(x, y, cols, big ? 34 : sp || fx.crit ? 22 : 14,
        { speed: big ? 420 : 300, life: big ? 0.7 : 0.45, size: big ? 4 : 3, g: big ? 380 : 200, delay: D, shape: big ? "px" : "spark" });

      if (fx.frozenHit) fxPixels(x, y, ["#e0f2fe", "#ffffff", "#7dd3fc"], 16, { speed: 260, life: 0.6, size: 3, g: 600, delay: D, shape: "px" });
      if (fx.crit) fxPixels(x, y, ["#fde047", "#ffffff"], 12, { speed: 340, life: 0.4, size: 3, g: 0, delay: D, shape: "spark" });
      if (fx.type === "kill") fxPixels(x, y, ["#facc15", "#fde68a", "#a16207"], 10, { speed: 220, life: 0.9, size: 6, g: 700, delay: D + 0.15, angle: -Math.PI / 2, spread: Math.PI * 0.8, shrink: false });
      // wind-ups and trails
      if (style === "bolt") trail(hx + 14, hy - 4, x, y, 0.1, D - 0.1, ["#ddd6fe", "#a78bfa", "#ffffff"], 10);
      if (style === "arrow" && fx.crit) trail(hx + 14, hy, x, y, 0.09, D - 0.09, ["#fde047", "#ffffff"], 8, { g: 0 });
      if (sp === "fire") {
        windup(["#fde047", "#f97316", "#ef4444", "#fb923c"], 34, 0.3);
        trail(hx + 16, hy - 6, x, y, 0.16, D - 0.16, ["#fde047", "#f97316", "#ef4444"], 18, { g: -80 });
      }
      if (sp === "meteor") {
        windup(["#fde047", "#f97316", "#ef4444", "#7c2d12"], 46, 0.45, { rise: 1.4, size: 4 });
        const ar = arena.getBoundingClientRect();
        trail(ar.right - 8, ar.top - 20, x, y, 0.15, D - 0.15, ["#fde047", "#f97316", "#ef4444", "#57534e"], 26, { g: -60, size: 4, life: 0.5 });
        fxPixels(x, y + 20, ["#57534e", "#78716c", "#292524"], 20, { speed: 260, life: 0.9, size: 5, g: 700, delay: D + 0.05, angle: -Math.PI / 2, spread: Math.PI });
      }
      if (sp === "pierce") {
        windup(["#4ade80", "#bbf7d0", "#ffffff"], 26, 0.2, { shape: "spark", vx: 40 });
        const ar = arena.getBoundingClientRect();
        trail(hx + 16, hy, ar.right + 10, y, 0.12, 0.34, ["#4ade80", "#d9f99d", "#ffffff"], 24, { g: 0, size: 3 });
      }
      if (sp === "rain") {
        windup(["#a3e635", "#bbf7d0", "#ffffff"], 24, 0.2, { shape: "spark" });
        trail(hx + 6, hy - 10, hx + 30, hy - 160, 0.05, 0.28, ["#ffffff", "#bbf7d0"], 10, { g: 0 });
      }
      if (sp === "holy") windup(["#fef9c3", "#fde047", "#ffffff"], 30, 0.3, { rise: 0.7 });
      if (sp === "bash") windup(["#ffffff", "#93c5fd"], 14, 0.12, { shape: "spark" });
      if (sp === "whirl") windup(["#ffffff", "#e0f2fe", "#93c5fd"], 24, 0.18, { shape: "spark", rise: 0.4 });
      if (sp === "judgment") {
        windup(["#fef9c3", "#fde047", "#ffffff"], 40, 0.35, { rise: 1.3 });
        const ar = arena.getBoundingClientRect();
        fxPixels(x, ar.top + 4, ["#fffbe6", "#fde047"], 24, { speed: 160, life: 0.6, size: 3, g: 600, delay: D - 0.05, angle: Math.PI / 2, spread: 0.6 });
      }
      if (sp === "frost") {
        windup(["#e0f2fe", "#7dd3fc", "#ffffff"], 22, 0.22, { rise: 0.6 });
        trail(hx + 14, hy - 4, x, y, 0.1, D - 0.1, ["#e0f2fe", "#7dd3fc", "#ffffff"], 14, { g: 60 });
        fxPixels(x, y, ["#e0f2fe", "#ffffff", "#7dd3fc"], 18, { speed: 160, life: 0.9, size: 3, g: 120, delay: D, shape: "px" });
      }
      if (sp === "chain") {
        windup(["#c4b5fd", "#facc15", "#ffffff"], 24, 0.2, { shape: "spark" });
        trail(hx + 14, hy - 4, x, y, 0.1, D - 0.1, ["#ffffff", "#facc15", "#c4b5fd"], 16, { g: 0, life: 0.2 });
      }
      if (sp === "volley") windup(["#bbf7d0", "#ffffff"], 12, 0.12, { shape: "spark", vx: 40 });
      if (sp === "snipe") {
        windup(["#fde047", "#ffffff"], 20, 0.25, { shape: "spark", rise: 0.3 });
        trail(hx + 16, hy, x, y, 0.2, D - 0.2, ["#fde047", "#ffffff"], 18, { g: 0 });
      }
    }
    shake(fx.special === "meteor" || fx.special === "judgment" ? "shake-lg" : "shake", D);
    if (fx.special === "meteor") setTimeout(() => flashGlow("#f97316", 700), D * 1000);
    if (fx.special === "holy" || fx.healed > 0 || (fx.type === "kill" && fx.heal > 0) || (fx.type === "heroAttack" && fx.healed > 0)) {
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
          setTimeout(() => { if (hero.isConnected) hero.parentElement.classList.add("a-hop"); }, D * 1000);
          const r = hero.getBoundingClientRect();
          const list = [];
          for (let i = 0; i < 26; i++) list.push({ x: r.left + Math.random() * r.width, y: r.bottom - Math.random() * 10,
            vx: (Math.random() - 0.5) * 30, vy: -80 - Math.random() * 140, life: 0.9 + Math.random() * 0.5, size: 3 + (i % 2),
            color: i % 3 ? "#fde047" : "#ffffff", g: -40, drag: 0.98, shape: "px", shrink: true, delay: D + 0.3 + Math.random() * 0.4 });
          fxAdd(list);
        }
      }
    }
  } else if (fx.type === "foeEnter") {
    if (S.battle && S.battle.enemy && S.battle.enemy.boss) {
      shake("shake-lg", 0.52);
      const e = document.querySelector("#enemySlot canvas");
      if (e) { const [x, y] = centerOf(e); fxPixels(x, y + 30, ["#78716c", "#a8a29e", "#57534e"], 18, { speed: 220, life: 0.6, size: 4, g: 600, delay: 0.5, angle: -Math.PI / 2, spread: Math.PI * 0.9 }); }
    }
  } else if (fx.type === "enemyAttack") {
    const hero = document.querySelector("#heroSlot canvas");
    if (hero) {
      const [x, y] = centerOf(hero);
      if (fx.missed || fx.frozen) fxPixels(x + 18, y, fx.frozen ? ["#e0f2fe", "#7dd3fc"] : ["#ffffff", "#e5e7eb"], 10, { speed: 160, life: 0.4, size: 3, g: 0, delay: 0.2, shape: "spark", angle: -Math.PI / 2, spread: Math.PI });
      else if (fx.blocked) fxPixels(x + 14, y, ["#ffffff", "#93c5fd", "#e0f2fe"], 14, { speed: 260, life: 0.4, size: 3, g: 100, delay: 0.2, shape: "spark", angle: 0, spread: Math.PI });
      else fxPixels(x, y, ["#ef4444", "#fca5a5", "#ffffff"], 16, { speed: 260, life: 0.5, size: 4, g: 500, delay: 0.2, angle: Math.PI, spread: Math.PI * 1.1 });
    }
    const soft = fx.blocked || fx.missed || fx.frozen;
    shake(soft ? "shake" : "shake-lg", 0.2);
    if (!soft) setTimeout(() => flashGlow("var(--bad)", 520), 200);
    if (fx.saved) setTimeout(() => flashGlow("#fde047", 900), 600);
  }
}

/* ===================== AMBIENT PIXEL LAYER =====================
   A low-res canvas over the arena (1 pixel = 3 css px) that keeps
   running between answers: story weather, flames under the hero while
   a technique is armed, frost around a frozen foe, a shield shimmer,
   motes around bosses. Quiet by design; it never covers the question. */
const AP = 3;
const AMB = { parts: [], raf: 0, cv: null, last: 0, t: 0, acc: {}, hero: null, foe: null, measured: 0 };
const AMB_COLORS = {
  bash: ["#ffffff", "#bfdbfe", "#60a5fa"], whirl: ["#ffffff", "#e0f2fe", "#93c5fd"],
  holy: ["#fffbe6", "#fde047", "#facc15"], judgment: ["#ffffff", "#fef08a", "#facc15"],
  frost: ["#ffffff", "#bae6fd", "#38bdf8"], fire: ["#fde047", "#f97316", "#ef4444"],
  chain: ["#ffffff", "#facc15", "#a78bfa"], meteor: ["#fde047", "#f97316", "#dc2626", "#7f1d1d"],
  volley: ["#ffffff", "#bbf7d0", "#4ade80"], pierce: ["#d9f99d", "#4ade80", "#16a34a"],
  snipe: ["#ffffff", "#fde047", "#eab308"], rain: ["#ecfccb", "#a3e635", "#4ade80"],
};
function ambientStart() {
  if (AMB.raf || REDUCED) return;
  AMB.last = performance.now();
  AMB.raf = requestAnimationFrame(ambientLoop);
}
function ambMeasure(cv) {
  const a = cv.getBoundingClientRect();
  const mirror = cv.parentElement && cv.parentElement.classList.contains("cx-mirror");
  const rel = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width) return null;
    const x0 = mirror ? a.right - r.right : r.left - a.left;
    return { x: x0 / AP, y: (r.top - a.top) / AP, w: r.width / AP, h: r.height / AP };
  };
  AMB.hero = rel(document.querySelector("#heroSlot .body canvas"));
  AMB.foe = rel(document.querySelector("#enemySlot .body canvas"));
}
function ambEmit(key, rate, dt, fn) {
  AMB.acc[key] = (AMB.acc[key] || 0) + rate * dt;
  while (AMB.acc[key] >= 1) { AMB.acc[key] -= 1; AMB.parts.push(fn()); }
}
function ambientLoop(now) {
  const cv = document.getElementById("ambient");
  const b = S.battle;
  if (!cv || S.screen !== "battle" || !b || !b.s) { AMB.raf = 0; AMB.parts = []; AMB.cv = null; return; }
  const dt = Math.min(0.05, (now - AMB.last) / 1000); AMB.last = now; AMB.t += dt;
  const W = Math.max(10, Math.ceil(cv.clientWidth / AP)), H = Math.max(10, Math.ceil(cv.clientHeight / AP));
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  if (cv !== AMB.cv || now - AMB.measured > 300) { AMB.cv = cv; AMB.measured = now; ambMeasure(cv); }
  const g = cv.getContext("2d");
  g.clearRect(0, 0, W, H);
  const s = b.s, R = Math.random, hero = AMB.hero, foe = b.pend ? null : AMB.foe;
  const groundY = H - 10;
  const rnd = (a, c) => a + R() * (c - a);
  const pick = arr => arr[Math.floor(R() * arr.length)];

  /* --- story weather --- */
  const scene = storyOf(s).scene;
  if (scene === "cells" || scene === "sea") ambEmit("w", scene === "sea" ? 7 : 5, dt, () => ({
    x: rnd(0, W), y: groundY, vx: 0, vy: -rnd(5, 12), life: rnd(3, 6), c: scene === "sea" ? pick(["#bae6fd", "#e0f2fe", "#7dd3fc"]) : pick(["#d1fae5", "#a7f3d0", "#ffffff"]),
    wob: rnd(0, 6), sz: R() < 0.25 ? 2 : 1, ring: R() < 0.3 }));
  else if (scene === "lava") ambEmit("w", 9, dt, () => ({ x: rnd(0, W), y: groundY + rnd(0, 6), vx: rnd(-3, 3), vy: -rnd(12, 26), life: rnd(1.2, 2.4), c: pick(["#fde047", "#fb923c", "#f97316", "#ef4444"]), flick: 1 }));
  else if (scene === "ice") ambEmit("w", 10, dt, () => ({ x: rnd(0, W), y: -2, vx: rnd(-3, 3), vy: rnd(6, 12), life: rnd(6, 9), c: pick(["#ffffff", "#e0f2fe", "#bae6fd"]), wob: rnd(0, 6), sz: R() < 0.2 ? 2 : 1 }));
  else if (scene === "desert") ambEmit("w", 12, dt, () => ({ x: -2, y: rnd(groundY - 30, groundY + 4), vx: rnd(25, 45), vy: rnd(-2, 2), life: rnd(2.5, 4), c: pick(["#e7c27d", "#d6b26a", "#f5deb3"]) }));
  else if (scene === "carnival") ambEmit("w", 5, dt, () => ({ x: rnd(0, W), y: -2, vx: rnd(-4, 4), vy: rnd(7, 13), life: rnd(5, 8), c: pick(["#f472b6", "#facc15", "#60a5fa", "#4ade80", "#c084fc"]), wob: rnd(0, 6), flick: 1 }));
  else if (scene === "gears") ambEmit("w", 4, dt, () => ({ x: rnd(0, W), y: groundY, vx: rnd(-2, 2), vy: -rnd(6, 12), life: rnd(1.5, 2.5), c: pick(["#d6d3d1", "#a8a29e", "#e7e5e4"]), sz: 2, grow: 1 }));
  else ambEmit("w", 3, dt, () => ({ x: rnd(0, W), y: rnd(groundY * 0.4, groundY - 4), vx: rnd(-4, 4), vy: rnd(-3, 3), life: rnd(2, 4), c: pick(["#fef08a", "#d9f99d"]), blink: 1, wob: rnd(0, 6) }));

  /* --- technique armed: flames rising from the hero's feet --- */
  const armed = b.armed && !S.feedback && !b.lvl ? b.armed : null;
  if (armed && hero) {
    const cols = AMB_COLORS[armed] || ["#ffffff"];
    ambEmit("arm", 55, dt, () => ({ x: hero.x + rnd(-2, hero.w + 2), y: hero.y + hero.h - rnd(0, 2), vx: rnd(-3, 3), vy: -rnd(12, 30), life: rnd(0.35, 0.8), c: pick(cols), flick: 1 }));
    // pulsing pixel ring on the ground
    const cx = hero.x + hero.w / 2, cy = hero.y + hero.h, rx = hero.w * 0.65 + Math.round(Math.sin(AMB.t * 8)), ry = 2;
    g.fillStyle = cols[Math.floor(AMB.t * 6) % cols.length];
    for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; g.fillRect(Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry), 1, 1); }
  }
  /* --- frozen foe: frost drifting off it --- */
  if (s.frozen && foe) ambEmit("frz", 12, dt, () => ({ x: foe.x + rnd(0, foe.w), y: foe.y + rnd(0, foe.h * 0.5), vx: rnd(-2, 2), vy: rnd(3, 8), life: rnd(0.8, 1.6), c: pick(["#ffffff", "#e0f2fe", "#7dd3fc"]), blink: 1 }));
  /* --- guard: shimmer around the hero --- */
  if (s.guard && hero) ambEmit("grd", 9, dt, () => { const t = R() * Math.PI * 2; return { x: hero.x + hero.w / 2 + Math.cos(t) * hero.w * 0.7, y: hero.y + hero.h / 2 + Math.sin(t) * hero.h * 0.6, vx: 0, vy: -2, life: 0.5, c: pick(["#ffffff", "#93c5fd"]) }; });
  /* --- full charge: sparks in the class color --- */
  if (s.charge >= CLASSES[b.h.cls].maxCharge && s.learned.length && hero && !armed) ambEmit("chg", 5, dt, () => ({ x: hero.x + rnd(0, hero.w), y: hero.y + rnd(0, hero.h), vx: 0, vy: -rnd(4, 10), life: 0.6, c: pick([CLASSES[b.h.cls].color, "#ffffff"]), blink: 1 }));
  /* --- boss: dark motes rising around it --- */
  if (b.enemy && b.enemy.boss && foe) ambEmit("boss", 10, dt, () => ({ x: foe.x + rnd(-4, foe.w + 4), y: foe.y + foe.h - rnd(0, 4), vx: rnd(-2, 2), vy: -rnd(6, 14), life: rnd(0.8, 1.5), c: pick(["#7f1d1d", "#4c1d95", "#1c1917", "#991b1b"]) }));

  /* --- update + draw --- */
  const keep = [];
  for (const p of AMB.parts) {
    p.life -= dt;
    if (p.life <= 0 || p.x < -4 || p.x > W + 4 || p.y < -6 || p.y > H + 4) continue;
    p.x += (p.vx + (p.wob != null ? Math.sin(AMB.t * 2 + p.wob) * 3 : 0)) * dt;
    p.y += p.vy * dt;
    if (p.blink && Math.floor((AMB.t + p.x) * 4) % 3 === 0) { keep.push(p); continue; }
    g.globalAlpha = p.life < 0.3 ? 0.5 : 1;
    g.fillStyle = p.flick && R() < 0.2 ? "#ffffff" : p.c;
    const sz = p.grow ? 1 + Math.min(2, Math.floor((2.5 - p.life) * 1.2)) : (p.sz || 1);
    const x = Math.round(p.x), y = Math.round(p.y);
    if (p.ring && sz > 1) { g.fillRect(x, y - 1, 1, 1); g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y + 1, 1, 1); }
    else g.fillRect(x, y, sz, sz);
    keep.push(p);
  }
  g.globalAlpha = 1;
  AMB.parts = keep.length > 400 ? keep.slice(-400) : keep;
  AMB.raf = requestAnimationFrame(ambientLoop);
}
