/* ===================================================================
   exam.js: optional practice exam for a set
   A set file may include:
     exam: { title, subtitle, minutes, sheet?, questions: [ q... ] }
       questions use the normal schema plus "chapter" (for the breakdown)
   The exam lives completely outside normal progress: it never touches
   results, stars, misses, streaks, or battle. Its own record is
   localStorage "fc:exam:<set id>" = { attempt, history }.
   Also adds an Equation Sheet pop-up when set.exam.sheet exists.
   Loaded after lessons.js.
   =================================================================== */

function examKey() { return "fc:exam:" + S.set.id; }
function examLoad() {
  try { const v = JSON.parse(localStorage.getItem(examKey()) || "null"); if (v) return v; } catch (e) {}
  return { attempt: null, history: [] };
}
function examSave() { try { localStorage.setItem(examKey(), JSON.stringify(S.exam)); } catch (e) {} }
function examQs() { return (S.set.exam && S.set.exam.questions) || []; }

function examNewAttempt() {
  const ord = {};
  examQs().forEach(q => {
    // range answers ("Less than / Between / More than") stay in order, like the real exam
    const ranged = q.options.some(o => /^(Less than|Between|More than)/.test(o));
    ord[q.id] = ranged ? q.options.map((_, i) => i) : shuffle(q.options.map((_, i) => i));
  });
  S.exam.attempt = { ord, sel: {}, flags: {}, idx: 0, elapsed: 0, done: false };
  examSave();
}

/* ---------- timer: counts up while the exam screen is open ---------- */
let _examTick = null, _examLast = 0;
function examTimerSync() {
  const on = S.screen === "exam" && S.exam && S.exam.attempt && !S.exam.attempt.done;
  if (on && !_examTick) {
    _examLast = Date.now();
    _examTick = setInterval(() => {
      if (S.screen !== "exam" || !S.exam.attempt || S.exam.attempt.done) return examTimerSync();
      const now = Date.now();
      S.exam.attempt.elapsed += (now - _examLast) / 1000; _examLast = now;
      const el = document.getElementById("examClock");
      if (el) el.textContent = examClock(S.exam.attempt.elapsed);
      if (Math.floor(S.exam.attempt.elapsed) % 10 === 0) examSave();
    }, 1000);
  } else if (!on && _examTick) {
    clearInterval(_examTick); _examTick = null;
    if (S.exam && S.exam.attempt) examSave();
  }
}
function examClock(s) {
  s = Math.floor(s || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0");
}

/* ---------- grading ---------- */
function examIsRight(q, sel) {
  sel = sel || [];
  if (q.type === "mc") return sel.length === 1 && sel[0] === q.answer;
  return sel.slice().sort().join(",") === (q.answers || []).slice().sort().join(",");
}
function examScore(att) {
  const qs = examQs();
  const by = {};
  let right = 0;
  qs.forEach(q => {
    const ok = examIsRight(q, att.sel[q.id]);
    if (ok) right++;
    const ch = q.chapter || "Other";
    by[ch] = by[ch] || { right: 0, total: 0 };
    by[ch].total++; if (ok) by[ch].right++;
  });
  return { right, total: qs.length, pct: Math.round((right / qs.length) * 100), by };
}

/* ---------- set home card ---------- */
function examCard() {
  if (!S.set.exam) return "";
  S.exam = S.exam && S.exam._set === S.set.id ? S.exam : Object.assign(examLoad(), { _set: S.set.id });
  const ex = S.set.exam, n = examQs().length;
  const h = S.exam.history || [];
  const best = h.length ? Math.max(...h.map(x => x.pct)) : null;
  const att = S.exam.attempt;
  const answered = att && !att.done ? Object.keys(att.sel).length : 0;
  const sub = att && !att.done ? `In progress · ${answered}/${n} answered · ${examClock(att.elapsed)}`
    : best !== null ? `Best ${best}% · last ${h[h.length - 1].pct}% · ${h.length} attempt${h.length > 1 ? "s" : ""}`
    : `${n} questions · scores itself at the end`;
  return `<div class="eyebrow" style="margin:26px 0 10px">When you're almost ready</div>
    <button class="card ex-card" data-act="examOpen" style="padding-left:26px">
      <div class="accentbar" style="background:var(--star)"></div>
      <div class="row">
        <div style="flex:1">
          <div class="eyebrow" style="color:var(--star)">Practice exam</div>
          <div style="font-size:16px;font-weight:bold;margin-top:3px">${esc(ex.title || "Practice Exam")}</div>
          <div class="muted" style="font-size:12px;margin-top:6px">${esc(sub)}</div>
        </div>
        <div class="ex-badge">${best !== null ? best + "%" : "📝"}</div>
      </div>
    </button>
    ${ex.sheet ? `<button class="chip ex-sheetbtn" data-act="examSheet">📄 Equation sheet</button>` : ""}`;
}

/* ---------- screens ---------- */
function viewExamIntro() {
  const ex = S.set.exam, n = examQs().length, att = S.exam.attempt;
  const resumable = att && !att.done;
  const h = (S.exam.history || []).slice(-5).reverse();
  const hist = h.length ? `<div class="eyebrow" style="margin:22px 0 10px">Recent attempts</div>
    ${h.map(x => `<div class="ex-hist"><span>${new Date(x.at).toLocaleDateString()}</span><span>${examClock(x.secs)}</span><b style="color:${x.pct >= 80 ? "var(--ok)" : x.pct >= 60 ? "var(--star)" : "var(--bad)"}">${x.pct}%</b></div>`).join("")}` : "";
  return `<div class="wrap ex-in">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 20px">
      <button class="backbtn" data-act="backToSet">${I.chevL}</button>
      <div><div class="eyebrow" style="color:var(--star)">${esc(S.set.class)} · Practice exam</div>
      <div style="font-size:22px;font-weight:bold;line-height:1.25">${esc(ex.title || "Practice Exam")}</div></div>
    </div>
    <div class="card" style="cursor:default;margin-bottom:16px">
      <div class="ls-body">
        <p class="ls-p">${esc(ex.subtitle || "")}</p>
        <ul class="ls-list">
          <li><b>${n} multiple choice</b>, set up like the real one. No feedback until you submit.</li>
          <li>Treat it like the real thing: closed notes, just the equation sheet and a calculator.</li>
          <li>The clock counts up so you can see your pace${ex.minutes ? ` (aim for under ${ex.minutes} min)` : ""}. Leaving saves your spot.</li>
          <li>Flag anything you want to come back to. These questions don't touch your deck progress.</li>
        </ul>
      </div>
    </div>
    ${ex.sheet ? `<button class="ghost" data-act="examSheet" style="width:100%;margin-bottom:10px">📄 Open the equation sheet</button>` : ""}
    ${resumable ? `<button class="primary" data-act="examResume" style="background:var(--star);color:#1a1a1a;margin-bottom:10px">Resume (${Object.keys(att.sel).length}/${n} answered) →</button>
      <button class="ghost" data-act="examStart" style="width:100%">Start over</button>`
      : `<button class="primary" data-act="examStart" style="background:var(--star);color:#1a1a1a">${h.length ? "Take it again" : "Start the exam"} →</button>`}
    ${att && att.done ? `<button class="ghost" data-act="examReview" style="width:100%;margin-top:10px">Review last attempt</button>` : ""}
    ${hist}
  </div>`;
}

function viewExam() {
  const att = S.exam.attempt, qs = examQs();
  const i = Math.min(att.idx, qs.length - 1), q = qs[i];
  const sel = att.sel[q.id] || [];
  const order = att.ord[q.id];
  const answered = Object.keys(att.sel).length;
  const flagged = !!att.flags[q.id];
  const opts = order.map(orig => {
    const on = sel.includes(orig);
    return `<button class="opt ex-opt ${on ? "on" : ""}" data-act="examPick" data-o="${orig}">
      <span class="box ${q.type}" style="border-color:${on ? "var(--star)" : "var(--border2)"};background:${on ? "var(--star)" : "transparent"}">${on ? '<span class="dot"></span>' : ""}</span>
      <span>${esc(q.options[orig])}</span>
    </button>`;
  }).join("");
  const dots = qs.map((x, k) => {
    const a = att.sel[x.id] && att.sel[x.id].length, f = att.flags[x.id];
    return `<button class="ex-dot ${k === i ? "cur" : ""} ${a ? "ans" : ""} ${f ? "flag" : ""}" data-act="examGo" data-i="${k}" data-nonav aria-label="Question ${k + 1}">${k + 1}</button>`;
  }).join("");
  const last = i === qs.length - 1;
  return `<div class="wrap ex-in" id="examWrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin:22px 0 14px">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="backbtn" data-act="examLeave">${I.chevL}</button>
        <span class="eyebrow" style="color:var(--star)">Practice exam</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <button class="star" data-act="examFlag" title="Flag for review" style="color:${flagged ? "var(--flag)" : "var(--muted)"}">${I.flag(flagged, 19)}</button>
        <span class="ex-clock" id="examClock">${examClock(att.elapsed)}</span>
      </div>
    </div>
    <div class="progressbar" style="margin-bottom:12px"><div style="width:${(answered / qs.length) * 100}%;background:var(--star)"></div></div>
    <div class="ex-dots">${dots}</div>
    <div class="card ex-q" style="cursor:default;margin-bottom:16px">
      <div class="eyebrow" style="color:var(--star);margin-bottom:10px">Question ${i + 1} of ${qs.length} · ${q.type === "mc" ? "Multiple choice" : "Select all that apply"}</div>
      <div style="font-size:18px;line-height:1.55">${esc(q.question)}</div>
    </div>
    <div style="display:grid;gap:10px;margin-bottom:18px">${opts}</div>
    <div style="display:flex;gap:10px">
      <button class="ghost" data-act="examPrev" ${i === 0 ? "disabled" : ""} style="${i === 0 ? "opacity:.4" : ""}">← Back</button>
      ${last ? `<button class="primary" data-act="examAskSubmit" style="background:var(--star);color:#1a1a1a;flex:1">Submit exam</button>`
             : `<button class="primary" data-act="examNext" style="background:var(--star);color:#1a1a1a;flex:1">Next →</button>`}
    </div>
    ${!last ? `<div style="text-align:center;margin-top:18px"><button class="linkbtn" data-act="examAskSubmit">Submit early</button></div>` : ""}
  </div>`;
}

function viewExamResult() {
  const att = S.exam.attempt, qs = examQs();
  const sc = examScore(att);
  const col = sc.pct >= 80 ? "var(--ok)" : sc.pct >= 60 ? "var(--star)" : "var(--bad)";
  const msg = sc.pct >= 90 ? "You're in great shape." : sc.pct >= 80 ? "Solid. Clean up the misses below and you're there."
    : sc.pct >= 60 ? "Getting there. The chapter bars show where to spend your time." : "Good baseline. Hit the lessons for the weak chapters, then try again.";
  const bars = Object.entries(sc.by).map(([ch, v]) => {
    const p = Math.round((v.right / v.total) * 100);
    return `<div class="ex-bar"><div class="ex-bar-top"><span>${esc(ch)}</span><span>${v.right}/${v.total}</span></div>
      <div class="segbar"><span style="width:${p}%;background:${p >= 80 ? "var(--ok)" : p >= 60 ? "var(--star)" : "var(--bad)"}"></span></div></div>`;
  }).join("");
  const rows = qs.map((q, k) => {
    const mine = att.sel[q.id] || [];
    const ok = examIsRight(q, mine);
    const right = q.type === "mc" ? [q.answer] : q.answers;
    const show = att.ord[q.id].map(o => {
      const isR = right.includes(o), isM = mine.includes(o);
      const cls = isR ? "r" : isM ? "w" : "";
      return `<li class="${cls}">${isR ? "✓ " : isM ? "✗ " : ""}${esc(q.options[o])}${isM ? ' <span class="muted">(yours)</span>' : ""}</li>`;
    }).join("");
    return `<details class="ex-rv ${ok ? "ok" : "bad"}" ${!ok && S.examOpenMiss ? "open" : ""}>
      <summary><span class="ex-n">${k + 1}</span><span class="ex-rq">${esc(q.question)}</span><span class="ex-mark">${ok ? "✓" : mine.length ? "✗" : "–"}</span></summary>
      <ul class="ex-opts">${show}</ul>
      <div class="ex-exp">${esc(q.explanation || "")}</div>
    </details>`;
  }).join("");
  return `<div class="wrap ex-in">
    <div style="display:flex;align-items:center;gap:12px;margin:22px 0 20px">
      <button class="backbtn" data-act="backToSet">${I.chevL}</button>
      <div><div class="eyebrow" style="color:var(--star)">Practice exam · results</div>
      <div style="font-size:22px;font-weight:bold;line-height:1.25">${esc(S.set.exam.title || "Practice Exam")}</div></div>
    </div>
    <div class="card ex-score" style="cursor:default;margin-bottom:16px;border-color:${col}">
      <div class="ex-ring" style="--p:${sc.pct};--c:${col}"><span>${sc.pct}%</span></div>
      <div style="flex:1">
        <div style="font-size:18px;font-weight:bold">${sc.right} of ${sc.total} correct</div>
        <div class="muted" style="font-size:13px;margin-top:4px">Time ${examClock(att.elapsed)}</div>
        <div class="dim" style="font-size:14px;margin-top:8px;line-height:1.5">${msg}</div>
      </div>
    </div>
    <div class="eyebrow" style="margin:18px 0 10px">By chapter</div>
    <div class="card" style="cursor:default;margin-bottom:16px">${bars}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 10px">
      <div class="eyebrow">Every question</div>
      <button class="linkbtn" data-act="examOpenMisses" style="margin:0">${S.examOpenMiss ? "Collapse all" : "Open my misses"}</button>
    </div>
    ${rows}
    <button class="primary" data-act="examStart" style="background:var(--star);color:#1a1a1a;margin-top:18px">Retake with a fresh attempt</button>
    <button class="ghost" data-act="backToSet" style="width:100%;margin-top:10px">Back to the deck</button>
  </div>`;
}

/* ---------- equation sheet modal ---------- */
function examSheetHtml() {
  const sh = S.set.exam.sheet;
  return `<div class="rd-head">
      <div><div class="eyebrow" style="color:var(--accent)">Allowed on the exam</div>
      <div style="font-size:20px;font-weight:bold;margin-top:4px">Equation sheet</div></div>
      <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    </div>
    ${sh.map(g => `<div class="ex-sh"><div class="eyebrow" style="margin:0 0 8px">${esc(g.group)}</div>
      ${g.rows.map(r => `<div class="ex-sh-row"><span>${esc(r[0])}</span><code>${esc(r[1])}</code></div>`).join("")}</div>`).join("")}`;
}

/* ---------- events ---------- */
function examGoto(scr) { goto(scr); examTimerSync(); }
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act;
  if (!act.startsWith("exam")) return;
  if (act === "examSheet") { sfx.tick(); showModal(examSheetHtml()); const m = document.querySelector("#overlay .modal"); if (m) m.classList.add("wide"); return; }
  if (act === "examOpen") { sfx.tick(); return examGoto("examIntro"); }
  if (act === "examStart") { closeModal(); examNewAttempt(); S.examOpenMiss = false; sfx.modeStart(); return examGoto("exam"); }
  if (act === "examResume") { sfx.tick(); return examGoto("exam"); }
  if (act === "examReview") { sfx.tick(); return examGoto("examResult"); }
  if (act === "examLeave") { examSave(); sfx.tick(); return examGoto("examIntro"); }
  const att = S.exam && S.exam.attempt;
  if (!att) return;
  const qs = examQs();
  if (act === "examPick") {
    const q = qs[att.idx], o = +t.dataset.o;
    let sel = (att.sel[q.id] || []).slice();
    if (q.type === "mc") sel = sel[0] === o ? [] : [o];
    else sel = sel.includes(o) ? sel.filter(x => x !== o) : sel.concat(o);
    if (sel.length) att.sel[q.id] = sel; else delete att.sel[q.id];
    examSave(); sfx.select(); return render();
  }
  if (act === "examFlag") { const id = qs[att.idx].id; if (att.flags[id]) delete att.flags[id]; else att.flags[id] = 1; examSave(); sfx.select(); return render(); }
  if (act === "examGo") { att.idx = +t.dataset.i; sfx.nav(); render(); return window.scrollTo(0, 0); }
  if (act === "examPrev") { if (att.idx > 0) att.idx--; sfx.tick(); render(); return window.scrollTo(0, 0); }
  if (act === "examNext") { if (att.idx < qs.length - 1) att.idx++; sfx.tick(); render(); return window.scrollTo(0, 0); }
  if (act === "examAskSubmit") {
    const left = qs.filter(q => !(att.sel[q.id] && att.sel[q.id].length)).length;
    const fl = Object.keys(att.flags).length;
    sfx.tick();
    return showModal(`<div style="font-size:20px;font-weight:bold;margin-bottom:8px">Submit the exam?</div>
      <div class="dim" style="font-size:14px;line-height:1.6;margin-bottom:18px">${left ? `<b style="color:var(--bad)">${left} unanswered</b> (they'll count as wrong). ` : "Every question is answered. "}${fl ? `${fl} flagged for review.` : ""}</div>
      <div style="display:flex;gap:10px"><button class="ghost" data-act="closeModal" style="flex:1">Keep going</button>
      <button class="primary" data-act="examSubmit" style="background:var(--star);color:#1a1a1a;flex:1">Submit</button></div>`);
  }
  if (act === "examSubmit") {
    closeModal();
    att.done = true;
    const sc = examScore(att);
    S.exam.history = (S.exam.history || []).concat({ pct: sc.pct, right: sc.right, total: sc.total, secs: Math.round(att.elapsed), at: Date.now() });
    examSave();
    examGoto("examResult");
    if (sc.pct >= 90) { sfx.deck(); confettiBurst(true); }
    else if (sc.pct >= 70) { sfx.chapter(); flashGlow("var(--ok)", 900); }
    else sfx.submit();
    return;
  }
  if (act === "examOpenMisses") { S.examOpenMiss = !S.examOpenMiss; sfx.tick(); return render(); }
});

/* ---------- hooks ---------- */
const _examBaseSetHome = viewSetHome;
viewSetHome = function () {
  const html = _examBaseSetHome();
  if (!S.set.exam) return html;
  const anchor = '<div style="text-align:center;margin-top:34px">';
  const i = html.lastIndexOf(anchor);
  return i < 0 ? html + examCard() : html.slice(0, i) + examCard() + html.slice(i);
};
const _examBaseRender = render;
render = function () {
  const scr = S.screen;
  if (scr !== "examIntro" && scr !== "exam" && scr !== "examResult") { _examBaseRender(); return examTimerSync(); }
  if (!S.exam || S.exam._set !== S.set.id) S.exam = Object.assign(examLoad(), { _set: S.set.id });
  if ((scr === "exam" && (!S.exam.attempt || S.exam.attempt.done)) || (scr === "examResult" && !(S.exam.attempt && S.exam.attempt.done))) S.screen = "examIntro";
  const v = S.screen === "exam" ? viewExam() : S.screen === "examResult" ? viewExamResult() : viewExamIntro();
  document.getElementById("app").innerHTML = topbar() + v + (S.menuOpen ? themeMenu() : "");
  if (document.body.classList.contains("kbd")) paintNav();
  examTimerSync();
};
window.addEventListener("pagehide", () => { if (S.exam && S.exam.attempt) examSave(); });

(function () {
  const st = document.createElement("style");
  st.id = "exam-css";
  st.textContent = `
.ex-in { animation: exIn .32s cubic-bezier(.22,.8,.3,1) both; }
@keyframes exIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .ex-in { animation: none; } }
.ex-badge { font-size: 22px; font-weight: bold; color: var(--star); }
.ex-sheetbtn { margin-top: 10px; width: 100%; justify-content: center; }
.ex-hist { display: flex; justify-content: space-between; gap: 10px; padding: 10px 14px; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 6px; background: var(--surface); font-size: 14px; }
.ex-hist span { color: var(--dim); }
.ex-clock { font-variant-numeric: tabular-nums; font-size: 14px; color: var(--dim); background: var(--surface2); border: 1px solid var(--border); border-radius: 999px; padding: 4px 12px; }
.ex-dots { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 16px; }
.ex-dot { width: 30px; height: 30px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted); font-size: 11.5px; cursor: pointer; padding: 0; font-family: inherit; position: relative; transition: transform .15s, border-color .15s, background-color .15s; }
.ex-dot.ans { background: var(--surface2); color: var(--text); border-color: var(--border2); }
.ex-dot.cur { border-color: var(--star); color: var(--star); transform: translateY(-2px); }
.ex-dot.flag::after { content: ""; position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--flag); }
.ex-q { animation: exIn .25s cubic-bezier(.22,.8,.3,1) both; }
.ex-opt.on { border-color: var(--star) !important; }
.ex-score { display: flex; gap: 18px; align-items: center; }
.ex-ring { --p: 0; width: 92px; height: 92px; flex: 0 0 92px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--c) calc(var(--p) * 1%), var(--surface2) 0); animation: exRing 1s cubic-bezier(.22,.8,.3,1) both; }
.ex-ring span { width: 72px; height: 72px; border-radius: 50%; background: var(--surface); display: grid; place-items: center; font-size: 20px; font-weight: bold; }
@keyframes exRing { from { transform: scale(.85) rotate(-40deg); opacity: 0; } to { transform: none; opacity: 1; } }
.ex-bar { margin-bottom: 12px; } .ex-bar:last-child { margin-bottom: 0; }
.ex-bar-top { display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 6px; }
.ex-rv { border: 1px solid var(--border); border-left: 4px solid var(--ok); border-radius: 10px; background: var(--surface); margin-bottom: 8px; padding: 0 14px; }
.ex-rv.bad { border-left-color: var(--bad); }
.ex-rv summary { list-style: none; cursor: pointer; display: flex; gap: 10px; align-items: flex-start; padding: 12px 0; font-size: 14px; line-height: 1.45; }
.ex-rv summary::-webkit-details-marker { display: none; }
.ex-n { color: var(--muted); font-size: 12px; min-width: 20px; padding-top: 1px; }
.ex-rq { flex: 1; }
.ex-mark { font-weight: bold; color: var(--ok); } .ex-rv.bad .ex-mark { color: var(--bad); }
.ex-opts { list-style: none; padding: 0; margin: 0 0 10px; font-size: 13.5px; line-height: 1.5; }
.ex-opts li { padding: 6px 10px; border-radius: 8px; margin-bottom: 4px; background: var(--surface2); }
.ex-opts li.r { background: var(--okBg); color: var(--ok); } .ex-opts li.w { background: var(--badBg); color: var(--bad); }
.ex-exp { font-size: 13.5px; line-height: 1.6; color: var(--dim); padding: 0 0 14px; }
.ex-sh { margin-bottom: 16px; }
.ex-sh-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 7px 10px; border-bottom: 1px solid var(--border); font-size: 13.5px; }
.ex-sh-row span { color: var(--dim); } .ex-sh-row code { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 2px 8px; font-size: 13px; text-align: right; }
`;
  document.head.appendChild(st);
})();
