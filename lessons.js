/* ===================================================================
   lessons.js — teaching pages + readiness checklist
   Optional per-set data. A set file may include:
     categories[i].lessons: [{ id, title, at, blocks, videos, search }]
       at     = question index the lesson sits in front of (0 = first)
       blocks = [{p}|{h}|{list:[]}|{steps:[]}|{tip}|{key}|{table:{head,rows}}|{example:{q,a}}]
       videos = [{ title, channel, url }]
     readiness: [{ group, items: [{ id, text, lesson? }] }]
   Lessons live outside Quiz/Shuffle/Battle, so they never touch streaks,
   misses or battle XP. They DO count toward the chapter's percent.
   Progress keys: progress.lessons[id] = "learned" | "working"
                  progress.readiness[id] = "red" | "yellow" | "green"
   Loaded after app.js (see the hooks at the bottom of this file).
   =================================================================== */

/* ---------- helpers ---------- */
function catLessons(c) { return (c && c.lessons) || []; }

/* Ordered chapter walk: lessons slotted in front of their question index. */
function catItems(c) {
  const out = [];
  const ls = catLessons(c);
  const n = c.questions.length;
  for (let i = 0; i <= n; i++) {
    ls.filter(l => Math.min(l.at || 0, n) === i).forEach(l => out.push({ kind: "lesson", l }));
    if (i < n) out.push({ kind: "q", q: c.questions[i], idx: i });
  }
  return out;
}
function lessonState(id) { return (progress.lessons || {})[id] || null; }
function findLesson(id) {
  if (!S.set) return null;
  for (const c of S.set.categories) {
    const l = catLessons(c).find(x => x.id === id);
    if (l) return { c, l };
  }
  return null;
}

/* Chapter tallies including lessons (used by set home). */
function catTally(c) {
  const qs = c.questions;
  const ls = catLessons(c);
  const qc = qs.filter(q => progress.results[q.id] === "correct").length;
  const qi = qs.filter(q => progress.results[q.id] === "incorrect").length;
  const lc = ls.filter(l => lessonState(l.id) === "learned").length;
  const lw = ls.filter(l => lessonState(l.id) === "working").length;
  const total = qs.length + ls.length;
  return { qc, qi, lc, lw, total, done: qc + lc, bad: qi + lw, nL: ls.length, nQ: qs.length };
}

/* ---------- walking the chapter ---------- */
/* Opens item k of the chapter walk. When auto-advancing, lessons already
   marked learned are skipped so the flow only stops where it matters. */
function goItem(k, skipLearned) {
  const c = currentCat();
  const items = catItems(c);
  while (skipLearned && items[k] && items[k].kind === "lesson" && lessonState(items[k].l.id) === "learned") k++;
  const it = items[k];
  if (!it) return goto("grid");
  if (it.kind === "lesson") { S.lessonId = it.l.id; return goto("lesson"); }
  S.qi = it.idx; resetQ(); freshOrder(it.q);
  return goto("quiz");
}
function itemIndexOfQuestion(c, qi) { return catItems(c).findIndex(it => it.kind === "q" && it.idx === qi); }
function itemIndexOfLesson(c, id)   { return catItems(c).findIndex(it => it.kind === "lesson" && it.l.id === id); }
function firstUnfinishedItem(c) {
  const items = catItems(c);
  const k = items.findIndex(it => it.kind === "lesson"
    ? lessonState(it.l.id) !== "learned"
    : progress.results[it.q.id] !== "correct");
  return k < 0 ? 0 : k;
}

/* ---------- inline formatting ---------- */
function fmt(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}
function renderBlocks(blocks) {
  return (blocks || []).map(b => {
    if (b.h) return `<h3 class="ls-h">${fmt(b.h)}</h3>`;
    if (b.p) return `<p class="ls-p">${fmt(b.p)}</p>`;
    if (b.list) return `<ul class="ls-list">${b.list.map(x => `<li>${fmt(x)}</li>`).join("")}</ul>`;
    if (b.steps) return `<ol class="ls-list">${b.steps.map(x => `<li>${fmt(x)}</li>`).join("")}</ol>`;
    if (b.tip) return `<div class="ls-call tip"><span class="ls-tag">Heads up</span>${fmt(b.tip)}</div>`;
    if (b.key) return `<div class="ls-call key"><span class="ls-tag">Exam takeaway</span>${fmt(b.key)}</div>`;
    if (b.table) return `<div class="ls-tablewrap"><table class="ls-table">
        <thead><tr>${b.table.head.map(h => `<th>${fmt(h)}</th>`).join("")}</tr></thead>
        <tbody>${b.table.rows.map(r => `<tr>${r.map(x => `<td>${fmt(x)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
    if (b.example) return `<details class="ls-ex"><summary><span class="ls-tag">Try it</span>${fmt(b.example.q)}</summary>
        <div class="ls-ans">${fmt(b.example.a)}</div></details>`;
    return "";
  }).join("");
}

/* ---------- lesson screen ---------- */
function viewLesson() {
  const hit = findLesson(S.lessonId);
  if (!hit) { S.screen = "grid"; return viewQuizGrid(); }
  const { c, l } = hit;
  const col = ck(c.color);
  const st = lessonState(l.id);
  const items = catItems(c);
  const k = itemIndexOfLesson(c, l.id);
  const lessonNo = catLessons(c).indexOf(l) + 1;

  const vids = (l.videos || []).map(v => `<a class="ls-vid" href="${esc(v.url)}" target="_blank" rel="noopener">
      <span class="ls-play">▶</span>
      <span><span class="ls-vt">${esc(v.title)}</span>${v.channel ? `<span class="ls-vc">${esc(v.channel)}</span>` : ""}</span>
    </a>`).join("");
  const search = l.search ? `<a class="ls-more" href="https://www.youtube.com/results?search_query=${encodeURIComponent(l.search)}" target="_blank" rel="noopener">More videos on YouTube ›</a>` : "";

  const next = items[k + 1];
  const nextLabel = !next ? "Back to grid" : next.kind === "q" ? "Continue to questions →" : "Next lesson →";

  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 20px">
      <button class="backbtn" data-act="toCatGrid">${I.chevL}</button>
      <div><div class="eyebrow" style="color:${col}">${esc(c.category)} · Lesson ${lessonNo}</div>
      <div style="font-size:22px;font-weight:bold;line-height:1.25">${esc(l.title)}</div></div>
    </div>
    <div class="card ls-body" style="cursor:default;margin-bottom:16px;border-left:4px solid ${col}">
      ${renderBlocks(l.blocks)}
    </div>
    ${vids || search ? `<div class="eyebrow" style="margin:0 0 10px">Watch</div><div class="ls-vids">${vids}${search}</div>` : ""}
    <div class="eyebrow" style="margin:22px 0 10px">How's this one sitting?</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <button class="chip ls-mark ${st === "working" ? "active" : ""}" data-act="markLesson" data-v="working" style="color:var(--bad);${st === "working" ? "border-color:var(--bad);background:var(--badBg)" : ""}">● Still working on it</button>
      <button class="chip ls-mark ${st === "learned" ? "active" : ""}" data-act="markLesson" data-v="learned" style="color:var(--ok);${st === "learned" ? "border-color:var(--ok);background:var(--okBg)" : ""}">✓ Got it</button>
    </div>
    <button class="primary" data-act="lessonNext" style="background:${col}">${nextLabel}</button>
  </div>`;
}

/* ---------- readiness checklist ---------- */
const LIGHTS = [
  { v: "red",    label: "Can't do it yet", col: "var(--bad)" },
  { v: "yellow", label: "Shaky",           col: "var(--star)" },
  { v: "green",  label: "Exam ready",      col: "var(--ok)" },
];
function readinessItems(set) { return (set.readiness || []).flatMap(g => g.items); }
function readinessPct() {
  const items = readinessItems(S.set);
  if (!items.length) return 0;
  const r = progress.readiness || {};
  const pts = items.reduce((a, it) => a + (r[it.id] === "green" ? 1 : r[it.id] === "yellow" ? 0.5 : 0), 0);
  return Math.round((pts / items.length) * 100);
}
function readinessCounts() {
  const r = progress.readiness || {};
  const c = { red: 0, yellow: 0, green: 0, none: 0 };
  readinessItems(S.set).forEach(it => { c[r[it.id] || "none"]++; });
  return c;
}
function readinessButton() {
  if (!(S.set.readiness || []).length) return "";
  const pct = readinessPct();
  const n = readinessCounts();
  const total = readinessItems(S.set).length;
  const w = x => (x / total) * 100;
  return `<button class="card" data-act="openReadiness" style="margin-bottom:18px;padding-left:26px;border-color:${pct === 100 ? "var(--ok)" : "var(--border)"}">
    <div class="accentbar" style="background:var(--accent)"></div>
    <div class="row">
      <div style="flex:1">
        <div class="eyebrow" style="color:var(--accent)">Readiness checklist</div>
        <div style="font-size:16px;font-weight:bold;margin-top:3px">Am I ready for this exam?</div>
        <div class="segbar"><span style="width:${w(n.green)}%;background:var(--ok)"></span><span style="width:${w(n.yellow)}%;background:var(--star)"></span><span style="width:${w(n.red)}%;background:var(--bad)"></span></div>
        <div class="muted" style="font-size:12px;margin-top:6px">${n.green} ready · ${n.yellow} shaky · ${n.red} not yet · ${n.none} unrated</div>
      </div>
      <div style="font-size:24px;font-weight:bold;color:var(--accent)">${pct}%</div>
    </div>
  </button>`;
}
function readinessHtml() {
  const r = progress.readiness || {};
  const pct = readinessPct();
  const groups = (S.set.readiness || []).map(g => {
    const rows = g.items.map(it => {
      const cur = r[it.id];
      const dots = LIGHTS.map(L => `<button class="rd-dot ${cur === L.v ? "on" : ""}" data-act="setLight" data-id="${esc(it.id)}" data-v="${L.v}" title="${L.label}" aria-label="${L.label}" style="--dc:${L.col}"></button>`).join("");
      const learn = it.lesson && findLesson(it.lesson) ? `<button class="rd-learn" data-act="readinessLearn" data-id="${esc(it.lesson)}">Lesson ›</button>` : "";
      return `<div class="rd-row" style="border-left-color:${cur ? LIGHTS.find(L => L.v === cur).col : "var(--border)"}">
        <div class="rd-text">${fmt(it.text)}${learn}</div>
        <div class="rd-dots">${dots}</div>
      </div>`;
    }).join("");
    return `<div class="rd-group"><div class="eyebrow" style="margin:0 0 8px">${esc(g.group)}</div>${rows}</div>`;
  }).join("");
  return `<div class="rd-head">
      <div><div class="eyebrow" style="color:var(--accent)">Readiness checklist</div>
      <div style="font-size:30px;font-weight:bold;margin-top:2px">${pct}%</div></div>
      <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    </div>
    <div class="rd-legend">${LIGHTS.map(L => `<span><i style="background:${L.col}"></i>${L.label}</span>`).join("")}</div>
    <div class="muted" style="font-size:12px;line-height:1.5;margin:0 0 16px">Be honest. Green means you could do it cold on the exam. Tap a light again to clear it.</div>
    ${groups}`;
}
function openReadiness() {
  showModal(readinessHtml());
  const m = document.querySelector("#overlay .modal");
  if (m) m.classList.add("wide");
}
/* Refresh the modal body in place so the pop animation and scroll stay put. */
function refreshReadiness() {
  const m = document.querySelector("#overlay .modal");
  if (!m) return;
  const top = m.scrollTop;
  m.innerHTML = readinessHtml();
  m.scrollTop = top;
  render();                       // keep the button's percent behind the modal current
}

/* ---------- events (separate listener; app.js ignores these acts) ---------- */
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act;

  if (act === "openLesson") { S.lessonId = t.dataset.id; sfx.tick(); return goto("lesson"); }
  if (act === "markLesson") {
    progress.lessons = progress.lessons || {};
    const v = t.dataset.v;
    if (progress.lessons[S.lessonId] === v) delete progress.lessons[S.lessonId];
    else progress.lessons[S.lessonId] = v;
    saveProgress();
    if (progress.lessons[S.lessonId] === "learned") { sfx.correct(); flashGlow("var(--ok)", 700); }
    else sfx.select();
    return render();
  }
  if (act === "lessonNext") {
    const c = currentCat();
    sfx.tick();
    return goItem(itemIndexOfLesson(c, S.lessonId) + 1, true);
  }
  if (act === "startCat") { sfx.tick(); return goItem(firstUnfinishedItem(currentCat()), false); }
  if (act === "openReadiness") { sfx.tick(); return openReadiness(); }
  if (act === "setLight") {
    progress.readiness = progress.readiness || {};
    const id = t.dataset.id, v = t.dataset.v;
    if (progress.readiness[id] === v) delete progress.readiness[id];
    else progress.readiness[id] = v;
    saveProgress();
    sfx.select();
    return refreshReadiness();
  }
  if (act === "readinessLearn") {
    const hit = findLesson(t.dataset.id);
    if (!hit) return;
    closeModal();
    S.cat = hit.c.category;
    S.lessonId = hit.l.id;
    sfx.tick();
    return goto("lesson");
  }
});

/* ===================================================================
   Hooks into the core app. lessons.js loads AFTER app.js, so the
   function declarations below replace app.js's versions, and the
   wrappers extend render() and loadProgress() without editing them.
   =================================================================== */

/* styles for lessons + checklist, injected so styles.css stays untouched */
(function () {
  const st = document.createElement("style");
  st.id = "lessons-css";
  st.textContent = `
.lcell { border-style: dashed; flex-direction: column; gap: 2px; }
.lcell .lc-ic { font-size: 18px; line-height: 1; }
.lcell .lc-n { font-size: 11px; letter-spacing: 1px; }
.ls-body { line-height: 1.65; font-size: 15.5px; }
.ls-body > :first-child { margin-top: 0; }
.ls-body > :last-child { margin-bottom: 0; }
.ls-h { font-size: 17px; margin: 20px 0 8px; }
.ls-p { margin: 0 0 12px; color: var(--text); }
.ls-list { margin: 0 0 12px; padding-left: 22px; }
.ls-list li { margin-bottom: 6px; }
.ls-body code { background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 1px 5px; font-size: .92em; }
.ls-call { border-radius: 10px; padding: 12px 14px; margin: 0 0 12px; font-size: 14.5px; line-height: 1.6; }
.ls-call.tip { background: var(--accBg); border: 1px solid var(--accent); }
.ls-call.key { background: var(--okBg); border: 1px solid var(--ok); }
.ls-tag { display: block; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; font-weight: bold; }
.ls-tablewrap { overflow-x: auto; margin: 0 0 12px; }
.ls-table { border-collapse: collapse; width: 100%; font-size: 14px; }
.ls-table th, .ls-table td { border: 1px solid var(--border); padding: 7px 9px; text-align: left; vertical-align: top; }
.ls-table th { background: var(--surface2); font-size: 12px; letter-spacing: .5px; }
.ls-ex { border: 1.5px dashed var(--border2); border-radius: 10px; padding: 10px 14px; margin: 0 0 12px; }
.ls-ex summary { cursor: pointer; font-size: 14.5px; line-height: 1.55; list-style: none; }
.ls-ex summary::-webkit-details-marker { display: none; }
.ls-ex summary::after { content: "Tap to show answer"; display: block; font-size: 11px; color: var(--accent); margin-top: 6px; letter-spacing: 1px; text-transform: uppercase; }
.ls-ex[open] summary::after { content: "Answer"; color: var(--ok); }
.ls-ans { margin-top: 8px; font-size: 14.5px; line-height: 1.6; color: var(--dim); }
.ls-vids { display: grid; gap: 8px; }
.ls-vid { display: flex; gap: 12px; align-items: center; background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px; padding: 12px 14px; text-decoration: none; color: var(--text); }
.ls-play { flex: 0 0 34px; height: 34px; border-radius: 50%; background: var(--bad); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; }
.ls-vt { display: block; font-size: 14.5px; line-height: 1.4; }
.ls-vc { display: block; font-size: 12px; color: var(--muted); margin-top: 2px; }
.ls-more { font-size: 12px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 2px; }
.ls-mark.active { box-shadow: 0 0 0 1px currentColor inset; }
.modal.wide { max-width: 640px; max-height: 86vh; overflow-y: auto; text-align: left; padding: 22px 20px; }
.rd-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; position: sticky; top: -22px; background: var(--surface); padding-top: 4px; z-index: 1; }
.rd-x { background: var(--surface2); border: 1px solid var(--border); color: var(--dim); border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 15px; }
.rd-legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: var(--dim); margin-bottom: 8px; }
.rd-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
.rd-group { margin-bottom: 18px; }
.rd-row { display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 10px 10px 10px 12px; border: 1px solid var(--border); border-left: 4px solid var(--border); border-radius: 10px; margin-bottom: 6px; background: var(--surface2); }
.rd-text { font-size: 14px; line-height: 1.45; flex: 1; }
.rd-learn { background: none; border: none; color: var(--accent); cursor: pointer; font-family: inherit; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 4px 0 0; display: block; }
.rd-dots { display: flex; gap: 6px; flex: 0 0 auto; }
.rd-dot { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--dc); background: transparent; cursor: pointer; opacity: .45; padding: 0; }
.rd-dot.on { background: var(--dc); opacity: 1; box-shadow: 0 0 8px var(--dc); }
`;
  document.head.appendChild(st);
})();

/* progress gains two optional records */
const _baseLoadProgress = loadProgress;
loadProgress = function (setId) {
  const p = _baseLoadProgress(setId);
  p.lessons = p.lessons || {};          // teaching pages: id -> "learned" | "working"
  p.readiness = p.readiness || {};      // checklist: id -> "red" | "yellow" | "green"
  return p;
};

/* router gains the lesson screen */
const _baseRender = render;
render = function () {
  if (S.screen !== "lesson") return _baseRender();
  document.getElementById("app").innerHTML = topbar() + viewLesson() + (S.menuOpen ? themeMenu() : "");
  if (document.body.classList.contains("kbd")) paintNav();
};

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
    // lessons count toward the chapter percent (never toward streaks or battle)
    const t = catTally(c);
    const cc = t.done, ci = t.bad, n = t.total;
    const pct = Math.round((cc / n) * 100) || 0;
    const done = cc === n;
    const col = ck(c.color);
    const label = done ? "✓ Complete"
      : t.nL ? `${t.qc}/${t.nQ} correct · ${t.lc}/${t.nL} lessons`
      : cc + "/" + n + " correct";
    return `<button class="card" data-act="openCat" data-cat="${esc(c.category)}" style="border-color:${done ? "var(--ok)" : "var(--border)"};margin-bottom:10px">
      <div class="fill" style="width:${pct}%;background:${tint(c.color, 9)}"></div>
      <div class="row">
        <div style="flex:1">
          <div class="eyebrow" style="color:${col}">${label}</div>
          <div style="font-size:16px;font-weight:bold;margin-top:2px">${esc(c.category)}</div>
          <div class="segbar" style="margin-top:8px"><span style="width:${(cc / n) * 100}%;background:var(--ok)"></span><span style="width:${(ci / n) * 100}%;background:var(--bad)"></span></div>
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

    ${readinessButton()}

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
  const done = c.questions.every(q => progress.results[q.id] === "correct")
    && catLessons(c).every(l => lessonState(l.id) === "learned");
  let lessonNo = 0;
  const cells = catItems(c).map(it => {
    if (it.kind === "lesson") {
      lessonNo++;
      const st = lessonState(it.l.id);
      const cellCol = st === "learned" ? "var(--ok)" : st === "working" ? "var(--bad)" : col;
      const bg = st === "learned" ? "var(--okBg)" : st === "working" ? "var(--badBg)" : "var(--surface)";
      return `<button class="qcell lcell" data-act="openLesson" data-id="${esc(it.l.id)}" title="${esc(it.l.title)}" style="color:${cellCol};background:${bg};border-color:${cellCol}"><span class="lc-ic">📖</span><span class="lc-n">L${lessonNo}</span></button>`;
    }
    const q = it.q, idx = it.idx;
    const st = progress.results[q.id] || "unanswered";
    const cellCol = st === "correct" ? "var(--ok)" : st === "incorrect" ? "var(--bad)" : "var(--muted)";
    const bg = st === "correct" ? "var(--okBg)" : st === "incorrect" ? "var(--badBg)" : "var(--surface)";
    const bd = st === "correct" ? "var(--ok)" : st === "incorrect" ? "var(--bad)" : "var(--border)";
    return `<button class="qcell" data-act="goQ" data-idx="${idx}" style="color:${cellCol};background:${bg};border-color:${bd}">${idx + 1}${progress.starred[q.id] ? '<span class="st">★</span>' : ""}</button>`;
  }).join("");
  const hasLessons = catLessons(c).length > 0;
  return `<div class="wrap">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 24px">
      <button class="backbtn" data-act="backToSet">${I.chevL}</button>
      <div><div class="eyebrow" style="color:${col}">${esc(c.category)}</div>
      <div style="font-size:20px;font-weight:bold">${hasLessons ? "Lessons & Questions" : "Question Grid"}</div></div>
    </div>
    ${done ? `<div class="fb" style="background:var(--okBg);border:1px solid var(--ok);justify-content:center;margin-bottom:20px;color:var(--ok);font-weight:bold">All correct in this chapter</div>` : ""}
    ${hasLessons ? `<div class="muted" style="font-size:12px;margin:-8px 0 14px">📖 = lesson page. Green = got it, red = still working on it. Lessons count toward this chapter's percent but never your streak.</div>` : ""}
    <div class="grid-q" style="margin-bottom:26px">${cells}</div>
    <button class="primary" data-act="startCat" style="background:${col}">Start / Continue →</button>
  </div>`;
}
function firstUnfinished(c) {
  const i = c.questions.findIndex(q => progress.results[q.id] !== "correct");
  return i < 0 ? 0 : i;
}

function nextQuiz() {
  const c = currentCat();
  const k = itemIndexOfQuestion(c, S.qi);
  const next = catItems(c)[k + 1];
  sfx.tick();
  if (next && next.kind === "q") {               // plain question-to-question: keep the in-place feel
    S.qi = next.idx; resetQ(); freshOrder(next.q); return render();
  }
  return goItem(k + 1, true);                    // lesson next (skips learned ones) or end of chapter
}
