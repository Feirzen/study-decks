/* ===================================================================
   stories.js — Battle story library (data + art)
   Each deck gets one story: its own floors, scenery, foes, bosses,
   final boss and trophy. New enemy sprites live here too, plus
   recolors ("base~variant") so one drawing can play many monsters.
   =================================================================== */

/* ---------- new sprites (16x16, authored facing right) ---------- */
Object.assign(SPRITES, {
  beetle: {
    pal: { a: "#7c5cd6", b: "#3b2a78", w: "#c4b5fd", d: "#2a1f4d", e: "#fde047", l: "#2a1f4d" },
    rows: [
      "................",
      "................",
      "................",
      "................",
      "..........l..l..",
      "...........l.l..",
      ".....bbbbb..ll..",
      "...bbawwaabdddd.",
      "..bawwaaaaabdedd",
      "..baaaaaaaaabddd",
      ".baaaaaaaaaaabd.",
      ".bbaaaaaaaaaabb.",
      "..bbbbbbbbbbbb..",
      "...l.l...l.l....",
      "..l..l..l..l....",
      "................",
    ],
  },
  spider: {
    pal: { a: "#5b5b78", b: "#2a2a3c", w: "#b4b9c6", d: "#34344c", e: "#ef4444", l: "#1c1c28", f: "#e5e7eb" },
    rows: [
      "................",
      "................",
      "................",
      "......bbbb......",
      "....bbaaaabb....",
      "...baawaaaaab...",
      "l..baaaaaaaab..l",
      ".l.baaaaaaaab.l.",
      "..lbbaaaaaabbl..",
      "lll.bdeddedb.lll",
      "...lbdddddddbl..",
      "..l..bbffbb..l..",
      ".l....f..f....l.",
      "l..............l",
      "................",
      "................",
    ],
  },
  mushroom: {
    pal: { r: "#dc2626", w: "#fef2f2", R: "#7f1d1d", s: "#f5e6c8", S: "#c9a97a", e: "#1c1917", m: "#7f1d1d", f: "#a16207" },
    rows: [
      "................",
      "................",
      ".....rrrrrr.....",
      "...rrrwwrrrrr...",
      "..rrwwwrrrwwrr..",
      ".rrrrrrrrrwwrrr.",
      ".rrwwrrrrrrrrrr.",
      "..RRRRRRRRRRRR..",
      "....ssssssss....",
      "....ssessses....",
      "....ssssssss....",
      "....sssmmsss....",
      "....SSSSSSSS....",
      "....ff....ff....",
      "................",
      "................",
    ],
  },
  goblin: {
    pal: { g: "#65a30d", e: "#1c1917", E: "#fef9c3", m: "#3f1d0b", t: "#fefce8", b: "#78350f", B: "#451a03", W: "#a8a29e", l: "#78350f" },
    rows: [
      "................",
      "................",
      "................",
      "......gggg......",
      "gg..gggggggg..gg",
      ".ggggEeggEegggg.",
      "...gggggggggg...",
      "....gmtmmtmg....",
      ".....gggggg..WW.",
      "....bbbbbbbb.WW.",
      "...gbbbbbbbbgl..",
      "...gbbBBbbbbgl..",
      "....bbbbbbbb....",
      "....gg....gg....",
      "...ggg....ggg...",
      "................",
    ],
  },
  skeleton: {
    pal: { w: "#e7e5e4", k: "#1c1917" },
    rows: [
      "................",
      "................",
      ".....wwwwww.....",
      "....wwwwwwww....",
      "....wkkwwkkw....",
      "....wkkwwkkw....",
      "....wwwwkwww....",
      ".....wkwkwk.....",
      "......wwww......",
      "....wwwwwwww....",
      "...w.w.ww.w.w...",
      "...w.wwwwww.w...",
      "...w..w..w..w...",
      "......wwww......",
      ".....w....w.....",
      "....ww....ww....",
    ],
  },
  imp: {
    pal: { h: "#fde68a", r: "#dc2626", y: "#fde047", m: "#450a0a", W: "#7f1d1d" },
    rows: [
      "................",
      "....h......h....",
      "....hh....hh....",
      ".....rrrrrr.....",
      "....rrrrrrrr....",
      "....ryyrryyr....",
      "....rrrrrrrr....",
      ".....rmmmmr.....",
      "W.....rrrr.....W",
      "WW..rrrrrrrr..WW",
      "WWWrrrrrrrrrrWWW",
      ".WW.rrrrrrrr.WW.",
      ".....rrrrrr.....",
      ".....rr..rr.....",
      "....rr....rr....",
      "................",
    ],
  },
  crab: {
    pal: { c: "#ea580c", C: "#9a3412", e: "#1c1917" },
    rows: [
      "................",
      "................",
      "................",
      ".cc..........cc.",
      "cccc........cccc",
      ".cc..........cc.",
      "..c...e..e...c..",
      "..c...e..e...c..",
      "...cccccccccc...",
      "..cccccccccccc..",
      ".cccCccccccCccc.",
      ".cccccccccccccc.",
      "..cCCCCCCCCCCc..",
      ".c.c.c....c.c.c.",
      "c.c.c......c.c.c",
      "................",
    ],
  },
  eyeball: {
    pal: { v: "#7f1d1d", w: "#f5f5f4", r: "#ef4444", i: "#16a34a", p: "#0c0a09", t: "#7f1d1d" },
    rows: [
      "................",
      "................",
      "....vvvvvvvv....",
      "...vwwwwwwwwv...",
      "..vwwwwwwwwwwv..",
      ".vwwrwwwwiiiwwv.",
      ".vwwwrwwiippiwv.",
      ".vwwwwrwiippiwv.",
      ".vwwwwwwwiiiwwv.",
      "..vwwwwwwwwwwv..",
      "...vwwwwwwwwv...",
      ".....vvvvvv.....",
      "......t..t......",
      ".....t....t.....",
      "......t..t......",
      "................",
    ],
  },
  trophy: {
    pal: { r: "#fff7cc", a: "#f2b632", H: "#fffbe6", b: "#b7791f", G: "#ef4444", g: "#fecaca", d: "#9a6512", p: "#5b3a1e", P: "#3b2412" },
    rows: [
      "................",
      "...rrrrrrrrrr...",
      ".bbaaaaaaaaaabb.",
      "b..aHHaaaaaaa..b",
      "b..aHaaaaaaaa..b",
      ".b.aHaaaGaaaa.b.",
      "..baaaaGgGaaab..",
      "...daaaaGaaad...",
      "....daaaaaad....",
      ".....daaaad.....",
      "......dddd......",
      ".......dd.......",
      ".......dd.......",
      ".....dddddd.....",
      "....pppppppp....",
      "....PPPPPPPP....",
    ],
  },
});
/* idle loop per base sprite, and which ones hover */
const IDLE_BASE = {
  hero_knight: "breathe", hero_wizard: "breathe", hero_ranger: "breathe",
  slime: "squish", slime_ice: "squish", slime_magma: "squish", slimeking: "squish",
  bat: "flap", bat_blood: "flap", ghost: "float", ghost_violet: "float", lich: "float",
  knight: "breathe", commander: "heavy", golem: "heavy", dragon: "heavy",
  beetle: "breathe", spider: "float", mushroom: "squish", goblin: "breathe", skeleton: "breathe",
  imp: "flap", crab: "squish", eyeball: "float",
};
const FLYING_BASE = { bat: 1, bat_blood: 1, ghost: 1, ghost_violet: 1, spider: 1, imp: 1, eyeball: 1 };

/* ---------- recolors: "base~name" -> palette overrides ---------- */
const VARIANTS = {
  // Shrunk!
  "slime~amoeba":   { a: "#a5f3c4", b: "#4fb88a", W: "#ffffff", e: "#14532d" },
  "slime~enzyme":   { a: "#f0abfc", b: "#a21caf", W: "#fdf4ff", e: "#4a044e" },
  "beetle~mite":    { a: "#d6c4a8", b: "#8a7356", w: "#f5ead8", d: "#5c4a33", l: "#5c4a33" },
  "beetle~aphid":   { a: "#84cc16", b: "#3f6212", w: "#d9f99d", d: "#365314", l: "#365314" },
  "eyeball~germ":   { v: "#166534", w: "#bbf7d0", r: "#22c55e", i: "#a855f7", t: "#166534" },
  "spider~phage":   { a: "#94a3b8", b: "#334155", w: "#e2e8f0", d: "#475569", e: "#22d3ee", l: "#334155" },
  "spider~lab":     { a: "#57534e", b: "#1c1917", d: "#292524", e: "#facc15" },
  "imp~radical":    { r: "#f97316", W: "#c2410c", h: "#fef08a", y: "#ffffff" },
  "slimeking~macro":{ a: "#fbcfe8", b: "#db2777", W: "#ffffff", e: "#500724", m: "#500724" },
  "golem~ribosome": { A: "#c4b5fd", a: "#8b5cf6", d: "#4c1d95", g: "#f472b6", o: "#22d3ee", O: "#cffafe" },
  "lich~prion":     { V: "#be185d", v: "#500724", g: "#f0abfc", o: "#f0abfc", O: "#fdf4ff" },
  // The Ember Relic
  "skeleton~charred": { w: "#78716c", k: "#f97316" },
  "mushroom~ash":   { r: "#57534e", w: "#f97316", R: "#292524", s: "#a8a29e", S: "#57534e" },
  "knight~obsidian":{ A: "#44403c", a: "#292524", d: "#0c0a09", r: "#f97316", p: "#ea580c", P: "#9a3412", k: "#7c2d12", K: "#431407" },
  "golem~obsidian": { A: "#44403c", a: "#292524", d: "#0c0a09", g: "#7c2d12", e: "#f97316" },
  "lich~ember":     { V: "#9a3412", v: "#431407", g: "#fb923c", o: "#fb923c", O: "#fff7ed" },
  "commander~molten": { A: "#7c2d12", a: "#431407", r: "#fde047", p: "#f97316", P: "#c2410c" },
  "slimeking~magma":{ a: "#fb923c", b: "#c2410c", W: "#fef3c7", e: "#431407", m: "#431407" },
  "dragon~cinder":  { a: "#292524", A: "#44403c", d: "#0c0a09", w: "#7c2d12", E: "#f97316", g: "#f97316", G: "#c2410c" },
  // The Captive Princess
  "goblin~chief":   { g: "#4d7c0f", b: "#7f1d1d", B: "#450a0a", W: "#78716c" },
  "crab~moat":      { c: "#65a30d", C: "#365314" },
  "ghost~drowned":  { a: "#99f6e4", b: "#14b8a6", c: "#042f2e", e: "#ffffff" },
  "slimeking~moat": { a: "#4d7c0f", b: "#1a2e05", W: "#d9f99d", e: "#1a2e05", m: "#1a2e05" },
  "lich~banshee":   { V: "#e2e8f0", v: "#64748b", g: "#67e8f9", o: "#67e8f9", O: "#ecfeff" },
  "knight~thorn":   { A: "#4ade80", a: "#15803d", d: "#14532d", r: "#be123c", p: "#9f1239", P: "#4c0519" },
  "lich~varn":      { V: "#166534", v: "#052e16", y: "#a3e635", g: "#a3e635", o: "#a3e635", O: "#ecfccb" },
  // The Sunken Kingdom
  "slime~jelly":    { a: "#f9a8d4", b: "#db2777", W: "#fdf2f8", e: "#831843" },
  "eyeball~deep":   { v: "#1e3a8a", w: "#bfdbfe", r: "#3b82f6", i: "#fde047", t: "#1e3a8a" },
  "crab~king":      { c: "#dc2626", C: "#7f1d1d" },
  "golem~kelp":     { A: "#4d7c0f", a: "#365314", d: "#1a2e05", g: "#a3e635", e: "#fde047" },
  "skeleton~pirate":{ w: "#d6d3d1", k: "#0c4a6e" },
  "commander~pirate": { A: "#1e3a8a", a: "#172554", r: "#facc15", p: "#dc2626", P: "#7f1d1d", s: "#e7e5e4" },
  "knight~coral":   { A: "#fb7185", a: "#e11d48", d: "#881337", r: "#2dd4bf", p: "#14b8a6", P: "#0f766e" },
  "lich~tide":      { V: "#0e7490", v: "#083344", g: "#67e8f9", o: "#67e8f9", O: "#ecfeff" },
  "dragon~leviathan": { a: "#0f766e", A: "#14b8a6", d: "#042f2e", w: "#115e59", E: "#fde047", g: "#5eead4", G: "#0f766e", H: "#ccfbf1", c: "#ccfbf1" },
  // The Clockwork Tower
  "knight~automaton": { A: "#d4a373", a: "#a16207", d: "#713f12", r: "#22d3ee", p: "#0891b2", P: "#155e75", k: "#78350f", K: "#451a03" },
  "bat~clock":      { a: "#b45309", W: "#d97706", w: "#78350f", e: "#22d3ee" },
  "eyeball~lens":   { v: "#a16207", w: "#e0f2fe", r: "#7dd3fc", i: "#0ea5e9", t: "#a16207" },
  "slime~oil":      { a: "#3f3f46", b: "#18181b", W: "#a1a1aa", e: "#facc15" },
  "spider~gear":    { a: "#a16207", b: "#713f12", w: "#fde68a", d: "#78350f", e: "#22d3ee", l: "#713f12" },
  "golem~brass":    { A: "#d4a373", a: "#a16207", d: "#713f12", g: "#78350f", e: "#22d3ee" },
  "slimeking~steam":{ a: "#cbd5e1", b: "#64748b", W: "#ffffff", e: "#1e293b", m: "#1e293b" },
  "lich~hour":      { V: "#ca8a04", v: "#713f12", g: "#fde68a", o: "#fde68a", O: "#fffbeb" },
  "commander~brass":{ A: "#a16207", a: "#713f12", r: "#22d3ee", p: "#0891b2", P: "#155e75" },
  // Frostbound
  "bat~frost":      { a: "#7dd3fc", W: "#bae6fd", w: "#0369a1", e: "#ffffff" },
  "ghost~snow":     { a: "#ffffff", b: "#bae6fd", c: "#0c4a6e", e: "#38bdf8" },
  "golem~snow":     { A: "#f1f5f9", a: "#cbd5e1", d: "#64748b", g: "#7dd3fc", e: "#0ea5e9" },
  "skeleton~frost": { w: "#bae6fd", k: "#0c4a6e" },
  "slimeking~ice":  { a: "#7dd3fc", b: "#0284c7", W: "#f0f9ff", e: "#082f49", m: "#082f49" },
  "crab~ice":       { c: "#7dd3fc", C: "#0369a1" },
  "eyeball~ice":    { v: "#0369a1", w: "#e0f2fe", r: "#7dd3fc", i: "#0ea5e9", t: "#0369a1" },
  "lich~frost":     { V: "#0284c7", v: "#0c4a6e", g: "#e0f2fe", o: "#7dd3fc", O: "#f0f9ff" },
  "knight~frost":   { A: "#e0f2fe", a: "#7dd3fc", d: "#0369a1", r: "#38bdf8", p: "#0284c7", P: "#075985" },
  "commander~frost":{ A: "#0369a1", a: "#0c4a6e", r: "#e0f2fe", p: "#38bdf8", P: "#0284c7" },
  "dragon~winter":  { a: "#38bdf8", A: "#7dd3fc", d: "#0c4a6e", w: "#0284c7", E: "#ffffff", g: "#e0f2fe", G: "#7dd3fc", H: "#f0f9ff", c: "#f0f9ff" },
  // Sands of the Pharaoh
  "beetle~scarab":  { a: "#0d9488", b: "#134e4a", w: "#5eead4", d: "#422006", l: "#422006", e: "#facc15" },
  "beetle~gold":    { a: "#facc15", b: "#a16207", w: "#fef9c3", d: "#713f12", l: "#713f12", e: "#0ea5e9" },
  "slime~sand":     { a: "#e7c27d", b: "#b08544", W: "#fdf6e3", e: "#5c3d14" },
  "skeleton~sand":  { w: "#e7c27d", k: "#422006" },
  "crab~scorpion":  { c: "#57534e", C: "#292524", e: "#ef4444" },
  "bat~tomb":       { a: "#a16207", W: "#ca8a04", w: "#422006", e: "#22d3ee" },
  "golem~sand":     { A: "#e7c27d", a: "#b08544", d: "#7a5a2a", g: "#a16207", e: "#0ea5e9" },
  "ghost~mummy":    { a: "#f5f0e1", b: "#c8b98f", c: "#3d2f14", e: "#facc15" },
  "commander~anubis": { A: "#1c1917", a: "#0c0a09", r: "#facc15", p: "#0ea5e9", P: "#075985", g: "#facc15" },
  "eyeball~ra":     { v: "#a16207", w: "#fef9c3", r: "#f59e0b", i: "#0ea5e9", t: "#a16207" },
  "knight~anubis":  { A: "#facc15", a: "#a16207", d: "#422006", r: "#0ea5e9", p: "#0284c7", P: "#075985" },
  "lich~pharaoh":   { V: "#0369a1", v: "#0c4a6e", y: "#facc15", w: "#e7c27d", g: "#facc15", o: "#facc15", O: "#fef9c3" },
  // The Midnight Carnival
  "slime~candy":    { a: "#f9a8d4", b: "#c084fc", W: "#ffffff", e: "#581c87" },
  "imp~jester":     { r: "#a855f7", W: "#eab308", h: "#ef4444", y: "#ffffff" },
  "golem~strong":   { A: "#fca5a5", a: "#dc2626", d: "#7f1d1d", g: "#facc15", e: "#1c1917" },
  "ghost~mirror":   { a: "#e0e7ff", b: "#a5b4fc", c: "#312e81", e: "#f0abfc" },
  "eyeball~peep":   { v: "#581c87", w: "#fae8ff", r: "#d946ef", i: "#facc15", t: "#581c87" },
  "slimeking~funhouse": { a: "#f472b6", b: "#9d174d", W: "#fdf2f8", e: "#500724", m: "#500724" },
  "knight~tin":     { A: "#cbd5e1", a: "#94a3b8", d: "#475569", r: "#dc2626", p: "#dc2626", P: "#7f1d1d", k: "#1d4ed8", K: "#1e3a8a" },
  "spider~tightrope": { a: "#7e22ce", b: "#3b0764", w: "#f0abfc", d: "#581c87", e: "#facc15", l: "#3b0764" },
  "commander~tamer":{ A: "#dc2626", a: "#7f1d1d", r: "#facc15", p: "#facc15", P: "#a16207" },
  "lich~conductor": { V: "#1e1b4b", v: "#0f0a2e", y: "#dc2626", g: "#facc15", o: "#facc15", O: "#fef9c3" },
};
/* ---------- villain sprites (never reuse a hero body for a boss) ---------- */
Object.assign(SPRITES, {
  /* Professor Minim: wild hair, huge goggles, lab coat, tiny wand */
  scientist: {
    pal: { H: "#f1f5f9", h: "#94a3b8", s: "#f5c9a5", S: "#d39b78", g: "#a16207", G: "#67e8f9", L: "#ecfeff",
           m: "#7c2d12", c: "#f8fafc", C: "#cbd5e1", t: "#db2777", p: "#334155", b: "#1e293b", w: "#78350f", x: "#f472b6", X: "#fdf2f8" },
    rows: [
      "...H..H.H.........",
      "..HHHHHHHHH.....x.",
      ".HHHHHHHHHHH...xXx",
      "HHhsssssssHHH...x.",
      "HhggggsggggH....w.",
      "hgGLGgsgGLGg...w..",
      ".gGGGgsgGGGg..w...",
      "..gggsssgggs.w....",
      "...sSmmmmSs.w.....",
      "....ssssss.ss.....",
      "...ccctttcccs.....",
      "..ccCcctccCcc.....",
      "..ccCcctccCc......",
      "..cccccccccc......",
      "..cCCCCCCCCc......",
      "...pp....pp.......",
      "..bbb...bbb.......",
    ],
  },
  /* showman: top hat, curly mustache, tailcoat, cane */
  showman: {
    pal: { h: "#1c1917", H: "#57534e", r: "#dc2626", s: "#f5c9a5", S: "#d39b78", e: "#1c1917", g: "#facc15",
           m: "#3f1d0b", c: "#b91c1c", C: "#7f1d1d", w: "#fef9c3", v: "#facc15", p: "#1c1917", b: "#0c0a09", k: "#a16207", K: "#fde047" },
    rows: [
      "......hhhhh.......",
      "......hHhhh.......",
      "......hHhhh.......",
      "......hHhhh.......",
      "......rrrrr.......",
      "....hhhhhhhhh.....",
      "......sssss.......",
      "......esgse.......",
      "......sssssS......",
      "....mmm.s.mmm.....",
      "...m..mmmmm..m....",
      "......wwvww.......",
      ".....ccwvwcc...K..",
      "....cccwvwccc.k...",
      "....cCcwwwcCc.k...",
      "....cCcccccCcsk...",
      "....cC.ppp.Cc.k...",
      "....C..p.p..C.k...",
      "......bb.bb...k...",
    ],
  },
  /* hooded priest: tall cowl, gold mask, glowing eyes, eye-topped staff */
  hooded: {
    pal: { h: "#1e3a8a", H: "#3b82f6", y: "#facc15", Y: "#a16207", e: "#22d3ee", r: "#f8fafc", R: "#cbd5e1",
           a: "#facc15", A: "#0ea5e9", s: "#78350f", b: "#1e293b" },
    rows: [
      "......hh..........",
      ".....hhhh.....aaa.",
      "....hhHhhh...aAAAa",
      "...hhHyyyhh...aaa.",
      "...hHyeyeyh....s..",
      "...hHyyyyyh....s..",
      "...hHyYyYyh....s..",
      "..hhHhyyyhhh...s..",
      "..hHrrrrrrrhh..s..",
      ".hhHrrRyRrrhhhss..",
      ".hHrrrRyRrrrh..s..",
      ".hHrrrRyRrrrh..s..",
      ".hHrrrrrrrrrh..s..",
      "hhHrrrRRRrrrhh.s..",
      "hHrrrRRRRRrrrh.s..",
      "hHHHHHHHHHHHHh.s..",
      "..bb......bb...s..",
    ],
  },
});
Object.assign(IDLE_BASE, { scientist: "breathe", showman: "breathe", hooded: "float" });
Object.assign(VARIANTS, {
  "showman~clockmaker": { h: "#78350f", H: "#a16207", r: "#22d3ee", g: "#22d3ee", c: "#a16207", C: "#713f12",
                          w: "#fde68a", v: "#22d3ee", m: "#e7e5e4", k: "#d4a373", K: "#22d3ee" },
});

/* trophy cup colors, one per story */
const TROPHY_PAL = {
  classic:   {},
  shrunk:    { a: "#34d399", H: "#ecfdf5", r: "#d1fae5", b: "#047857", d: "#065f46", G: "#f472b6", g: "#fce7f3" },
  volcano:   { a: "#f97316", H: "#ffedd5", r: "#fed7aa", b: "#9a3412", d: "#7c2d12", G: "#fde047", g: "#fefce8" },
  princess:  { a: "#f9a8d4", H: "#fdf2f8", r: "#fce7f3", b: "#be185d", d: "#9d174d", G: "#a855f7", g: "#f3e8ff" },
  sunken:    { a: "#2dd4bf", H: "#f0fdfa", r: "#ccfbf1", b: "#0f766e", d: "#115e59", G: "#ffffff", g: "#e0f2fe" },
  clockwork: { a: "#d4a373", H: "#fff7ed", r: "#fde68a", b: "#92400e", d: "#78350f", G: "#22d3ee", g: "#cffafe" },
  frost:     { a: "#bae6fd", H: "#ffffff", r: "#f0f9ff", b: "#0369a1", d: "#075985", G: "#38bdf8", g: "#e0f2fe" },
  desert:    { a: "#facc15", H: "#fefce8", r: "#fef9c3", b: "#a16207", d: "#854d0e", G: "#0ea5e9", g: "#e0f2fe" },
  carnival:  { a: "#c084fc", H: "#faf5ff", r: "#f3e8ff", b: "#7e22ce", d: "#6b21a8", G: "#facc15", g: "#fef9c3" },
};
for (const k in TROPHY_PAL) VARIANTS["trophy~" + k] = TROPHY_PAL[k];

function baseOf(name) { return String(name).split("~")[0]; }
const _spriteCache = {};
function getSprite(name) {
  if (SPRITES[name]) return SPRITES[name];
  if (_spriteCache[name]) return _spriteCache[name];
  const base = SPRITES[baseOf(name)];
  if (!base) return null;
  return (_spriteCache[name] = { rows: base.rows, pal: Object.assign({}, base.pal, VARIANTS[name] || {}) });
}

/* ---------- the stories ----------
   floors: [name, tint, foes [[sprite, name]...], boss [sprite, name, hits, scale]]
   trophy perk ids are read by game.js (perks()).                        */
const F = (name, tint, foes, boss) => ({ name, tint, foes: foes.map(([k, n]) => ({ key: k, name: n })),
  boss: { key: boss[0], name: boss[1], hits: boss[2], scale: boss[3] || 5 } });

const STORIES = {
  classic: {
    title: "The Dragon's Lair", scene: "mountains", color: "#f59e0b",
    premise: "Five floors of monsters stand between you and Ashmaw, the dragon who burned the valley.",
    goal: "Slay Ashmaw the Dragon.",
    victory: "Ashmaw is beaten and the lair is quiet. The valley can finally rebuild.",
    trophy: { name: "Fang of Ashmaw", perk: "maxhp", text: "+10 max HP" },
    floors: [
      F("Greenwood", [70, 150, 90], [["slime", "Slime"], ["bat", "Bat"], ["slime", "Slime"], ["bat", "Bat"]], ["slimeking", "Slime King", 6]),
      F("Stone Peaks", [100, 125, 170], [["bat", "Bat"], ["slime_ice", "Frost Slime"], ["ghost", "Wraith"], ["slime_ice", "Frost Slime"]], ["golem", "Stone Golem", 8]),
      F("Haunted Crypt", [125, 80, 180], [["ghost", "Wraith"], ["bat_blood", "Blood Bat"], ["ghost_violet", "Phantom"], ["knight", "Dark Knight"]], ["lich", "The Lich", 10]),
      F("Dark Keep", [135, 60, 75], [["knight", "Dark Knight"], ["ghost_violet", "Phantom"], ["bat_blood", "Blood Bat"], ["knight", "Dark Knight"]], ["commander", "Dread Commander", 12]),
      F("Dragon's Lair", [215, 80, 30], [["slime_magma", "Magma Slime"], ["knight", "Dark Knight"], ["slime_magma", "Magma Slime"]], ["dragon", "Ashmaw the Dragon", 16, 4]),
    ],
  },
  shrunk: {
    title: "Shrunk!", scene: "cells", color: "#34d399",
    premise: "Professor Minim, a twitchy little wizard with a grudge against students, zapped you with his shrinking wand. Now you're smaller than a cell, stranded somewhere in his lab. Fight your way across the dish, through a living cell, and up onto his bench to get your size back.",
    goal: "Defeat Professor Minim and take back your size.",
    victory: "Minim's wand clatters to the bench and snaps in two. With a pop and a rush of air you're full size again, and the tiny professor is the one looking up at you now.",
    trophy: { name: "Minim's Shrinking Wand", perk: "dodge", text: "+5% chance enemies miss" },
    floors: [
      F("The Petri Dish", [90, 170, 110], [["slime~amoeba", "Amoeba"], ["beetle~mite", "Dust Mite"], ["eyeball~germ", "Germ"], ["slime~amoeba", "Amoeba"]], ["slimeking~macro", "The Macrophage", 6]),
      F("Cytoplasm Currents", [80, 140, 200], [["slime~enzyme", "Rogue Enzyme"], ["spider~phage", "Bacteriophage"], ["beetle~aphid", "Aphid"], ["spider~phage", "Bacteriophage"]], ["golem~ribosome", "Ribosome Golem", 8]),
      F("Mitochondrial Maze", [210, 110, 70], [["imp~radical", "Free Radical"], ["beetle~mite", "Dust Mite"], ["slime~enzyme", "Rogue Enzyme"], ["imp~radical", "Free Radical"]], ["lich~prion", "The Prion Lich", 10]),
      F("The Nucleus Gate", [150, 90, 200], [["spider~phage", "Bacteriophage"], ["eyeball~germ", "Germ"], ["spider~lab", "Lab Spider"], ["imp~radical", "Free Radical"]], ["spider~lab", "The Gatekeeper Spider", 12, 6]),
      F("Minim's Lab Bench", [190, 170, 90], [["spider~lab", "Lab Spider"], ["beetle~aphid", "Aphid"], ["imp~radical", "Free Radical"]], ["scientist", "Professor Minim", 16, 5]),
    ],
  },
  volcano: {
    title: "The Ember Relic", scene: "lava", color: "#f97316",
    premise: "A cursed relic called the Ember Heart is waking every fire beast in the land. The only way to stop it is to carry it up Mount Cinder and throw it back into the caldera where it was forged.",
    goal: "Climb Mount Cinder and destroy the Ember Heart.",
    victory: "The Cinder King crashes into the caldera and takes the Ember Heart down with him. The mountain sighs, the lava dims, and the fire beasts scatter for good.",
    trophy: { name: "Heart of Cinder", perk: "charge", text: "Start every floor with 2 charge" },
    floors: [
      F("The Ashfields", [170, 90, 60], [["slime_magma", "Magma Slime"], ["imp", "Fire Imp"], ["bat_blood", "Ember Bat"], ["skeleton~charred", "Charred Bones"]], ["golem~obsidian", "Obsidian Golem", 6]),
      F("Smoke Caves", [120, 80, 80], [["bat_blood", "Ember Bat"], ["mushroom~ash", "Ash Shroom"], ["imp", "Fire Imp"], ["mushroom~ash", "Ash Shroom"]], ["lich~ember", "The Smolder Lich", 8]),
      F("Magma Bridges", [220, 90, 40], [["slime_magma", "Magma Slime"], ["skeleton~charred", "Charred Bones"], ["imp", "Fire Imp"], ["knight~obsidian", "Obsidian Guard"]], ["commander~molten", "Molten Commander", 10]),
      F("The Caldera Rim", [200, 60, 50], [["imp", "Fire Imp"], ["knight~obsidian", "Obsidian Guard"], ["bat_blood", "Ember Bat"], ["mushroom~ash", "Ash Shroom"]], ["slimeking~magma", "The Furnace Slime", 12]),
      F("The Heart Chamber", [235, 70, 25], [["knight~obsidian", "Obsidian Guard"], ["imp", "Fire Imp"], ["slime_magma", "Magma Slime"]], ["dragon~cinder", "The Cinder King", 16, 4]),
    ],
  },
  princess: {
    title: "The Captive Princess", scene: "castle", color: "#f472b6",
    premise: "Warlock Varn stole Princess Elowen the night before her coronation and locked her at the top of Thornspire Castle. The royal guard fell at the gate. You're who's left.",
    goal: "Storm Thornspire and free Princess Elowen.",
    victory: "Varn's staff splinters and his spells unravel. The tower door swings open, and Princess Elowen strides out into the light, already giving orders about the coronation.",
    trophy: { name: "The Princess's Favor", perk: "dmg", text: "+10% damage" },
    floors: [
      F("The King's Road", [100, 160, 90], [["goblin", "Goblin"], ["bat", "Bat"], ["goblin", "Goblin"], ["slime", "Slime"]], ["goblin~chief", "Goblin Chieftain", 6]),
      F("The Moat", [70, 130, 120], [["crab~moat", "Moat Crab"], ["ghost~drowned", "Drowned Guard"], ["slime", "Slime"], ["crab~moat", "Moat Crab"]], ["slimeking~moat", "The Moat Horror", 8]),
      F("The Courtyard", [140, 130, 110], [["knight", "Dark Knight"], ["skeleton", "Skeleton"], ["goblin", "Goblin"], ["knight", "Dark Knight"]], ["commander", "The Iron Captain", 10]),
      F("The Haunted Halls", [110, 80, 170], [["ghost", "Wraith"], ["ghost_violet", "Phantom"], ["skeleton", "Skeleton"], ["bat", "Bat"]], ["lich~banshee", "The Banshee Queen", 12]),
      F("Thornspire Tower", [150, 60, 110], [["knight~thorn", "Thorn Knight"], ["imp", "Imp"], ["ghost_violet", "Phantom"]], ["lich~varn", "Warlock Varn", 16, 6]),
    ],
  },
  sunken: {
    title: "The Sunken Kingdom", scene: "sea", color: "#2dd4bf",
    premise: "The old kingdom of Maris sank beneath the waves a thousand years ago, and now the tide is creeping farther up the coast every night. Something down there is pulling the sea inland.",
    goal: "Dive to drowned Maris and silence the Leviathan.",
    victory: "The Leviathan sinks back into the trench and the currents go still. Up on the coast, the tide quietly rolls back to where it belongs.",
    trophy: { name: "Leviathan Pearl", perk: "xp", text: "+10% XP" },
    floors: [
      F("The Tidepools", [60, 150, 170], [["crab", "Rock Crab"], ["slime~jelly", "Jellyfish"], ["crab", "Rock Crab"], ["eyeball~deep", "Deep Eye"]], ["crab~king", "The King Crab", 6, 6]),
      F("The Kelp Forest", [40, 130, 110], [["slime~jelly", "Jellyfish"], ["ghost~drowned", "Drowned Sailor"], ["crab", "Rock Crab"], ["eyeball~deep", "Deep Eye"]], ["golem~kelp", "The Kelp Golem", 8]),
      F("Shipwreck Graveyard", [60, 100, 140], [["skeleton~pirate", "Drowned Pirate"], ["ghost~drowned", "Drowned Sailor"], ["slime~jelly", "Jellyfish"], ["skeleton~pirate", "Drowned Pirate"]], ["commander~pirate", "Captain Bones", 10]),
      F("The Drowned Palace", [70, 90, 170], [["knight~coral", "Coral Knight"], ["slime~jelly", "Jellyfish"], ["eyeball~deep", "Deep Eye"], ["knight~coral", "Coral Knight"]], ["lich~tide", "The Tide Lich", 12]),
      F("The Abyss", [30, 50, 120], [["eyeball~deep", "Deep Eye"], ["ghost~drowned", "Drowned Sailor"], ["knight~coral", "Coral Knight"]], ["dragon~leviathan", "The Leviathan", 16, 4]),
    ],
  },
  clockwork: {
    title: "The Clockwork Tower", scene: "gears", color: "#d4a373",
    premise: "Every clock in the city stopped at midnight, and time stopped with them. Birds hang in the air and the fountains are frozen mid-splash. Only you can still move, and every clock hand is pointing at the Clockmaker's tower.",
    goal: "Climb the tower and restart time.",
    victory: "The Clockmaker's last spring snaps. Somewhere far below a single clock ticks, then another, then the whole city lurches back into motion like nothing happened.",
    trophy: { name: "Clockmaker's Gear", perk: "crit", text: "+5% crit chance" },
    floors: [
      F("The Cog Market", [170, 130, 80], [["knight~automaton", "Automaton"], ["bat~clock", "Clockwork Bat"], ["eyeball~lens", "Watcher Lens"], ["knight~automaton", "Automaton"]], ["golem~brass", "The Brass Golem", 6]),
      F("The Steam Works", [130, 120, 120], [["slime~oil", "Oil Slime"], ["knight~automaton", "Automaton"], ["bat~clock", "Clockwork Bat"], ["slime~oil", "Oil Slime"]], ["slimeking~steam", "The Boiler Beast", 8]),
      F("The Pendulum Hall", [150, 110, 70], [["eyeball~lens", "Watcher Lens"], ["spider~gear", "Gear Spider"], ["knight~automaton", "Automaton"], ["bat~clock", "Clockwork Bat"]], ["lich~hour", "The Hourglass Lich", 10]),
      F("The Spring Vault", [120, 100, 140], [["spider~gear", "Gear Spider"], ["knight~automaton", "Automaton"], ["slime~oil", "Oil Slime"], ["eyeball~lens", "Watcher Lens"]], ["commander~brass", "The Iron Regent", 12]),
      F("The Clock Face", [190, 150, 90], [["knight~automaton", "Automaton"], ["spider~gear", "Gear Spider"], ["eyeball~lens", "Watcher Lens"]], ["showman~clockmaker", "The Clockmaker", 16, 5]),
    ],
  },
  frost: {
    title: "Frostbound", scene: "ice", color: "#7dd3fc",
    premise: "Winter came three months ago and never left. The valley is buried, the rivers have turned to stone, and up in the peaks an old wyrm is breathing the cold down on everyone.",
    goal: "Reach the Frozen Throne and break the Winter Wyrm.",
    victory: "The Winter Wyrm shatters like a dropped icicle. By morning the snow is dripping off the roofs and the whole valley smells like spring.",
    trophy: { name: "Wyrm's Frost Heart", perk: "armor", text: "Take 5% less damage" },
    floors: [
      F("Snowbound Village", [140, 170, 200], [["slime_ice", "Frost Slime"], ["bat~frost", "Frost Bat"], ["ghost~snow", "Snow Wraith"], ["slime_ice", "Frost Slime"]], ["golem~snow", "The Snow Golem", 6]),
      F("Glacier Pass", [110, 150, 200], [["skeleton~frost", "Frost Revenant"], ["bat~frost", "Frost Bat"], ["slime_ice", "Frost Slime"], ["skeleton~frost", "Frost Revenant"]], ["slimeking~ice", "The Glacier Slime", 8]),
      F("The Frozen Lake", [90, 140, 190], [["crab~ice", "Ice Crab"], ["ghost~snow", "Snow Wraith"], ["eyeball~ice", "Frozen Eye"], ["crab~ice", "Ice Crab"]], ["lich~frost", "The Frost Lich", 10]),
      F("The Howling Peaks", [120, 130, 180], [["skeleton~frost", "Frost Revenant"], ["knight~frost", "Rime Knight"], ["bat~frost", "Frost Bat"], ["knight~frost", "Rime Knight"]], ["commander~frost", "The Winter Marshal", 12]),
      F("The Frozen Throne", [150, 190, 230], [["knight~frost", "Rime Knight"], ["ghost~snow", "Snow Wraith"], ["skeleton~frost", "Frost Revenant"]], ["dragon~winter", "The Winter Wyrm", 16, 4]),
    ],
  },
  desert: {
    title: "Sands of the Pharaoh", scene: "desert", color: "#facc15",
    premise: "Archaeologists cracked open the tomb of Pharaoh Ankh-Ra, and the desert hasn't been quiet since. Sandstorms swallow caravans whole and the dead are walking out of the dunes.",
    goal: "Descend into the pyramid and put Ankh-Ra back to rest.",
    victory: "Ankh-Ra sinks back into his sarcophagus and the lid grinds shut on its own. Outside the sandstorm drops, and for the first time in weeks the stars come out over the dunes.",
    trophy: { name: "Ankh of Ra", perk: "ankh", text: "Once per adventure, survive a knockout" },
    floors: [
      F("The Dunes", [210, 170, 90], [["beetle~scarab", "Scarab"], ["slime~sand", "Sand Slime"], ["skeleton~sand", "Dune Walker"], ["beetle~scarab", "Scarab"]], ["golem~sand", "The Sand Golem", 6]),
      F("The Oasis Ruins", [120, 170, 130], [["crab~scorpion", "Giant Scorpion"], ["beetle~scarab", "Scarab"], ["bat~tomb", "Tomb Bat"], ["crab~scorpion", "Giant Scorpion"]], ["beetle~gold", "The Golden Scarab", 8, 6]),
      F("The Valley of Kings", [200, 140, 80], [["skeleton~sand", "Dune Walker"], ["ghost~mummy", "Mummy Spirit"], ["crab~scorpion", "Giant Scorpion"], ["bat~tomb", "Tomb Bat"]], ["commander~anubis", "The Jackal Guard", 10]),
      F("The Pyramid Halls", [170, 130, 70], [["ghost~mummy", "Mummy Spirit"], ["eyeball~ra", "Eye of Ra"], ["knight~anubis", "Tomb Guard"], ["skeleton~sand", "Dune Walker"]], ["hooded", "The High Priest", 12, 5]),
      F("The Burial Chamber", [190, 150, 60], [["knight~anubis", "Tomb Guard"], ["eyeball~ra", "Eye of Ra"], ["ghost~mummy", "Mummy Spirit"]], ["lich~pharaoh", "Pharaoh Ankh-Ra", 16, 6]),
    ],
  },
  carnival: {
    title: "The Midnight Carnival", scene: "carnival", color: "#c084fc",
    premise: "A carnival rolled into town overnight. Nobody saw it arrive, and everyone who's walked through its gates has come back out with a painted-on smile and nothing behind their eyes.",
    goal: "Find the Ringmaster and break his spell on the town.",
    victory: "The Ringmaster's hat tumbles into the sawdust and the music grinds to a stop. The tents sag, the lights wink out, and the townsfolk blink like they're waking up from a long nap.",
    trophy: { name: "Ringmaster's Top Hat", perk: "slot", text: "A third boon slot" },
    floors: [
      F("The Midway", [170, 90, 160], [["slime~candy", "Cotton Candy Slime"], ["imp~jester", "Jester Imp"], ["bat", "Bat"], ["slime~candy", "Cotton Candy Slime"]], ["golem~strong", "The Strongman", 6]),
      F("Hall of Mirrors", [120, 110, 190], [["ghost~mirror", "Mirror Wraith"], ["eyeball~peep", "Peeping Eye"], ["imp~jester", "Jester Imp"], ["ghost~mirror", "Mirror Wraith"]], ["slimeking~funhouse", "The Funhouse Blob", 8]),
      F("The Big Top", [190, 70, 80], [["imp~jester", "Jester Imp"], ["knight~tin", "Tin Soldier"], ["spider~tightrope", "Tightrope Spider"], ["knight~tin", "Tin Soldier"]], ["commander~tamer", "The Lion Tamer", 10]),
      F("The Ghost Train", [90, 70, 140], [["skeleton", "Skeleton"], ["ghost~mirror", "Mirror Wraith"], ["eyeball~peep", "Peeping Eye"], ["bat", "Bat"]], ["lich~conductor", "The Conductor", 12]),
      F("The Ringmaster's Wagon", [160, 50, 100], [["knight~tin", "Tin Soldier"], ["imp~jester", "Jester Imp"], ["eyeball~peep", "Peeping Eye"]], ["showman", "The Ringmaster", 16, 5]),
    ],
  },
};
const STORY_IDS = Object.keys(STORIES);
const LIBRARY = STORY_IDS.filter(k => k !== "classic");
/* decks with a hand-picked story; everything else gets one from its id */
const DECK_STORY = { "chem-481-exam-1": "shrunk" };
function storyForDeck(setMeta) {
  const id = setMeta && setMeta.id;
  if (setMeta && setMeta.story && STORIES[setMeta.story]) return setMeta.story;
  if (DECK_STORY[id]) return DECK_STORY[id];
  let h = 0;
  for (const c of String(id || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return LIBRARY[h % LIBRARY.length];
}

/* ---------- scenery: drawn between the sky and the ground ---------- */
function drawScene(g, scene, W, H, groundY, c, rnd) {
  const { far, near, light, acc, top, hor } = c;
  const ridge = (base, rough, col) => {
    g.fillStyle = rgb(col);
    let h = base + Math.floor(rnd() * rough);
    for (let x = 0; x < W; x += 2) {
      h += Math.floor(rnd() * 3) - 1;
      h = Math.max(base - rough, Math.min(base + rough, h));
      g.fillRect(x, groundY - h, 2, h);
    }
  };
  const disc = (cx, cy, r, col) => {
    g.fillStyle = rgb(col);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) g.fillRect(cx + x, cy + y, 1, 1);
  };
  const ring = (cx, cy, r, col) => {
    g.fillStyle = rgb(col);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = x * x + y * y; if (d <= r * r + 1 && d >= (r - 1) * (r - 1)) g.fillRect(cx + x, cy + y, 1, 1); }
  };
  if (scene === "cells") {
    for (let i = 0; i < 6; i++) {
      const r = 5 + Math.floor(rnd() * 7), cx = Math.floor(rnd() * W), cy = 4 + Math.floor(rnd() * (groundY - 8));
      disc(cx, cy, r, mix(top, acc, 0.35)); ring(cx, cy, r, mix(far, acc, 0.5));
      disc(cx + Math.floor(r / 3), cy - 1, Math.max(1, Math.floor(r / 3)), mix(far, acc, 0.6));
    }
    for (let i = 0; i < W / 6; i++) { g.fillStyle = rgb(mix(hor, [255, 255, 255], 0.35)); g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * groundY), 1, 1); }
    // wobbly membrane
    g.fillStyle = rgb(near);
    for (let x = 0; x < W; x++) { const h = Math.floor(groundY * 0.18 + Math.sin(x / 5) * 2 + Math.sin(x / 13) * 3); g.fillRect(x, groundY - h, 1, h); }
  } else if (scene === "lava") {
    const cx = Math.floor(W * (0.35 + rnd() * 0.3)), peak = Math.floor(groundY * 0.2);
    g.fillStyle = rgb(far);
    for (let y = peak; y < groundY; y++) { const w = Math.floor((y - peak) * 1.6) + 4; g.fillRect(cx - w, y, w * 2, 1); }
    g.fillStyle = rgb([255, 120, 30]); g.fillRect(cx - 3, peak, 6, 2);
    g.fillStyle = rgb([255, 200, 60]); g.fillRect(cx - 1, peak, 2, 1);
    for (let i = 0; i < 6; i++) { g.fillStyle = rgb([255, 110 + Math.floor(rnd() * 80), 30]); g.fillRect(cx - 4 + Math.floor(rnd() * 8), peak - 2 - Math.floor(rnd() * 8), 1, 1); }
    ridge(Math.floor(groundY * 0.16), 3, near);
  } else if (scene === "castle") {
    ridge(Math.floor(groundY * 0.3), 4, far);
    const bx = Math.floor(W * (0.4 + rnd() * 0.2)), base = groundY - Math.floor(groundY * 0.25);
    g.fillStyle = rgb(mix(far, [0, 0, 0], 0.15));
    g.fillRect(bx - 14, base - 8, 28, groundY - base + 8);
    for (let x = bx - 14; x < bx + 14; x += 4) g.fillRect(x, base - 10, 2, 2);
    [[-16, 22], [12, 18], [-3, 30]].forEach(([dx, h]) => {
      g.fillRect(bx + dx, groundY - h - 12, 6, h + 12);
      g.fillRect(bx + dx - 1, groundY - h - 14, 2, 2); g.fillRect(bx + dx + 2, groundY - h - 14, 2, 2); g.fillRect(bx + dx + 5, groundY - h - 14, 2, 2);
    });
    g.fillStyle = rgb([250, 210, 120]);
    g.fillRect(bx, groundY - 36, 1, 2); g.fillRect(bx - 14, groundY - 26, 1, 2); g.fillRect(bx + 14, groundY - 22, 1, 2);
    ridge(Math.floor(groundY * 0.12), 2, near);
  } else if (scene === "sea") {
    for (let i = 0; i < 4; i++) {                     // light rays
      g.fillStyle = rgb(mix(top, [255, 255, 255], light ? 0.25 : 0.1));
      const x0 = Math.floor(rnd() * W);
      for (let y = 0; y < groundY; y++) g.fillRect(x0 + Math.floor(y * 0.35), y, 2, 1);
    }
    for (let i = 0; i < W / 4; i++) { g.fillStyle = rgb(mix(hor, [255, 255, 255], 0.4)); g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * groundY), 1, 1); }
    ridge(Math.floor(groundY * 0.2), 4, far);
    for (let i = 0; i < 9; i++) {                     // kelp
      const x = Math.floor(rnd() * W), h = 8 + Math.floor(rnd() * 16);
      g.fillStyle = rgb(mix(near, [40, 160, 80], 0.45));
      for (let y = 0; y < h; y++) g.fillRect(x + Math.round(Math.sin(y / 3) * 1), groundY - y, 1, 1);
    }
  } else if (scene === "gears") {
    for (let i = 0; i < 4; i++) {
      const r = 6 + Math.floor(rnd() * 8), cx = Math.floor(rnd() * W), cy = Math.floor(groundY * (0.25 + rnd() * 0.5));
      const col = mix(far, acc, 0.2);
      disc(cx, cy, r, col);
      g.fillStyle = rgb(col);
      for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; g.fillRect(Math.round(cx + Math.cos(t) * (r + 1)) - 1, Math.round(cy + Math.sin(t) * (r + 1)) - 1, 3, 3); }
      disc(cx, cy, Math.max(1, Math.floor(r / 3)), mix(top, hor, 0.5));
    }
    ridge(Math.floor(groundY * 0.14), 2, near);
  } else if (scene === "ice") {
    g.fillStyle = rgb(far);
    for (let x = 0; x < W; x += 6) { const h = Math.floor(groundY * (0.25 + rnd() * 0.3)); for (let y = 0; y < h; y++) { const w = Math.max(1, Math.floor((y / h) * 6)); g.fillRect(x + 3 - Math.floor(w / 2), groundY - h + y, w, 1); } }
    for (let i = 0; i < W / 3; i++) { g.fillStyle = rgb(mix(hor, [255, 255, 255], 0.7)); g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * groundY), 1, 1); }
    ridge(Math.floor(groundY * 0.12), 2, near);
  } else if (scene === "desert") {
    for (let i = 0; i < 2; i++) {                     // pyramids
      const cx = Math.floor(W * (0.2 + rnd() * 0.6)), h = Math.floor(groundY * (0.3 + rnd() * 0.2));
      for (let y = 0; y < h; y++) { g.fillStyle = rgb(y % 3 === 0 ? mix(far, [0, 0, 0], 0.08) : far); g.fillRect(cx - y, groundY - h + y, y * 2 + 1, 1); }
    }
    g.fillStyle = rgb(near);
    for (let x = 0; x < W; x++) { const h = Math.floor(groundY * 0.12 + Math.sin(x / 11 + rnd() * 0.2) * 3 + 3); g.fillRect(x, groundY - h, 1, h); }
  } else if (scene === "carnival") {
    const wx = Math.floor(W * (0.62 + rnd() * 0.15)), wr = Math.floor(groundY * 0.28), wy = groundY - wr - 4;
    ring(wx, wy, wr, far);
    g.fillStyle = rgb(far);
    for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; for (let k = 0; k < wr; k++) g.fillRect(Math.round(wx + Math.cos(t) * k), Math.round(wy + Math.sin(t) * k), 1, 1); }
    g.fillRect(wx - 1, wy, 2, groundY - wy);
    for (let i = 0; i < 2; i++) {                     // striped tents
      const cx = Math.floor(W * (0.15 + i * 0.25 + rnd() * 0.08)), h = Math.floor(groundY * 0.3);
      for (let y = 0; y < h; y++) for (let x = -y; x <= y; x++) {
        g.fillStyle = rgb(Math.floor((x + 40) / 3) % 2 ? mix(near, [200, 40, 60], 0.5) : mix(near, [240, 230, 210], 0.4));
        g.fillRect(cx + x, groundY - h + y, 1, 1);
      }
    }
    for (let x = 0; x < W; x += 3) { g.fillStyle = rgb([[250, 204, 21], [244, 114, 182], [96, 165, 250]][(x / 3) % 3]); g.fillRect(x, Math.floor(groundY * 0.2 + Math.sin(x / 8) * 2), 1, 1); }
  } else {
    ridge(Math.floor(groundY * 0.42), 5, far);
    ridge(Math.floor(groundY * 0.22), 3, near);
  }
}
