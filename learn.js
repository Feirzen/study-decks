/* ===================================================================
   learn.js: confidence checks + the shared "weakness" score
   A set's readiness items may list the questions that test them:
     readiness[g].items[i].qs = ["f1", "f2", ...]
   Whenever you finish the last question of an objective (every one of its
   questions answered since it was last rated), a Confidence Check pops up:
   the objective, the questions with how you did, and red / yellow / green.
   The rating fills in the readiness checklist for you and feeds weakness(),
   which decides what comes back for review in Battle, Shuffle and filters.
   Progress keys: progress.lastAt[qid] = time answered
                  progress.confAt[objId] = time last rated or skipped
                  progress.readiness[objId] = "red" | "yellow" | "green"
   Loaded after scrolls.js.
   =================================================================== */

let _objMap = null, _objMapSet = null;
function objItems() { return (S.set && S.set.readiness || []).flatMap(g => g.items.map(it => Object.assign({ group: g.group }, it))); }
function objectivesFor(qid) {
  if (_objMapSet !== S.set) {
    _objMap = {}; _objMapSet = S.set;
    objItems().forEach(it => (it.qs || []).forEach(id => (_objMap[id] = _objMap[id] || []).push(it)));
  }
  return _objMap[qid] || [];
}
/* worst rating among the objectives a question belongs to */
function confOf(qid) {
  const r = (progress && progress.readiness) || {};
  let worst = null;
  objectivesFor(qid).forEach(it => {
    const v = r[it.id];
    if (v === "red" || (v === "yellow" && worst !== "red") || (v === "green" && !worst)) worst = v;
    if (!v && !worst) worst = "none";
  });
  return worst;
}
/* How much a question needs another look. 0 = solid, higher = weaker. */
function weakness(q) {
  const id = q.id, res = progress.results[id];
  let w = 0;
  if (res === "incorrect") w += 4;
  w += Math.min(3, progress.missCount[id] || 0) * 1.2;
  const c = confOf(id);
  w += c === "red" ? 3 : c === "yellow" ? 1.5 : c === "green" ? 0 : c === "none" ? 0.5 : 0;
  if (progress.starred[id]) w += 1;
  if (res === "correct" && (progress.streaks[id] || 0) >= 2) w -= 1;
  return Math.max(0, w);
}
/* Shuffle and filtered Battle use the same idea (bag weights must be whole numbers) */
weightOf = function (q) { return Math.max(1, Math.round(1 + weakness(q))); };

/* ---------- tracking answers ---------- */
const _learnBaseRecord = recordAnswer;
recordAnswer = function (q, ok) {
  _learnBaseRecord(q, ok);
  progress.lastAt = progress.lastAt || {};
  progress.lastAt[q.id] = Date.now();
  progress.confAt = progress.confAt || {};
  objectivesFor(q.id).forEach(it => { if (objDue(it)) confEnqueue(it.id); });
  saveProgress();
};
function objDue(it) {
  if (!it.qs || !it.qs.length) return false;
  const at = progress.lastAt || {}, ca = (progress.confAt || {})[it.id] || 0;
  return it.qs.every(id => (at[id] || (progress.results[id] ? 1 : 0)) > ca);
}
function confEnqueue(id) { S.confQ = S.confQ || []; if (!S.confQ.includes(id)) S.confQ.push(id); }

/* ---------- the check itself ---------- */
function confHtml(id) {
  const it = objItems().find(x => x.id === id); if (!it) return "";
  const qs = allQuestions(S.set).filter(q => it.qs.includes(q.id));
  const right = qs.filter(q => progress.results[q.id] === "correct").length;
  const cur = (progress.readiness || {})[id];
  const rows = qs.map(q => {
    const ok = progress.results[q.id] === "correct";
    const t = q.question.length > 82 ? q.question.slice(0, 80).trim() + "…" : q.question;
    return `<div class="cf-q ${ok ? "ok" : "bad"}"><span>${ok ? "✓" : "✗"}</span><span>${esc(t)}</span></div>`;
  }).join("");
  const opts = [["red", "Not yet", "I'd miss these on the exam"], ["yellow", "Shaky", "Some of it's there"], ["green", "Got it", "I could do these cold"]];
  return `<div class="cf">
    <div class="rd-head" style="position:static">
      <div><div class="eyebrow" style="color:var(--accent)">🎯 Confidence check · ${esc(it.group)}</div>
      <div class="cf-obj">${fmt(it.text)}</div></div>
    </div>
    <div class="muted" style="font-size:12px;margin:2px 0 8px">You just finished this objective's questions: <b style="color:${right === qs.length ? "var(--ok)" : "var(--text)"}">${right} of ${qs.length} right</b> on your latest tries.${cur ? " Last time you said: " + ({ red: "not yet", yellow: "shaky", green: "got it" })[cur] + "." : ""}</div>
    <div class="cf-list">${rows}</div>
    <div style="font-size:14.5px;font-weight:bold;margin:14px 0 8px">How sure do you feel about this one?</div>
    <div class="cf-opts">${opts.map(([v, l, sub]) => `<button class="cf-btn" data-act="confRate" data-id="${esc(id)}" data-v="${v}" style="--dc:${v === "red" ? "var(--bad)" : v === "yellow" ? "var(--star)" : "var(--ok)"}">
      <i></i><b>${l}</b><span>${sub}</span></button>`).join("")}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
      ${it.lesson && findLesson(it.lesson) ? `<button class="rd-learn" data-act="confLesson" data-id="${esc(it.lesson)}" style="padding:0">Reread the lesson ›</button>` : "<span></span>"}
      <button class="linkbtn" data-act="confSkip" data-id="${esc(id)}" style="margin:0">Skip for now</button>
    </div>
    <div class="muted" style="font-size:11.5px;margin-top:10px;line-height:1.5">Lower ratings bring these questions back more often. You'll get to rate it again after you've seen them all again.</div>
  </div>`;
}
function confReady() {
  if (!S.confQ || !S.confQ.length || !S.set || modalOpen() || S.modalSoon || S.feedback) return false;
  const scr = S.screen;
  if (scr === "battle") return !(S.battle && (S.battle.lvl || S.battle.over || S.battle.showVictory));
  if (scr === "map") return !(S.mapQ || S.mapDlg || (S.battle && S.battle.lvl) || S.mapHelpOpen);
  return scr === "quiz" || scr === "shuffle" || scr === "grid" || scr === "setHome";
}
function confDrain() {
  if (!confReady()) return;
  const id = S.confQ.shift();
  const html = confHtml(id); if (!html) return confDrain();
  showModal(html);
  const m = document.querySelector("#overlay .modal"); if (m) m.classList.add("wide", "cf-modal");
  mallet(NOTE(84), 0, { dur: 0.5, vol: 0.07, wet: 0.3 }); mallet(NOTE(91), 0.08, { dur: 0.6, vol: 0.06, wet: 0.3 });
}
function readyChipText() { return "🎯 " + readinessPct() + "%"; }

document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act;
  if (act === "confRate") {
    const id = t.dataset.id, v = t.dataset.v;
    progress.readiness = progress.readiness || {}; progress.confAt = progress.confAt || {};
    progress.readiness[id] = v; progress.confAt[id] = Date.now();
    saveProgress();
    closeModal();
    if (v === "green") { sfx.correct(); flashGlow("var(--ok)", 700); } else sfx.select();
    document.querySelectorAll(".rdchip").forEach(c => c.textContent = readyChipText());
    if (S.screen === "setHome") render();
    return setTimeout(confDrain, 350);
  }
  if (act === "confSkip") {
    progress.confAt = progress.confAt || {}; progress.confAt[t.dataset.id] = Date.now(); saveProgress();
    closeModal(); sfx.tick(); return setTimeout(confDrain, 350);
  }
  if (act === "confLesson") {
    const hit = findLesson(t.dataset.id); if (!hit) return;
    // keep the check: put it back at the front so it returns after reading
    const cur = document.querySelector(".cf-btn"); if (cur) { S.confQ = S.confQ || []; S.confQ.unshift(cur.dataset.id); }
    sfx.tick();
    showModal(lessonPeekHtml(t.dataset.id));
    const m = document.querySelector("#overlay .modal"); if (m) m.classList.add("wide");
    return;
  }
});

/* after renders and closed pop-ups: run pending checks, keep the header chip */
const _learnBaseRender = render;
render = function () {
  _learnBaseRender();
  if (S.set && (S.screen === "battle" || S.screen === "map") && (S.set.readiness || []).length) {
    const head = document.querySelector("#app .bhead");
    if (head && !head.querySelector(".rdchip")) {
      const c = document.createElement("button");
      c.className = "rdchip"; c.dataset.act = "openReadiness"; c.dataset.nonav = "1";
      c.title = "Exam readiness (from your confidence checks)";
      c.textContent = readyChipText();
      const last = head.lastElementChild;
      if (last && last.tagName === "DIV") last.prepend(c); else head.appendChild(c);
    }
  }
  setTimeout(confDrain, 60);
};
const _learnBaseClose = closeModal;
closeModal = function () { _learnBaseClose(); setTimeout(confDrain, 300); };

(function () {
  const st = document.createElement("style");
  st.id = "learn-css";
  st.textContent = `
.rdchip { font-size: 12.5px; font-weight: bold; padding: 5px 10px; border-radius: 999px; background: var(--surface); border: 1px solid var(--border2); color: var(--accent); cursor: pointer; white-space: nowrap; }
.cf-modal { animation: cfIn .35s cubic-bezier(.22,.8,.3,1) both; }
@keyframes cfIn { from { transform: translateY(14px) scale(.98); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .cf-modal { animation: none; } }
.cf-obj { font-size: 18px; font-weight: bold; line-height: 1.35; margin-top: 4px; }
.cf-list { max-height: 190px; overflow-y: auto; border: 1px solid var(--border); border-radius: 10px; padding: 4px 0; background: var(--surface2); }
.cf-q { display: flex; gap: 8px; font-size: 12px; line-height: 1.4; padding: 5px 10px; color: var(--dim); }
.cf-q span:first-child { font-weight: bold; flex: 0 0 12px; }
.cf-q.ok span:first-child { color: var(--ok); } .cf-q.bad span:first-child { color: var(--bad); }
.cf-opts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.cf-btn { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 12px 6px; border-radius: 12px; border: 2px solid var(--dc); background: var(--surface); color: var(--text); cursor: pointer; font-family: inherit; transition: transform .15s cubic-bezier(.175,.885,.32,1.275), background-color .15s; }
.cf-btn:hover { background: color-mix(in srgb, var(--dc) 14%, var(--surface)); }
.cf-btn:active { transform: scale(.95); }
.cf-btn i { width: 16px; height: 16px; border-radius: 50%; background: var(--dc); }
.cf-btn b { font-size: 14px; } .cf-btn span { font-size: 11px; color: var(--muted); text-align: center; line-height: 1.3; }
`;
  document.head.appendChild(st);
})();
