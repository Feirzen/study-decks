/* ===================================================================
   tower.js: the Tower revamp (adventure format v3)
   - One floor per chapter of the deck. Each floor's foes are sized so you
     walk that whole chapter, and the floor boss is warded until you have.
   - Bosses come from a big shared pool, shuffled per adventure.
   - The Throne: a separate room above the last chapter. Opens at 90% of
     the deck answered. The final boss calls minions in to shield him.
   - Bosses sometimes cast effects (fog, quake, shadow, heal, fury).
   - Floors unlock from question progress (any mode), or by clearing the
     floor below. Cleared floors can be revisited from the stairs button,
     and come back with new things each visit.
   - Bigger floors (more rooms) and a minimap.
   - Seasonal story: Halloween runs Oct 16 to Nov 10 in every deck.
   Loaded after filters.js / sync.js, so its overrides win.
   =================================================================== */

/* ===================== SEASONS ===================== */
const SEASONS = [{ id: "halloween", from: [10, 16], to: [11, 10] }];   // [month, day], inclusive
function seasonNow(d) {
  d = d || new Date();
  const v = (d.getMonth() + 1) * 100 + d.getDate();
  const hit = SEASONS.find(x => v >= x.from[0] * 100 + x.from[1] && v <= x.to[0] * 100 + x.to[1]);
  return hit ? hit.id : null;
}

/* ===================== HUE-SHIFTED SPRITES ("base~h120") ===================== */
function _hexHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function _hslHex(h, s, l) {
  const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return "#" + [f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, "0")).join("");
}
const _hueCache = {};
const _twGetSprite = getSprite;
getSprite = function (name) {
  const m = /^(.*)~h(-?\d+)$/.exec(name);
  if (!m) return _twGetSprite(name);
  if (_hueCache[name]) return _hueCache[name];
  const base = _twGetSprite(m[1]); if (!base) return null;
  const pal = {};
  Object.keys(base.pal).forEach(k => {
    const c = base.pal[k];
    if (!/^#[0-9a-f]{6}$/i.test(c)) { pal[k] = c; return; }
    const [h, s, l] = _hexHsl(c);
    pal[k] = s < 0.12 ? c : _hslHex((h + +m[2] + 360) % 360, s, l);   // greys/whites/blacks stay put
  });
  return (_hueCache[name] = { rows: base.rows, pal });
};

/* ===================== HALLOWEEN STORY ===================== */
Object.assign(VARIANTS, {
  "mushroom~pumpkin": { r: "#f97316", w: "#fdba74", R: "#9a3412", s: "#fde68a", S: "#c2410c", e: "#1c1917", m: "#1c1917", f: "#166534" },
  "showman~pumpkin":  { s: "#fb923c", S: "#c2410c", e: "#fde047", m: "#7c2d12", c: "#4c1d95", C: "#2e1065", h: "#14532d", H: "#166534", r: "#f97316", w: "#fef3c7", p: "#1c1917" },
  "lich~witch":       { V: "#1c1917", v: "#0c0a09", g: "#a3e635", o: "#a3e635", O: "#ecfccb", y: "#f97316" },
  "slime~goo":        { a: "#a3e635", b: "#4d7c0f", W: "#f7fee7", e: "#1a2e05" },
  "slimeking~cauldron": { a: "#84cc16", b: "#3f6212", W: "#ecfccb", e: "#1a2e05", g: "#f97316", G: "#9a3412" },
  "m_balloon~pumpkin": { r: "#f97316", R: "#fdba74", w: "#166534" },
  "m_npc~halloween":  { h: "#581c87", c: "#f97316", C: "#fb923c" },
  "m_crystal~witch":  { c: "#a855f7", C: "#e9d5ff", d: "#581c87" },
});
LOOK.halloween = { floor: "#2b2433", floor2: "#262030", speck: ["#3b3047", "#1c1624"], wall: "#3b2a4a", hi: "#f97316", lo: "#160d1f",
  pat: "brick", props: ["m_tree~charred", "m_bones", "m_balloon~pumpkin", "m_crystal~witch", "m_urn"], decal: "crack", fog: "#06030a" };
QUEST_ITEM.halloween = "candy corn";
NPC_NAME.halloween = "Lost Trick-or-Treater";
STORIES.halloween = {
  title: "The Pumpkin King's Night", scene: "castle", look: "halloween", color: "#f97316", season: "halloween",
  premise: "Every jack-o'-lantern in town lit itself at midnight, and the costumes started walking off on their own. The Pumpkin King is back, and he means to keep it Halloween forever.",
  goal: "Climb Hollow Manor and snuff out the Pumpkin King.",
  victory: "The Pumpkin King's grin flickers, sputters, and goes dark. Across town the jack-o'-lanterns blow out one by one, and the costumes slump back into closets where they belong.",
  trophy: { name: "The Pumpkin King's Crown", perk: "xp", text: "+10% XP" },
  throne: "The Pumpkin King's Hall",
  floors: [
    F("The Pumpkin Patch", [214, 110, 40], [["mushroom~pumpkin", "Jack-o'-Shroom"], ["bat", "Bat"], ["slime~goo", "Goo Slime"], ["skeleton", "Skeleton"]], ["golem~h30", "The Scarecrow Colossus", 6]),
    F("The Haunted Cornfield", [170, 140, 60], [["ghost", "Sheet Ghost"], ["mushroom~pumpkin", "Jack-o'-Shroom"], ["spider", "Cobweb Spider"], ["bat", "Bat"]], ["spider~h20", "Mother Widow", 8, 6]),
    F("The Witch's Wood", [110, 70, 150], [["imp", "Candy Devil"], ["slime~goo", "Goo Slime"], ["eyeball~h80", "Bog Eye"], ["ghost_violet", "Phantom"]], ["slimeking~cauldron", "The Cauldron Blob", 10]),
    F("Graveyard Hollow", [90, 100, 120], [["skeleton", "Skeleton"], ["ghost", "Sheet Ghost"], ["bat_blood", "Vampire Bat"], ["knight~h270", "Grave Knight"]], ["lich~witch", "The Witch Queen", 12]),
    F("Hollow Manor", [150, 70, 40], [["knight~h270", "Grave Knight"], ["imp", "Candy Devil"], ["ghost_violet", "Phantom"]], ["showman~pumpkin", "The Pumpkin King", 16, 5]),
  ],
};
/* in season, every deck plays the seasonal story */
const _twStoryForDeck = storyForDeck;
storyForDeck = function (meta) { const s = seasonNow(); return s && STORIES[s] ? s : _twStoryForDeck(meta); };

/* ===================== BOSS POOL ===================== */
const EXTRA_BOSSES = [
  ["golem~h140", "The Moss Colossus"], ["slimeking~h200", "The Abyssal Ooze"], ["lich~h160", "The Verdant Lich"],
  ["dragon~h260", "The Void Drake", 4], ["commander~h40", "The Gilded Warlord"], ["spider~h90", "The Venom Matriarch", 6],
  ["crab~h280", "The Amethyst Crab", 6], ["golem~h300", "The Crystal Sentinel"], ["beetle~h40", "The Gilded Beetle", 6],
  ["eyeball~h120", "The All-Seeing Eye", 6], ["knight~h20", "The Ember Knight"], ["hooded~h180", "The Tide Oracle", 5],
  ["goblin~h200", "The Frost Goblin King"], ["imp~h180", "The Storm Imp"], ["skeleton~h40", "The Bone Baron"],
  ["ghost~h300", "The Weeping Shade"], ["mushroom~h260", "The Spore Lord"], ["bat~h90", "The Plague Bat", 6],
];
function bossPool() {
  const out = [];
  Object.keys(STORIES).forEach(k => STORIES[k].floors.forEach((f, i) => { if (i < 4) out.push({ key: f.boss.key, name: f.boss.name, scale: f.boss.scale, home: k }); }));
  EXTRA_BOSSES.forEach(([key, name, scale]) => out.push({ key, name, scale: scale || 5, home: null }));
  return out;
}
function shuffled(arr, R) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const _bossOrder = {};
/* the run's own story bosses come first-ish, mixed with guests from the pool, never twice until all are used */
function towerBosses(run) {
  const key = (run.created || 0) + ":" + run.story;
  if (_bossOrder[key]) return _bossOrder[key];
  const R = rng32(hashStr("boss:" + key)), st = storyOf(run);
  const own = shuffled(st.floors.slice(0, 4).map(f => ({ key: f.boss.key, name: f.boss.name, scale: f.boss.scale })), R);
  const guests = shuffled(bossPool().filter(b => b.home !== run.story && !own.some(o => o.name === b.name)), R);
  const out = [];
  while (own.length || guests.length) {
    if (own.length && (R() < 0.5 || !guests.length)) out.push(own.shift());
    if (guests.length) out.push(guests.shift());
  }
  return (_bossOrder[key] = out);
}

/* ===================== FLOORS ===================== */
function towerChaps() { return (S.set && S.set.categories) || []; }
SL = function () { return Math.max(1, towerChaps().length || 5); };
function isThrone(floor) { return floor === SL() + 1; }
function clampN(x, a, b) { return Math.max(a, Math.min(b, x)); }
const ROMAN = ["", "", " II", " III", " IV", " V", " VI"];
const _twFloorInfo = floorInfo;
floorInfo = function (run, floor) {
  if (!S.set) return _twFloorInfo(run, floor);
  const N = SL(), st = storyOf(run);
  if (floor <= N) {
    const ch = towerChaps()[floor - 1], area = st.floors[(floor - 1) % 5], Q = ch.questions.length;
    const all = st.floors.flatMap(f => f.foes);
    const nf = clampN(Math.ceil(Q / 5), 3, 12);
    const foes = [];
    for (let i = 0; i < nf; i++) foes.push(i % 2 ? area.foes[i % area.foes.length] : all[(floor * 7 + i * 3) % all.length]);
    if (run.visits && run.visits[floor] && (run.cf || []).includes(floor)) foes.push({ key: "goblin~h50", name: "Treasure Goblin", gold: true });
    const boss = run.created ? towerBosses(run)[(floor - 1) % towerBosses(run).length] : area.boss;
    return { name: ch.category, area: area.name + ROMAN[Math.floor((floor - 1) / 5) + 1], tint: area.tint, foes, chapter: floor - 1, qn: Q,
             foeHits: clampN(Math.round(1.3 * Q / nf), 2, 9),
             boss: { key: boss.key, name: boss.name, hits: Math.min(22, 6 + Math.round(floor * 1.2)), scale: boss.scale || 5 } };
  }
  if (floor === N + 1) {
    const top = st.floors[4];
    return { name: st.throne || top.name + ": The Throne", area: top.name, tint: top.tint, foes: [], throne: true, minions: top.foes,
             boss: { key: top.boss.key, name: top.boss.name, hits: 26, scale: top.boss.scale || 5 } };
  }
  const n = floor - N - 1, theme = st.floors[(n - 1) % 5], rnd = seeded(floor * 13 + 5);
  const all = st.floors.flatMap(f => f.foes), b = theme.boss;
  return { name: "Endless " + n, sub: theme.name, tint: theme.tint, foes: [0, 1, 2, 3].map(() => all[Math.floor(rnd() * all.length)]), endless: true,
           boss: { key: b.key, name: b.name, hits: Math.min(30, 12 + 2 * n), scale: b.scale } };
};
floorTitle = function (run, floor) {
  const f = floorInfo(run, floor);
  if (f.endless) return f.name + " · " + f.sub;
  if (f.throne) return f.name;
  return "Floor " + floor + " · " + f.name;
};
deckScale = function () { return 1; };
const _twMakeEnemy = makeEnemy;
makeEnemy = function (run) {
  const b = S.battle;
  if (b && b.bossStash) { const e = b.bossStash; b.bossStash = null; return e; }
  const f = floorInfo(run, run.floor);
  if (f.endless || !S.set) return _twMakeEnemy(run);
  const d = diffOf(run);
  if (f.throne || run.idx >= f.foes.length) {
    const bh = Math.max(3, Math.round(f.boss.hits * d.hp));
    return { key: f.boss.key, name: f.boss.name, boss: true, final: !!f.throne, ward: !f.throne, hits: bh, maxHits: bh, scale: f.boss.scale || 5 };
  }
  const foe = f.foes[run.idx];
  const h = clampN(Math.round(f.foeHits * d.hp * (foe.gold ? 0.5 : 1)), 1, 12);
  return { key: foe.key, name: foe.name, boss: false, gold: !!foe.gold, hits: h, maxHits: h, scale: 4 };
};
campaignPct = function (s) {
  if (s.cleared) return 100;
  return Math.round((s.cf || []).filter(f => f <= SL()).length / (SL() + 1) * 100);
};

/* ===================== UNLOCKS ===================== */
function chapterStat(k) {
  const ch = towerChaps()[k - 1]; if (!ch) return { done: 0, total: 0 };
  return { done: ch.questions.filter(q => progress.results[q.id]).length, total: ch.questions.length };
}
function deckAnswered() {
  let d = 0, t = 0;
  towerChaps().forEach((c, i) => { const x = chapterStat(i + 1); d += x.done; t += x.total; });
  return t ? d / t : 0;
}
const THRONE_AT = 0.9;
function floorOpen(s, k) {
  const N = SL(), cf = s.cf || [];
  if (k > N + 1) return !!s.cleared;
  if (k === N + 1) return deckAnswered() >= THRONE_AT || !!s.cleared;
  if (k === 1) return true;
  const c = chapterStat(k);
  return (c.total && c.done >= c.total) || cf.includes(k) || cf.includes(k - 1);
}

/* ===================== SAVES: v3 only ===================== */
const _twLoadAdv = loadAdv;
loadAdv = function (setId) {
  const d = _twLoadAdv(setId);
  if (d.slots.some(s => s && !s.v3)) {                 // old 5-floor adventures: heroes keep everything, the run starts fresh
    d.slots = d.slots.map(s => s && s.v3 ? s : null);
    try { localStorage.setItem("fc:adv:" + setId, JSON.stringify(d)); } catch (e) {}
  }
  return d;
};
const _twNewRun = newRun;
newRun = function (hero, story) {
  const r = _twNewRun(hero, story);
  r.v3 = true; r.cf = []; r.visits = {};
  return r;
};

/* ===================== QUESTIONS: one chapter per floor ===================== */
function chapterFloor() { const s = S.battle && S.battle.s; return s && s.v3 && S.set && s.floor <= SL() ? s.floor : 0; }
const _twDeckOrder = deckOrder;
deckOrder = function () {
  const k = chapterFloor();
  return k ? towerChaps()[k - 1].questions.map(q => allQuestions(S.set).find(x => x.id === q.id) || q) : _twDeckOrder();
};
if (typeof scrollIndex === "function") {
  const _twScrollIndex = scrollIndex;
  scrollIndex = function () {
    const k = chapterFloor();
    if (!k) return _twScrollIndex();
    if (progress && progress.noScrolls) return [];
    const c = towerChaps()[k - 1];
    return catLessons(c).map(l => ({ l, c, pos: Math.min(l.at || 0, c.questions.length) }));
  };
}
const _twWardLeft = wardLeft;
wardLeft = function (s) {
  const b = S.battle;
  if (s.v3 && b && b.enemy && b.enemy.ward) {
    if (!orderMode() || s.passDone) return 0;
    return Math.max(0, deckOrder().length - (s.qpos || 0));
  }
  if (s.v3 && b && b.enemy && b.enemy.final) return 0;   // the throne: the deck is already covered
  return _twWardLeft(s);
};
const BOSS_FX = {
  fog:    { name: "Fog", text: "casts a fog over your choices. They'll clear in a moment." },
  quake:  { name: "Quake", text: "slams the floor. Everything shakes!" },
  shadow: { name: "Shadow", text: "snuffs out the lights." },
  heal:   { name: "Mend", text: "patches up a wound. +1 HP for the boss." },
  fury:   { name: "Fury", text: "is enraged. A wrong answer this turn hits 50% harder." },
};
const _twPick = pickQuestion;
pickQuestion = function () {
  const b = S.battle, s = b && b.s;
  if (s && s.v3 && s.qf !== s.floor) {
    s.qf = s.floor;
    const all = deckOrder(), seen = new Set(s.seen || []);
    s.passDone = !all.length || all.every(q => seen.has(q.id));
    s.qpos = s.passDone ? 0 : initQpos(s, all);
  }
  const r = _twPick.apply(this, arguments);
  b.bossFx = null;
  if (b.enemy && b.enemy.boss && b.cur && Math.random() < 0.22) {
    const ks = Object.keys(BOSS_FX).filter(k => k !== "heal" || (b.enemy.hits < b.enemy.maxHits && !wardLeft(s)));
    const k = ks[Math.floor(Math.random() * ks.length)];
    b.bossFx = k;
    if (k === "heal") b.enemy.hits = Math.min(b.enemy.maxHits, b.enemy.hits + 1);
    if (k === "shadow" || k === "quake") setTimeout(() => sfx.bBoss && sfx.bBoss(), 120);
  }
  return r;
};
const _twDamage = damageFrom;
damageFrom = function (run, boss) {
  const d = _twDamage(run, boss);
  return S.battle && S.battle.bossFx === "fury" ? Math.round(d * 1.5) : d;
};

/* ===================== BATTLE: floors cleared, throne minions ===================== */
const _twSubmit = submitBattle;
submitBattle = function () {
  const b = S.battle; if (!b) return _twSubmit();
  const s = b.s, f0 = s.floor, wasBoss = b.enemy && b.enemy.boss, wasMinion = b.enemy && b.enemy.minion;
  _twSubmit();
  b.bossFx = null;
  document.body.classList.remove("bfx-fog", "bfx-quake", "bfx-shadow", "bfx-heal", "bfx-fury");
  if (!s.v3) return;
  if (b.over) { b.bossStash = null; b.pendMinion = null; b.minionWaves = 0; return; }
  if (wasBoss && s.floor > f0) { s.cf = s.cf || []; if (!s.cf.includes(f0)) s.cf.push(f0); saveAdv(); }
  if (wasMinion && b.pend) b.minionBack = true;
  const e = b.enemy;
  if (e && e.final && !b.pend && e.hits > 0) {
    const frac = e.hits / e.maxHits, w = b.minionWaves || 0;
    if ((frac <= 0.7 && w < 1) || (frac <= 0.4 && w < 2) || (frac <= 0.15 && w < 3)) {
      const f = floorInfo(s, s.floor), pool = f.minions || [];
      const pick = pool[(w + s.floor) % Math.max(1, pool.length)] || { key: "skeleton", name: "Minion" };
      const mh = clampN(Math.round((3 + w) * diffOf(s).hp), 2, 8);
      b.pendMinion = { key: pick.key, name: pick.name, boss: false, minion: true, hits: mh, maxHits: mh, scale: 4 };
      b.minionWaves = w + 1;
    }
  }
  if (b.bossStash) { s.enemyHits = b.bossStash.hits; saveAdv(); }
};
const _twNext = battleNextQuestion;
battleNextQuestion = function () {
  const b = S.battle;
  if (b && b.minionBack && b.pend && !b.dying && !b.victory) { b.minionBack = false; return proceedNext(); }
  if (b && b.pendMinion && !b.dying && !b.victory && !b.pend) {
    const m = b.pendMinion; b.pendMinion = null;
    b.bossStash = b.enemy; b.enemy = m;
    proceedNext();
    b.fx = { type: "foeEnter" };
    twToast(`${m.name} rushes in to shield ${b.bossStash.name}!`, "boss");
    sfx.bStart && sfx.bStart();
    return render();
  }
  return _twNext();
};
/* never walk onto a sealed floor: stay on the one you just cleared and open the stairs */
function twSealedMsg(s, k) {
  if (isThrone(k)) return `The throne room is sealed. It opens once you've answered ${Math.round(THRONE_AT * 100)}% of the deck (you're at ${Math.round(deckAnswered() * 100)}%). Practice any floor in the meantime.`;
  const c = chapterStat(k);
  return `Floor ${k} is sealed. Finish its chapter (${c.done}/${c.total} answered) or clear floor ${k - 1} to open it.`;
}
const _twReturn = returnToMap;
returnToMap = function () {
  const b = S.battle, s = b && b.s;
  if (s && s.v3 && s.floor <= SL() + 1 && !floorOpen(s, s.floor)) {
    const k = s.floor;
    s.floor = Math.max(1, k - 1); s.idx = 0; s.enemyHits = null;
    b.enemy = makeEnemy(s);
    _twReturn();
    S.picker = { msg: twSealedMsg(s, k) };
    return render();
  }
  return _twReturn();
};
const _twProceed = proceedNext;
proceedNext = function () {
  const b = S.battle, s = b && b.s;
  if (s && s.v3 && !b.mapMode && b.pend && s.floor <= SL() + 1 && !floorOpen(s, s.floor)) {
    const k = s.floor;
    s.floor = Math.max(1, k - 1); s.idx = 0; s.enemyHits = null; s.qf = null;
    b.enemy = makeEnemy(s);
    twToast(twSealedMsg(s, k));
  }
  return _twProceed();
};
function twToast(text, kind) {
  const d = document.createElement("div");
  d.className = "tw-toast " + (kind || "");
  d.textContent = text;
  document.body.appendChild(d);
  setTimeout(() => d.classList.add("out"), 3600);
  setTimeout(() => d.remove(), 4200);
}

/* ===================== MAP: bigger floors, revisits, throne room ===================== */
mapSeed = function (run) {
  const v = (run.visits && run.visits[run.floor]) || 0;
  return hashStr((run.created || 0) + ":" + run.story + ":" + run.floor + ":" + (run.heroId || "") + (v ? ":v" + v : ""));
};
const RETURN_LINES = [
  "Fresh footprints. Something moved in since you cleared this place.",
  "Someone left a thank-you note on the wall. It's addressed to you.",
  "The old boss's lair has a new doormat. It says GO AWAY.",
  "A fresh crate of supplies. Somebody's been restocking.",
  "Graffiti: \"Back again? Respect.\"",
];
const _twGenFloor = genFloor;
genFloor = function (run, seed) {
  if (!S.set || !run.v3) return _twGenFloor(run, seed);
  const R = rng32(seed), st = storyOf(run), look = LOOK[st.look || st.scene] || LOOK.mountains, fi = floorInfo(run, run.floor);
  if (fi.throne) {
    const rm = genRoom(R, 0, 1, look);
    const F = { rooms: [rm], dark: true, look, scene: st.scene, story: run.story, nRooms: 1, throne: true };
    placeProps(R, rm, look); placeTorches(R, rm, 9);
    return F;
  }
  const nFoes = fi.foes.length;
  const nRooms = clampN(Math.ceil(nFoes / 3) + 1, 2, 6);
  const dark = run.floor > 1 && R() < 0.22;
  const rooms = [];
  for (let r = 0; r < nRooms; r++) rooms.push(genRoom(R, r, nRooms, look));
  const F = { rooms, dark, look, scene: st.scene, story: run.story, nRooms };
  const foes = fi.foes.map((f, i) => ({ id: "f" + i, type: "foe", foe: i, key: f.key, name: f.name }));
  foes.forEach((f, i) => {
    const r = f.key === "goblin~h50" ? Math.floor(R() * nRooms) : Math.min(nRooms - 1, Math.floor(i * nRooms / nFoes));
    if (!placeObj(R, rooms[r], f, { minFromEntrance: r === 0 ? 6 : 3 })) placeObj(R, rooms[(r + 1) % nRooms], f, { minFromEntrance: 3 });
  });
  const opts = [];
  const lockRoom = nRooms >= 2 && R() < 0.5 ? nRooms - 2 : -1;
  if (lockRoom >= 0) { rooms[lockRoom].lock = true; opts.push({ id: "c0", type: "chest", key: true, room: Math.floor(R() * (lockRoom + 1)) }); }
  else opts.push({ id: "c0", type: "chest", room: Math.floor(R() * nRooms) });
  const pool = ["shrine", "npc", "chest2"].sort(() => R() - 0.5);
  pool.slice(0, nRooms >= 4 ? 3 : 1 + (R() < 0.5 ? 1 : 0)).forEach(k => {
    if (k === "shrine") opts.push({ id: "s0", type: "shrine", room: Math.floor(R() * nRooms) });
    if (k === "npc") opts.push({ id: "n0", type: "npc", room: Math.floor(R() * nRooms) });
    if (k === "chest2") opts.push({ id: "c1", type: "chest", room: Math.floor(R() * nRooms) });
  });
  const eggs = Math.max(1, Math.round(nRooms / 2));
  for (let i = 0; i < eggs; i++) opts.push({ id: "e" + i, type: "egg", room: Math.floor(R() * nRooms), line: Math.floor(R() * EGG_LINES.length) });
  // coming back to a cleared floor: something new
  const revisit = run.visits && run.visits[run.floor] && (run.cf || []).includes(run.floor);
  if (revisit) {
    opts.push({ id: "c9", type: "chest", room: nRooms - 1 });
    opts.push({ id: "e9", type: "egg", room: Math.floor(R() * nRooms), line: 0, ret: Math.floor(R() * RETURN_LINES.length) });
    if (R() < 0.5 && !opts.some(o => o.type === "shrine")) opts.push({ id: "s0", type: "shrine", room: Math.floor(R() * nRooms) });
  }
  opts.forEach(o => placeObj(R, rooms[o.room], o, { minFromEntrance: o.type === "egg" ? 2 : 3, wallHug: o.type === "egg" }));
  rooms.forEach(rm => placeProps(R, rm, look));
  rooms.forEach(rm => placeTorches(R, rm, dark ? 7 : (st.scene === "castle" || st.scene === "mountains") ? 3 : 0));
  return F;
};
/* the return-visit egg reads its own line */
if (typeof interact === "function") {
  const _twInteract = interact;
  interact = function (o) {
    if (o && o.type === "egg" && o.ret != null) {
      const ms = S.battle.s.map; if (!ms.eggs.includes(o.id)) { ms.eggs.push(o.id); grantXp(5); persistMap(); }
      sfx.select();
      return say(RETURN_LINES[o.ret] + " (+5 XP)");
    }
    return _twInteract(o);
  };
}
const _twMapBusy = mapBusy;
mapBusy = function () { return !!S.picker || _twMapBusy(); };

/* ===================== LEVEL PICKER (the stairs) ===================== */
const STAIRS_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h5v-5h5v-5h5V6h3"/><path d="M3 21V17"/></svg>';
function twPickerHtml() {
  const b = S.battle, s = b.s, N = SL(), nodes = [];
  for (let k = N + 1; k >= 1; k--) {
    const fi = floorInfo(s, k), open = floorOpen(s, k), done = (s.cf || []).includes(k) || (fi.throne && s.cleared), cur = k === s.floor;
    let desc;
    if (fi.throne) desc = done ? `${fi.boss.name} has fallen.` : open ? `${fi.boss.name} waits, with minions at his side.` : `Opens at ${Math.round(THRONE_AT * 100)}% of the deck answered (you're at ${Math.round(deckAnswered() * 100)}%).`;
    else {
      const c = chapterStat(k);
      desc = done ? `${fi.boss.name} defeated. Come back any time: new things turn up.` : open ? `${fi.boss.name} guards the top. ${c.done}/${c.total} answered.` : `Answer every question in this chapter to open it (${c.done}/${c.total}).`;
    }
    const pct = fi.throne ? deckAnswered() : (chapterStat(k).total ? chapterStat(k).done / chapterStat(k).total : 0);
    nodes.push(`<button class="tw-node ${open ? "open" : "locked"} ${done ? "done" : ""} ${cur ? "cur" : ""} ${fi.throne ? "throne" : ""}" ${open ? `data-act="twGo" data-f="${k}"` : `data-act="twLocked" data-f="${k}"`} style="--i:${N + 1 - k};--tc:rgb(${fi.tint.join(",")})">
      <span class="tw-dot">${done ? "✓" : open ? "" : "🔒"}</span>
      <span class="tw-card tex">
        <span class="tw-por ${open ? "" : "sil"}">${spriteCanvas(fi.boss.key, fi.throne ? 3 : 2)}${done ? '<span class="tw-x">☠</span>' : ""}</span>
        <span class="tw-txt"><span class="eyebrow">${fi.throne ? "The Throne" : "Floor " + k + " · " + esc(fi.area)}</span>
          <b>${esc(fi.name)}</b><span class="muted">${esc(desc)}</span>
          <span class="tw-bar"><i style="width:${Math.round(pct * 100)}%"></i></span></span>
        ${cur ? '<span class="tw-here">You are here</span>' : ""}
      </span></button>`);
  }
  const msg = S.picker && S.picker.msg;
  return `<div class="tw-pick" data-nonav>
    <div class="tw-panel">
      <button class="rd-x" data-act="twClose" aria-label="Close">✕</button>
      <div class="eyebrow" style="color:${storyOf(s).color}">${esc(storyOf(s).title)}</div>
      <h2>The Tower</h2>
      <div class="muted tw-sub">Every chapter is a floor. Finish a chapter's questions anywhere in the app to open its floor, or clear the floor below.</div>
      ${msg ? `<div class="tw-msg">${esc(msg)}</div>` : ""}
      <div class="tw-line"><span class="tw-rail"></span>${nodes.join("")}</div>
    </div></div>`;
}
function twGo(k) {
  const b = S.battle, s = b.s;
  if (!floorOpen(s, k)) return;
  s.visits = s.visits || {};
  if ((s.cf || []).includes(k) || (isThrone(k) && s.cleared)) s.visits[k] = (s.visits[k] || 0) + 1;
  s.floor = k; s.idx = 0; s.enemyHits = null; s.map = null; s.qf = null;
  s.hp = maxHpOf(s, b.h); s.guard = false; s.frozen = false;
  floorStart(s, b.h);
  S.picker = null; b.bossStash = null; b.pendMinion = null; b.minionWaves = 0;
  saveAdv();
  sfx.bStart && sfx.bStart();
  openSlot(b.slot);
}
const _twViewMap = viewMap;
viewMap = function () {
  let html = _twViewMap();
  const b = S.battle; if (!b || !b.s.v3) return html;
  const ms = b.s.map; if (ms) { ms.seen = ms.seen || []; if (!ms.seen.includes(ms.room)) ms.seen.push(ms.room); }
  html = html.replace('id="mapbox">', `id="mapbox"><button class="tw-stairs" data-act="twOpen" data-nonav title="Floors" aria-label="Floors">${STAIRS_SVG}</button><canvas id="twMini" class="tw-mini"></canvas>`);
  if (S.picker) html += twPickerHtml();
  return html;
};
/* the throne room fight is easier to follow with the boss named on the gate */
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-act]"); if (!t) return;
  const a = t.dataset.act;
  if (a === "twOpen") { S.picker = {}; sfx.tick(); render(); const c = document.querySelector(".tw-node.cur"); if (c) setTimeout(() => c.scrollIntoView({ block: "center", behavior: "smooth" }), 350); return; }
  if (a === "twClose") { S.picker = null; sfx.tick(); return render(); }
  if (a === "twGo") return twGo(+t.dataset.f);
  if (a === "twLocked") { sfx.bBlock && sfx.bBlock(); t.classList.remove("shake"); void t.offsetWidth; t.classList.add("shake"); }
});

/* ===================== MINIMAP ===================== */
function drawMini() {
  const cv = document.getElementById("twMini"), b = S.battle;
  if (!cv || !b || !b.s.map) return;
  const s = b.s, ms = s.map, F = floorData(s), n = F.rooms.length, P = 2, gap = 8, rw = RW * P, rh = RH * P;
  cv.width = n * rw + (n - 1) * gap; cv.height = rh;
  const g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
  const seen = ms.seen || [ms.room], blink = Math.floor(Date.now() / 400) % 2;
  F.rooms.forEach((rm, i) => {
    const ox = i * (rw + gap);
    if (i > 0) { g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(ox - gap, rh / 2 - 1, gap, 2); }
    if (!seen.includes(i)) {
      g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(ox, 0, rw, rh);
      g.fillStyle = "rgba(255,255,255,.45)"; g.font = "bold 16px sans-serif"; g.textAlign = "center"; g.fillText("?", ox + rw / 2, rh / 2 + 6);
      return;
    }
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
      if (rm.g[y][x]) continue;
      g.fillStyle = i === ms.room ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.22)";
      g.fillRect(ox + x * P, y * P, P, P);
    }
    rm.objs.forEach(o => {
      if (o.type === "foe" && ms.cleared.includes(o.id)) return;
      if (o.type === "chest" && (ms.opened || []).includes(o.id)) return;
      if (o.type === "egg") return;
      g.fillStyle = o.type === "foe" ? "#ef4444" : o.type === "chest" ? "#facc15" : o.type === "shrine" ? "#22d3ee" : "#a78bfa";
      g.fillRect(ox + o.x * P - 1, o.y * P - 1, P + 2, P + 2);
    });
    if (rm.last) { g.fillStyle = foesLeft(s) === 0 ? "#f97316" : "#7f1d1d"; g.fillRect(ox + (RW - 1) * P - 2, rm.east.y * P - 2, P + 4, P + 4); }
    if (i === ms.room && blink) { g.fillStyle = "#ffffff"; g.fillRect(ox + MS.tx * P - 1, MS.ty * P - 1, P + 2, P + 2); }
  });
}
setInterval(() => { if (S.screen === "map") drawMini(); }, 400);

/* ===================== RENDER HOOK: boss effects + minimap ===================== */
const _twRender = render;
render = function () {
  _twRender();
  const b = S.battle;
  document.body.classList.remove("bfx-fog", "bfx-quake", "bfx-shadow", "bfx-heal", "bfx-fury");
  if (S.screen === "map") drawMini();
  if (S.screen === "battle" && b && b.bossFx && !S.feedback && b.enemy && b.enemy.boss) {
    document.body.classList.add("bfx-" + b.bossFx);
    const ar = document.getElementById("arena");
    if (ar && !ar.querySelector(".bfx-banner")) ar.insertAdjacentHTML("beforeend",
      `<div class="bfx-banner"><b>${esc(BOSS_FX[b.bossFx].name)}!</b> ${esc(b.enemy.name)} ${esc(BOSS_FX[b.bossFx].text)}</div>`);
  }
};

/* ===================== STYLES ===================== */
(function () {
  const css = `
  .tw-stairs { position: absolute; top: 8px; left: 8px; z-index: 4; width: 38px; height: 38px; border-radius: 11px; border: 1.5px solid rgba(255,255,255,.25);
    background: rgba(10,8,16,.55); color: #fff; display: grid; place-items: center; cursor: pointer; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    transition: transform .18s ease, background .2s ease; }
  .tw-stairs:hover { background: rgba(10,8,16,.75); transform: translateY(-1px); }
  .tw-stairs:active { transform: scale(.94); }
  .tw-mini { position: absolute; top: 8px; right: 8px; z-index: 3; max-width: 46%; height: auto; image-rendering: pixelated; pointer-events: none;
    padding: 5px; border-radius: 9px; background: rgba(10,8,16,.5); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
  .tw-pick { position: fixed; inset: 0; z-index: 60; background: rgba(5,3,10,.62); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
    display: flex; justify-content: center; align-items: flex-start; overflow-y: auto; padding: 24px 12px; animation: twFade .25s ease both; }
  .tw-panel { position: relative; width: 100%; max-width: 520px; background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
    padding: 22px 18px 26px; box-shadow: 0 20px 60px rgba(0,0,0,.45); animation: twRise .4s cubic-bezier(.2,.9,.3,1.2) both; }
  .tw-panel .rd-x { position: absolute; top: 14px; right: 14px; }
  .tw-panel h2 { margin: 2px 0 4px; font-size: 26px; }
  .tw-sub { font-size: 13px; line-height: 1.5; margin-bottom: 14px; padding-right: 30px; }
  .tw-msg { font-size: 13.5px; line-height: 1.5; padding: 10px 12px; border-radius: 12px; margin-bottom: 14px;
    background: color-mix(in srgb, var(--star) 14%, transparent); border: 1px solid color-mix(in srgb, var(--star) 40%, transparent); }
  .tw-line { position: relative; display: grid; gap: 12px; padding-left: 4px; }
  .tw-rail { position: absolute; left: 17px; top: 18px; bottom: 18px; width: 3px; border-radius: 3px;
    background: linear-gradient(to top, var(--accent), color-mix(in srgb, var(--accent) 20%, transparent)); transform-origin: bottom; animation: twRail .9s ease .1s both; }
  .tw-node { position: relative; display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: none; border: 0; padding: 0;
    font: inherit; color: var(--text); cursor: pointer; animation: twIn .45s cubic-bezier(.2,.9,.3,1.15) both; animation-delay: calc(var(--i) * 45ms + .1s); }
  .tw-dot { position: relative; z-index: 1; flex: 0 0 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: bold;
    background: var(--surface2, var(--surface)); border: 3px solid var(--tc); color: #fff; box-shadow: 0 0 0 4px var(--surface); }
  .tw-node.done .tw-dot { background: var(--tc); }
  .tw-node.locked .tw-dot { border-color: var(--border); filter: grayscale(1); font-size: 11px; }
  .tw-node.cur .tw-dot { animation: twPulse 1.6s ease-in-out infinite; }
  .tw-card { flex: 1; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; border: 1.5px solid var(--border);
    background: color-mix(in srgb, var(--tc) 9%, var(--surface)); transition: transform .18s ease, border-color .2s ease, box-shadow .2s ease; position: relative; }
  .tw-node.open:hover .tw-card { transform: translateX(3px); border-color: var(--tc); box-shadow: 0 6px 18px color-mix(in srgb, var(--tc) 25%, transparent); }
  .tw-node.cur .tw-card { border-color: var(--tc); }
  .tw-node.locked .tw-card { opacity: .62; background: var(--surface); }
  .tw-node.throne .tw-card { border-width: 2px; border-color: color-mix(in srgb, var(--star) 60%, var(--border)); }
  .tw-por { position: relative; flex: 0 0 56px; height: 56px; display: grid; place-items: center; border-radius: 12px; background: rgba(0,0,0,.18); overflow: hidden; }
  .tw-por canvas { max-width: 52px; max-height: 52px; image-rendering: pixelated; }
  .tw-por.sil canvas { filter: brightness(0) opacity(.55); }
  .tw-node.done .tw-por canvas { filter: grayscale(.85) opacity(.65); }
  .tw-x { position: absolute; right: 2px; bottom: 0; font-size: 16px; }
  .tw-txt { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .tw-txt b { font-size: 15px; line-height: 1.25; }
  .tw-txt .muted { font-size: 12px; line-height: 1.4; }
  .tw-txt .eyebrow { color: var(--tc); font-size: 10px; }
  .tw-bar { display: block; height: 4px; border-radius: 4px; background: var(--border); margin-top: 4px; overflow: hidden; }
  .tw-bar i { display: block; height: 100%; background: var(--tc); border-radius: 4px; transform-origin: left; animation: twBar .8s ease both; animation-delay: calc(var(--i) * 45ms + .35s); }
  .tw-here { position: absolute; top: -8px; right: 10px; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 99px; background: var(--tc); color: #fff; }
  .tw-node.shake { animation: twShake .35s ease; }
  .tw-toast { position: fixed; left: 50%; top: 70px; transform: translateX(-50%); z-index: 70; max-width: 360px; padding: 12px 16px; border-radius: 14px;
    background: rgba(15,12,24,.92); color: #fff; font-size: 14px; line-height: 1.45; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,.4);
    animation: twRise .35s cubic-bezier(.2,.9,.3,1.2) both; transition: opacity .5s ease, transform .5s ease; }
  .tw-toast.boss { border: 1.5px solid #ef4444; }
  .tw-toast.out { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  .bfx-banner { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); z-index: 6; width: max-content; max-width: 90%;
    padding: 7px 12px; border-radius: 10px; background: rgba(10,6,16,.82); color: #fff; font-size: 12.5px; line-height: 1.35; text-align: center;
    animation: twRise .4s ease both; }
  .bfx-banner b { color: #fbbf24; }
  body.bfx-fog .opt { animation: twUnfog 3s ease both; }
  body.bfx-quake #arena, body.bfx-quake .opt { animation: twQuake .45s ease 3; }
  body.bfx-shadow #arena { filter: brightness(.4) saturate(.6); transition: filter .6s ease; }
  body.bfx-shadow .qtext, body.bfx-shadow .question { animation: twFlicker 1.4s ease both; }
  body.bfx-fury #arena { box-shadow: inset 0 0 40px rgba(239,68,68,.55); }
  @keyframes twFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes twRise { from { opacity: 0; transform: translate(var(--tx, 0), 14px) scale(.98); } to { opacity: 1; transform: translate(var(--tx, 0), 0) scale(1); } }
  .tw-toast, .bfx-banner { --tx: -50%; }
  @keyframes twIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
  @keyframes twRail { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @keyframes twBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes twPulse { 0%,100% { box-shadow: 0 0 0 4px var(--surface), 0 0 0 4px var(--tc); } 50% { box-shadow: 0 0 0 4px var(--surface), 0 0 0 10px transparent; } }
  @keyframes twShake { 0%,100% { transform: none; } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
  @keyframes twUnfog { 0%,55% { filter: blur(7px); } 100% { filter: none; } }
  @keyframes twQuake { 0%,100% { transform: none; } 20% { transform: translate(-4px, 2px); } 40% { transform: translate(4px, -2px); } 60% { transform: translate(-3px, -1px); } 80% { transform: translate(3px, 1px); } }
  @keyframes twFlicker { 0%,30%,60% { opacity: .25; } 15%,45%,100% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .tw-node, .tw-rail, .tw-bar i, .tw-panel { animation: none !important; } }`;
  const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
})();
