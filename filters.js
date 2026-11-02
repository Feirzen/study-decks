/* ===================================================================
   filters.js: the Filters and Options pop-ups on the deck home.
   Loaded last. Replaces the three filter chips with two buttons:
     Filters  -> which chapters Shuffle/Battle use, the Starred / Misses /
                 New narrowing. Options holds Recall first, Confidence Checks, and
                 whether Battle drops Scrolls of Wisdom (that one is per deck).
     Options  -> Recall first (hide the choices until you've thought of an
                 answer) and Confidence Check pop-ups on/off.
   Chapter picks and the scrolls switch are saved per deck (progress);
   the options are global (settings), so they follow you to every deck.
   =================================================================== */

/* ---------- which chapters are in play ---------- */
function chapOn(c) { const off = (progress && progress.chapOff) || {}; return !off[c.category]; }
function playCats() {
  if (!S.set) return [];
  const on = S.set.categories.filter(chapOn);
  return on.length ? on : S.set.categories;          // never let you pick nothing
}
function playQs() { return playCats().flatMap(c => c.questions.map(q => ({ ...q, _cat: c }))); }
function chapNarrowed() { return S.set && playCats().length < S.set.categories.length; }

/* ---------- everything Shuffle / Battle pull from now respects chapters ---------- */
activeFilters = function () {
  const f = progress.filters || {}, qs = S.set ? playQs() : [];
  return Object.keys(FILTER_TEST).filter(k => f[k] && qs.some(FILTER_TEST[k]));
};
buildPool = function () {
  const qs = playQs(), a = activeFilters();
  if (!a.length) return qs;
  return qs.filter(q => a.some(k => FILTER_TEST[k](q)));
};
deckOrder = function () { return playQs(); };
missedPool = function () {
  const has = q => (progress.missCount[q.id] || 0) > 0;
  const m = buildPool().filter(has);
  return m.length ? m : playQs().filter(has);
};
starredCount = function () { return S.set ? playQs().filter(q => progress.starred[q.id]).length : 0; };
missedCount  = function () { return S.set ? playQs().filter(q => (progress.missCount[q.id] || 0) > 0).length : 0; };
freshCount   = function () { return S.set ? playQs().filter(q => !progress.results[q.id]).length : 0; };
if (typeof deckScale === "function") {
  deckScale = function (run) {
    if (!S.set || run.floor > SL(run)) return 1;
    return Math.max(0.6, Math.min(4, playQs().length / 55));
  };
}
/* Scrolls: positions follow only the chapters in play; switch them off entirely if asked. */
if (typeof scrollIndex === "function") {
  scrollIndex = function () {
    if (progress && progress.noScrolls) return [];
    const out = [];
    let start = 0;
    playCats().forEach(c => {
      catLessons(c).forEach(l => out.push({ l, c, pos: start + Math.min(l.at || 0, c.questions.length) }));
      start += c.questions.length;
    });
    return out;
  };
}
/* Confidence Checks can be muted from Options. */
if (typeof confDrain === "function") {
  const _fxConfDrain = confDrain;
  confDrain = function () { if (settings.noConf) { if (S.confQ) S.confQ.length = 0; return; } return _fxConfDrain(); };
}

/* ---------- the two buttons that replace the chips ---------- */
const FX_ICON = {
  filter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8.5V19l-4 2v-7.5z"/></svg>',
  sliders: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.4" fill="var(--surface)"/><circle cx="15" cy="17" r="2.4" fill="var(--surface)"/></svg>',
};
function fxSummary() {
  const bits = [];
  if (chapNarrowed()) { const n = playCats().length; bits.push(n + " of " + S.set.categories.length + " chapters"); }
  const a = activeFilters();
  if (a.length) bits.push(a.map(k => FILTER_META[k].label).join(" + "));
  return bits;
}
filterChips = function () {
  const bits = fxSummary(), on = bits.length;
  const opts = [settings.recallFirst ? "Recall first" : "", settings.noConf ? "Checks off" : "", progress.noScrolls ? "No scrolls" : ""].filter(Boolean);
  return `<div class="chiprow fx-row" style="margin-bottom:8px">
    <button class="chip fx-btn ${on ? "active" : ""}" data-act="fxOpenFilters">${FX_ICON.filter}<span>Filters${on ? " · " + on : ""}</span></button>
    <button class="chip fx-btn ${opts.length ? "active" : ""}" data-act="fxOpenOptions">${FX_ICON.sliders}<span>Options${opts.length ? " · " + opts.length : ""}</span></button>
  </div>
  <div class="muted" style="font-size:12px;margin:0 2px 20px;line-height:1.5">${on
    ? "Shuffle and Battle are using: " + esc(bits.join(" · ")) + "."
    : "Shuffle and Battle use the whole deck. Tap Filters to pick chapters or narrow to Starred, Misses, or New."}${opts.length ? " On: " + esc(opts.join(", ")) + "." : ""}</div>`;
};

/* ---------- Filters pop-up ---------- */
function fxToggle(on) { return `<span class="fx-sw ${on ? "on" : ""}" aria-hidden="true"><span></span></span>`; }
function filtersHtml() {
  const f = progress.filters || {};
  const n = { starred: starredCount(), missed: missedCount(), fresh: freshCount() };
  const icon = { starred: I.star, missed: I.flag, fresh: I.fresh };
  const cls = { starred: "chip--star", missed: "chip--flag", fresh: "chip--fresh" };
  const chips = ["starred", "missed", "fresh"].map(k =>
    `<button class="chip ${cls[k]} ${f[k] && n[k] ? "active" : ""}" data-act="fxFilt" data-f="${k}" ${n[k] ? "" : "disabled"}>
      ${icon[k](!!(f[k] && n[k]), 17)}<span>${FILTER_META[k].label}${n[k] ? " · " + n[k] : ""}</span></button>`).join("");
  const off = progress.chapOff || {};
  const chaps = S.set.categories.map((c, i) => {
    const on = !off[c.category];
    return `<button class="fx-chap ${on ? "on" : ""}" data-act="fxChap" data-i="${i}" style="--cc:${ck(c.color)}">
      <span class="fx-box">${on ? "✓" : ""}</span><span class="fx-name">${esc(c.category)}</span><span class="fx-n">${c.questions.length}</span></button>`;
  }).join("");
  const allOn = !Object.keys(off).some(k => off[k]);
  return `<div class="fx-pop">
    <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    <h2>Filters</h2>
    <div class="muted fx-sub">These shape Shuffle and Battle. Chapter quizzes always show the full chapter.</div>
    <div class="eyebrow fx-h">Only questions that are</div>
    <div class="chiprow three">${chips}</div>
    <div class="muted fx-note">Mix them however you like. With none on, everything in your chapters is fair game.</div>
    <div class="fx-hrow"><div class="eyebrow fx-h" style="margin:0">Chapters</div>
      <button class="linkbtn fx-all" data-act="fxChapAll">${allOn ? "Clear all" : "Select all"}</button></div>
    <div class="fx-chaps">${chaps}</div>
    <button class="primary" data-act="closeModal" style="background:var(--accent);margin-top:16px">Done</button>
  </div>`;
}
/* ---------- Options pop-up ---------- */
function optionsHtml() {
  return `<div class="fx-pop">
    <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    <h2>Options</h2>
    <div class="muted fx-sub">These follow you to every deck.</div>
    <button class="fx-opt" data-act="fxOpt" data-k="recallFirst">
      <span><b>Recall first</b><span class="muted">Hides the choices until you've thought of your answer. Closer to a blank exam page, and it sticks better.</span></span>${fxToggle(!!settings.recallFirst)}</button>
    <button class="fx-opt" data-act="fxOpt" data-k="noConf">
      <span><b>Confidence Checks</b><span class="muted">The red / yellow / green pop-up after you finish an objective's questions. Turn off for fast cramming.</span></span>${fxToggle(!settings.noConf)}</button>
    ${S.set ? `<div class="eyebrow fx-h">Battle</div>
    <button class="fx-opt" data-act="fxScrolls">
      <span><b>Scrolls of Wisdom</b><span class="muted">Learning pages pop up as you reach them in Battle. Set for this deck only.</span></span>${fxToggle(!progress.noScrolls)}</button>` : ""}
    <button class="primary" data-act="closeModal" style="background:var(--accent);margin-top:16px">Done</button>
  </div>`;
}
function fxShow(html) {
  const keep = document.querySelector("#overlay .fx-pop");
  const st = keep ? keep.parentElement.scrollTop : 0;
  if (keep) { keep.parentElement.innerHTML = html; }
  else {
    showModal(html);
    const m = document.querySelector("#overlay .modal"); if (m) m.classList.add("wide", "fx-modal");
  }
  const m = document.querySelector("#overlay .modal"); if (m) m.scrollTop = st;
}
function fxRefreshHome() { if (S.screen === "setHome") render(); }

/* ---------- Recall first: cover the choices until you tap ---------- */
const _fxRender = render;
render = function () {
  _fxRender();
  if (S.feedback) { S.recallOpen = null; return; }
  if (!settings.recallFirst) return;
  const opts = document.querySelectorAll('#app .opt[data-act="pick"]');
  if (!opts.length || (S.selected && S.selected.length)) return;
  const key = Array.from(opts).map(o => o.textContent.trim()).join("|");
  if (S.recallOpen === key) return;
  const box = opts[0].parentElement;
  if (!box || box.classList.contains("rf-hide")) return;
  box.classList.add("rf-hide");
  box.insertAdjacentHTML("beforebegin",
    `<button class="rf-cover" data-act="rfShow" data-k="${esc(key)}"><span class="rf-eye">👁</span>
      <span><b>Answer it in your head first</b><span class="muted">Then tap to see the ${opts.length} choices</span></span></button>`);
};

document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act;
  if (act === "fxOpenFilters") { sfx.tick(); return fxShow(filtersHtml()); }
  if (act === "fxOpenOptions") { sfx.tick(); return fxShow(optionsHtml()); }
  if (act === "fxFilt") {
    const k = t.dataset.f; progress.filters = progress.filters || {};
    progress.filters[k] = !progress.filters[k]; saveProgress(); sfx.select();
    fxRefreshHome(); return fxShow(filtersHtml());
  }
  if (act === "fxChap") {
    const c = S.set.categories[+t.dataset.i]; if (!c) return;
    progress.chapOff = progress.chapOff || {};
    const turningOff = !progress.chapOff[c.category];
    if (turningOff && playCats().length === 1 && chapOn(c)) { sfx.tick(); return; }  // keep at least one
    if (turningOff) progress.chapOff[c.category] = true; else delete progress.chapOff[c.category];
    saveProgress(); sfx.select(); fxRefreshHome(); return fxShow(filtersHtml());
  }
  if (act === "fxChapAll") {
    const off = progress.chapOff || {};
    const allOn = !Object.keys(off).some(k => off[k]);
    progress.chapOff = {};
    if (allOn) S.set.categories.slice(1).forEach(c => { progress.chapOff[c.category] = true; });  // "clear" leaves chapter 1 so something stays on
    saveProgress(); sfx.select(); fxRefreshHome(); return fxShow(filtersHtml());
  }
  if (act === "fxScrolls") { progress.noScrolls = !progress.noScrolls; saveProgress(); sfx.select(); fxRefreshHome(); return fxShow(optionsHtml()); }
  if (act === "fxOpt") { const k = t.dataset.k; settings[k] = !settings[k]; saveSettings(); sfx.select(); fxRefreshHome(); return fxShow(optionsHtml()); }
  if (act === "rfShow") { S.recallOpen = t.dataset.k; sfx.tick(); return render(); }
});

/* ---------- styles ---------- */
(function () {
  const css = `
  .fx-btn { justify-content: center; color: var(--text); }
  .fx-btn.active { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 11%, var(--surface)); }
  .fx-modal { max-width: 460px; text-align: left; max-height: calc(100vh - 48px); overflow-y: auto; position: relative; }
  .fx-pop .rd-x { position: absolute; top: 14px; right: 14px; }
  .fx-pop h2 { margin: 0 0 4px; font-size: 24px; padding-right: 44px; }
  .fx-sub { font-size: 13px; margin-bottom: 16px; line-height: 1.5; }
  .fx-h { margin: 18px 0 8px; }
  .fx-note { font-size: 12px; margin-top: 8px; line-height: 1.5; }
  .fx-hrow { display: flex; justify-content: space-between; align-items: center; margin: 18px 0 8px; }
  .fx-all { font-size: 12.5px; }
  .fx-chaps { display: grid; gap: 8px; }
  .fx-chap { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 11px 12px;
    border-radius: 12px; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted);
    font: inherit; cursor: pointer; transition: border-color var(--t-std, .2s) ease, background var(--t-std, .2s) ease, color .2s ease, transform .12s ease; }
  .fx-chap:active { transform: scale(.985); }
  .fx-chap.on { border-color: var(--cc); color: var(--text); background: color-mix(in srgb, var(--cc) 10%, var(--surface)); }
  .fx-box { flex: 0 0 22px; height: 22px; border-radius: 7px; border: 1.5px solid var(--border2, var(--border)); display: grid; place-items: center;
    font-size: 13px; font-weight: bold; color: #fff; transition: background .2s ease, border-color .2s ease; }
  .fx-chap.on .fx-box { background: var(--cc); border-color: var(--cc); animation: pop .25s var(--ease-pop, ease); }
  .fx-name { flex: 1; font-size: 14.5px; font-weight: bold; line-height: 1.3; }
  .fx-n { font-size: 12px; color: var(--muted); }
  .fx-opt { display: flex; align-items: center; justify-content: space-between; gap: 14px; width: 100%; text-align: left;
    padding: 13px 14px; margin-bottom: 8px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--surface);
    color: var(--text); font: inherit; cursor: pointer; }
  .fx-opt b { display: block; font-size: 15px; margin-bottom: 3px; }
  .fx-opt .muted { display: block; font-size: 12.5px; line-height: 1.45; }
  .fx-sw { flex: 0 0 44px; height: 26px; border-radius: 13px; background: var(--border); position: relative; transition: background .22s ease; }
  .fx-sw span { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .22s var(--ease-pop, ease); }
  .fx-sw.on { background: var(--accent); }
  .fx-sw.on span { transform: translateX(18px); }
  .rf-hide { display: none !important; }
  .rf-cover { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; padding: 22px 18px; margin-bottom: 18px;
    border-radius: 14px; border: 1.5px dashed var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--surface));
    color: var(--text); font: inherit; cursor: pointer; animation: fbin .3s var(--ease-pop, ease); }
  .rf-cover b { display: block; font-size: 15.5px; margin-bottom: 3px; }
  .rf-cover .muted { display: block; font-size: 13px; }
  .rf-eye { font-size: 24px; }
  .rf-cover:active { transform: scale(.985); }`;
  const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
})();
