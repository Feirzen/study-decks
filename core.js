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
const DEFAULT_SETTINGS = { theme: "midnight", muted: false, chamLock: null, chamTone: "auto" };
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
const CHAM_EVERY = 1;          // reroll after this many answered questions (1 = every answer)

function makeChameleon() {
  const h = Math.floor(Math.random() * 360);
  const acc = (h + 120 + Math.floor(Math.random() * 110)) % 360;
  // chamTone: "auto" = mixed (mostly dark), "light" = light only, "dark" = dark only
  const tone = settings.chamTone;
  const light = tone === "light" ? true : tone === "dark" ? false : Math.random() < 0.28;
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
    lockChameleon();
  }
}
/* Freeze whatever palette is on screen right now. */
function lockChameleon() {
  const vars = {};
  CHAM_VARS.forEach(v => vars[v] = getComputedStyle(document.documentElement).getPropertyValue("--" + v).trim());
  settings.chamLock = { mode: chamMode, vars };
  saveSettings();
}
/* Lizard tap: any -> light only -> dark only -> any.
   Switching tone paints a new palette right away. If the lock is on, the
   lock moves onto the new palette so it stays on, as the person left it. */
function cycleChamTone() {
  const order = ["auto", "light", "dark"];
  const cur = order.indexOf(settings.chamTone);
  settings.chamTone = order[(cur + 1) % order.length];
  chamCounter = 0;
  paintChameleon(makeChameleon());
  if (settings.chamLock) lockChameleon();
  else saveSettings();
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

/* ===================== AUDIO (synthesized, no asset files) =====================
   Two kits share one mixer:
     soft kit  -> marimba / glass tones for browsing, quizzing, shuffle
     chip kit  -> punchy 8-bit voices for Battle
   Everything runs through a gentle compressor so stacked sounds never clip,
   with a small generated room reverb for the soft kit.                    */
let _actx = null, _bus = null, _verb = null, _pulse = {};
function audioCtx() {
  if (settings.muted) return null;
  try {
    if (!_actx) {
      _actx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = _actx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4;
      comp.attack.value = 0.003; comp.release.value = 0.18;
      _bus = _actx.createGain(); _bus.gain.value = 0.85;
      _bus.connect(comp); comp.connect(_actx.destination);
      // short airy room: decaying stereo noise impulse
      const len = Math.floor(_actx.sampleRate * 1.1);
      const ir = _actx.createBuffer(2, len, _actx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
      }
      const conv = _actx.createConvolver(); conv.buffer = ir;
      const lp = _actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 5200;
      _verb = _actx.createGain(); _verb.gain.value = 0.32;
      _verb.connect(conv); conv.connect(lp); lp.connect(_bus);
    }
    if (_actx.state === "suspended") _actx.resume();
  } catch (e) { return null; }
  return _actx;
}
/* Route a voice: dry to the bus, optional reverb send. */
function route(node, wet) {
  node.connect(_bus);
  if (wet) { const s = _actx.createGain(); s.gain.value = wet; node.connect(s); s.connect(_verb); }
}
function env(g, t0, vol, atk, dur) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

/* ---- soft kit ---- */
/* Marimba-ish: sine body + quick 4th-partial "knock" on the attack. */
function mallet(freq, start, o) {
  const ctx = audioCtx(); if (!ctx) return;
  o = o || {};
  const dur = o.dur || 0.45, vol = o.vol || 0.16, t0 = ctx.currentTime + start;
  const out = ctx.createGain(); out.gain.value = 1;
  const a = ctx.createOscillator(), ga = ctx.createGain();
  a.type = "sine"; a.frequency.value = freq; env(ga, t0, vol, 0.004, dur);
  const b = ctx.createOscillator(), gb = ctx.createGain();
  b.type = "sine"; b.frequency.value = freq * 3.93; env(gb, t0, vol * 0.32 * (o.bright == null ? 1 : o.bright), 0.002, dur * 0.18);
  const c = ctx.createOscillator(), gc = ctx.createGain();
  c.type = "triangle"; c.frequency.value = freq * 2; env(gc, t0, vol * 0.18, 0.002, 0.03);
  a.connect(ga); b.connect(gb); c.connect(gc); ga.connect(out); gb.connect(out); gc.connect(out);
  route(out, o.wet == null ? 0.22 : o.wet);
  [a, b, c].forEach(x => { x.start(t0); x.stop(t0 + dur + 0.05); });
}
/* Glass / bell: inharmonic partials, long shimmer. */
function bell(freq, start, o) {
  const ctx = audioCtx(); if (!ctx) return;
  o = o || {};
  const dur = o.dur || 1.1, vol = o.vol || 0.07, t0 = ctx.currentTime + start;
  const out = ctx.createGain();
  [[1, 1], [2.76, 0.34], [5.4, 0.13], [8.93, 0.05]].forEach(([m, v], i) => {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq * m;
    env(g, t0, vol * v, 0.003, dur / (1 + i * 0.7));
    osc.connect(g); g.connect(out);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  });
  route(out, o.wet == null ? 0.45 : o.wet);
}
/* Filtered noise: whooshes, soft thuds. */
function hush(start, dur, o) {
  const ctx = audioCtx(); if (!ctx) return;
  o = o || {};
  const t0 = ctx.currentTime + start, n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = o.type || "bandpass"; f.Q.value = o.q || 1.2;
  f.frequency.setValueAtTime(o.f1 || 800, t0);
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
  const g = ctx.createGain(); env(g, t0, o.vol || 0.1, o.atk || 0.01, dur);
  src.connect(f); f.connect(g); route(g, o.wet || 0);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

/* ---- chip kit ---- */
function pulseWave(duty) {                   // band-limited pulse via Fourier series
  if (_pulse[duty]) return _pulse[duty];
  const N = 48, re = new Float32Array(N), im = new Float32Array(N);
  for (let k = 1; k < N; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return (_pulse[duty] = _actx.createPeriodicWave(re, im));
}
function chip(freq, start, dur, o) {
  const ctx = audioCtx(); if (!ctx) return;
  o = o || {};
  const t0 = ctx.currentTime + start, vol = o.vol || 0.12;
  const osc = ctx.createOscillator();
  if (o.wave === "tri") osc.type = "triangle";
  else if (o.wave === "square") osc.type = "square";
  else osc.setPeriodicWave(pulseWave(o.duty || 0.25));
  osc.frequency.setValueAtTime(freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t0 + (o.slide || dur));
  if (o.vib) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = o.vib; lg.gain.value = freq * 0.025;
    lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
  }
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = o.lp || 5200;
  const g = ctx.createGain();
  // chip envelope: instant attack, short hold, then release
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.004);
  g.gain.setValueAtTime(vol, t0 + Math.max(0.005, dur * (o.hold == null ? 0.55 : o.hold)));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(lp); lp.connect(g); route(g, o.wet || 0);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}
function crunch(start, dur, o) {             // 8-bit noise: stepped, filtered
  const ctx = audioCtx(); if (!ctx) return;
  o = o || {};
  const t0 = ctx.currentTime + start, n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  const step = o.step || 6; let v = 0;
  for (let i = 0; i < n; i++) { if (i % step === 0) v = Math.random() * 2 - 1; d[i] = v; }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = "lowpass";
  f.frequency.setValueAtTime(o.f1 || 4000, t0);
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
  const g = ctx.createGain(); env(g, t0, o.vol || 0.12, 0.003, dur);
  src.connect(f); f.connect(g); route(g, 0);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);       // midi -> Hz
const PENTA = [0, 2, 4, 7, 9];

const sfx = {
  /* ---------- soft kit ---------- */
  tick()    { if (S.screen === "battle") return chip(1568, 0, 0.03, { vol: 0.05, duty: 0.125 });
              mallet(NOTE(91), 0, { dur: 0.07, vol: 0.045, wet: 0.04, bright: 0.4 }); },
  select()  { if (S.screen === "battle") { chip(NOTE(81), 0, 0.035, { vol: 0.07, duty: 0.125 }); chip(NOTE(88), 0.035, 0.05, { vol: 0.06, duty: 0.125 }); return; }
              mallet(NOTE(83), 0, { dur: 0.22, vol: 0.1, wet: 0.12 }); },
  nav()     { mallet(NOTE(88), 0, { dur: 0.06, vol: 0.035, wet: 0, bright: 0.3 }); },
  submit()  { mallet(NOTE(79), 0, { dur: 0.2, vol: 0.1 }); },
  correct() {                                         // bright rising major triad + sparkle
    [84, 88, 91].forEach((n, i) => mallet(NOTE(n), i * 0.075, { dur: 0.5, vol: 0.15 }));
    bell(NOTE(96), 0.2, { vol: 0.05, dur: 1.2 });
  },
  wrong()   {                                         // soft falling minor "nope", small-speaker safe
    mallet(NOTE(69), 0, { dur: 0.35, vol: 0.17, bright: 0.6, wet: 0.12 });
    mallet(NOTE(65), 0.11, { dur: 0.55, vol: 0.17, bright: 0.5, wet: 0.12 });
    hush(0, 0.16, { f1: 420, q: 0.8, vol: 0.09 });
  },
  streak(n) {                                         // climbs a pentatonic ladder, chimes every 5
    const k = Math.min(n, 15) - 1;
    const base = 72 + 12 * Math.floor(k / 5) + PENTA[k % 5];
    mallet(NOTE(base), 0, { dur: 0.4, vol: 0.15 });
    mallet(NOTE(base + 7), 0.07, { dur: 0.45, vol: 0.12 });
    if (n % 5 === 0) { bell(NOTE(base + 12), 0.15, { vol: 0.07 }); bell(NOTE(base + 19), 0.24, { vol: 0.05 }); }
  },
  modeStart() {                                       // airy swish into a gentle chord
    hush(0, 0.32, { f1: 300, f2: 3200, q: 1.4, vol: 0.07, atk: 0.14, wet: 0.2 });
    [79, 86, 91].forEach((n, i) => mallet(NOTE(n), 0.17 + i * 0.03, { dur: 0.7, vol: 0.1 }));
  },
  chapter() {
    [72, 76, 79, 84, 88].forEach((n, i) => mallet(NOTE(n), i * 0.08, { dur: 0.7, vol: 0.14 }));
    bell(NOTE(96), 0.42, { vol: 0.07, dur: 1.6 });
  },
  deck() {
    [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => mallet(NOTE(n), i * 0.085, { dur: 0.8, vol: 0.14 }));
    [84, 88, 91, 96].forEach((n, i) => bell(NOTE(n), 0.62 + i * 0.05, { vol: 0.055, dur: 2.2 }));
    [48, 55].forEach((n, i) => mallet(NOTE(n + 12), 0.62 + i * 0.02, { dur: 1.4, vol: 0.12, bright: 0.3 }));
  },

  /* ---------- chip kit (Battle) ---------- */
  bStart() {
    [67, 72, 76, 79].forEach((n, i) => chip(NOTE(n), i * 0.07, 0.07, { vol: 0.09 }));
    chip(NOTE(84), 0.28, 0.32, { vol: 0.09, vib: 7, hold: 0.7 });
    chip(NOTE(48), 0.28, 0.32, { wave: "tri", vol: 0.16 });
    crunch(0.28, 0.2, { f1: 6000, f2: 800, vol: 0.06 });
  },
  bSwing() {
    crunch(0, 0.09, { f1: 1500, f2: 7000, vol: 0.06, step: 2 });
    chip(900, 0.02, 0.07, { to: 320, vol: 0.05, duty: 0.125 });
  },
  bHit() {                                            // timed to land when the blade connects
    crunch(0.16, 0.1, { f1: 5000, f2: 900, vol: 0.13, step: 4 });
    chip(240, 0.16, 0.11, { wave: "square", to: 55, vol: 0.1, lp: 2200 });
    chip(NOTE(88), 0.16, 0.05, { vol: 0.05, duty: 0.125 });
  },
  bKill() {
    sfx.bHit();
    [79, 76, 72, 67, 64].forEach((n, i) => chip(NOTE(n), 0.3 + i * 0.035, 0.05, { vol: 0.08 }));
    crunch(0.3, 0.42, { f1: 5000, f2: 180, vol: 0.13, step: 8 });
    chip(110, 0.3, 0.3, { wave: "tri", to: 40, vol: 0.18 });
    chip(NOTE(83), 0.72, 0.07, { vol: 0.08, duty: 0.5 });      // coin
    chip(NOTE(88), 0.79, 0.22, { vol: 0.08, duty: 0.5, hold: 0.3 });
  },
  bHurt() {
    crunch(0.19, 0.14, { f1: 3000, f2: 500, vol: 0.14, step: 5 });
    chip(330, 0.19, 0.18, { wave: "square", to: 70, vol: 0.09, lp: 1800 });
    chip(120, 0.19, 0.22, { wave: "tri", to: 45, vol: 0.2 });
  },
  bLevel() {
    const seq = [72, 76, 79, 84, 88, 91, 96];
    seq.forEach((n, i) => chip(NOTE(n), i * 0.045, 0.06, { vol: 0.08 }));
    seq.forEach((n, i) => chip(NOTE(n), 0.14 + i * 0.045, 0.06, { vol: 0.03 }));   // echo
    chip(NOTE(96), 0.34, 0.4, { vol: 0.07, vib: 8, hold: 0.6, duty: 0.5 });
  },
  bBoss() {
    chip(NOTE(40), 0, 0.7, { wave: "square", vol: 0.07, lp: 900, vib: 5, hold: 0.8 });
    chip(NOTE(41), 0, 0.7, { wave: "square", vol: 0.06, lp: 900, hold: 0.8 });
    crunch(0, 0.7, { f1: 400, f2: 120, vol: 0.12, step: 30 });
    chip(NOTE(52), 0.62, 0.12, { vol: 0.09 }); chip(NOTE(51), 0.76, 0.3, { vol: 0.09, vib: 6 });
    crunch(0.6, 0.25, { f1: 2500, f2: 200, vol: 0.12, step: 6 });           // landing thud
    chip(90, 0.6, 0.3, { wave: "tri", to: 35, vol: 0.22 });
  },
  bOver() {
    [[67, 0.22], [66, 0.22], [65, 0.22], [64, 0.7]].forEach(([n, d], i) =>
      chip(NOTE(n), i * 0.24, d, { wave: "tri", vol: 0.2, vib: i === 3 ? 6 : 0, hold: 0.8 }));
    [[55, 0.22], [54, 0.22], [53, 0.22], [52, 0.7]].forEach(([n, d], i) =>
      chip(NOTE(n), i * 0.24, d, { vol: 0.05, hold: 0.8 }));
  },
  bHeal() { [76, 83].forEach((n, i) => chip(NOTE(n), 0.95 + i * 0.06, 0.08, { vol: 0.045, duty: 0.5 })); },
};

/* ===================== VISUAL EFFECTS =====================
   One full-screen canvas runs every particle (confetti, pixel bursts,
   sparks). It lives outside #app so re-renders never cut an effect off. */
const FX = { cv: null, g: null, parts: [], raf: 0, last: 0, w: 0, h: 0, dpr: 1 };
const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function fxEnsure() {
  if (!FX.cv) {
    FX.cv = document.createElement("canvas");
    FX.cv.id = "fxcanvas";
    document.body.appendChild(FX.cv);
    FX.g = FX.cv.getContext("2d");
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = window.innerWidth, h = window.innerHeight;
  if (w !== FX.w || h !== FX.h || dpr !== FX.dpr) {
    FX.w = w; FX.h = h; FX.dpr = dpr;
    FX.cv.width = Math.round(w * dpr); FX.cv.height = Math.round(h * dpr);
  }
}
/* p: {x, y, vx, vy, life, size, color, g(ravity), drag, shape:'px'|'conf'|'spark', rot, spin} */
const PXG = 3;                                   // particle pixel grid (css px)
function fxAdd(list) {
  if (REDUCED) return;
  fxEnsure();
  list.forEach(p => { p.max = p.life; p.rot = p.rot || 0; FX.parts.push(p); });
  if (!FX.raf) { FX.last = performance.now(); FX.raf = requestAnimationFrame(fxLoop); }
}
function fxLoop(now) {
  const dt = Math.min(0.033, (now - FX.last) / 1000); FX.last = now;
  const g = FX.g;
  g.setTransform(FX.dpr, 0, 0, FX.dpr, 0, 0);
  g.clearRect(0, 0, FX.w, FX.h);
  const keep = [];
  for (const p of FX.parts) {
    p.life -= dt;
    if (p.life <= 0) continue;
    if (p.delay > 0) { p.delay -= dt; p.life += dt; keep.push(p); continue; }
    p.vy += (p.g || 0) * dt;
    const drag = Math.pow(p.drag || 1, dt * 60);
    p.vx *= drag; p.vy *= drag;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += (p.spin || 0) * dt;
    const k = p.life / p.max;
    g.globalAlpha = Math.ceil((k < 0.35 ? k / 0.35 : 1) * 4) / 4;      // stepped fade
    g.fillStyle = p.color;
    if (p.shape === "conf") {
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
      g.scale(1, Math.cos(p.rot * 2.2 + p.flip));                 // paper flutter
      g.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
      g.restore();
    } else if (p.shape === "spark") {
      // a short streak drawn as chunky pixels on the 3px grid
      const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp;
      const n = Math.max(1, Math.min(5, Math.round(1 + sp * 0.012)));
      for (let j = 0; j < n; j++) {
        g.globalAlpha = (k < 0.35 ? k / 0.35 : 1) * (1 - j / (n + 1));
        g.fillRect(PXG * Math.round((p.x - ux * j * PXG) / PXG), PXG * Math.round((p.y - uy * j * PXG) / PXG), PXG, PXG);
      }
    } else {
      // squares snap to a 3px grid and shrink in whole steps
      const raw = p.size * (p.shrink ? (0.35 + 0.65 * k) : 1);
      const s = Math.max(PXG, PXG * Math.round(raw / PXG));
      g.fillRect(PXG * Math.round((p.x - s / 2) / PXG), PXG * Math.round((p.y - s / 2) / PXG), s, s);
    }
    keep.push(p);
  }
  g.globalAlpha = 1;
  FX.parts = keep;
  FX.raf = keep.length ? requestAnimationFrame(fxLoop) : 0;
  if (!keep.length) g.clearRect(0, 0, FX.w, FX.h);
}
/* Burst of square pixels from a point (client coords). */
function fxPixels(x, y, colors, n, o) {
  o = o || {};
  const list = [];
  for (let i = 0; i < n; i++) {
    const a = (o.angle != null ? o.angle : -Math.PI / 2) + (Math.random() - 0.5) * (o.spread != null ? o.spread : Math.PI * 2);
    const sp = (o.speed || 220) * (0.4 + Math.random() * 0.8);
    list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: (o.life || 0.7) * (0.6 + Math.random() * 0.6),
      size: o.size || 4, color: colors[i % colors.length], g: o.g == null ? 600 : o.g, drag: o.drag || 0.94,
      shape: o.shape || "px", shrink: o.shrink !== false, delay: o.delay || 0 });
  }
  fxAdd(list);
}

function flashGlow(color, ms) {
  const g = document.createElement("div");
  g.className = "glow";
  g.style.boxShadow = "inset 0 0 46px 6px " + color;
  g.style.animation = "pulse " + ((ms || 1200) / 1000) + "s ease-out forwards";
  document.body.appendChild(g);
  setTimeout(() => g.remove(), ms || 1200);
}
function confettiBurst(big) {
  if (REDUCED) return;
  fxEnsure();
  const colors = ["#22d3a0", "#0EA5E9", "#f59e0b", "#f97316", "#a78bfa", "#f472b6", "#facc15"];
  const list = [];
  const shoot = (x, y, ang, spread, n, speed) => {
    for (let i = 0; i < n; i++) {
      const a = ang + (Math.random() - 0.5) * spread, sp = speed * (0.55 + Math.random() * 0.6);
      list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: big ? 2.6 : 1.5,
        size: 7 + Math.random() * 5, color: colors[(Math.random() * colors.length) | 0],
        g: 820, drag: 0.965, shape: "conf", rot: Math.random() * 6, spin: (Math.random() - 0.5) * 14,
        flip: Math.random() * 6, delay: big ? Math.random() * 0.25 : 0 });
    }
  };
  const W = FX.w, H = FX.h;
  if (big) {
    shoot(0, H * 0.85, -Math.PI / 3.2, 0.7, 55, 900);
    shoot(W, H * 0.85, -Math.PI + Math.PI / 3.2, 0.7, 55, 900);
    shoot(W / 2, H * 0.55, -Math.PI / 2, 1.4, 40, 620);
  } else {
    shoot(W / 2, H * 0.58, -Math.PI / 2, 1.3, 30, 520);
  }
  fxAdd(list);
}
function shakeApp() {
  const a = document.getElementById("app");
  a.style.animation = "shake .36s ease";
  setTimeout(() => { a.style.animation = ""; }, 400);
}
function celebrate(ok) {
  if (ok) { sfx.correct(); confettiBurst(); flashGlow("var(--ok)", 900); }
  else { sfx.wrong(); shakeApp(); flashGlow("var(--bad)", 600); }
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
  const tg = ev.target;
  if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA")) {   // typing: leave keys alone
    if (k === "Enter" && tg.dataset.enter) {
      ev.preventDefault();
      const b = document.querySelector(`#app [data-act="${tg.dataset.enter}"]`);
      if (b) b.click();
    }
    return;
  }
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
