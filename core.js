/* ===================================================================
   core.js — state, persistence, themes, audio, effects, keyboard
   Loaded first. Everything here is global on purpose (no build step).
   =================================================================== */

const MANIFEST_URL = "sets/manifest.json";

/* ===================== STATE ===================== */
const S = {
  screen: "home",        // home | classView | setHome | grid | quiz | shuffle | battle
  manifest: null,
  classId: null,
  set: null,
  cat: null,
  qi: 0,
  selected: [], feedback: null, showAnswer: false,
  shuffleQ: [], shuffleIdx: 0, streak: 0, high: 0,
  battle: null,
  navIdx: 0,
  menuOpen: false,
  meta: {},              // setId -> { total, cats: {name: count} }
};

let progress = null;     // persisted object for the current set
const orders = {};       // transient shuffled option orders, keyed by question id

/* ===================== SETTINGS (global, not per-deck) ===================== */
const DEFAULT_SETTINGS = { theme: "midnight", muted: false, chamLock: null };
let settings = loadSettings();

function loadSettings() {
  try {
    const raw = localStorage.getItem("fc:settings");
    if (raw) return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
  } catch (e) {}
  return Object.assign({}, DEFAULT_SETTINGS);
}
function saveSettings() {
  try { localStorage.setItem("fc:settings", JSON.stringify(settings)); } catch (e) {}
}

/* ===================== PROGRESS ===================== */
/* Shape:
   { results: {qid:"correct"|"incorrect"}, starred: {qid:true},
     missCount: {qid:n},  filter: "all"|"starred"|"missed",
     high: n, celebrated: {}, battle: {bestFloor, xp, level} }            */
function blankProgress() {
  return {
    results: {}, starred: {}, missCount: {}, filter: "all",
    high: 0, celebrated: {}, battle: { bestFloor: 0, xp: 0, level: 1 },
  };
}
function loadProgress(setId) {
  let p = blankProgress();
  try {
    const raw = localStorage.getItem("fc:" + setId);
    if (raw) p = Object.assign(p, JSON.parse(raw));
  } catch (e) {}
  // migrate from the old schema
  p.results = p.results || {};
  p.starred = p.starred || {};
  p.missCount = p.missCount || {};
  p.celebrated = p.celebrated || {};
  p.battle = Object.assign({ bestFloor: 0, xp: 0, level: 1 }, p.battle || {});
  if (!p.filter) p.filter = p.starOnly ? "starred" : "all";
  delete p.starOnly;
  delete p.known;               // flashcards are gone
  return p;
}
function saveProgress() {
  if (!S.set) return;
  try { localStorage.setItem("fc:" + S.set.id, JSON.stringify(progress)); } catch (e) {}
}
function peekProgress(setId) {           // read-only, for list screens
  try {
    const raw = localStorage.getItem("fc:" + setId);
    if (raw) return Object.assign(blankProgress(), JSON.parse(raw));
  } catch (e) {}
  return blankProgress();
}

/* ===================== UTIL ===================== */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function allQuestions(set) {
  return set.categories.flatMap(c => c.questions.map(q => ({ ...q, _cat: c })));
}
function optionOrder(q) {
  if (!orders[q.id]) orders[q.id] = shuffle(q.options.map((_, i) => i));
  return orders[q.id];
}
function freshOrder(q) { if (q) orders[q.id] = shuffle(q.options.map((_, i) => i)); }
function grade(q, sel) {
  const order = optionOrder(q);
  if (q.type === "mc") return sel.length === 1 && order[sel[0]] === q.answer;
  const chosen = sel.map(i => order[i]).sort().join(",");
  const ans = (q.answers || []).slice().sort().join(",");
  return chosen === ans;
}

/* ===================== FILTERS (starred / misses) ===================== */
function starredCount() {
  return S.set ? allQuestions(S.set).filter(q => progress.starred[q.id]).length : 0;
}
function missedCount() {
  return S.set ? allQuestions(S.set).filter(q => (progress.missCount[q.id] || 0) > 0).length : 0;
}
/* Effective filter — falls back to "all" if the chosen pool is empty. */
function activeFilter() {
  if (progress.filter === "starred" && starredCount() > 0) return "starred";
  if (progress.filter === "missed" && missedCount() > 0) return "missed";
  return "all";
}
function filterLabel() {
  const f = activeFilter();
  return f === "starred" ? " · starred" : f === "missed" ? " · misses" : "";
}

/* Build the question pool for shuffle / battle.
   Weighted so that struggled-with questions resurface more often:
     currently incorrect  -> weight 4
     ever missed, now ok  -> weight 2 + min(missCount,3)
     never missed         -> weight 1                                    */
function buildPool() {
  let qs = allQuestions(S.set);
  const f = activeFilter();
  if (f === "starred") qs = qs.filter(q => progress.starred[q.id]);
  if (f === "missed")  qs = qs.filter(q => (progress.missCount[q.id] || 0) > 0);
  return qs;
}
function weightOf(q) {
  const misses = progress.missCount[q.id] || 0;
  if (progress.results[q.id] === "incorrect") return 4 + Math.min(misses, 3);
  if (misses > 0) return 2 + Math.min(misses, 2);
  return 1;
}
/* Weighted shuffle: expand by weight, shuffle, then dedupe keeping first
   occurrence. Heavier questions land earlier far more often, but every
   question still appears exactly once per pass. */
function weightedOrder(pool) {
  const bag = [];
  pool.forEach(q => { const w = weightOf(q); for (let i = 0; i < w; i++) bag.push(q); });
  const seen = new Set(), out = [];
  shuffle(bag).forEach(q => { if (!seen.has(q.id)) { seen.add(q.id); out.push(q); } });
  return out;
}

/* ===================== RECORDING AN ANSWER ===================== */
/* Single funnel for quiz, shuffle and battle so the rules stay identical.
   - correct can downgrade to incorrect, and can recover afterwards
   - lifetime misses are tracked
   - two lifetime misses auto-stars the question                        */
function recordAnswer(q, ok) {
  progress.results[q.id] = ok ? "correct" : "incorrect";
  if (!ok) {
    const n = (progress.missCount[q.id] || 0) + 1;
    progress.missCount[q.id] = n;
    if (n >= 2) progress.starred[q.id] = true;
  }
  saveProgress();
  bumpChameleon();
}

/* ===================== THEMES ===================== */
const THEMES = {
  midnight:  { label: "Midnight",  mode: "dark",  swatch: "#0f0f13" },
  paper:     { label: "Paper",     mode: "light", swatch: "#f6f3ec" },
  sepia:     { label: "Sepia",     mode: "dark",  swatch: "#2a211a" },
  chameleon: { label: "Chameleon", mode: "dyn",   swatch: "conic-gradient(#f87171,#fbbf24,#34d399,#38bdf8,#a78bfa,#f87171)" },
};
const CHAM_VARS = ["bg","surface","surface2","border","border2","text","dim","muted","accent","ok","bad","star","flag","shadow","okBg","badBg","scrim","accBg"];
let chamMode = "dark";
let chamCounter = 0;
const CHAM_EVERY = 3;          // reroll after this many answered questions

function makeChameleon() {
  const h = Math.floor(Math.random() * 360);
  const acc = (h + 120 + Math.floor(Math.random() * 110)) % 360;
  const light = Math.random() < 0.28;
  const H = (x, s, l, a) => `hsl(${x} ${s}% ${l}%${a ? " / " + a + "%" : ""})`;
  if (light) {
    return { mode: "light", vars: {
      bg: H(h, 32, 95), surface: H(h, 42, 99), surface2: H(h, 26, 91),
      border: H(h, 22, 83), border2: H(h, 20, 66), text: H(h, 38, 11),
      dim: H(h, 18, 33), muted: H(h, 14, 50), accent: H(acc, 66, 37),
      ok: "hsl(158 72% 29%)", bad: "hsl(0 72% 44%)",
      star: "hsl(32 88% 34%)", flag: "hsl(0 72% 42%)",
      shadow: "rgba(40,35,20,.16)",
      okBg: "hsl(158 72% 40% / 13%)", badBg: "hsl(0 72% 50% / 11%)",
      scrim: H(h, 32, 95, 82), accBg: H(acc, 66, 45, 11),
    }};
  }
  return { mode: "dark", vars: {
    bg: H(h, 26, 7), surface: H(h, 22, 12), surface2: H(h, 26, 9),
    border: H(h, 18, 21), border2: H(h, 18, 33), text: H(h, 26, 95),
    dim: H(h, 14, 74), muted: H(h, 12, 50), accent: H(acc, 74, 63),
    ok: "hsl(158 66% 56%)", bad: "hsl(0 82% 73%)",
    star: "hsl(38 92% 55%)", flag: "hsl(0 76% 62%)",
    shadow: "rgba(0,0,0,.5)",
    okBg: "hsl(158 66% 56% / 13%)", badBg: "hsl(0 82% 73% / 13%)",
    scrim: H(h, 26, 7, 82), accBg: H(acc, 74, 63, 14),
  }};
}
function clearChameleonVars() {
  CHAM_VARS.forEach(v => document.documentElement.style.removeProperty("--" + v));
}
function paintChameleon(pal) {
  chamMode = pal.mode;
  CHAM_VARS.forEach(v => document.documentElement.style.setProperty("--" + v, pal.vars[v]));
  syncThemeColorMeta();
}
function rollChameleon(force) {
  if (settings.theme !== "chameleon") return;
  if (settings.chamLock && !force) return;
  paintChameleon(makeChameleon());
}
function bumpChameleon() {
  if (settings.theme !== "chameleon" || settings.chamLock) return;
  if (++chamCounter >= CHAM_EVERY) { chamCounter = 0; rollChameleon(); }
}
function toggleChamLock() {
  if (settings.chamLock) {
    settings.chamLock = null;
    saveSettings();
    rollChameleon(true);
  } else {
    const vars = {};
    CHAM_VARS.forEach(v => vars[v] = getComputedStyle(document.documentElement).getPropertyValue("--" + v).trim());
    settings.chamLock = { mode: chamMode, vars };
    saveSettings();
  }
}
function applyTheme() {
  const t = THEMES[settings.theme] ? settings.theme : "midnight";
  document.documentElement.setAttribute("data-theme", t);
  if (t === "chameleon") {
    if (settings.chamLock) paintChameleon(settings.chamLock);
    else paintChameleon(makeChameleon());
  } else {
    clearChameleonVars();
    syncThemeColorMeta();
  }
}
function themeMode() {
  return settings.theme === "chameleon" ? chamMode : (THEMES[settings.theme] || THEMES.midnight).mode;
}
function syncThemeColorMeta() {
  const m = document.getElementById("themeColorMeta");
  if (m) m.setAttribute("content", getComputedStyle(document.body).backgroundColor || "#0f0f13");
}

/* ---- category / deck hex colors, re-fitted to the active theme ----
   Keeps the hue variety authors picked, guarantees it stays legible on
   both light and dark backgrounds.                                     */
function hexToHsl(hex) {
  let x = String(hex).replace("#", "");
  if (x.length === 3) x = x.split("").map(c => c + c).join("");
  const r = parseInt(x.slice(0, 2), 16) / 255,
        g = parseInt(x.slice(2, 4), 16) / 255,
        b = parseInt(x.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = Math.round(h * 60); if (h < 0) h += 360;
  const l = (mx + mn) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}
const _ckCache = {};
function ck(hex) {                       // readable version of an author color
  const key = hex + "|" + themeMode();
  if (_ckCache[key]) return _ckCache[key];
  const { h, s, l } = hexToHsl(hex || "#0EA5E9");
  const sat = Math.max(48, Math.min(92, s));
  const lig = themeMode() === "light"
    ? Math.max(26, Math.min(l, 40))
    : Math.max(58, Math.min(l, 78));
  return (_ckCache[key] = `hsl(${h} ${sat}% ${lig}%)`);
}
function tint(hex, alpha) {              // translucent wash of an author color
  const { h, s } = hexToHsl(hex || "#0EA5E9");
  const lig = themeMode() === "light" ? 45 : 60;
  return `hsl(${h} ${Math.max(50, s)}% ${lig}% / ${alpha}%)`;
}

/* ===================== AUDIO (synthesized, no asset files) ===================== */
let _actx = null;
function audioCtx() {
  if (settings.muted) return null;
  try {
    if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
    if (_actx.state === "suspended") _actx.resume();
  } catch (e) { return null; }
  return _actx;
}
function tone(freq, start, dur, type, vol) {
  const ctx = audioCtx(); if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || "triangle"; o.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol || 0.2, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
function sweep(f1, f2, start, dur, type, vol) {
  const ctx = audioCtx(); if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || "sawtooth";
  const t0 = ctx.currentTime + start;
  o.frequency.setValueAtTime(f1, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol || 0.16, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
function noise(start, dur, vol, hp) {
  const ctx = audioCtx(); if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 700;
  const g = ctx.createGain(); g.gain.value = vol || 0.14;
  src.connect(f); f.connect(g); g.connect(ctx.destination);
  src.start(ctx.currentTime + start);
}

const sfx = {
  tick()    { tone(1320, 0, 0.035, "square", 0.045); },
  select()  { tone(880, 0, 0.05, "square", 0.07); tone(1320, 0.03, 0.05, "square", 0.045); },
  submit()  { tone(587, 0, 0.06, "triangle", 0.13); tone(784, 0.05, 0.09, "triangle", 0.11); },
  nav()     { tone(660, 0, 0.04, "sine", 0.06); },
  correct() { tone(659, 0, 0.13, "triangle", 0.22); tone(880, 0.085, 0.15, "triangle", 0.20); tone(1175, 0.17, 0.20, "triangle", 0.16); },
  /* The old wrong-answer sound sat at 147-196 Hz, which phone and laptop
     speakers cannot reproduce. This one lives where small speakers work. */
  wrong()   {
    tone(415, 0, 0.09, "square", 0.16);
    tone(311, 0.075, 0.11, "square", 0.16);
    tone(233, 0.155, 0.24, "sawtooth", 0.13);
    tone(466, 0.155, 0.20, "sine", 0.05);
  },
  streak(n) {                                    // pitch climbs with the streak
    const step = Math.min(n, 14);
    const base = 523 * Math.pow(2, step / 12);
    tone(base, 0, 0.09, "triangle", 0.16);
    tone(base * 1.5, 0.06, 0.13, "triangle", 0.12);
  },
  modeStart() { sweep(220, 880, 0, 0.28, "sawtooth", 0.10); tone(880, 0.24, 0.16, "triangle", 0.14); },
  hit()      { noise(0, 0.14, 0.16, 900); tone(180, 0, 0.1, "square", 0.10); },
  enemyHit() { noise(0, 0.1, 0.12, 1400); tone(700, 0, 0.07, "square", 0.10); },
  enemyDie() { sweep(700, 120, 0, 0.4, "square", 0.13); noise(0.02, 0.3, 0.1, 500); },
  levelUp()  { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.075, 0.24, "triangle", 0.18)); },
  gameOver() { [392, 349, 311, 233].forEach((f, i) => tone(f, i * 0.16, 0.4, "sawtooth", 0.14)); },
  chapter()  { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, "triangle", 0.19)); },
  deck()     {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.42, "triangle", 0.2));
    [131, 165, 196, 262].forEach((f, i) => tone(f, i * 0.22, 0.5, "sine", 0.1));
  },
};

/* ===================== VISUAL EFFECTS ===================== */
function flashGlow(color, ms) {
  const g = document.createElement("div");
  g.className = "glow";
  g.style.boxShadow = "inset 0 0 70px 18px " + color;
  g.style.animation = "pulse " + ((ms || 1200) / 1000) + "s ease-out forwards";
  document.body.appendChild(g);
  setTimeout(() => g.remove(), ms || 1200);
}
function confettiBurst(big) {
  const colors = ["#22d3a0", "#0EA5E9", "#f59e0b", "#f97316", "#a78bfa", "#f472b6"];
  const box = document.createElement("div");
  box.className = "confetti-layer" + (big ? " big" : "");
  const n = big ? 90 : 28;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    p.style.background = colors[i % colors.length];
    p.style.left = (50 + (Math.random() * (big ? 90 : 44) - (big ? 45 : 22))) + "%";
    p.style.setProperty("--dx", (Math.random() * (big ? 420 : 260) - (big ? 210 : 130)) + "px");
    p.style.setProperty("--dy", (-((big ? 200 : 130) + Math.random() * (big ? 380 : 200))) + "px");
    p.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
    p.style.animationDelay = (Math.random() * (big ? 0.5 : 0.06)) + "s";
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), big ? 2600 : 1200);
}
function shakeApp() {
  const a = document.getElementById("app");
  a.style.animation = "shake .4s ease";
  setTimeout(() => { a.style.animation = ""; }, 430);
}
function celebrate(ok) {
  if (ok) { sfx.correct(); confettiBurst(); flashGlow("var(--ok)", 900); }
  else { sfx.wrong(); shakeApp(); flashGlow("var(--bad)", 600); }
}
function floatNum(host, text, color) {
  if (!host) return;
  const el = document.createElement("div");
  el.className = "floatnum";
  el.textContent = text;
  el.style.color = color;
  el.style.left = "50%";
  el.style.top = "0px";
  el.style.transform = "translateX(-50%)";
  host.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

/* ===================== MODALS ===================== */
function showModal(html) {
  document.getElementById("overlay").innerHTML =
    `<div class="modalbg" data-act="modalbg"><div class="modal">${html}</div></div>`;
}
function closeModal() { document.getElementById("overlay").innerHTML = ""; }
function modalOpen() { return !!document.getElementById("overlay").innerHTML; }

/* ===================== ICONS ===================== */
const I = {
  chevL: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  check: c => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  x: c => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  star: (filled, size) => `<svg width="${size || 18}" height="${size || 18}" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  flag: (filled, size) => `<svg width="${size || 18}" height="${size || 18}" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  shuffle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
  sword: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>',
  palette: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  sound: on => on
    ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'
    : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
};

/* ===================== KEYBOARD NAVIGATION =====================
   Arrows move a highlight by screen geometry (so it works on the
   question grid and the chip row without special cases), Enter
   activates, Backspace leaves the screen.                            */
const BACK_ACTS = ["home", "backToClass", "backToSet", "toCatGrid", "battleExit"];

function navItems() {
  return Array.from(document.querySelectorAll("#app [data-act]"))
    .filter(el => !el.disabled && !el.hasAttribute("data-nonav") && el.offsetParent !== null);
}
function paintNav() {
  const items = navItems();
  document.querySelectorAll(".kbfocus").forEach(el => el.classList.remove("kbfocus"));
  if (!items.length) return;
  if (S.navIdx >= items.length) S.navIdx = items.length - 1;
  if (S.navIdx < 0) S.navIdx = 0;
  const el = items[S.navIdx];
  el.classList.add("kbfocus");
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function navMove(dir) {
  const items = navItems();
  if (!items.length) return;
  const cur = items[S.navIdx] || items[0];
  const cr = cur.getBoundingClientRect();
  const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
  let best = null, bestScore = Infinity;
  items.forEach((el, i) => {
    if (el === cur) return;
    const r = el.getBoundingClientRect();
    const dx = (r.left + r.width / 2) - cx, dy = (r.top + r.height / 2) - cy;
    let along, across;
    if (dir === "down")       { along = dy;  across = Math.abs(dx); }
    else if (dir === "up")    { along = -dy; across = Math.abs(dx); }
    else if (dir === "right") { along = dx;  across = Math.abs(dy); }
    else                      { along = -dx; across = Math.abs(dy); }
    if (along < 6) return;
    const score = along + across * 2.4;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  if (best === null) {                                  // nothing that way: wrap linearly
    const fwd = (dir === "down" || dir === "right");
    best = (S.navIdx + (fwd ? 1 : -1) + items.length) % items.length;
  }
  S.navIdx = best;
  paintNav();
  sfx.nav();
}
document.addEventListener("keydown", ev => {
  const k = ev.key;
  const dirs = { ArrowDown: "down", ArrowUp: "up", ArrowLeft: "left", ArrowRight: "right" };

  if (modalOpen()) {                                     // modals: Enter = confirm, Esc/Backspace = cancel
    if (k === "Escape" || k === "Backspace") { ev.preventDefault(); closeModal(); }
    return;
  }
  if (dirs[k]) {
    ev.preventDefault();
    document.body.classList.add("kbd");
    navMove(dirs[k]);
    return;
  }
  if (k === "Enter" || k === " ") {
    const items = navItems();
    const el = items[S.navIdx];
    if (document.body.classList.contains("kbd") && el) { ev.preventDefault(); el.click(); }
    return;
  }
  if (k === "Backspace") {
    ev.preventDefault();
    document.body.classList.add("kbd");
    for (const a of BACK_ACTS) {
      const el = document.querySelector(`#app [data-act="${a}"]`);
      if (el) { el.click(); return; }
    }
  }
  if (k === "Escape" && S.menuOpen) { S.menuOpen = false; render(); }
});
