/* ===================================================================
   hall.js — heroes, the Hall of Fame, and save migration
   Heroes are global (not per deck) under "fc:heroes", so the same hero
   can carry their level, boon and trophies into any deck's story.
   =================================================================== */

/* ===================== HERO STORE ===================== */
let _heroes = null;
function loadHeroes() {
  if (_heroes) return _heroes;
  try {
    const raw = localStorage.getItem("fc:heroes");
    if (raw) { const d = JSON.parse(raw); if (d && Array.isArray(d.heroes)) return (_heroes = d); }
  } catch (e) {}
  return (_heroes = { v: 1, heroes: [] });
}
function saveHeroes() {
  try { localStorage.setItem("fc:heroes", JSON.stringify(loadHeroes())); } catch (e) {}
}
function heroById(id) { return loadHeroes().heroes.find(h => h.id === id) || null; }
function createHero(name, cls, extra) {
  const h = Object.assign({ id: "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: String(name || "").trim().slice(0, 18) || CLASSES[cls].name, cls, created: Date.now(),
    xp: 0, boon: null, trophies: [], kills: 0, deaths: 0 }, extra || {});
  loadHeroes().heroes.push(h);
  saveHeroes();
  return h;
}
/* every saved adventure on this device, across all decks */
function forEachAdvKey(fn) {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf("fc:adv:") === 0) keys.push(k); }
  keys.forEach(fn);
}
function retireHero(id) {
  const st = loadHeroes();
  st.heroes = st.heroes.filter(h => h.id !== id);
  saveHeroes();
  forEachAdvKey(k => {
    try {
      const d = JSON.parse(localStorage.getItem(k));
      if (d && d.v === 2 && Array.isArray(d.slots)) {
        d.slots = d.slots.map(s => s && s.heroId === id ? null : s);
        localStorage.setItem(k, JSON.stringify(d));
      }
    } catch (e) {}
  });
  if (S.set) S.adv = loadAdv(S.set.id);
}

const NAME_BITS = {
  a: ["Bran", "Thal", "Mira", "Kael", "Ost", "Vela", "Rook", "Sable", "Fen", "Ardo", "Lio", "Quill", "Esme", "Toren", "Wyn", "Pell"],
  b: ["wick", "dor", "ra", "mund", "ith", "ova", "ley", "gard", "ric", "ette", "an", "oth", "is", "orn", "a", "el"],
  fun: ["Sir Quizalot", "Mitochondra", "Captain Flashcard", "Lady Lipid", "The Cramming Knight", "Professor Snooze",
        "Benedict Enzyme", "Sergeant Syllabus", "Alpha Helix", "Dame Notecard", "Bilbo Beta-Sheet", "Sir Reads-a-Lot"],
};
function randomHeroName() {
  if (Math.random() < 0.35) return NAME_BITS.fun[Math.floor(Math.random() * NAME_BITS.fun.length)];
  const p = a => a[Math.floor(Math.random() * a.length)];
  return p(NAME_BITS.a) + p(NAME_BITS.b);
}
function fmtDate(t) {
  try { return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch (e) { return ""; }
}

/* ===================== TROPHY ART =====================
   A pixel cup per story with a sweeping shine and the odd twinkle,
   redrawn every frame while any trophy is on screen.                 */
function trophyCanvas(story, scale) {
  return `<canvas class="trophycv" data-trophy="${esc(story)}" data-scale="${scale || 4}"></canvas>`;
}
let _trophyRaf = 0;
function drawTrophy(cv, now) {
  const key = "trophy~" + cv.dataset.trophy, sc = +cv.dataset.scale || 4;
  const grid = spriteGrid(getSprite(key) ? key : "trophy"), n = grid.length, m = grid[0].length, pad = 2;
  const W = (m + pad * 2) * sc, H = (n + pad * 2) * sc;
  if (cv.width !== W) { cv.width = W; cv.height = H; cv.style.width = W + "px"; cv.style.height = H + "px"; }
  const g = cv.getContext("2d");
  g.clearRect(0, 0, W, H);
  const seed = (cv.dataset.trophy.length * 977) % 1000;
  const cycle = 2600, t = ((now + seed * 3) % cycle) / cycle;          // 0..1 across the sweep
  const band = -6 + t * (m + n + 12);
  for (let y = 0; y < n; y++) for (let x = 0; x < m; x++) {
    let col = grid[y][x];
    if (!col) continue;
    if (col !== OUTLINE) {
      const d = (x + y) - band;
      if (d >= 0 && d < 2.2) col = rgb(mix(toRgb(col), [255, 255, 255], d < 1.1 ? 0.75 : 0.45));
    }
    g.fillStyle = col;
    g.fillRect((x + pad) * sc, (y + pad) * sc, sc, sc);
  }
  // twinkles: a little plus that blinks at a few fixed spots
  const spots = [[1, 3], [m + 2, 6], [m + 1, 1], [2, n - 2]];
  spots.forEach(([sx, sy], i) => {
    const ph = ((now / 700) + i * 1.7 + seed) % 4;
    if (ph > 1) return;
    const a = ph < 0.5 ? ph * 2 : (1 - ph) * 2;
    g.globalAlpha = a;
    g.fillStyle = "#ffffff";
    g.fillRect(sx * sc, sy * sc, sc, sc);
    g.fillRect((sx - 1) * sc, sy * sc, sc, sc); g.fillRect((sx + 1) * sc, sy * sc, sc, sc);
    g.fillRect(sx * sc, (sy - 1) * sc, sc, sc); g.fillRect(sx * sc, (sy + 1) * sc, sc, sc);
    g.globalAlpha = 1;
  });
}
function mountTrophies() {
  if (_trophyRaf || !document.querySelector("canvas[data-trophy]")) return;
  const frame = now => {
    const list = document.querySelectorAll("canvas[data-trophy]");
    if (!list.length) { _trophyRaf = 0; return; }
    list.forEach(cv => drawTrophy(cv, REDUCED ? 0 : now));
    _trophyRaf = requestAnimationFrame(frame);
  };
  _trophyRaf = requestAnimationFrame(frame);
}

/* ===================== HERO SELECT (empty slot) ===================== */
function heroTrophyMinis(h, size) {
  return (h.trophies || []).map(t => {
    const st = STORIES[t.story];
    return `<span class="tmini" title="${esc(st ? st.trophy.name : "Trophy")}">${trophyCanvas(t.story, size || 1)}</span>`;
  }).join("");
}
function heroPerksText(h) {
  const p = perksOf(h), out = [];
  STORY_IDS.forEach(k => { const st = STORIES[k]; if (p[st.trophy.perk]) out.push(st.trophy.text); });
  return out;
}
function viewAdvHero() {
  const list = loadHeroes().heroes.slice().sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const cards = list.map(h => {
    const C = CLASSES[h.cls], perks = heroPerksText(h);
    return `<div class="card herocard tex" style="cursor:default">
      <div class="slotart">${spriteCanvas(C.sprite, 2)}</div>
      <div style="flex:1;min-width:0">
        <div class="eyebrow" style="color:${C.color}">${C.name} · Lv ${levelOf(h.xp)} · ${(h.trophies || []).length} ${(h.trophies || []).length === 1 ? "trophy" : "trophies"}</div>
        <div style="font-size:18px;font-weight:bold;margin-top:2px">${esc(h.name)}</div>
        <div class="herometa">${boonChip(h)}${heroTrophyMinis(h, 1)}</div>
        ${perks.length ? `<div class="muted" style="font-size:12px;margin-top:6px;line-height:1.5">Trophy perks: ${esc(perks.join(" · "))}</div>` : ""}
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="primary" data-act="advPickHero" data-id="${h.id}" style="background:${C.color};color:#111;padding:10px;font-size:15px;flex:1">Bring ${esc(h.name)}</button>
          <button class="ghost" data-act="heroRetire" data-id="${h.id}" title="Retire hero" aria-label="Retire ${esc(h.name)}" style="flex:0 0 48px;padding:10px">${TRASH}</button>
        </div>
      </div>
    </div>`;
  }).join("");
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 18px">
      <button class="backbtn" data-act="toAdvMenu">${I.chevL}</button>
      <div><div class="eyebrow" style="color:var(--accent)">Slot ${S.advPick + 1}</div>
      <div style="font-size:22px;font-weight:bold">Who's going?</div></div>
    </div>
    <button class="card slotcard empty" data-act="advNewHero">
      <div class="slotart"><span class="plus">+</span></div>
      <div style="flex:1"><div style="font-size:17px;font-weight:bold">New hero</div>
      <div class="muted" style="font-size:13px;margin-top:3px">Pick a class and a name. Starts at level 1.</div></div>
    </button>
    ${list.length ? `<div class="eyebrow" style="margin:18px 0 10px">Your heroes</div>${cards}` : ""}
    <div class="muted" style="font-size:12.5px;line-height:1.6;margin-top:14px">Old heroes start each new adventure on Floor 1 with fresh techniques, but they keep their level, their boon, and every trophy perk.</div>
  </div>`;
}
function askRetire(id) {
  const h = heroById(id); if (!h) return;
  showModal(`<h2>Retire ${esc(h.name)}?</h2>
    <p>They leave the roster for good, along with their level ${levelOf(h.xp)}, boon and ${(h.trophies || []).length} ${(h.trophies || []).length === 1 ? "trophy" : "trophies"}. Any saved adventures they're on are cleared too. Your study progress stays.</p>
    <div class="btns">
      <button class="ghost" data-act="closeModal">Keep them</button>
      <button class="primary" data-act="heroRetireYes" data-id="${h.id}" style="background:var(--bad);flex:1">Retire</button>
    </div>`);
}

/* ===================== NEW HERO: NAME ===================== */
function viewAdvName() {
  const C = CLASSES[S.newCls] || CLASSES.knight;
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 22px">
      <button class="backbtn" data-act="toAdvClass">${I.chevL}</button>
      <div><div class="eyebrow" style="color:${C.color}">New ${C.name}</div>
      <div style="font-size:22px;font-weight:bold">Name your hero</div></div>
    </div>
    <div class="card namecard tex" style="cursor:default">
      <div class="namehero">${spriteCanvas(C.sprite, 4)}</div>
      <div class="namerow">
        <input id="heroName" class="nameinput" type="text" maxlength="18" autocomplete="off" spellcheck="false"
          placeholder="Hero name" value="${esc(S.nameDraft || "")}" data-enter="advCreateHero">
        <button class="ghost dice" data-act="advNameDice" title="Random name" aria-label="Random name">🎲</button>
      </div>
      <div class="muted" style="font-size:12.5px;margin-top:8px">Up to 18 characters. This name shows up in the Hall of Fame next to every trophy they win.</div>
    </div>
    <button class="primary" data-act="advCreateHero" style="background:${C.color};color:#111;margin-top:16px">Create hero →</button>
  </div>`;
}

/* ===================== HALL OF FAME ===================== */
function viewHall() {
  const heroes = loadHeroes().heroes;
  const won = [];
  heroes.forEach(h => (h.trophies || []).forEach(t => won.push({ t, h })));
  won.sort((a, b) => (b.t.date || 0) - (a.t.date || 0));
  const shelf = won.length ? won.map(({ t, h }) => {
    const st = STORIES[t.story] || STORIES.classic, C = CLASSES[h.cls];
    return `<div class="trophycard tex">
      <div class="trophybox">${trophyCanvas(t.story, 5)}</div>
      <div class="tname">${esc(st.trophy.name)}</div>
      <div class="tsub">${esc(st.floors[4].boss.name)} defeated</div>
      <div class="tmeta"><span style="color:${C.color}">${esc(h.name)}</span> · ${esc(st.title)}</div>
      <div class="tmeta muted">${esc(t.deckTitle || "")}${t.date ? " · " + fmtDate(t.date) : ""}</div>
    </div>`;
  }).join("") : `<div class="trophyempty"><div class="trophybox dim0">${trophyCanvas("classic", 4)}</div>
      <div>No trophies yet. Beat a story's final boss and its trophy lands here.</div></div>`;

  const roster = heroes.slice().sort((a, b) => (b.xp || 0) - (a.xp || 0)).map(h => {
    const C = CLASSES[h.cls];
    const tl = (h.trophies || []).map(t => { const st = STORIES[t.story]; return st ? esc(st.trophy.name) : ""; }).join(", ");
    return `<div class="herorow">
      <div class="slotart sm">${spriteCanvas(C.sprite, 2)}</div>
      <div style="flex:1;min-width:0">
        <div class="hrname">${esc(h.name)} <span class="muted" style="font-weight:normal;font-size:12px">· ${C.name} · Lv ${levelOf(h.xp)}</span></div>
        <div class="herometa">${boonChip(h, true)}${heroTrophyMinis(h, 1)}</div>
        <div class="muted" style="font-size:11.5px;margin-top:4px">Since ${fmtDate(h.created)} · ${h.kills || 0} foes${tl ? " · " + tl : ""}</div>
      </div>
      <button class="ghost" data-act="heroRetire" data-id="${h.id}" title="Retire hero" aria-label="Retire ${esc(h.name)}" style="flex:0 0 40px;padding:8px">${TRASH}</button>
    </div>`;
  }).join("");

  return `<div class="wrap hall">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 18px">
      <button class="backbtn" data-act="home">${I.chevL}</button>
      <div><div class="eyebrow" style="color:var(--star)">${won.length} ${won.length === 1 ? "trophy" : "trophies"} · ${heroes.length} ${heroes.length === 1 ? "hero" : "heroes"}</div>
      <div style="font-size:24px;font-weight:bold">Hall of Fame</div></div>
    </div>
    <div class="shelf">${shelf}</div>
    <div class="eyebrow" style="margin:28px 0 10px">Heroes</div>
    <div class="roster">${roster || '<div class="muted" style="font-size:13px">No heroes yet. Start a Battle to make one.</div>'}</div>
  </div>`;
}

/* ===================== ONE-TIME MIGRATION (per device) =====================
   v1 battle saves held the whole character inside a slot. Each becomes a
   hero + a v2 adventure. Biochem's battle saves are wiped for its new
   story; a save there that beat Ashmaw becomes the hero "phaseone" with
   the Fang of Ashmaw trophy. Deck progress is never touched.           */
function deckTitleOf(setId) {
  for (const c of (S.manifest && S.manifest.classes) || []) {
    const s = (c.sets || []).find(x => x.id === setId);
    if (s) return c.name + " · " + s.title;
  }
  return setId;
}
function migrateV2() {
  try { if (localStorage.getItem("fc:migr:v2")) return; } catch (e) { return; }
  const OLD_SP = { knight: ["bash", "holy"], wizard: ["fire", "meteor"], ranger: ["pierce", "rain"] };
  forEachAdvKey(key => {
    let d;
    try { d = JSON.parse(localStorage.getItem(key)); } catch (e) { return; }
    if (!d || d.v === 2 || !Array.isArray(d.slots)) return;
    const deck = key.slice("fc:adv:".length), title = deckTitleOf(deck);
    const slots = d.slots.filter(s => s && CLASSES[s.cls]);
    const heroFrom = (s, name) => createHero(name, s.cls, {
      created: s.created || Date.now(), xp: Math.max(0, ((s.level || 1) - 1) * XPL),
      kills: s.kills || 0, deaths: s.deaths || 0,
      trophies: s.cleared ? [{ story: "classic", deck, deckTitle: title, date: s.updated || Date.now() }] : [],
    });
    if (deck === "chem-481-exam-1") {
      const champ = slots.filter(s => s.cleared).sort((a, b) => (b.level - a.level) || (b.updated - a.updated))[0];
      if (champ) heroFrom(champ, "phaseone");
      localStorage.setItem(key, JSON.stringify({ v: 2, slots: [null, null, null] }));
      return;
    }
    const out = d.slots.map((s, i) => {
      if (!s || !CLASSES[s.cls]) return null;
      const h = heroFrom(s, CLASSES[s.cls].name + " " + (i + 1));
      const run = newRun(h, "classic");
      Object.assign(run, { floor: s.floor || 1, idx: s.idx || 0, enemyHits: s.enemyHits, cleared: !!s.cleared,
        deaths: s.deaths || 0, kills: s.kills || 0, best: s.best || 0, learned: OLD_SP[s.cls].slice(),
        hpPicks: Math.floor(((s.level || 1) - 1) / 2), seen: s.seen || [], created: s.created || Date.now() });
      run.hp = maxHpOf(run, h);
      return run;
    });
    localStorage.setItem(key, JSON.stringify({ v: 2, slots: out }));
  });
  try { localStorage.setItem("fc:migr:v2", String(Date.now())); } catch (e) {}
}
