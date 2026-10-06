/* ===================================================================
   map.js — Exploration mode
   Each floor is 2–3 connected rooms you walk around in, top-down. Foes
   stand on the map (walk into them to fight), the boss waits behind a
   gate that only opens once every guardian is down, and there are
   optional things to find: chests (one question), shrines (three in a
   row), a fetch quest, keys for locked doors, and hidden easter eggs.
   Questions stay the currency for every reward.

   Layouts are generated from a seed per adventure + floor, so a floor
   always looks the same when you come back to it. What you've done on
   a floor lives in run.map (saved with the adventure).
   Turn the whole thing off with the map button in the settings tray.
   =================================================================== */

const T = 16;                 // logical pixels per tile
const RW = 26, RH = 16;       // room size in tiles

/* ---------- small RNG (mulberry32) ---------- */
function rng32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hashStr(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------- map props (authored facing right) ---------- */
Object.assign(SPRITES, {
  m_rock: { pal: { a: "#8a8a8a", A: "#b4b4b4", b: "#5e5e5e" }, rows: [
    "...aaaa...", "..aAAaaa..", ".aAAaaaab.", "aaAaaaaabb", "aaaaaaabbb", ".abbbbbbb."] },
  m_tree: { pal: { b: "#5b4636", B: "#3d2e23" }, rows: [
    "....b.....", ".b..b..b..", "..b.b.b...", "...bbb..b.", "b...b..b..", ".b..bbb...", "..bbb.....",
    "....b.....", "....bB....", "....bB....", "...bbB....", "..bbbBb..."] },
  m_bush: { pal: { g: "#3f7d3a", G: "#5fa356", d: "#2a5527" }, rows: [
    "..gggg....", ".gGGggg...", "gGGggggg..", "gggggggGg.", ".ggggggggg", "..dddddd.."] },
  m_crystal: { pal: { c: "#60a5fa", C: "#bfdbfe", d: "#1d4ed8" }, rows: [
    "...c....", "..cC....", "..cCc.c.", ".ccCc.cC", ".cCCccCc", "cCCcccCc", "dddddddd"] },
  m_bones: { pal: { w: "#e7e5e4", W: "#a8a29e" }, rows: [
    "w.......w.", "wwwwwwwww.", "w.....w..w", "..wW......", ".wwww..ww."] },
  m_barrel: { pal: { b: "#6b3e1f", B: "#8a5530", h: "#3f3f46" }, rows: [
    ".bbbbbb.", "bBBBBBBb", "bhhhhhhb", "bBBBBBBb", "bBBBBBBb", "bhhhhhhb", "bBBBBBBb", ".bbbbbb."] },
  m_crate: { pal: { c: "#7a5230", C: "#a8733f", d: "#6b4423" }, rows: [
    "ccccccccc", "cCCCCCCCc", "cCdCCCdCc", "cCCdCdCCc", "cCCCdCCCc", "cCCdCdCCc", "cCdCCCdCc", "cCCCCCCCc", "ccccccccc"] },
  m_gear: { pal: { g: "#a16207", G: "#d4a373" }, rows: [
    "...g.g...", "..ggggg..", ".ggGGGgg.", "ggG...Ggg", ".gG...Gg.", "ggG...Ggg", ".ggGGGgg.", "..ggggg..", "...g.g..."] },
  m_cactus: { pal: { g: "#3f7d3a", G: "#65a30d" }, rows: [
    "...gg...", "..gGgg..", "..gGgg..", "g.gGgg.g", "ggGGggGg", "ggGggggg", ".ggGgg..", "..gGgg..", "..gGgg..", "..gggg.."] },
  m_kelp: { pal: { g: "#2f8f5b", G: "#4ade80" }, rows: [
    "..g...", ".gG...", ".g..g.", "gg.gG.", ".ggg..", "..g...", ".gG...", "gg..g.", ".g.gG.", ".ggg..", "..g...", ".gg..."] },
  m_organelle: { pal: { o: "#c2410c", O: "#fb923c", i: "#fde68a" }, rows: [
    "..oooooooo..", ".oOOOOOOOOo.", "oOiOiOiOiOOo", "oOOiOiOiOiOo", ".oOOOOOOOOo.", "..oooooooo.."] },
  m_vesicle: { pal: { v: "#be185d", V: "#f9a8d4", W: "#ffffff" }, rows: [
    "..vvvv..", ".vVVVVv.", "vVWVVVVv", "vVVVVVVv", "vVVVVVVv", ".vVVVVv.", "..vvvv.."] },
  m_pillar: { pal: { p: "#78716c", P: "#a8a29e", d: "#57534e" }, rows: [
    "pppppppp", ".PPPPPP.", ".PdPPPP.", ".PdPPPP.", ".PdPPPP.", ".PdPPPP.", ".PdPPPP.", ".PdPPPP.", ".PPPPPP.", "pppppppp"] },
  m_balloon: { pal: { r: "#ef4444", R: "#fca5a5", w: "#e5e7eb" }, rows: [
    ".rrr..", "rRrrr.", "rRrrr.", "rrrrr.", ".rrr..", "..r...", "..w...", "...w..", "..w...", "...w.."] },
  m_urn: { pal: { u: "#9a5b2a", U: "#c2783a", d: "#5c3410" }, rows: [
    "..uuuu..", "...uu...", "..uuuu..", ".uUUUUu.", "uUddddUu", "uUUUUUUu", "uUddddUu", ".uUUUUu.", "..uuuu.."] },
  m_shell: { pal: { s: "#f9a8d4", S: "#fce7f3" }, rows: [
    "..sss..", ".sSsSs.", "sSsSsSs", "sssssss"] },
  m_chest: { pal: { c: "#6b3e1f", C: "#a16207", g: "#facc15", y: "#fde047" }, rows: [
    ".cccccccc.", "cCCCCCCCCc", "cCCCCCCCCc", "gggggggggg", "cCCCyyCCCc", "cCCCyyCCCc", "cCCCCCCCCc", "cccccccccc"] },
  m_chestopen: { pal: { c: "#6b3e1f", C: "#a16207", g: "#facc15", d: "#2a1508", y: "#fde047", Y: "#fffbe6" }, rows: [
    ".cccccccc.", "cddddddddc", "cdyYyyYydc", "gggggggggg", "cCCCCCCCCc", "cCCCCCCCCc", "cCCCCCCCCc", "cccccccccc"] },
  m_shrine: { pal: { s: "#6b7280", S: "#9ca3af", d: "#4b5563", g: "#22d3ee", G: "#cffafe" }, rows: [
    ".....gg.....", "....gGGg....", ".....gg.....", "............", "..ssssssss..", "..sSSSSSSs..",
    "...sSSSSs...", "...sSddSs...", "...sSSSSs...", "...sSSSSs...", "..ssssssss..", ".ssSSSSSSss."] },
  m_npc: { pal: { h: "#7c2d12", s: "#f5c9a5", e: "#1c1917", m: "#b85a4c", c: "#4d7c0f", C: "#65a30d", b: "#422006" }, rows: [
    "....hhhh....", "...hhhhhh...", "..hhsssshh..", "..hsessesh..", "..hssssssh..", "...ssmmss...", "..ccccccc...",
    ".cccCCcccc..", ".ccCCCCccc..", ".scCCCCcs...", "..cCCCCc....", "..cccccc....", "..cc..cc....", "..bb..bb...."] },
});
Object.assign(VARIANTS, {
  "m_rock~lava":   { a: "#3b2a26", A: "#57403a", b: "#1c1412" },
  "m_rock~ice":    { a: "#a5c8e4", A: "#e0f2fe", b: "#6b9cc4" },
  "m_rock~sea":    { a: "#5b7f86", A: "#86aab0", b: "#3b5a61" },
  "m_rock~sand":   { a: "#b08a5a", A: "#d6b27c", b: "#7a5a32" },
  "m_rock~cell":   { a: "#d9677d", A: "#f2a1b0", b: "#9b3550" },
  "m_tree~charred": { b: "#1c1917", B: "#0c0a09" },
  "m_tree~snow":   { b: "#e0f2fe", B: "#7c8a99" },
  "m_barrel~oil":  { b: "#27272a", B: "#3f3f46", h: "#a16207" },
  "m_barrel~candy": { b: "#9d174d", B: "#f472b6", h: "#fde68a" },
  "m_shrine~off":  { g: "#4b5563", G: "#6b7280" },
  "m_crystal~lava": { c: "#f97316", C: "#fde047", d: "#7c2d12" },
  "m_crystal~sea": { c: "#2dd4bf", C: "#ccfbf1", d: "#0f766e" },
  "m_npc~shrunk":  { h: "#0f766e", c: "#e5e7eb", C: "#f8fafc" },
  "m_npc~volcano": { h: "#57534e", c: "#78350f", C: "#a16207" },
  "m_npc~princess": { h: "#facc15", c: "#1d4ed8", C: "#3b82f6" },
  "m_npc~sunken":  { h: "#0ea5e9", c: "#14b8a6", C: "#5eead4" },
  "m_npc~clockwork": { h: "#78350f", c: "#a16207", C: "#d4a373" },
  "m_npc~frost":   { h: "#e0f2fe", c: "#0369a1", C: "#38bdf8" },
  "m_npc~desert":  { h: "#e7c27d", c: "#f5f0e1", C: "#ffffff" },
  "m_npc~carnival": { h: "#dc2626", c: "#7e22ce", C: "#c084fc" },
});

/* ---------- how each scene looks on the map ---------- */
const LOOK = {
  mountains: { floor: "#3f6b3a", floor2: "#45733f", speck: ["#5a8f4f", "#2f5229"], wall: "#4a4a44", hi: "#6e6e64", lo: "#2b2b27",
               pat: "rock", props: ["m_tree", "m_rock", "m_bush", "m_bones"], decal: "tuft", fog: "#0b0d12" },
  cells:     { floor: "#d9a49b", floor2: "#cf968d", speck: ["#e8bbb3", "#b97c74"], wall: "#a33a52", hi: "#d9677d", lo: "#6d1f33",
               pat: "membrane", props: ["m_organelle", "m_vesicle", "m_rock~cell"], decal: "dots", fog: "#1a0710" },
  lava:      { floor: "#3a2b27", floor2: "#33251f", speck: ["#4a3832", "#241a16"], wall: "#231815", hi: "#4a3029", lo: "#120c0a",
               pat: "rock", props: ["m_rock~lava", "m_tree~charred", "m_bones", "m_crystal~lava"], decal: "crack", fog: "#0c0503" },
  castle:    { floor: "#6b6b75", floor2: "#62626b", speck: ["#7a7a84", "#55555e"], wall: "#4b4b55", hi: "#6b6b78", lo: "#2a2a32",
               pat: "brick", props: ["m_barrel", "m_pillar", "m_crate", "m_bones"], decal: "flag", fog: "#07070b" },
  sea:       { floor: "#c9b27a", floor2: "#bfa870", speck: ["#ddc795", "#a8925c"], wall: "#2b5f6b", hi: "#3f7f8b", lo: "#163a42",
               pat: "coral", props: ["m_kelp", "m_rock~sea", "m_shell", "m_crystal~sea"], decal: "shell", fog: "#020c14" },
  gears:     { floor: "#5a5148", floor2: "#524a42", speck: ["#6b6157", "#433c35"], wall: "#8a6a3a", hi: "#b08a4a", lo: "#4f3a1d",
               pat: "plate", props: ["m_gear", "m_crate", "m_barrel~oil"], decal: "rivet", fog: "#080605" },
  ice:       { floor: "#dbeaf5", floor2: "#cfe2f0", speck: ["#ffffff", "#b9d4e8"], wall: "#6fa5cc", hi: "#a9d0ec", lo: "#3f6f95",
               pat: "ice", props: ["m_crystal", "m_tree~snow", "m_rock~ice"], decal: "snow", fog: "#050a12" },
  desert:    { floor: "#d9b26f", floor2: "#d1a965", speck: ["#e8c98c", "#b8914f"], wall: "#b88a4a", hi: "#d8ab6a", lo: "#7a5626",
               pat: "sandstone", props: ["m_cactus", "m_bones", "m_urn", "m_rock~sand"], decal: "ripple", fog: "#0c0703" },
  carnival:  { floor: "#5b2a4a", floor2: "#4f2440", speck: ["#6e3459", "#43203a"], wall: "#b91c1c", hi: "#f5f0e1", lo: "#7f1d1d",
               pat: "tent", props: ["m_barrel~candy", "m_balloon", "m_crate"], decal: "check", fog: "#0a0410" },
};
const QUEST_ITEM = { classic: "monster fangs", shrunk: "membrane scraps", volcano: "ember shards", princess: "goblin trinkets",
  sunken: "black pearls", clockwork: "loose cogs", frost: "frost crystals", desert: "scarab shells", carnival: "lost tickets" };
const NPC_NAME = { classic: "Old Hermit", shrunk: "Stranded Lab Tech", volcano: "Ash Miner", princess: "Royal Squire",
  sunken: "Mermaid Scout", clockwork: "Apprentice Tinker", frost: "Lost Trapper", desert: "Wandering Scribe", carnival: "Sad Clown" };
const EGG_LINES = [
  "You find a note: \"I studied for 6 hours and remembered the font.\" Relatable.",
  "A tiny skeleton clutching flashcards. It never made the final.",
  "Someone carved \"mitochondria is the powerhouse\" into the wall. Classic.",
  "A forgotten snack stash. Still crunchy. Don't ask.",
  "You find a coin with your own face on it. Weird. You keep it.",
  "A sign reads: \"Free XP. Take one.\" You take one.",
  "A very small door. You knock. Something knocks back. You leave.",
  "A pile of crumpled practice exams. Every answer is C.",
  "You step on a squeaky tile. It squeaks again later, on its own.",
  "A dusty mirror. Your reflection gives you a thumbs up.",
];

/* ===================== FLOOR GENERATION ===================== */
function mapSeed(run) { return hashStr((run.created || 0) + ":" + run.story + ":" + run.floor + ":" + (run.heroId || "")); }
const _floorCache = {};
function floorData(run) {
  const key = mapSeed(run);
  if (_floorCache[key]) return _floorCache[key];
  return (_floorCache[key] = genFloor(run, key));
}
function genFloor(run, seed) {
  const R = rng32(seed), st = storyOf(run), look = LOOK[st.scene] || LOOK.mountains;
  const fi = floorInfo(run, run.floor);
  const nRooms = R() < 0.55 ? 3 : 2;
  const dark = run.floor > 1 && R() < 0.22;
  const rooms = [];
  for (let r = 0; r < nRooms; r++) rooms.push(genRoom(R, r, nRooms, look));
  const F = { rooms, dark, look, scene: st.scene, story: run.story, nRooms };
  // --- foes spread over the rooms (never right at the entrance)
  const foes = fi.foes.map((f, i) => ({ id: "f" + i, type: "foe", foe: i, key: f.key, name: f.name }));
  const plan = foes.map((f, i) => i === 0 ? 0 : Math.min(nRooms - 1, 1 + Math.floor((i - 1) * (nRooms - 1) / Math.max(1, foes.length - 1))));
  if (nRooms === 2) plan.splice(0, plan.length, ...foes.map((_, i) => i < 2 ? 0 : 1));
  foes.forEach((f, i) => placeObj(R, rooms[plan[i]], f, { minFromEntrance: 6 }));
  // --- optional content: pick a few
  const opts = [];
  const lockRoom = nRooms >= 2 && R() < 0.5 ? nRooms - 2 : -1;        // east door of this room is locked
  if (lockRoom >= 0) {
    rooms[lockRoom].lock = true;
    opts.push({ id: "c0", type: "chest", key: true, room: Math.floor(R() * (lockRoom + 1)) });
  } else opts.push({ id: "c0", type: "chest", room: Math.floor(R() * nRooms) });
  const pool = ["shrine", "npc", "chest2"].sort(() => R() - 0.5);
  const extra = 1 + (R() < 0.5 ? 1 : 0);
  pool.slice(0, extra).forEach(k => {
    if (k === "shrine") opts.push({ id: "s0", type: "shrine", room: Math.floor(R() * nRooms) });
    if (k === "npc") opts.push({ id: "n0", type: "npc", room: Math.floor(R() * nRooms) });
    if (k === "chest2") opts.push({ id: "c1", type: "chest", room: Math.floor(R() * nRooms) });
  });
  const eggs = 1 + (R() < 0.6 ? 1 : 0);
  for (let i = 0; i < eggs; i++) opts.push({ id: "e" + i, type: "egg", room: Math.floor(R() * nRooms), line: Math.floor(R() * EGG_LINES.length) });
  opts.forEach(o => placeObj(R, rooms[o.room], o, { minFromEntrance: o.type === "egg" ? 2 : 3, wallHug: o.type === "egg" }));
  // --- props last, without ever cutting a path
  rooms.forEach(rm => placeProps(R, rm, look));
  // --- torches: wall-mounted, more on dark floors
  rooms.forEach(rm => placeTorches(R, rm, dark ? 7 : (st.scene === "castle" || st.scene === "mountains") ? 3 : 0));
  return F;
}
function genRoom(R, idx, n, look) {
  const g = [];
  for (let y = 0; y < RH; y++) { g.push([]); for (let x = 0; x < RW; x++) g[y].push(1); }
  const carve = (x0, y0, x1, y1) => { for (let y = Math.max(1, y0); y <= Math.min(RH - 2, y1); y++) for (let x = Math.max(1, x0); x <= Math.min(RW - 2, x1); x++) g[y][x] = 0; };
  const shape = ["hall", "cave", "cross", "ring", "split", "L"][Math.floor(R() * 6)];
  if (shape === "hall") carve(2, 2, RW - 3, RH - 3);
  else if (shape === "cross") { carve(2, 5, RW - 3, RH - 6); carve(8, 2, RW - 9, RH - 3); }
  else if (shape === "ring") { carve(2, 2, RW - 3, RH - 3); for (let y = 6; y <= RH - 7; y++) for (let x = 9; x <= RW - 10; x++) g[y][x] = 1; }
  else if (shape === "split") { carve(2, 2, RW - 3, RH - 3); const wx = 8 + Math.floor(R() * 10); for (let y = 2; y < RH - 2; y++) if (Math.abs(y - RH / 2) > 2) g[y][wx] = 1; }
  else if (shape === "L") { carve(2, 2, RW - 3, 8); if (R() < 0.5) carve(2, 2, 10, RH - 3); else carve(RW - 11, 2, RW - 3, RH - 3); carve(2, RH - 7, RW - 3, RH - 3); }
  else {                                                          // cave: cellular automata
    for (let y = 1; y < RH - 1; y++) for (let x = 1; x < RW - 1; x++) g[y][x] = R() < 0.42 ? 1 : 0;
    for (let k = 0; k < 4; k++) {
      const c = g.map(r => r.slice());
      for (let y = 1; y < RH - 1; y++) for (let x = 1; x < RW - 1; x++) {
        let w = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) w += c[y + dy][x + dx];
        g[y][x] = w >= 5 ? 1 : 0;
      }
    }
  }
  // ragged edges: nibble a few wall tiles in from the border for a less boxy feel
  for (let i = 0; i < 26; i++) {
    const x = 2 + Math.floor(R() * (RW - 4)), y = 2 + Math.floor(R() * (RH - 4));
    if (x < 3 || x > RW - 4 || y < 3 || y > RH - 4) g[y][x] = R() < 0.5 ? 1 : g[y][x];
  }
  // doors: west (entrance) and east (exit), at random rows
  const wy = 3 + Math.floor(R() * (RH - 6)), ey = 3 + Math.floor(R() * (RH - 6));
  const room = { idx, g, west: { y: wy }, east: { y: ey }, objs: [], props: [], torches: [], last: idx === n - 1, first: idx === 0 };
  // guarantee a corridor: west door -> middle -> east door
  const mx = Math.floor(RW / 2) + Math.floor(R() * 5) - 2, my = Math.floor(RH / 2);
  const dig = (x0, y0, x1, y1) => {
    let x = x0, y = y0;
    while (x !== x1) { g[y][x] = 0; if (y + 1 < RH - 1) g[y + 1][x] = g[y + 1][x] && R() < 0.5 ? 1 : 0; x += Math.sign(x1 - x); }
    while (y !== y1) { g[y][x] = 0; y += Math.sign(y1 - y); }
    g[y][x] = 0;
  };
  dig(1, wy, mx, my); dig(mx, my, RW - 2, ey);
  g[wy][0] = 0; g[ey][RW - 1] = 0;                                // door tiles
  // drop pockets you can't reach
  const reach = flood(g, 1, wy);
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) if (!g[y][x] && !reach[y][x]) g[y][x] = 1;
  room.start = { x: 1, y: wy };
  return room;
}
function flood(g, sx, sy, blocked) {
  const seen = g.map(r => r.map(() => false));
  const q = [[sx, sy]]; seen[sy][sx] = true;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= RW || ny >= RH || seen[ny][nx] || g[ny][nx]) continue;
      if (blocked && blocked[ny + "," + nx]) continue;
      seen[ny][nx] = true; q.push([nx, ny]);
    }
  }
  return seen;
}
function roomBlocked(rm) {
  const b = {};
  rm.objs.forEach(o => b[o.y + "," + o.x] = 1);
  rm.props.forEach(p => b[p.y + "," + p.x] = 1);
  return b;
}
/* every door and every object must stay reachable (objects from a neighbor tile) */
function roomOk(rm) {
  const reach = flood(rm.g, 1, rm.west.y, roomBlocked(rm));
  if (!reach[rm.east.y][RW - 2] && !reach[rm.east.y][RW - 1]) return false;
  return rm.objs.every(o => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
    const x = o.x + dx, y = o.y + dy; return x >= 0 && y >= 0 && x < RW && y < RH && reach[y][x];
  }));
}
function freeTiles(rm) {
  const b = roomBlocked(rm), out = [];
  for (let y = 1; y < RH - 1; y++) for (let x = 1; x < RW - 1; x++) {
    if (rm.g[y][x] || b[y + "," + x]) continue;
    if (y === rm.west.y && x <= 2) continue;
    if (y === rm.east.y && x >= RW - 3) continue;
    out.push({ x, y });
  }
  return out;
}
function placeObj(R, rm, o, opt) {
  const tiles = freeTiles(rm).filter(t => Math.abs(t.x - 1) + Math.abs(t.y - rm.west.y) >= (opt.minFromEntrance || 0) &&
    !rm.objs.some(p => Math.abs(p.x - t.x) + Math.abs(p.y - t.y) < 3));
  const pref = opt.wallHug ? tiles.filter(t => rm.g[t.y - 1][t.x] || rm.g[t.y + 1][t.x] || rm.g[t.y][t.x - 1] || rm.g[t.y][t.x + 1]) : tiles;
  const list = (pref.length ? pref : tiles).sort(() => R() - 0.5);
  for (const t of list) {
    o.x = t.x; o.y = t.y; rm.objs.push(o);
    if (roomOk(rm)) return true;
    rm.objs.pop();
  }
  return false;
}
function placeProps(R, rm, look) {
  const n = 8 + Math.floor(R() * 8);
  let tries = 0, placed = 0;
  while (placed < n && tries++ < 120) {
    const tiles = freeTiles(rm);
    const t = tiles[Math.floor(R() * tiles.length)];
    if (!t) break;
    if (rm.objs.some(o => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < 2)) continue;
    const p = { x: t.x, y: t.y, key: look.props[Math.floor(R() * look.props.length)], flip: R() < 0.5 };
    rm.props.push(p);
    if (!roomOk(rm)) { rm.props.pop(); continue; }
    placed++;
  }
}
function placeTorches(R, rm, n) {
  const spots = [];
  for (let y = 1; y < RH - 1; y++) for (let x = 1; x < RW - 1; x++)
    if (rm.g[y][x] === 1 && rm.g[y + 1] && rm.g[y + 1][x] === 0) spots.push({ x, y });
  spots.sort(() => R() - 0.5);
  for (const s of spots) {
    if (rm.torches.length >= n) break;
    if (rm.torches.some(t => Math.abs(t.x - s.x) + Math.abs(t.y - s.y) < 6)) continue;
    rm.torches.push(s);
  }
}

/* ===================== RUN STATE ON THE MAP ===================== */
function mapOn() { return settings.mapMode !== false; }
function ensureMapState(run) {
  if (run.map && run.map.floor === run.floor) return run.map;
  const F = floorData(run);
  // coming from quick mode mid-floor: the foes already beaten stay beaten
  const done = [];
  for (let i = 0; i < Math.min(run.idx || 0, floorInfo(run, run.floor).foes.length); i++) done.push("f" + i);
  run.map = { floor: run.floor, room: 0, x: F.rooms[0].start.x, y: F.rooms[0].start.y, cleared: done, opened: [], eggs: [],
              quest: 0, need: 0, items: 0, keys: 0, unlocked: false, shrine: 0, entered: false };
  return run.map;
}
function foesLeft(run) {
  const F = floorData(run), ms = run.map;
  let n = 0; F.rooms.forEach(rm => rm.objs.forEach(o => { if (o.type === "foe" && !ms.cleared.includes(o.id)) n++; }));
  return n;
}
function totalFoes(run) { let n = 0; floorData(run).rooms.forEach(rm => rm.objs.forEach(o => { if (o.type === "foe") n++; })); return n; }

/* ===================== ENTER / LEAVE ===================== */
const MS = { x: 0, y: 0, tx: 0, ty: 0, fromX: 0, fromY: 0, t: 1, path: [], keyDir: null, dir: 1, raf: 0, last: 0, step: 0,
             goal: null, pdown: false, plast: 0, parts: [], acc: {}, cache: {}, banner: null, fade: 0, fadeTo: null, time: 0, bump: 0 };
function enterMap(banner) {
  const b = S.battle, s = b.s;
  const ms = ensureMapState(s);
  b.mapMode = true;
  b.enemy = b.enemy || makeEnemy(s);
  MS.x = MS.tx = ms.x; MS.y = MS.ty = ms.y; MS.t = 1; MS.path = []; MS.goal = null; MS.keyDir = null;
  MS.parts = [];
  S.mapDlg = null; S.mapQ = null;
  if (!ms.entered) { ms.entered = true; MS.banner = { text: floorTitle(s, s.floor), sub: storyOf(s).title, t: 0 }; }
  else if (banner) MS.banner = { text: banner, sub: "", t: 0 };
  if (s.picks > 0 && !b.lvl) b.lvl = { stage: "choose" };
  persistMap();
  S.screen = "map";
  S.navIdx = 0;
  render();
  window.scrollTo(0, 0);
}
function persistMap() {
  const b = S.battle; if (!b) return;
  const ms = b.s.map; if (!ms) return;
  ms.x = MS.tx; ms.y = MS.ty;
  b.s.updated = Date.now();
  saveAdv(); saveHeroes(); saveProgress();
}
/* back from a fight: drop the foe, maybe a new floor */
function returnToMap() {
  const b = S.battle, s = b.s;
  const newFloor = !s.map || s.map.floor !== s.floor;
  b.pend = null; b.fx = null; b.armed = null; resetQ();
  if (typeof FX !== "undefined" && FX.parts) FX.parts = [];
  if (newFloor) { s.map = null; ensureMapState(s); }
  enterMap(newFloor ? null : null);
}
function startMapFight(o) {
  const b = S.battle, s = b.s;
  s.idx = o.boss ? floorInfo(s, s.floor).foes.length : o.foe;
  b.enemy = makeEnemy(s);
  b.mapFight = o.boss ? "boss" : o.id;
  b.pend = null; b.armed = null; b.note = null; b.lvl = null;
  fightStart(s, b.h);
  pickQuestion(); resetQ(); freshOrder(b.cur);
  b.fx = { type: o.boss ? "foeEnter" : "enter" };
  persistMap();
  S.screen = "battle"; S.navIdx = 0;
  if (o.boss) setTimeout(() => sfx.bBoss(), 380); else sfx.bStart();
  render(); window.scrollTo(0, 0);
}

/* ===================== MOVEMENT ===================== */
function curRoom() { const F = floorData(S.battle.s); return F.rooms[S.battle.s.map.room]; }
function objAt(rm, x, y) {
  const ms = S.battle.s.map;
  return rm.objs.find(o => o.x === x && o.y === y && !(o.type === "foe" && ms.cleared.includes(o.id)) && !(o.type === "egg" && ms.eggs.includes(o.id))) || null;
}
function tileBlocked(rm, x, y) {
  if (x < 0 || y < 0 || x >= RW || y >= RH) return true;
  if (rm.g[y][x]) return true;
  if (rm.props.some(p => p.x === x && p.y === y)) return true;
  const o = objAt(rm, x, y);
  if (o && o.type !== "egg") return true;
  if (x === RW - 1 && y === rm.east.y) return !doorOpen(rm);
  return false;
}
function doorOpen(rm) {
  const s = S.battle.s, ms = s.map;
  if (rm.last) return foesLeft(s) === 0;          // the gate
  if (rm.lock) return ms.unlocked;
  return true;
}
function bfs(rm, sx, sy, goalFn) {
  const prev = {}, q = [[sx, sy]], key = (x, y) => x + "," + y;
  prev[key(sx, sy)] = null;
  while (q.length) {
    const [x, y] = q.shift();
    if (goalFn(x, y)) { const path = []; let k = key(x, y); while (prev[k]) { path.unshift(k.split(",").map(Number)); k = prev[k]; } return path; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (k in prev || tileBlocked(rm, nx, ny)) continue;
      prev[k] = key(x, y); q.push([nx, ny]);
    }
  }
  return null;
}
function adjacent(ax, ay, bx, by) { return Math.abs(ax - bx) + Math.abs(ay - by) === 1; }
function mapBusy() { return !!(S.mapQ || (S.battle && S.battle.lvl) || MS.fadeTo); }
/* walk toward a tile, or toward whatever is standing on it */
function mapGoTo(x, y) {
  const rm = curRoom();
  const o = objAt(rm, x, y);
  const isDoor = (x === RW - 1 && y === rm.east.y) || (x === 0 && y === rm.west.y);
  if (o && o.type !== "egg") {
    if (adjacent(MS.tx, MS.ty, x, y)) { faceTo(x); return interact(o); }
    const p = bfs(rm, MS.tx, MS.ty, (px, py) => adjacent(px, py, x, y));
    MS.path = p || []; MS.goal = p ? o : null;
    return;
  }
  if (isDoor && !doorOpen(rm) && x === RW - 1) {
    const p = bfs(rm, MS.tx, MS.ty, (px, py) => adjacent(px, py, x, y));
    MS.path = p || []; MS.goal = p ? { type: "door" } : null; return;
  }
  const p = bfs(rm, MS.tx, MS.ty, (px, py) => px === x && py === y);
  MS.path = p || []; MS.goal = o && o.type === "egg" ? o : null;
}
function faceTo(x) { if (x !== MS.tx) MS.dir = x > MS.tx ? 1 : -1; }
function stepTo(nx, ny) {
  const rm = curRoom();
  faceTo(nx);
  if (nx === RW - 1 && ny === rm.east.y && !doorOpen(rm)) { MS.path = []; return bumpDoor(rm); }
  const o = objAt(rm, nx, ny);
  if (o && o.type !== "egg") { MS.path = []; return interact(o); }
  if (tileBlocked(rm, nx, ny)) { MS.path = []; return; }
  MS.fromX = MS.tx; MS.fromY = MS.ty; MS.tx = nx; MS.ty = ny; MS.t = 0;
  MS.step++;
}
function arrive() {
  const b = S.battle, s = b.s, ms = s.map, rm = curRoom();
  ms.x = MS.tx; ms.y = MS.ty;
  // doors
  if (MS.tx === RW - 1 && MS.ty === rm.east.y) {
    if (rm.last) return startMapFight({ boss: true });
    return changeRoom(ms.room + 1, "west");
  }
  if (MS.tx === 0 && MS.ty === rm.west.y && ms.room > 0) return changeRoom(ms.room - 1, "east");
  if (MS.tx === 0 && MS.ty === rm.west.y && ms.room === 0) { MS.tx = 1; MS.x = 1; MS.path = []; return say("The way back is sealed. Onward."); }
  const o = objAt(rm, MS.tx, MS.ty);
  if (o && o.type === "egg") { MS.path = []; return interact(o); }
  if (MS.step % 8 === 0) persistMap();
  if (!MS.path.length && MS.goal) {
    const g = MS.goal; MS.goal = null;
    if (g.type === "door") return bumpDoor(rm);
    if (adjacent(MS.tx, MS.ty, g.x, g.y)) { faceTo(g.x); interact(g); }
  }
}
function changeRoom(r, side) {
  const s = S.battle.s, ms = s.map, F = floorData(s);
  MS.fadeTo = { r, side }; MS.fade = 0;
  MS.path = []; MS.goal = null;
  sfx.tick();
  setTimeout(() => {
    ms.room = r;
    const rm = F.rooms[r];
    if (side === "west") { MS.tx = 1; MS.ty = rm.west.y; MS.dir = 1; }
    else { MS.tx = RW - 2; MS.ty = rm.east.y; MS.dir = -1; }
    MS.x = MS.tx; MS.y = MS.ty; MS.t = 1;
    MS.parts = [];
    MS.fadeTo = null;
    persistMap();
    render();
  }, 220);
}
function bumpDoor(rm) {
  const s = S.battle.s, ms = s.map;
  if (rm.last) {
    const n = foesLeft(s);
    sfx.bBlock();
    return say(`The gate won't budge. ${n} ${n === 1 ? "guardian" : "guardians"} still stand${n === 1 ? "s" : ""} on this floor. Defeat them all to open it.`);
  }
  if (rm.lock && !ms.unlocked) {
    if (ms.keys > 0) { ms.keys--; ms.unlocked = true; sfx.bArm(); persistMap(); return say("You turn the key. The door grinds open."); }
    sfx.bBlock();
    return say("Locked tight. There has to be a key on this floor somewhere.");
  }
}

/* ===================== INTERACTION ===================== */
function say(text, actions, title, then) { S.mapDlg = { text, actions: actions || null, title: title || null, then: then || null }; render(); }
/* closing a dialog can hand out what it promised */
function closeDlg() {
  const d = S.mapDlg; S.mapDlg = null;
  if (d && d.then === "gift") S.battle.lvl = { stage: "free", free: true, src: "npc" };
  else if (S.battle.s.picks > 0 && !S.battle.lvl) S.battle.lvl = { stage: "choose" };
  render();
}
function interact(o) {
  const b = S.battle, s = b.s, ms = s.map;
  if (o.type === "foe") return startMapFight(o);
  if (o.type === "chest") {
    if (ms.opened.includes(o.id)) return say("Empty. You already looted this one.");
    return say("A locked chest. The lock has a riddle carved into it.", [{ label: "Answer it (1 question)", act: "mapQStart", arg: o.id }], "Chest");
  }
  if (o.type === "shrine") {
    if (ms.shrine === 1) return say("The shrine glows softly. It already gave you its gift.");
    if (ms.shrine === 2) return say("The shrine is dark and silent. Maybe next floor.");
    return say("An old shrine hums with power. Answer 3 in a row to wake it. Miss once and it falls dormant for this floor.",
      [{ label: "Begin the trial (3 questions)", act: "mapQStart", arg: o.id }], "Shrine");
  }
  if (o.type === "npc") {
    const who = NPC_NAME[s.story] || "Stranger", item = QUEST_ITEM[s.story] || "trophies";
    if (ms.quest === 0) {
      const left = foesLeft(s);
      if (left === 0) { ms.quest = 2; grantXp(10); persistMap(); return say(`"You already cleared this floor? Wow. Here, take this for the trouble." (+10 XP)`, null, who); }
      ms.quest = 1; ms.need = Math.min(3, left); ms.items = 0; persistMap();
      return say(`"Please, adventurer! Bring me ${ms.need} ${item}. The monsters on this floor carry them. I'll make it worth your while."`, null, who);
    }
    if (ms.quest === 1 && ms.items < ms.need) return say(`"Still need ${ms.need - ms.items} more ${item}. Go get 'em!"`, null, who);
    if (ms.quest === 1) {
      ms.quest = 2; persistMap();
      grantXp(30);
      sfx.bVictory();
      return say(`"You did it! Take this, and my blessing." (+30 XP and a free boon roll)`, null, who, "gift");
    }
    return say(`"Thanks again, friend. Safe travels!"`, null, who);
  }
  if (o.type === "egg") {
    if (ms.eggs.includes(o.id)) return;
    ms.eggs.push(o.id);
    grantXp(8);
    sfx.bArm();
    MS.burst = { x: o.x, y: o.y, t: 0 };
    persistMap();
    return say(EGG_LINES[o.line % EGG_LINES.length] + " (+8 XP)", null, "Secret found!");
  }
}
function grantXp(n) {
  const b = S.battle;
  const leveled = gainXp(Math.round(n * (1 + mods(b.s, b.h).xp)));
  if (leveled) { sfx.bLevel(); MS.lvlFlash = 0; }
  return leveled;
}
/* questions on the map: chests (1) and shrines (3 in a row) */
function mapQStart(id) {
  const b = S.battle, rm = curRoom();
  const o = rm.objs.find(x => x.id === id); if (!o) return;
  S.mapDlg = null;
  S.mapQ = { obj: id, kind: o.type, step: 0, need: o.type === "shrine" ? 3 : 1, q: null, result: null };
  mapNextQ();
}
function mapNextQ() {
  const b = S.battle, saved = b.enemy;
  b.enemy = { boss: false };
  pickQuestion();
  b.enemy = saved;
  S.mapQ.q = b.cur;
  resetQ(); freshOrder(b.cur);
  sfx.tick();
  render();
}
function mapQuestion() { return S.mapQ ? S.mapQ.q : null; }
function mapSubmit() {
  const b = S.battle, s = b.s, ms = s.map, Q = S.mapQ, q = Q.q;
  const ok = grade(q, S.selected);
  recordAnswer(q, ok);
  if (!s.seen.includes(q.id)) s.seen.push(q.id);
  S.feedback = ok ? "correct" : "incorrect";
  if (!ok) S.showAnswer = true;
  const rm = curRoom(), o = rm.objs.find(x => x.id === Q.obj);
  if (Q.kind === "chest") {
    if (ok) {
      ms.opened.push(o.id);
      grantXp(12);
      let msg = "The chest clicks open! +12 XP";
      if (o.key) { ms.keys++; msg += " and a rusty key"; }
      Q.result = { ok, text: msg + "." };
      sfx.bVictory();
    } else {
      const d = Math.min(6, s.hp - 1); s.hp -= d;
      Q.result = { ok, text: `The lock snaps at your fingers.${d > 0 ? " -" + d + " HP." : ""} You can try again.` };
      sfx.bHurt();
    }
  } else {
    if (ok) {
      Q.step++;
      if (Q.step >= Q.need) {
        ms.shrine = 1; grantXp(25);
        Q.result = { ok, text: "The shrine blazes to life! +25 XP and a free boon roll.", gift: true };
        sfx.bVictory();
      } else { Q.result = { ok, text: `Correct. ${Q.need - Q.step} to go.`, more: true }; sfx.bArm(); }
    } else {
      ms.shrine = 2;
      Q.result = { ok, text: "The light flickers out. The shrine goes dormant." };
      sfx.bFizzle();
    }
  }
  persistMap();
  render();
}
function mapQNext() {
  const Q = S.mapQ, b = S.battle;
  if (Q && Q.result && Q.result.more) { Q.result = null; return mapNextQ(); }
  const gift = Q && Q.result && Q.result.gift;
  S.mapQ = null; resetQ();
  if (gift) b.lvl = { stage: "free", free: true, src: "shrine" };
  else if (b.s.picks > 0) b.lvl = { stage: "choose" };
  sfx.tick();
  render();
}
/* a foe died on the map: count it, quest items, then back to exploring */
function mapFoeDown(id) {
  const s = S.battle.s, ms = s.map;
  if (!ms || id === "boss") return;
  if (!ms.cleared.includes(id)) ms.cleared.push(id);
  if (ms.quest === 1 && ms.items < ms.need) ms.items++;
}

/* ===================== VIEW ===================== */
const MAP_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>';
function viewMap() {
  const b = S.battle;
  if (!b) return `<div class="wrap"><div class="empty">No adventure running.</div></div>`;
  const s = b.s, h = b.h, C = CLASSES[h.cls], ms = ensureMapState(s), F = floorData(s);
  const left = foesLeft(s), total = totalFoes(s);
  const mx = maxHpOf(s, h), hpFrac = s.hp / mx;
  const item = QUEST_ITEM[s.story] || "items";
  const goals = [
    `<li class="${left === 0 ? "done" : ""}">${left === 0 ? "✓" : "⚔"} Guardians defeated: ${total - left}/${total}</li>`,
    `<li class="${left === 0 ? "" : "muted"}">${left === 0 ? "🚪 The gate is open. The boss waits beyond it (far east)." : "🔒 The gate stays sealed until every guardian falls."}</li>`,
    ms.quest === 1 ? `<li>📜 Bring ${ms.need} ${item}: ${ms.items}/${ms.need}</li>` : "",
    ms.keys ? `<li>🗝 Keys: ${ms.keys}</li>` : "",
  ].join("");
  let panel = "";
  if (S.mapQ) panel = viewMapQ();
  else if (S.mapDlg) {
    const d = S.mapDlg;
    panel = `<div class="mapdlg tex fbpop">
      ${d.title ? `<div class="eyebrow" style="color:var(--star);margin-bottom:6px">${esc(d.title)}</div>` : ""}
      <div class="dlgtext">${esc(d.text)}</div>
      <div class="dlgbtns">${(d.actions || []).map(a => `<button class="primary" data-act="${a.act}" data-arg="${esc(a.arg || "")}" style="background:var(--accent)">${esc(a.label)}</button>`).join("")}
      <button class="ghost" data-act="mapDlgClose">${d.actions ? "Not now" : "OK"}</button></div></div>`;
  } else if (b.lvl) panel = viewLevelUp();
  else {
    panel = `<div class="maphelp tex">
      <div class="eyebrow" style="margin-bottom:6px">Exploring</div>
      <div class="dim" style="font-size:13.5px;line-height:1.6">Walk with the <b>arrow keys</b> or <b>tap/click</b> where you want to go (hold to keep following). Walk into foes to fight. Press <b>Enter</b> or tap things to interact. Chests, shrines and strangers are optional, and secrets hide near the walls.</div>
    </div>`;
  }
  const bn = MS.banner; MS.banner = null;
  return `<div class="wrap battle mapwrap">
    <div class="bhead">
      <button class="backbtn" data-act="toAdvMenu" title="Save & exit">${I.chevL}</button>
      <span class="eyebrow" style="color:${C.color}">${esc(h.name)} · ${esc(floorTitle(s, s.floor))}${F.nRooms > 1 ? " · Room " + (ms.room + 1) + "/" + F.nRooms : ""}</span>
      <span></span>
    </div>
    <div class="bgrid">
      <div class="bleft">
        <div class="mapbox ${F.dark ? "dark" : ""}" id="mapbox">
          <canvas id="mapcv" class="mapcv" width="${RW * T}" height="${RH * T}"></canvas>
          ${bn ? `<div class="mapbanner"><div class="mbt">${esc(bn.text)}</div>${bn.sub ? `<div class="mbs">${esc(bn.sub)}</div>` : ""}</div>` : ""}
        </div>
        <div class="hud tex maphud">
          <div class="hudcol">
            <div class="hudlabel"><span>HP</span><b style="color:${hpColor(hpFrac)}">${s.hp} / ${mx}</b></div>
            <div class="hpbar ${hpFrac < 0.3 ? "low" : ""}"><div class="fillb" style="width:${hpFrac * 100}%;background:${hpColor(hpFrac)}"></div></div>
            <div class="xpbar" title="XP ${xpInto(h.xp)} / ${XPL}"><div style="width:${xpInto(h.xp) / XPL * 100}%"></div></div>
            <div class="hudboon">${boonChip(h, true, b.lvl && b.lvl.stage === "reveal" ? b.lvl.before : null)}</div>
          </div>
          <div class="hudcol">
            <div class="hudlabel"><span>Lv ${levelOf(h.xp)} ${esc(C.name)}</span><b style="color:var(--muted)">${diffOf(s).label}</b></div>
            <ul class="goals">${goals}</ul>
            ${s.picks > 0 && !b.lvl ? `<button class="primary lvlnow" data-act="mapLevel">★ Level up! (${s.picks})</button>` : ""}
          </div>
        </div>
      </div>
      <div class="bright">${panel}</div>
    </div>
  </div>`;
}
function viewMapQ() {
  const Q = S.mapQ, q = Q.q;
  if (!q) return "";
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
      <span>${esc(q.options[origIdx])}</span></button>`;
  }).join("");
  const title = Q.kind === "shrine" ? `Shrine trial · ${Math.min(Q.step + 1, Q.need)} of ${Q.need}` : "Chest riddle";
  let fb = "";
  if (S.feedback && Q.result) {
    const ok = Q.result.ok;
    fb = `<div class="fb tex fbpop" style="background:${ok ? "var(--okBg)" : "var(--badBg)"};border:1px solid ${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:14px">
      ${ok ? I.check("var(--ok)") : I.x("var(--bad)")}
      <div><div style="font-weight:bold;color:${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:4px">${esc(Q.result.text)}</div>
      <div class="dim" style="font-size:14px;line-height:1.6">${esc(q.explanation || "")}</div></div></div>`;
  }
  const btn = !S.feedback
    ? `<button class="primary" data-act="mapSubmit" style="background:${S.selected.length ? "var(--accent)" : "var(--border)"};color:${S.selected.length ? "#fff" : "var(--muted)"}" ${S.selected.length ? "" : "disabled"}>Answer</button>`
    : `<button class="primary" data-act="mapQNext" style="background:var(--accent)">${Q.result && Q.result.more ? "Next question →" : "Back to exploring →"}</button>`;
  const cc = q._cat ? ck(q._cat.color) : "var(--accent)";
  return `<div class="card qcard tex" style="cursor:default">
      <div class="eyebrow" style="color:var(--star);margin-bottom:6px">${title}</div>
      <div class="eyebrow" style="color:${cc};margin-bottom:10px">${q.type === "mc" ? "Multiple Choice" : "Select All That Apply"}${q._cat ? " · " + esc(q._cat.category) : ""}</div>
      <div class="qtext">${esc(q.question)}</div>
    </div>
    <div class="bopts">${opts}</div>${fb}<div>${btn}</div>`;
}

/* ===================== DRAWING ===================== */
function spriteImg(name, flip) {
  const k = name + (flip ? "|f" : "");
  if (MS.cache[k]) return MS.cache[k];
  if (!getSprite(name)) return null;
  const grid = spriteGrid(name), n = grid.length, m = grid[0].length;
  const c = document.createElement("canvas"); c.width = m; c.height = n;
  const g = c.getContext("2d");
  for (let y = 0; y < n; y++) for (let x = 0; x < m; x++) {
    const col = grid[y][x]; if (!col) continue;
    g.fillStyle = col; g.fillRect(flip ? m - 1 - x : x, y, 1, 1);
  }
  return (MS.cache[k] = c);
}
function hexMix(a, b, t) { return rgb(mix(toRgb(a), toRgb(b), t)); }
/* the static part of a room: floor, decals, walls, door frames */
function roomLayer(run, F, ri) {
  const key = mapSeed(run) + ":" + ri;
  if (MS.cache[key]) return MS.cache[key];
  const rm = F.rooms[ri], L = F.look, tint = floorInfo(run, run.floor).tint;
  const c = document.createElement("canvas"); c.width = RW * T; c.height = RH * T;
  const g = c.getContext("2d");
  const R = rng32(hashStr(key));
  const fl = hexMix(L.floor, rgb(tint), 0.08), fl2 = hexMix(L.floor2, rgb(tint), 0.08);
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
    const X = x * T, Y = y * T;
    if (!rm.g[y][x]) {
      // floor tile
      px(X, Y, T, T, (x + y) % 2 && L.decal === "check" ? fl2 : R() < 0.5 ? fl : fl2);
      for (let i = 0; i < 5; i++) px(X + Math.floor(R() * T), Y + Math.floor(R() * T), 1, 1, L.speck[Math.floor(R() * 2)]);
      const d = R();
      if (L.decal === "tuft" && d < 0.18) { const a = X + 3 + Math.floor(R() * 9), b2 = Y + 4 + Math.floor(R() * 8); px(a, b2, 1, 2, L.speck[0]); px(a + 2, b2 - 1, 1, 3, L.speck[0]); px(a + 4, b2, 1, 2, L.speck[0]); }
      if (L.decal === "crack" && d < 0.16) { let a = X + 2, b2 = Y + 4 + Math.floor(R() * 8); for (let k = 0; k < 10; k++) { px(a, b2, 1, 1, k % 3 ? "#7c2d12" : "#f97316"); a++; b2 += Math.floor(R() * 3) - 1; } }
      if (L.decal === "flag") { px(X, Y + T - 1, T, 1, L.speck[1]); px(X + T - 1, Y, 1, T, L.speck[1]); }
      if (L.decal === "rivet") { px(X, Y, T, 1, L.speck[1]); px(X, Y, 1, T, L.speck[1]); if (d < 0.5) { px(X + 2, Y + 2, 1, 1, L.speck[0]); px(X + T - 3, Y + T - 3, 1, 1, L.speck[0]); } }
      if (L.decal === "snow" && d < 0.3) { px(X + 4 + Math.floor(R() * 8), Y + 4 + Math.floor(R() * 8), 2, 1, "#ffffff"); }
      if (L.decal === "ripple" && d < 0.3) { const b2 = Y + 4 + Math.floor(R() * 8); for (let k = 0; k < 10; k++) px(X + 3 + k, b2 + (k % 4 < 2 ? 0 : 1), 1, 1, L.speck[0]); }
      if (L.decal === "shell" && d < 0.08) { px(X + 6, Y + 8, 3, 2, "#fbcfe8"); px(X + 7, Y + 7, 1, 1, "#fbcfe8"); }
      if (L.decal === "dots" && d < 0.25) { px(X + 4 + Math.floor(R() * 8), Y + 4 + Math.floor(R() * 8), 2, 2, "#f2c4bc"); }
      if (L.decal === "check") { /* checkerboard already */ }
      continue;
    }
    // wall: top surface everywhere, a front face where the floor is right below
    const face = y + 1 < RH && !rm.g[y + 1][x];
    px(X, Y, T, T, L.lo);
    for (let i = 0; i < 4; i++) px(X + Math.floor(R() * T), Y + Math.floor(R() * T), 2, 1, hexMix(L.lo, L.wall, 0.5));
    if (!face) continue;
    const fy = Y + 4, fh = T - 4;
    px(X, fy, T, fh, L.wall);
    if (L.pat === "brick" || L.pat === "sandstone") {
      const bh = L.pat === "brick" ? 4 : 6;
      for (let r = 0; r * bh < fh; r++) {
        px(X, fy + r * bh, T, 1, L.lo);
        const off = r % 2 ? 0 : (L.pat === "brick" ? 4 : 6);
        for (let c2 = off; c2 < T; c2 += (L.pat === "brick" ? 8 : 12)) px(X + c2, fy + r * bh, 1, bh, L.lo);
        px(X + 1, fy + r * bh + 1, T - 2, 1, hexMix(L.wall, L.hi, 0.4));
      }
    } else if (L.pat === "plate") {
      px(X, fy, T, 1, L.hi); px(X, fy, 1, fh, L.hi); px(X + T - 1, fy, 1, fh, L.lo); px(X, Y + T - 1, T, 1, L.lo);
      [[2, 2], [T - 3, 2], [2, fh - 3], [T - 3, fh - 3]].forEach(([a, b2]) => { px(X + a, fy + b2, 1, 1, "#fde68a"); px(X + a, fy + b2 + 1, 1, 1, L.lo); });
    } else if (L.pat === "membrane") {
      for (let i = 0; i < 3; i++) { const a = X + 2 + Math.floor(R() * 10), b2 = fy + 2 + Math.floor(R() * 6); px(a, b2, 4, 3, L.hi); px(a + 1, b2, 2, 1, "#f9c0cb"); }
      px(X, fy + Math.floor(fh / 2) + Math.floor(R() * 3), T, 1, L.lo);
      px(X, fy, T, 1, L.hi);
    } else if (L.pat === "ice") {
      px(X, fy, T, 1, "#e0f2fe"); for (let k = 0; k < 6; k++) px(X + 2 + k, fy + 2 + k, 1, 1, "#e0f2fe");
      px(X + T - 1, fy, 1, fh, L.lo); px(X, Y + T - 1, T, 1, L.lo);
    } else if (L.pat === "tent") {
      for (let c2 = 0; c2 < T; c2 += 4) px(X + c2, fy, 2, fh, L.hi);
      for (let c2 = 0; c2 < T; c2 += 4) px(X + c2 + 1, fy + fh - 2, 2, 2, "#facc15");
    } else if (L.pat === "coral") {
      px(X, fy, T, 1, L.hi);
      for (let i = 0; i < 3; i++) px(X + Math.floor(R() * 13), fy + 1 + Math.floor(R() * 8), 3, 2, L.hi);
      if (R() < 0.5) { const a = X + Math.floor(R() * 12); px(a, fy + 2, 1, 4, "#fb7185"); px(a - 1, fy + 2, 3, 1, "#fb7185"); }
    } else {                                                                   // rock
      px(X, fy, T, 1, L.hi);
      for (let i = 0; i < 4; i++) px(X + Math.floor(R() * 12), fy + 2 + Math.floor(R() * 8), 3 + Math.floor(R() * 3), 2, i % 2 ? L.hi : L.lo);
    }
    px(X, Y + T - 1, T, 1, "rgba(0,0,0,.35)");
  }
  // rims where walls meet the floor on the sides and bottom, so every edge reads clearly
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
    if (!rm.g[y][x]) continue;
    const X = x * T, Y = y * T;
    if (x + 1 < RW && !rm.g[y][x + 1]) { px(X + T - 3, Y, 3, T, L.wall); px(X + T - 3, Y, 1, T, L.hi); }
    if (x > 0 && !rm.g[y][x - 1]) { px(X, Y, 3, T, L.wall); px(X + 2, Y, 1, T, L.hi); }
    if (y > 0 && !rm.g[y - 1][x]) { px(X, Y, T, 3, L.wall); px(X, Y, T, 1, L.hi); }
  }
  // soft shadow under walls onto the floor
  for (let y = 1; y < RH; y++) for (let x = 0; x < RW; x++) if (!rm.g[y][x] && rm.g[y - 1][x]) { g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x * T, y * T, T, 3); }
  return (MS.cache[key] = c);
}
function drawDoor(g, rm, side, open, kind) {
  const y = (side === "east" ? rm.east.y : rm.west.y) * T, x = side === "east" ? (RW - 1) * T : 0;
  if (kind === "gate") {
    g.fillStyle = "#1c1917"; g.fillRect(x, y - 4, T, T + 4);
    if (!open) { g.fillStyle = "#57534e"; for (let k = 1; k < T; k += 4) g.fillRect(x + k, y - 3, 2, T + 2); g.fillStyle = "#a8a29e"; g.fillRect(x, y + 3, T, 2); g.fillRect(x, y + 10, T, 2); }
    else { g.fillStyle = "#7f1d1d"; g.fillRect(x + 2, y, T - 4, T); g.fillStyle = "#57534e"; for (let k = 1; k < T; k += 4) g.fillRect(x + k, y - 4, 2, 3); }
    g.fillStyle = "#facc15"; g.fillRect(x + 6, y - 6, 4, 2);
  } else if (kind === "lock") {
    if (open) return;
    g.fillStyle = "#6b3e1f"; g.fillRect(x + 1, y, T - 2, T);
    g.fillStyle = "#8a5530"; for (let k = 2; k < T; k += 5) g.fillRect(x + 2, y + k, T - 4, 2);
    g.fillStyle = "#facc15"; g.fillRect(x + 7, y + 6, 3, 4); g.fillStyle = "#1c1917"; g.fillRect(x + 8, y + 8, 1, 2);
  } else if (kind === "stairs") {
    g.fillStyle = "#1c1917"; g.fillRect(x, y, T, T);
    g.fillStyle = "#78716c"; for (let k = 0; k < 4; k++) g.fillRect(x + k * 3, y + 2 + k * 3, T - k * 3, 2);
  }
}
function drawTorch(g, tx, ty, t) {
  const X = tx * T + 6, Y = ty * T + 6;
  g.fillStyle = "#5b3a1e"; g.fillRect(X + 1, Y + 4, 2, 6);
  const f = Math.floor(t * 10 + tx * 3) % 3;
  g.fillStyle = "#f97316"; g.fillRect(X, Y + 1 - (f === 1 ? 1 : 0), 4, 4);
  g.fillStyle = "#fde047"; g.fillRect(X + 1, Y + 2 - (f === 2 ? 1 : 0), 2, 2);
  if (f === 0) { g.fillStyle = "#fde047"; g.fillRect(X + 1, Y - 1, 1, 1); }
}
function mapLoop(now) {
  const cv = document.getElementById("mapcv");
  if (!cv || S.screen !== "map" || !S.battle || !S.battle.s.map) { MS.raf = 0; return; }
  const dt = Math.min(0.05, (now - MS.last) / 1000); MS.last = now; MS.time += dt;
  const b = S.battle, s = b.s, ms = s.map, F = floorData(s), rm = F.rooms[ms.room], L = F.look;
  // ---------- movement ----------
  if (MS.t < 1) {
    MS.t = Math.min(1, MS.t + dt * 7.5);
    MS.x = MS.fromX + (MS.tx - MS.fromX) * MS.t; MS.y = MS.fromY + (MS.ty - MS.fromY) * MS.t;
    if (MS.t >= 1) arrive();
  } else if (!mapBusy() && S.screen === "map") {
    if (MS.keyDir) { MS.path = []; MS.goal = null; stepTo(MS.tx + MS.keyDir[0], MS.ty + MS.keyDir[1]); }
    else if (MS.path.length) { const [nx, ny] = MS.path.shift(); stepTo(nx, ny); }
  }
  if (S.screen !== "map" || !document.getElementById("mapcv")) { MS.raf = 0; return; }
  // ---------- draw ----------
  const g = cv.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(roomLayer(s, F, ms.room), 0, 0);
  if (!rm.first) drawDoor(g, rm, "west", true, "open");
  else drawDoor(g, rm, "west", true, "stairs");
  if (rm.last) drawDoor(g, rm, "east", foesLeft(s) === 0, "gate");
  else if (rm.lock) drawDoor(g, rm, "east", ms.unlocked, "lock");
  rm.torches.forEach(t => drawTorch(g, t.x, t.y, MS.time));
  // y-sorted things
  const things = [];
  rm.props.forEach(p => things.push({ y: p.y, draw: () => { const im = spriteImg(p.key, p.flip); if (im) g.drawImage(im, p.x * T + Math.round((T - im.width) / 2), p.y * T + T - im.height); } }));
  rm.objs.forEach(o => {
    if (o.type === "foe" && ms.cleared.includes(o.id)) return;
    if (o.type === "egg") {
      if (ms.eggs.includes(o.id)) return;
      const d = Math.abs(o.x - MS.x) + Math.abs(o.y - MS.y);
      if (d > 4) return;
      things.push({ y: o.y, draw: () => { const ph = Math.floor(MS.time * 5) % 4; g.fillStyle = ph === 0 ? "#ffffff" : "#fde047";
        const X = o.x * T + 8, Y = o.y * T + 8; g.fillRect(X - 1, Y, 3, 1); g.fillRect(X, Y - 1, 1, 3); if (ph < 2) { g.fillRect(X - 3, Y, 1, 1); g.fillRect(X + 3, Y, 1, 1); g.fillRect(X, Y - 3, 1, 1); g.fillRect(X, Y + 3, 1, 1); } } });
      return;
    }
    let key = null, flip = false, bob = 0;
    if (o.type === "foe") { key = o.key; flip = true; bob = Math.round(Math.sin(MS.time * 3 + o.x) * 1); }
    else if (o.type === "chest") key = ms.opened.includes(o.id) ? "m_chestopen" : "m_chest";
    else if (o.type === "shrine") { key = ms.shrine === 0 ? "m_shrine" : "m_shrine~off"; bob = 0; }
    else if (o.type === "npc") { key = getSprite("m_npc~" + s.story) ? "m_npc~" + s.story : "m_npc"; flip = MS.x < o.x; }
    things.push({ y: o.y, draw: () => {
      const im = spriteImg(key, flip); if (!im) return;
      const X = o.x * T + Math.round((T - im.width) / 2), Y = o.y * T + T - im.height + bob;
      g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(o.x * T + 3, o.y * T + T - 3, T - 6, 3);
      g.drawImage(im, X, Y);
      if (o.type === "shrine" && ms.shrine === 0) { const ph = Math.floor(MS.time * 4) % 2; g.fillStyle = ph ? "#cffafe" : "#22d3ee"; g.fillRect(X + 5, Y - 3 - ph, 1, 1); g.fillRect(X + 7, Y - 2, 1, 1); }
      if (o.type === "npc" && ms.quest !== 2) { const ph = Math.floor(MS.time * 2) % 2; g.fillStyle = "#facc15"; g.fillRect(X + 5, Y - 6 - ph, 2, 3); g.fillRect(X + 5, Y - 2 - ph, 2, 1); }
      if (o.type === "chest" && !ms.opened.includes(o.id) && Math.floor(MS.time * 2) % 3 === 0) { g.fillStyle = "#fffbe6"; g.fillRect(X + 2 + Math.floor(MS.time * 7) % 6, Y + 1, 1, 1); }
    } });
  });
  const hk = CLASSES[b.h.cls].sprite;
  const walking = MS.t < 1;
  things.push({ y: MS.y + 0.01, draw: () => {
    const im = spriteImg(hk, MS.dir < 0); if (!im) return;
    const X = Math.round(MS.x * T + (T - im.width) / 2), Y = Math.round(MS.y * T + T - im.height) - (walking && Math.floor(MS.t * 4) % 2 ? 1 : 0);
    g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(Math.round(MS.x * T) + 3, Math.round(MS.y * T) + T - 3, T - 6, 3);
    g.drawImage(im, X, Y);
  } });
  things.sort((a, c) => a.y - c.y).forEach(t => t.draw());
  // interaction hint over whatever you're next to
  const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => objAt(rm, MS.tx + dx, MS.ty + dy)).find(o => o && o.type !== "egg");
  if (near && MS.t >= 1 && !mapBusy()) {
    const ph = Math.floor(MS.time * 3) % 2, X = near.x * T + 6, Y = near.y * T - 12 - ph;
    g.fillStyle = "#000"; g.fillRect(X - 1, Y - 1, 6, 8);
    g.fillStyle = near.type === "foe" ? "#ef4444" : "#fde047"; g.fillRect(X + 1, Y, 2, 4); g.fillRect(X + 1, Y + 5, 2, 1);
  }
  // ---------- weather (low-key, logical pixels) ----------
  mapWeather(g, dt, F.scene);
  // ---------- darkness with torch + hero light ----------
  if (F.dark) {
    const dc = MS.cache.dark || (MS.cache.dark = document.createElement("canvas"));
    dc.width = RW * T; dc.height = RH * T;
    const d = dc.getContext("2d");
    d.fillStyle = L.fog; d.globalAlpha = 0.86; d.fillRect(0, 0, dc.width, dc.height); d.globalAlpha = 1;
    d.globalCompositeOperation = "destination-out";
    // stepped light pools (chunky rings, not a smooth spotlight)
    const hole = (cx, cy, r) => { [[r, 0.3], [r * 0.78, 0.55], [r * 0.56, 0.85], [r * 0.36, 1]].forEach(([rr, a]) => { d.globalAlpha = a; d.beginPath(); d.arc(Math.round(cx), Math.round(cy), Math.round(rr), 0, Math.PI * 2); d.fill(); }); d.globalAlpha = 1; };
    hole(MS.x * T + 8, MS.y * T + 4, 52 + (Math.floor(MS.time * 4) % 2));
    rm.torches.forEach(t => hole(t.x * T + 8, t.y * T + 12, 30 + (Math.floor(MS.time * 6 + t.x) % 2) * 2));
    d.globalCompositeOperation = "source-over";
    g.drawImage(dc, 0, 0);
    // warm torch glow
    g.globalAlpha = 0.12; g.fillStyle = "#f97316";
    rm.torches.forEach(t => { g.beginPath(); g.arc(t.x * T + 8, t.y * T + 12, 18, 0, Math.PI * 2); g.fill(); });
    g.globalAlpha = 1;
    rm.torches.forEach(t => drawTorch(g, t.x, t.y, MS.time));
  }
  // secret found sparkle burst
  if (MS.burst) {
    MS.burst.t += dt;
    const k = MS.burst.t;
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = k * 40; g.fillStyle = i % 2 ? "#fde047" : "#ffffff"; g.fillRect(Math.round(MS.burst.x * T + 8 + Math.cos(a) * r), Math.round(MS.burst.y * T + 8 + Math.sin(a) * r), 2, 2); }
    if (k > 0.6) MS.burst = null;
  }
  // room fade
  if (MS.fadeTo) { MS.fade = Math.min(1, MS.fade + dt * 6); g.fillStyle = "rgba(0,0,0," + (Math.ceil(MS.fade * 4) / 4) + ")"; g.fillRect(0, 0, cv.width, cv.height); }
  MS.raf = requestAnimationFrame(mapLoop);
}
function mapWeather(g, dt, scene) {
  const W = RW * T, H = RH * T, R = Math.random, P = MS.parts;
  const emit = (k, rate, fn) => { MS.acc[k] = (MS.acc[k] || 0) + rate * dt; while (MS.acc[k] >= 1) { MS.acc[k]--; P.push(fn()); } };
  const pick = a => a[Math.floor(R() * a.length)];
  if (scene === "ice") emit("w", 14, () => ({ x: R() * W, y: -2, vx: R() * 6 - 3, vy: 10 + R() * 10, l: 8, c: pick(["#ffffff", "#e0f2fe"]) }));
  else if (scene === "desert") emit("w", 22, () => ({ x: -2, y: R() * H, vx: 40 + R() * 30, vy: R() * 6 - 3, l: 6, c: pick(["#e7c27d", "#f5deb3", "#d6b26a"]) }));
  else if (scene === "lava") emit("w", 9, () => ({ x: R() * W, y: H + 2, vx: R() * 4 - 2, vy: -(14 + R() * 16), l: 4, c: pick(["#fde047", "#f97316", "#ef4444"]), fl: 1 }));
  else if (scene === "gears") emit("w", 5, () => ({ x: R() * W, y: H * (0.2 + R() * 0.8), vx: R() * 4 - 2, vy: -(6 + R() * 8), l: 2.5, c: pick(["#d6d3d1", "#e7e5e4"]), sz: 2 }));
  else if (scene === "sea" || scene === "cells") emit("w", 6, () => ({ x: R() * W, y: H + 2, vx: 0, vy: -(6 + R() * 8), l: 9, c: pick(scene === "sea" ? ["#bae6fd", "#e0f2fe"] : ["#fbe4e0", "#ffffff"]), wob: R() * 6 }));
  else if (scene === "carnival") emit("w", 4, () => ({ x: R() * W, y: -2, vx: R() * 6 - 3, vy: 8 + R() * 6, l: 9, c: pick(["#f472b6", "#facc15", "#60a5fa", "#4ade80"]), wob: R() * 6 }));
  else emit("w", 3, () => ({ x: R() * W, y: R() * H, vx: R() * 6 - 3, vy: R() * 6 - 3, l: 3, c: pick(["#fef08a", "#d9f99d"]), bl: 1, wob: R() * 6 }));
  const keep = [];
  for (const p of P) {
    p.l -= dt; if (p.l <= 0 || p.x > W + 4 || p.y > H + 4 || p.y < -6) continue;
    p.x += (p.vx + (p.wob != null ? Math.sin(MS.time * 2 + p.wob) * 4 : 0)) * dt; p.y += p.vy * dt;
    if (p.bl && Math.floor((MS.time + p.x) * 3) % 3 === 0) { keep.push(p); continue; }
    g.fillStyle = p.fl && R() < 0.2 ? "#ffffff" : p.c;
    g.fillRect(Math.round(p.x), Math.round(p.y), p.sz || 1, p.sz || 1);
    keep.push(p);
  }
  MS.parts = keep.length > 300 ? keep.slice(-300) : keep;
}

/* ===================== INPUT ===================== */
function mapMount() {
  const cv = document.getElementById("mapcv");
  if (!cv) return;
  const toTile = ev => {
    const r = cv.getBoundingClientRect();
    return [Math.floor((ev.clientX - r.left) / r.width * RW), Math.floor((ev.clientY - r.top) / r.height * RH)];
  };
  cv.onpointerdown = ev => {
    if (mapBusy()) return;
    ev.preventDefault();
    if (S.mapDlg && !S.mapDlg.actions) closeDlg();
    MS.pdown = true; MS.plast = performance.now();
    const [x, y] = toTile(ev); mapGoTo(x, y);
    try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
  };
  cv.onpointermove = ev => {
    if (!MS.pdown || mapBusy()) return;
    const now = performance.now(); if (now - MS.plast < 140) return;
    MS.plast = now;
    const [x, y] = toTile(ev);
    const rm = curRoom(), o = objAt(rm, x, y);
    if (o && o.type !== "egg") return;                       // don't keep re-targeting interactables while dragging
    mapGoTo(x, y);
  };
  cv.onpointerup = cv.onpointercancel = () => { MS.pdown = false; };
  if (!MS.raf) { MS.last = performance.now(); MS.raf = requestAnimationFrame(mapLoop); }
}
const KEYDIR = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
document.addEventListener("keydown", ev => {
  if (S.screen !== "map" || modalOpen() || mapBusy()) return;
  const tg = ev.target; if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA")) return;
  const k = ev.key;
  if (KEYDIR[k]) {
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (S.mapDlg && !S.mapDlg.actions) closeDlg();
    MS.keyDir = KEYDIR[k];
    return;
  }
  if (k === "Enter" || k === " " || k === "e" || k === "E") {
    if (S.mapDlg && S.mapDlg.actions) return;                // let normal Enter press the dialog button
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (S.mapDlg) return closeDlg();
    const rm = curRoom();
    const o = [[MS.dir, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => objAt(rm, MS.tx + dx, MS.ty + dy)).find(x => x && x.type !== "egg");
    if (o) interact(o);
    else if (MS.tx === RW - 2 && MS.ty === rm.east.y && !doorOpen(rm)) bumpDoor(rm);
  }
}, true);
document.addEventListener("keyup", ev => {
  if (KEYDIR[ev.key] && MS.keyDir === KEYDIR[ev.key]) MS.keyDir = null;
}, true);
window.addEventListener("blur", () => { MS.keyDir = null; MS.pdown = false; });
