/* ===================================================================
   app.js — boot, routing, screens, events
   Loaded last; calls boot() at the bottom.
   =================================================================== */

/* ===================== SET METADATA CACHE =====================
   Question totals per deck so the class screen can draw real progress
   bars before you have ever opened a deck. Cached in localStorage and
   refreshed in the background.                                        */
function metaKey(setId) { return "fc:meta:" + setId; }
function loadMeta(setId) {
  if (S.meta[setId]) return S.meta[setId];
  try {
    const raw = localStorage.getItem(metaKey(setId));
    if (raw) return (S.meta[setId] = JSON.parse(raw));
  } catch (e) {}
  return null;
}
function storeMeta(set) {
  const m = { total: 0, cats: {}, ids: [] };
  set.categories.forEach(c => {
    m.cats[c.category] = c.questions.length;
    m.total += c.questions.length;
    c.questions.forEach(q => m.ids.push(q.id));
  });
  S.meta[set.id] = m;
  try { localStorage.setItem(metaKey(set.id), JSON.stringify(m)); } catch (e) {}
  return m;
}
async function prefetchMeta() {
  const jobs = [];
  (S.manifest.classes || []).forEach(c => (c.sets || []).forEach(s => {
    if (loadMeta(s.id)) return;
    jobs.push(fetch(s.file, { cache: "no-cache" })
      .then(r => r.json())
      .then(set => { set.id = set.id || s.id; storeMeta(set); })
      .catch(() => {}));
  }));
  if (!jobs.length) return;
  await Promise.all(jobs);
  render();
}

/* Deck-level tallies straight from stored progress + cached meta. */
function deckStats(setId) {
  const p = peekProgress(setId);
  const m = loadMeta(setId);
  let correct = 0, incorrect = 0;
  const ids = m ? m.ids : Object.keys(p.results || {});
  ids.forEach(id => {
    const r = p.results[id];
    if (r === "correct") correct++;
    else if (r === "incorrect") incorrect++;
  });
  const total = m ? m.total : ids.length;
  return { correct, incorrect, total, seen: correct + incorrect, hasMeta: !!m };
}

/* ===================== BOOT ===================== */
async function boot() {
  applyTheme();
  try {
    const res = await fetch(MANIFEST_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("manifest " + res.status);
    S.manifest = await res.json();
  } catch (e) {
    document.getElementById("app").innerHTML =
      '<div class="wrap"><div class="empty">Couldn\'t load <code>sets/manifest.json</code>.<br><br>' +
      'If you opened the file directly, use a local server or GitHub Pages —<br>browsers block fetch() on file:// URLs.<br><br>' +
      '<span class="muted">' + esc(e.message) + "</span></div></div>";
    return;
  }
  render();
  prefetchMeta();
}

async function openSet(cls, setMeta) {
  const res = await fetch(setMeta.file, { cache: "no-cache" });
  const set = await res.json();
  set.id = set.id || setMeta.id;
  set._color = setMeta.color || cls.color;
  S.set = set;
  storeMeta(set);
  progress = loadProgress(set.id);
  S.high = progress.high || 0;
  settings.lastSet = { classId: cls.id, setId: setMeta.id };
  saveSettings();
  rollChameleon();
  S.screen = "setHome";
  S.navIdx = 0;
  render();
}

/* ===================== ROUTER ===================== */
function render() {
  const el = document.getElementById("app");
  let html = "";
  if (S.screen === "home") html = viewHome();
  else if (S.screen === "classView") html = viewClass();
  else if (S.screen === "setHome") html = viewSetHome();
  else if (S.screen === "grid") html = viewQuizGrid();
  else if (S.screen === "quiz") html = viewQuiz();
  else if (S.screen === "shuffle") html = viewShuffle();
  else if (S.screen === "battle") html = viewBattle();
  el.innerHTML = topbar() + html + (S.menuOpen ? themeMenu() : "");
  mountSprites();
  if (document.body.classList.contains("kbd")) paintNav();
}
function goto(screen) { S.screen = screen; S.navIdx = 0; render(); window.scrollTo(0, 0); }

/* ===================== TOP BAR ===================== */
function topbar() {
  const cham = settings.theme === "chameleon";
  const locked = cham && !!settings.chamLock;
  return `<div class="topbar">
    ${cham ? `<button class="iconbtn ${locked ? "on" : ""}" data-act="chamLock" data-nonav title="${locked ? "Unlock colors" : "Lock this palette"}" style="${locked ? "" : "opacity:.6;filter:grayscale(.7)"}">🦎</button>` : ""}
    <button class="iconbtn" data-act="toggleMute" data-nonav title="${settings.muted ? "Unmute" : "Mute"}">${I.sound(!settings.muted)}</button>
    <button class="iconbtn ${S.menuOpen ? "on" : ""}" data-act="themeMenu" data-nonav title="Theme">${I.palette}</button>
  </div>`;
}
function themeMenu() {
  const rows = Object.keys(THEMES).map(k => {
    const t = THEMES[k];
    const sel = settings.theme === k;
    return `<button data-act="setTheme" data-theme="${k}" data-nonav class="${sel ? "sel" : ""}">
      <span class="swatch" style="background:${t.swatch}"></span>${t.label}${sel ? " ✓" : ""}
    </button>`;
  }).join("");
  const chamNote = settings.theme === "chameleon"
    ? `<div style="padding:6px 12px 4px;font-size:11px;line-height:1.5;color:var(--muted)">New palette every ${CHAM_EVERY} answers. Tap 🦎 to keep one.</div>`
    : "";
  return `<div class="thememenu">${rows}${chamNote}</div>`;
}

/* ===================== HOME ===================== */
function viewHome() {
  const classes = S.manifest.classes || [];

  let gCorrect = 0, gTotal = 0, gSeen = 0;
  classes.forEach(c => (c.sets || []).forEach(s => {
    const d = deckStats(s.id);
    gCorrect += d.correct; gTotal += d.total; gSeen += d.seen;
  }));

  const cards = classes.map(c => {
    const col = ck(c.color || "#0EA5E9");
    let correct = 0, incorrect = 0, total = 0;
    (c.sets || []).forEach(s => { const d = deckStats(s.id); correct += d.correct; incorrect += d.incorrect; total += d.total; });
    const n = (c.sets || []).length;
    const pc = total ? (correct / total) * 100 : 0;
    const pi = total ? (incorrect / total) * 100 : 0;
    return `<button class="card" data-act="openClass" data-id="${esc(c.id)}" style="margin-bottom:12px;padding-left:26px">
      <div class="accentbar" style="background:${col}"></div>
      <div class="row">
        <div style="flex:1">
          <div class="eyebrow" style="color:${col}">${n} set${n === 1 ? "" : "s"}</div>
          <div style="font-size:19px;font-weight:bold;margin-top:3px">${esc(c.name)}</div>
          ${total ? `<div class="segbar"><span style="width:${pc}%;background:var(--ok)"></span><span style="width:${pi}%;background:var(--bad)"></span></div>
          <div class="muted" style="font-size:12px;margin-top:6px">${correct} of ${total} correct</div>` : ""}
        </div>
        <div style="font-size:22px;color:${col}">›</div>
      </div>
    </button>`;
  }).join("");

  let resume = "";
  const ls = settings.lastSet;
  if (ls && classes.some(c => c.id === ls.classId && (c.sets || []).some(s => s.id === ls.setId))) {
    const c = classes.find(x => x.id === ls.classId);
    const s = c.sets.find(x => x.id === ls.setId);
    const d = deckStats(s.id);
    if (d.seen && d.seen < d.total) {
      resume = `<button class="card" data-act="resume" style="margin-bottom:22px;border-color:var(--accent);padding-left:26px">
        <div class="accentbar" style="background:var(--accent)"></div>
        <div class="row">
          <div><div class="eyebrow" style="color:var(--accent)">Pick up where you left off</div>
          <div style="font-size:17px;font-weight:bold;margin-top:3px">${esc(c.name)} · ${esc(s.title)}</div>
          <div class="muted" style="font-size:12px;margin-top:4px">${d.correct}/${d.total} correct</div></div>
          <div style="font-size:22px;color:var(--accent)">›</div>
        </div>
      </button>`;
    }
  }

  return `<div class="wrap">
    <div style="margin:22px 0 26px">
      <div class="eyebrow">${gTotal ? gCorrect + " of " + gTotal + " questions correct" : "Self-hosted quiz decks"}</div>
      <div class="wordmark">Study<span class="l2">Decks</span></div>
      <div class="rule"></div>
    </div>
    ${resume}
    ${cards || '<div class="empty">No classes yet. Add one in <code>sets/manifest.json</code>.</div>'}
  </div>`;
}

/* ===================== CLASS (deck list) ===================== */
const DECK_PALETTE = ["#0EA5E9", "#F59E0B", "#EC4899", "#22C55E", "#A78BFA", "#F97316", "#14B8A6", "#EF4444"];

function viewClass() {
  const c = S.manifest.classes.find(x => x.id === S.classId);
  if (!c) { S.screen = "home"; return viewHome(); }
  const classCol = ck(c.color || "#0EA5E9");

  const sets = (c.sets || []).map((s, i) => {
    const col = ck(s.color || DECK_PALETTE[i % DECK_PALETTE.length]);
    const d = deckStats(s.id);
    const pc = d.total ? (d.correct / d.total) * 100 : 0;
    const pi = d.total ? (d.incorrect / d.total) * 100 : 0;
    const label = !d.total ? "Loading…"
      : d.correct === d.total ? "✓ Complete"
      : d.seen ? `${d.correct}/${d.total} correct` : "Not started";
    return `<button class="card" data-act="openSet" data-id="${esc(s.id)}" style="margin-bottom:12px;padding-left:26px;border-color:${d.total && d.correct === d.total ? "var(--ok)" : "var(--border)"}">
      <div class="accentbar" style="background:${col}"></div>
      <div class="fill" style="width:${pc}%;background:${tint(s.color || DECK_PALETTE[i % DECK_PALETTE.length], 9)}"></div>
      <div class="row">
        <div style="flex:1">
          <div class="eyebrow" style="color:${col}">${label}</div>
          <div style="font-size:18px;font-weight:bold;margin-top:3px">${esc(s.title)}</div>
          ${s.subtitle ? `<div class="muted" style="font-size:13px;margin-top:3px;line-height:1.45">${esc(s.subtitle)}</div>` : ""}
          <div class="segbar"><span style="width:${pc}%;background:var(--ok)"></span><span style="width:${pi}%;background:var(--bad)"></span></div>
        </div>
        <div style="font-size:22px;color:${col}">›</div>
      </div>
    </button>`;
  }).join("") || '<div class="empty">No sets in this class yet.</div>';

  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 26px">
      <button class="backbtn" data-act="home">${I.chevL}</button>
      <div><div class="eyebrow" style="color:${classCol}">Class</div>
      <div style="font-size:24px;font-weight:bold">${esc(c.name)}</div></div>
    </div>
    ${sets}
  </div>`;
}

/* ===================== SET HOME ===================== */
function viewSetHome() {
  const set = S.set;
  const qs = allQuestions(set);
  const total = qs.length;
  const correct = qs.filter(q => progress.results[q.id] === "correct").length;
  const incorrect = qs.filter(q => progress.results[q.id] === "incorrect").length;
  const unanswered = total - correct - incorrect;
  const starredN = starredCount();
  const missedN = missedCount();
  const f = progress.filter;
  const setCol = ck(set._color || "#0EA5E9");

  const catCards = set.categories.map(c => {
    const cc = c.questions.filter(q => progress.results[q.id] === "correct").length;
    const ci = c.questions.filter(q => progress.results[q.id] === "incorrect").length;
    const pct = Math.round((cc / c.questions.length) * 100) || 0;
    const done = cc === c.questions.length;
    const col = ck(c.color);
    return `<button class="card" data-act="openCat" data-cat="${esc(c.category)}" style="border-color:${done ? "var(--ok)" : "var(--border)"};margin-bottom:10px">
      <div class="fill" style="width:${pct}%;background:${tint(c.color, 9)}"></div>
      <div class="row">
        <div style="flex:1">
          <div class="eyebrow" style="color:${col}">${done ? "✓ Complete" : cc + "/" + c.questions.length + " correct"}</div>
          <div style="font-size:16px;font-weight:bold;margin-top:2px">${esc(c.category)}</div>
          <div class="segbar" style="margin-top:8px"><span style="width:${(cc / c.questions.length) * 100}%;background:var(--ok)"></span><span style="width:${(ci / c.questions.length) * 100}%;background:var(--bad)"></span></div>
        </div>
        <div style="font-size:19px;color:${col};font-weight:bold">${pct}%</div>
      </div>
    </button>`;
  }).join("");

  const chips = `<div class="chiprow" style="margin-bottom:20px">
    <button class="chip star ${f === "starred" ? "active" : ""}" data-act="filter" data-f="starred" ${starredN ? "" : "disabled"}>
      ${I.star(f === "starred", 19)}<span>Starred${starredN ? " · " + starredN : ""}</span>
    </button>
    <button class="chip flag ${f === "missed" ? "active" : ""}" data-act="filter" data-f="missed" ${missedN ? "" : "disabled"}>
      ${I.flag(f === "missed", 19)}<span>Misses${missedN ? " · " + missedN : ""}</span>
    </button>
  </div>`;

  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 22px">
      <button class="backbtn" data-act="backToClass">${I.chevL}</button>
      <div><div class="eyebrow" style="color:${setCol}">${esc(set.class)} · ${esc(set.title)}</div>
      <div style="font-size:22px;font-weight:bold;line-height:1.25">${esc(set.subtitle || set.title)}</div></div>
    </div>

    <div class="stats" style="margin-bottom:18px">
      <div class="stat"><div class="n" style="color:var(--ok)">${correct}</div><div class="l">Correct</div></div>
      <div class="stat"><div class="n" style="color:var(--bad)">${incorrect}</div><div class="l">Incorrect</div></div>
      <div class="stat"><div class="n" style="color:var(--muted)">${unanswered}</div><div class="l">Unanswered</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <button class="pill" data-act="startShuffle" style="background:var(--surface);border:1.5px solid var(--border);color:var(--text);justify-content:center;height:54px">${I.shuffle} Shuffle</button>
      <button class="pill" data-act="startBattle" style="background:var(--surface);border:1.5px solid var(--accent);color:var(--accent);justify-content:center;height:54px">${I.sword} Battle</button>
    </div>
    ${chips}

    <div class="eyebrow" style="margin-bottom:10px">Quiz by chapter</div>
    ${catCards}

    <div style="text-align:center;margin-top:34px">
      <button class="linkbtn" data-act="askReset">Reset this deck's progress</button>
    </div>
  </div>`;
}

/* ===================== QUESTION GRID ===================== */
function currentCat() { return S.set.categories.find(c => c.category === S.cat); }

function viewQuizGrid() {
  const c = currentCat();
  if (!c) { S.screen = "setHome"; return viewSetHome(); }
  const col = ck(c.color);
  const done = c.questions.every(q => progress.results[q.id] === "correct");
  const cells = c.questions.map((q, idx) => {
    const st = progress.results[q.id] || "unanswered";
    const cellCol = st === "correct" ? "var(--ok)" : st === "incorrect" ? "var(--bad)" : "var(--muted)";
    const bg = st === "correct" ? "var(--okBg)" : st === "incorrect" ? "var(--badBg)" : "var(--surface)";
    const bd = st === "correct" ? "var(--ok)" : st === "incorrect" ? "var(--bad)" : "var(--border)";
    return `<button class="qcell" data-act="goQ" data-idx="${idx}" style="color:${cellCol};background:${bg};border-color:${bd}">${idx + 1}${progress.starred[q.id] ? '<span class="st">★</span>' : ""}</button>`;
  }).join("");
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 24px">
      <button class="backbtn" data-act="backToSet">${I.chevL}</button>
      <div><div class="eyebrow" style="color:${col}">${esc(c.category)}</div>
      <div style="font-size:20px;font-weight:bold">Question Grid</div></div>
    </div>
    ${done ? `<div class="fb" style="background:var(--okBg);border:1px solid var(--ok);justify-content:center;margin-bottom:20px;color:var(--ok);font-weight:bold">All correct in this chapter</div>` : ""}
    <div class="grid-q" style="margin-bottom:26px">${cells}</div>
    <button class="primary" data-act="goQ" data-idx="${firstUnfinished(c)}" style="background:${col}">Start / Continue →</button>
  </div>`;
}
function firstUnfinished(c) {
  const i = c.questions.findIndex(q => progress.results[q.id] !== "correct");
  return i < 0 ? 0 : i;
}

/* ===================== QUIZ ===================== */
function viewQuiz() {
  const c = currentCat();
  const q = c.questions[S.qi];
  const col = ck(c.color);
  const order = optionOrder(q);
  const starred = !!progress.starred[q.id];

  const opts = order.map((origIdx, pos) => {
    const isSel = S.selected.includes(pos);
    const isCorrect = q.type === "mc" ? q.answer === origIdx : (q.answers || []).includes(origIdx);
    const reveal = S.feedback === "correct" || (S.feedback === "incorrect" && S.showAnswer);
    let border = "var(--border)", bg = "var(--surface)";
    if (reveal && isCorrect) { border = "var(--ok)"; bg = "var(--okBg)"; }
    if (isSel && !S.feedback) { border = col; bg = tint(c.color, 14); }
    if (S.feedback === "incorrect" && isSel && !isCorrect) { border = "var(--bad)"; bg = "var(--badBg)"; }
    return `<button class="opt" data-act="pick" data-pos="${pos}" style="border-color:${border};background:${bg}">
      <span class="box ${q.type}" style="border-color:${isSel ? col : "var(--border2)"};background:${isSel ? col : "transparent"}">${isSel ? '<span class="dot"></span>' : ""}</span>
      <span>${esc(q.options[origIdx])}</span>
    </button>`;
  }).join("");

  let fb = "";
  if (S.feedback) {
    const ok = S.feedback === "correct";
    const showExp = S.showAnswer || ok;
    fb = `<div class="fb fbpop" style="background:${ok ? "var(--okBg)" : "var(--badBg)"};border:1px solid ${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:18px">
      ${ok ? I.check("var(--ok)") : I.x("var(--bad)")}
      <div><div style="font-weight:bold;color:${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:4px">${ok ? "Correct!" : "Incorrect"}</div>
      ${showExp ? `<div class="dim" style="font-size:14px;line-height:1.6">${esc(q.explanation || "")}</div>` : ""}</div>
    </div>`;
  }

  let buttons;
  if (!S.feedback) {
    buttons = `<button class="primary" data-act="submitQuiz" style="background:${S.selected.length ? col : "var(--border)"};color:${S.selected.length ? "#fff" : "var(--muted)"}" ${S.selected.length ? "" : "disabled"}>Submit Answer</button>`;
  } else if (S.feedback === "incorrect") {
    buttons = `${!S.showAnswer ? `<button class="ghost" data-act="showAns">Show Answer</button>` : ""}
      <button class="ghost" data-act="retry" style="border-color:var(--bad);color:var(--bad)">↻ Retry</button>
      <button class="primary" data-act="nextQuiz" style="background:${col};flex:1">${S.qi < c.questions.length - 1 ? "Next →" : "Finish"}</button>`;
  } else {
    buttons = `<button class="primary" data-act="nextQuiz" style="background:${col}">${S.qi < c.questions.length - 1 ? "Next →" : "Finish"}</button>`;
  }

  return `<div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin:22px 0 20px">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="backbtn" data-act="toCatGrid">${I.chevL}</button>
        <span class="eyebrow" style="color:${col}">${esc(c.category)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <button class="star" data-act="star" data-id="${q.id}" style="color:${starred ? "var(--star)" : "var(--muted)"}">${I.star(starred, 20)}</button>
        <span class="muted" style="font-size:13px">${S.qi + 1}/${c.questions.length}</span>
      </div>
    </div>
    <div class="progressbar" style="margin-bottom:22px"><div style="width:${((S.qi + 1) / c.questions.length) * 100}%;background:${col}"></div></div>
    <div class="card" style="cursor:default;margin-bottom:18px">
      <div class="eyebrow" style="color:${col};margin-bottom:10px">${q.type === "mc" ? "Multiple Choice" : "Select All That Apply"}</div>
      <div style="font-size:18px;line-height:1.55">${esc(q.question)}</div>
    </div>
    <div style="display:grid;gap:10px;margin-bottom:18px">${opts}</div>
    ${fb}
    <div style="display:flex;gap:10px">${buttons}</div>
  </div>`;
}

/* ===================== SHUFFLE ===================== */
function startShuffle() {
  const pool = buildPool();
  if (!pool.length) return;
  S.shuffleQ = weightedOrder(pool);
  S.shuffleIdx = 0;
  S.streak = 0;
  resetQ();
  freshOrder(S.shuffleQ[0]);
  sfx.modeStart();
  goto("shuffle");
}
function viewShuffle() {
  const q = S.shuffleQ[S.shuffleIdx];
  if (!q) return `<div class="wrap"><div class="empty">No questions to shuffle.</div></div>`;
  const col = q._cat ? ck(q._cat.color) : "var(--accent)";
  const order = optionOrder(q);
  const starred = !!progress.starred[q.id];

  const opts = order.map((origIdx, pos) => {
    const isSel = S.selected.includes(pos);
    const isCorrect = q.type === "mc" ? q.answer === origIdx : (q.answers || []).includes(origIdx);
    let border = "var(--border)", bg = "var(--surface)";
    if (S.feedback && isCorrect) { border = "var(--ok)"; bg = "var(--okBg)"; }
    if (isSel && !S.feedback) { border = col; bg = tint(q._cat ? q._cat.color : "#0EA5E9", 14); }
    if (S.feedback === "incorrect" && isSel && !isCorrect) { border = "var(--bad)"; bg = "var(--badBg)"; }
    return `<button class="opt" data-act="pick" data-pos="${pos}" style="border-color:${border};background:${bg}">
      <span class="box ${q.type}" style="border-color:${isSel ? col : "var(--border2)"};background:${isSel ? col : "transparent"}">${isSel ? '<span class="dot"></span>' : ""}</span>
      <span>${esc(q.options[origIdx])}</span>
    </button>`;
  }).join("");

  let fb = "";
  if (S.feedback) {
    const ok = S.feedback === "correct";
    fb = `<div class="fb fbpop" style="background:${ok ? "var(--okBg)" : "var(--badBg)"};border:1px solid ${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:18px">
      ${ok ? I.check("var(--ok)") : I.x("var(--bad)")}
      <div><div style="font-weight:bold;color:${ok ? "var(--ok)" : "var(--bad)"};margin-bottom:4px">${ok ? "Correct!  Streak " + S.streak : "Streak ended" + (S.high ? " — best: " + S.high : "")}</div>
      <div class="dim" style="font-size:14px;line-height:1.6">${esc(q.explanation || "")}</div></div>
    </div>`;
  }

  const btn = !S.feedback
    ? `<button class="primary" data-act="submitShuffle" style="background:${S.selected.length ? "var(--accent)" : "var(--border)"};color:${S.selected.length ? "#fff" : "var(--muted)"}" ${S.selected.length ? "" : "disabled"}>Submit Answer</button>`
    : `<button class="primary" data-act="nextShuffle" style="background:var(--accent)">Next →</button>`;

  return `<div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin:22px 0 18px">
      <button class="backbtn" data-act="backToSet">${I.chevL}</button>
      <span class="eyebrow" style="color:var(--accent)">Shuffle${filterLabel()}</span>
      <div style="display:flex;gap:16px;align-items:center">
        <div style="text-align:center"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Streak</div><div style="font-size:20px;font-weight:bold;color:${S.streak ? "var(--star)" : "var(--muted)"}">${S.streak}</div></div>
        ${S.high ? `<div style="text-align:center"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Best</div><div style="font-size:20px;font-weight:bold;color:var(--accent)">${S.high}</div></div>` : ""}
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button class="star" data-act="star" data-id="${q.id}" style="color:${starred ? "var(--star)" : "var(--muted)"}">${I.star(starred, 20)}</button>
    </div>
    <div class="card" style="cursor:default;margin-bottom:18px">
      <div class="eyebrow" style="color:${col};margin-bottom:10px">${q.type === "mc" ? "Multiple Choice" : "Select All That Apply"}${q._cat ? " · " + esc(q._cat.category) : ""}</div>
      <div style="font-size:18px;line-height:1.55">${esc(q.question)}</div>
    </div>
    <div style="display:grid;gap:10px;margin-bottom:18px">${opts}</div>
    ${fb}
    <div>${btn}</div>
  </div>`;
}

/* ===================== ANSWER HANDLERS ===================== */
function resetQ() { S.selected = []; S.feedback = null; S.showAnswer = false; }

function pick(pos) {
  if (S.feedback) return;
  let q;
  if (S.screen === "shuffle") q = S.shuffleQ[S.shuffleIdx];
  else if (S.screen === "battle") q = battleQuestion();
  else q = currentCat().questions[S.qi];
  if (q.type === "mc") S.selected = [pos];
  else S.selected = S.selected.includes(pos) ? S.selected.filter(i => i !== pos) : S.selected.concat(pos);
  sfx.select();
  render();
}

function submitQuiz() {
  const q = currentCat().questions[S.qi];
  const ok = grade(q, S.selected);
  recordAnswer(q, ok);
  S.feedback = ok ? "correct" : "incorrect";
  render();
  celebrate(ok);
  checkCompletion();
}
function nextQuiz() {
  const c = currentCat();
  if (S.qi < c.questions.length - 1) {
    S.qi++; resetQ(); freshOrder(c.questions[S.qi]); sfx.tick(); render();
  } else {
    goto("grid");
  }
}
function submitShuffle() {
  const q = S.shuffleQ[S.shuffleIdx];
  const ok = grade(q, S.selected);
  S.streak = ok ? S.streak + 1 : 0;
  S.high = Math.max(S.high, S.streak);
  progress.high = S.high;
  recordAnswer(q, ok);
  S.feedback = ok ? "correct" : "incorrect";
  if (!ok) S.showAnswer = true;
  render();
  if (ok) { sfx.streak(S.streak); confettiBurst(); flashGlow("var(--ok)", 900); }
  else celebrate(false);
  checkCompletion();
}
function nextShuffle() {
  S.shuffleIdx++;
  if (S.shuffleIdx >= S.shuffleQ.length) { S.shuffleQ = weightedOrder(buildPool()); S.shuffleIdx = 0; }
  resetQ();
  freshOrder(S.shuffleQ[S.shuffleIdx]);
  sfx.tick();
  render();
}

/* ===================== COMPLETION CELEBRATIONS ===================== */
function checkCompletion() {
  if (!S.set) return;
  let deckDone = true;
  let fire = null;
  S.set.categories.forEach(c => {
    const done = c.questions.every(q => progress.results[q.id] === "correct");
    if (!done) deckDone = false;
    const key = "cat:" + c.category;
    if (done && !progress.celebrated[key]) { progress.celebrated[key] = true; fire = { kind: "chapter", cat: c }; }
    if (!done && progress.celebrated[key]) { progress.celebrated[key] = false; }
  });
  if (deckDone && !progress.celebrated.deck) { progress.celebrated.deck = true; fire = { kind: "deck" }; }
  if (!deckDone && progress.celebrated.deck) { progress.celebrated.deck = false; }
  saveProgress();
  if (fire) setTimeout(() => showCompletion(fire), 950);
}
function showCompletion(f) {
  if (f.kind === "deck") {
    confettiBurst(true);
    sfx.deck();
    flashGlow("var(--ok)", 1600);
    showModal(`<div style="font-size:44px;line-height:1;margin-bottom:10px">🏆</div>
      <h2 style="color:var(--star)">Deck complete</h2>
      <p>Every question in <b>${esc(S.set.title)}</b> answered correctly. Nice work.</p>
      <div class="btns"><button class="primary" data-act="closeModal" style="background:var(--accent)">Onward</button></div>`);
  } else {
    confettiBurst(true);
    sfx.chapter();
    flashGlow("var(--ok)", 1100);
    showModal(`<div style="font-size:40px;line-height:1;margin-bottom:10px">✨</div>
      <h2 style="color:var(--ok)">Chapter complete</h2>
      <p><b>${esc(f.cat.category)}</b> is fully correct.</p>
      <div class="btns"><button class="primary" data-act="closeModal" style="background:${ck(f.cat.color)}">Keep going</button></div>`);
  }
}

/* ===================== RESET ===================== */
function askReset() {
  showModal(`<h2>Reset this deck?</h2>
    <p>This clears every answer, star and miss for <b>${esc(S.set.title)}</b> on this device. It cannot be undone.</p>
    <div class="btns">
      <button class="ghost" data-act="closeModal">Cancel</button>
      <button class="primary" data-act="doReset" style="background:var(--bad);flex:1">Yes, reset</button>
    </div>`);
}
function doReset() {
  progress = blankProgress();
  saveProgress();
  S.high = 0;
  closeModal();
  render();
}

/* ===================== EVENTS ===================== */
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-act]");

  // clicking outside the theme menu closes it
  if (S.menuOpen && (!t || (t.dataset.act !== "setTheme" && t.dataset.act !== "themeMenu"))) {
    S.menuOpen = false;
    if (!t) return render();
  }
  if (!t) return;
  const act = t.dataset.act;

  // ---- top bar / modals
  if (act === "themeMenu") { S.menuOpen = !S.menuOpen; sfx.tick(); return render(); }
  if (act === "setTheme") {
    settings.theme = t.dataset.theme;
    if (settings.theme !== "chameleon") settings.chamLock = null;
    chamCounter = 0;
    saveSettings(); applyTheme();
    S.menuOpen = false;
    _flushColorCache();
    sfx.select();
    return render();
  }
  if (act === "chamLock") { toggleChamLock(); _flushColorCache(); sfx.select(); return render(); }
  if (act === "toggleMute") {
    settings.muted = !settings.muted; saveSettings();
    if (!settings.muted) sfx.select();
    return render();
  }
  if (act === "closeModal" || act === "modalbg") {
    if (act === "modalbg" && ev.target !== t) return;
    return closeModal();
  }
  if (act === "askReset") return askReset();
  if (act === "doReset") return doReset();

  // ---- navigation
  if (act === "home") { sfx.tick(); return goto("home"); }
  if (act === "openClass") { S.classId = t.dataset.id; sfx.tick(); return goto("classView"); }
  if (act === "backToClass") { sfx.tick(); return goto("classView"); }
  if (act === "backToSet") { sfx.tick(); return goto("setHome"); }
  if (act === "openSet") {
    const c = S.manifest.classes.find(x => x.id === S.classId);
    sfx.tick();
    return openSet(c, c.sets.find(s => s.id === t.dataset.id));
  }
  if (act === "resume") {
    const c = S.manifest.classes.find(x => x.id === settings.lastSet.classId);
    S.classId = c.id;
    sfx.tick();
    return openSet(c, c.sets.find(s => s.id === settings.lastSet.setId));
  }

  // ---- filters
  if (act === "filter") {
    const want = t.dataset.f;
    progress.filter = progress.filter === want ? "all" : want;   // mutually exclusive by construction
    saveProgress();
    sfx.select();
    return render();
  }

  // ---- quiz
  if (act === "openCat") { S.cat = t.dataset.cat; rollChameleon(); sfx.tick(); return goto("grid"); }
  if (act === "toCatGrid") { sfx.tick(); return goto("grid"); }
  if (act === "goQ") {
    S.qi = +t.dataset.idx; resetQ(); freshOrder(currentCat().questions[S.qi]);
    sfx.tick(); return goto("quiz");
  }
  if (act === "pick") return pick(+t.dataset.pos);
  if (act === "submitQuiz") return submitQuiz();
  if (act === "showAns") { S.showAnswer = true; return render(); }
  if (act === "retry") { resetQ(); sfx.tick(); return render(); }
  if (act === "nextQuiz") return nextQuiz();

  // ---- shuffle
  if (act === "startShuffle") return startShuffle();
  if (act === "submitShuffle") return submitShuffle();
  if (act === "nextShuffle") return nextShuffle();

  // ---- battle
  if (act === "startBattle") return startBattle();
  if (act === "submitBattle") return submitBattle();
  if (act === "battleNext") return battleNextQuestion();
  if (act === "battleRestart") return startBattle();

  // ---- star toggle (any screen)
  if (act === "star") {
    const id = t.dataset.id;
    progress.starred[id] = !progress.starred[id];
    if (!progress.starred[id]) delete progress.starred[id];
    saveProgress();
    sfx.select();
    return render();
  }
});

function _flushColorCache() { for (const k in _ckCache) delete _ckCache[k]; }

boot();
