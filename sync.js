/* ===================================================================
   sync.js: move progress between devices, plus the hero editor.
   - Settings tray "Transfer" button opens Export / Import.
   - Export: pick decks (progress, exam, adventures) and heroes, then
     share/save a .json file or copy it as text.
   - Import: load the file (or paste), see what's new vs what clashes,
     and choose Keep mine / Use imported (heroes can also Combine).
   - Hall of Fame: pencil button per hero to fix boons and name by hand.
   - The exploration map toggle moved from the tray into Options.
   Loaded after filters.js.
   =================================================================== */

const SX_PEN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
const SX = { mode: null, pick: {}, file: null, choice: {}, msg: "" };

function sxRead(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function sxDecks() {
  const out = [];
  ((S.manifest && S.manifest.classes) || []).forEach(c => (c.sets || []).forEach(s => out.push({ id: s.id, title: c.name + " · " + s.title })));
  return out;
}
function sxDeckData(id) {
  const d = { progress: sxRead("fc:" + id), exam: sxRead("fc:exam:" + id), adv: sxRead("fc:adv:" + id) };
  return d;
}
/* how much is in a deck save, in plain words; 0 = nothing worth keeping */
function sxDeckSize(d) {
  if (!d) return { n: 0, text: "nothing" };
  const ans = d.progress && d.progress.results ? Object.keys(d.progress.results).length : 0;
  const adv = d.adv && Array.isArray(d.adv.slots) ? d.adv.slots.filter(Boolean) : [];
  const ex = d.exam ? ((d.exam.history || []).length + (d.exam.attempt ? 1 : 0)) : 0;
  const bits = [];
  if (ans) bits.push(ans + " answered");
  if (adv.length) bits.push(adv.length + " adventure" + (adv.length > 1 ? "s" : "") + " (floor " + Math.max(...adv.map(a => a.floor || 1)) + ")");
  if (ex) bits.push(ex + " practice exam" + (ex > 1 ? "s" : ""));
  return { n: ans + adv.length * 50 + ex, text: bits.join(" · ") || "nothing yet" };
}
function sxHeroText(h) {
  const names = heroBoons(h).filter(Boolean).map(id => (boonById(id) || {}).name).filter(Boolean);
  return (CLASSES[h.cls] ? CLASSES[h.cls].name : "Hero") + " · Lv " + levelOf(h.xp || 0) + (names.length ? " · " + names.join(", ") : "");
}
function sxShow(html) {
  const keep = document.querySelector("#overlay .sx-pop");
  const st = keep ? keep.parentElement.scrollTop : 0;
  if (keep) keep.parentElement.innerHTML = html;
  else { showModal(html); const m = document.querySelector("#overlay .modal"); if (m) m.classList.add("wide", "fx-modal"); }
  const m = document.querySelector("#overlay .modal"); if (m) m.scrollTop = st;
}
function sxCheck(on) { return `<span class="fx-box sx-box ${on ? "on" : ""}">${on ? "✓" : ""}</span>`; }

/* ---------- start ---------- */
function openTransfer() {
  SX.mode = "start"; SX.msg = ""; sfx.tick();
  sxShow(`<div class="fx-pop sx-pop">
    <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    <h2>Transfer progress</h2>
    <div class="muted fx-sub">Move your decks and heroes to another device, or keep a backup.</div>
    <button class="fx-opt" data-act="sxExport"><span><b>Export</b><span class="muted">Pick decks and heroes, then save or share a file.</span></span><span class="sx-arrow">→</span></button>
    <button class="fx-opt" data-act="sxImport"><span><b>Import</b><span class="muted">Load a file from another device. You'll see any clashes before anything changes.</span></span><span class="sx-arrow">→</span></button>
  </div>`);
}

/* ---------- export ---------- */
function sxExportStart() {
  SX.mode = "export"; SX.pick = { settings: false };
  sxDecks().forEach(d => { if (sxDeckSize(sxDeckData(d.id)).n > 0) SX.pick["d:" + d.id] = true; });
  loadHeroes().heroes.forEach(h => { SX.pick["h:" + h.id] = true; });
  sxExportView();
}
function sxExportView() {
  const decks = sxDecks().map(d => ({ d, sz: sxDeckSize(sxDeckData(d.id)) })).filter(x => x.sz.n > 0);
  const heroes = loadHeroes().heroes;
  const row = (key, title, sub) => `<button class="fx-chap sx-row ${SX.pick[key] ? "on" : ""}" data-act="sxPick" data-k="${esc(key)}" style="--cc:var(--accent)">
      ${sxCheck(SX.pick[key])}<span class="fx-name">${esc(title)}<span class="muted sx-sub">${esc(sub)}</span></span></button>`;
  const n = Object.keys(SX.pick).filter(k => SX.pick[k]).length;
  sxShow(`<div class="fx-pop sx-pop">
    <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    <h2>Export</h2>
    <div class="muted fx-sub">Everything checked goes in the file. Nothing on this device changes.</div>
    <div class="eyebrow fx-h">Decks</div>
    <div class="fx-chaps">${decks.length ? decks.map(x => row("d:" + x.d.id, x.d.title, x.sz.text)).join("") : '<div class="muted" style="font-size:13px">No deck progress yet.</div>'}</div>
    <div class="eyebrow fx-h">Heroes</div>
    <div class="fx-chaps">${heroes.length ? heroes.map(h => row("h:" + h.id, h.name, sxHeroText(h))).join("") : '<div class="muted" style="font-size:13px">No heroes yet.</div>'}</div>
    <div class="eyebrow fx-h">Other</div>
    <div class="fx-chaps">${row("settings", "Look & options", "Theme, sound, map mode, Recall first")}</div>
    <div class="muted fx-note">Adventures need their hero, so any hero on a checked deck's adventure comes along automatically.</div>
    <div class="sx-btns">
      <button class="primary" data-act="sxShare" ${n ? "" : "disabled"} style="background:var(--accent)">Save / share file</button>
      <button class="ghost" data-act="sxCopy" ${n ? "" : "disabled"}>Copy as text</button>
    </div>
    ${SX.msg ? `<div class="sx-msg">${esc(SX.msg)}</div>` : ""}
  </div>`);
}
function sxBuild() {
  const out = { app: "study-decks", v: 1, at: Date.now(), decks: {}, heroes: [] };
  const want = new Set();
  sxDecks().forEach(d => {
    if (!SX.pick["d:" + d.id]) return;
    const data = sxDeckData(d.id);
    out.decks[d.id] = { title: d.title, progress: data.progress, exam: data.exam, adv: data.adv };
    if (data.adv && Array.isArray(data.adv.slots)) data.adv.slots.forEach(s => { if (s && s.heroId) want.add(s.heroId); });
  });
  loadHeroes().heroes.forEach(h => { if (SX.pick["h:" + h.id] || want.has(h.id)) out.heroes.push(JSON.parse(JSON.stringify(h))); });
  if (SX.pick.settings) out.settings = sxRead("fc:settings");
  return out;
}
function sxFileName() { const d = new Date(); return "study-decks-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + ".json"; }
async function sxShare() {
  const text = JSON.stringify(sxBuild());
  const name = sxFileName();
  try {
    const file = new File([text], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Study Decks progress" });
      SX.msg = "Shared. On the other device, open Transfer → Import."; sfx.select(); return sxExportView();
    }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  SX.msg = "Saved " + name + ". On the other device, open Transfer → Import."; sfx.select(); sxExportView();
}
async function sxCopy() {
  const text = JSON.stringify(sxBuild());
  try { await navigator.clipboard.writeText(text); SX.msg = "Copied. Paste it into Import on the other device (Notes or Messages work for carrying it over)."; }
  catch (e) { SX.msg = "Couldn't reach the clipboard here. Use Save / share file instead."; }
  sfx.select(); sxExportView();
}

/* ---------- import ---------- */
function sxImportStart() {
  SX.mode = "import"; SX.file = null; SX.choice = {}; SX.pick = {}; SX.msg = "";
  sxShow(`<div class="fx-pop sx-pop">
    <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    <h2>Import</h2>
    <div class="muted fx-sub">Pick the file you exported, or paste the copied text. Nothing changes until you confirm.</div>
    <label class="primary sx-file" style="background:var(--accent)">Choose file<input type="file" id="sxFile" accept=".json,application/json,text/plain" hidden></label>
    <div class="eyebrow fx-h">Or paste</div>
    <textarea id="sxPaste" class="sx-paste" placeholder='{"app":"study-decks",…}'></textarea>
    <button class="ghost" data-act="sxPasteGo" style="width:100%;margin-top:8px">Use pasted text</button>
    ${SX.msg ? `<div class="sx-msg bad">${esc(SX.msg)}</div>` : ""}
  </div>`);
}
function sxLoad(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { d = null; }
  if (!d || d.app !== "study-decks") { SX.msg = "That doesn't look like a Study Decks export."; sfx.tick(); return sxImportStart(); }
  SX.file = d; SX.choice = {}; SX.pick = {};
  const localHeroes = loadHeroes().heroes;
  Object.keys(d.decks || {}).forEach(id => {
    const mine = sxDeckSize(sxDeckData(id)), theirs = sxDeckSize(d.decks[id]);
    SX.pick["d:" + id] = true;
    if (mine.n > 0) SX.choice["d:" + id] = theirs.n >= mine.n ? "theirs" : "mine";
  });
  (d.heroes || []).forEach(h => {
    SX.pick["h:" + h.id] = true;
    const mh = localHeroes.find(x => x.id === h.id);
    if (mh) SX.choice["h:" + h.id] = "combine";
  });
  if (d.settings) { SX.pick.settings = false; }
  sfx.select(); sxImportView();
}
function sxSeg(key, opts) {
  return `<div class="sx-seg">${opts.map(([v, label]) =>
    `<button class="${SX.choice[key] === v ? "on" : ""}" data-act="sxChoose" data-k="${esc(key)}" data-v="${v}">${label}</button>`).join("")}</div>`;
}
function sxImportView() {
  const d = SX.file, localHeroes = loadHeroes().heroes, titles = {};
  sxDecks().forEach(x => { titles[x.id] = x.title; });
  const deckRows = Object.keys(d.decks || {}).map(id => {
    const key = "d:" + id, theirs = sxDeckSize(d.decks[id]), mine = sxDeckSize(sxDeckData(id)), clash = mine.n > 0;
    return `<div class="sx-item ${SX.pick[key] ? "on" : ""}">
      <button class="fx-chap sx-row ${SX.pick[key] ? "on" : ""}" data-act="sxPick" data-k="${esc(key)}" style="--cc:var(--accent)">
        ${sxCheck(SX.pick[key])}<span class="fx-name">${esc(titles[id] || d.decks[id].title || id)}
        <span class="muted sx-sub">Imported: ${esc(theirs.text)}</span>
        ${clash ? `<span class="muted sx-sub">On this device: ${esc(mine.text)}</span>` : '<span class="sx-tag">New here</span>'}</span></button>
      ${clash && SX.pick[key] ? sxSeg(key, [["mine", "Keep mine"], ["theirs", "Use imported"]]) : ""}
    </div>`;
  }).join("");
  const heroRows = (d.heroes || []).map(h => {
    const key = "h:" + h.id, mh = localHeroes.find(x => x.id === h.id);
    return `<div class="sx-item ${SX.pick[key] ? "on" : ""}">
      <button class="fx-chap sx-row ${SX.pick[key] ? "on" : ""}" data-act="sxPick" data-k="${esc(key)}" style="--cc:var(--accent)">
        ${sxCheck(SX.pick[key])}<span class="fx-name">${esc(h.name)}
        <span class="muted sx-sub">Imported: ${esc(sxHeroText(h))}</span>
        ${mh ? `<span class="muted sx-sub">On this device: ${esc(sxHeroText(mh))}</span>` : '<span class="sx-tag">New here</span>'}</span></button>
      ${mh && SX.pick[key] ? sxSeg(key, [["mine", "Keep mine"], ["combine", "Combine"], ["theirs", "Use imported"]]) : ""}
    </div>`;
  }).join("");
  const anyCombine = Object.keys(SX.choice).some(k => SX.choice[k] === "combine" && SX.pick[k]);
  const n = Object.keys(SX.pick).filter(k => SX.pick[k]).length;
  sxShow(`<div class="fx-pop sx-pop">
    <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    <h2>Import</h2>
    <div class="muted fx-sub">From ${esc(new Date(d.at || Date.now()).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}. New things just get added. Where both devices have something, you choose.</div>
    ${deckRows ? `<div class="eyebrow fx-h">Decks</div><div class="fx-chaps">${deckRows}</div>` : ""}
    ${heroRows ? `<div class="eyebrow fx-h">Heroes</div><div class="fx-chaps">${heroRows}</div>` : ""}
    ${anyCombine ? '<div class="muted fx-note">Combine keeps the higher level, the most recently rolled boons, and every trophy from both.</div>' : ""}
    ${d.settings ? `<div class="eyebrow fx-h">Other</div><div class="fx-chaps"><button class="fx-chap sx-row ${SX.pick.settings ? "on" : ""}" data-act="sxPick" data-k="settings" style="--cc:var(--accent)">
      ${sxCheck(SX.pick.settings)}<span class="fx-name">Look & options<span class="muted sx-sub">Replaces your theme and options here</span></span></button></div>` : ""}
    <div class="sx-btns">
      <button class="primary" data-act="sxApply" ${n ? "" : "disabled"} style="background:var(--accent)">Import ${n} item${n === 1 ? "" : "s"}</button>
      <button class="ghost" data-act="sxImport">Pick a different file</button>
    </div>
  </div>`);
}
function sxWrite(k, v) { if (v == null) return; localStorage.setItem(k, JSON.stringify(v)); }
function sxApply() {
  const d = SX.file; if (!d) return;
  const now = Date.now();
  try {
    // heroes first, so adventures always have someone to point at
    const st = loadHeroes(), need = new Set();
    Object.keys(d.decks || {}).forEach(id => {
      const key = "d:" + id; if (!SX.pick[key]) return;
      if (SX.choice[key] === "mine") return;
      const D = d.decks[id];
      sxWrite("fc:" + id, D.progress); sxWrite("fc:exam:" + id, D.exam); sxWrite("fc:adv:" + id, D.adv);
      if (D.adv && Array.isArray(D.adv.slots)) D.adv.slots.forEach(s => { if (s && s.heroId) need.add(s.heroId); });
    });
    (d.heroes || []).forEach(h => {
      const key = "h:" + h.id, mh = st.heroes.find(x => x.id === h.id);
      if (!SX.pick[key] && !(need.has(h.id) && !mh)) return;
      const copy = JSON.parse(JSON.stringify(h));
      if (!mh) { st.heroes.push(copy); return; }
      const c = SX.choice[key] || "combine";
      if (c === "mine") return;
      if (c === "combine") { mergeHero(mh, copy); mh.boonsAt = now; return; }
      Object.keys(mh).forEach(k => delete mh[k]); Object.assign(mh, copy); mh.boonsAt = now;   // wins over any other open copy
    });
    localStorage.setItem("fc:heroes", JSON.stringify(st));
    if (SX.pick.settings && d.settings) sxWrite("fc:settings", d.settings);
  } catch (e) {
    SX.msg = "Import stopped: this device's storage said no (" + (e && e.name || "error") + "). Nothing was lost on the other device.";
    return sxShow(`<div class="fx-pop sx-pop"><button class="rd-x" data-act="closeModal" aria-label="Close">✕</button><h2>Hmm</h2><div class="sx-msg bad">${esc(SX.msg)}</div></div>`);
  }
  sfx.select();
  sxShow(`<div class="fx-pop sx-pop" style="text-align:center"><div style="font-size:38px">✅</div><h2 style="padding:0">Imported</h2>
    <div class="muted fx-sub">Reloading so everything picks it up…</div></div>`);
  // drop in-memory copies so nothing writes old data back on the way out
  S.exam = null; S.battle = null; S.set = null; _heroes = null;
  setTimeout(() => location.reload(), 900);
}

/* ---------- hero editor (Hall of Fame) ---------- */
function sxEditHero(id) {
  const h = heroById(id); if (!h) return;
  const slots = heroBoons(h), order = ["legendary", "rare", "uncommon", "common", "chaos"];
  const opts = cur => `<option value="">Empty</option>` + order.map(r =>
    `<optgroup label="${RARITY[r].label}">${BOONS.filter(b => b.r === r).map(b => `<option value="${b.id}" ${b.id === cur ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</optgroup>`).join("");
  sxShow(`<div class="fx-pop sx-pop">
    <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    <h2>Edit ${esc(h.name)}</h2>
    <div class="muted fx-sub">Put back a boon that went missing, or rename. Level and trophies stay as they are.</div>
    <div class="eyebrow fx-h">Name</div>
    <input id="sxName" class="nameinput sx-input" maxlength="18" value="${esc(h.name)}">
    <div class="eyebrow fx-h">Boons</div>
    ${slots.map((b, i) => `<label class="sx-slot"><span class="muted">Slot ${i + 1}</span><select id="sxB${i}" class="sx-select">${opts(b)}</select></label>`).join("")}
    <div class="muted fx-note" id="sxBoonText"></div>
    <div class="sx-btns">
      <button class="primary" data-act="sxHeroSave" data-id="${h.id}" style="background:var(--star);color:#1a1a1a">Save</button>
      <button class="ghost" data-act="closeModal">Cancel</button>
    </div>
  </div>`);
}
function sxHeroSave(id) {
  const h = heroById(id); if (!h) return;
  const n = heroBoons(h).length, picks = [];
  for (let i = 0; i < n; i++) { const el = document.getElementById("sxB" + i); const v = el ? el.value : ""; picks.push(v && !picks.includes(v) ? v : null); }
  const nm = (document.getElementById("sxName") || {}).value;
  if (nm && nm.trim()) h.name = nm.trim().slice(0, 18);
  h.boons = picks; h.boonsAt = Date.now();
  saveHeroes();
  if (typeof boonLog === "function") boonLog("edited by hand", h);
  closeModal(); sfx.select(); render();
}
const _sxHall = viewHall;
viewHall = function () {
  return _sxHall().replace(/<button class="ghost" data-act="heroRetire" data-id="([^"]+)"/g,
    (m, id) => `<button class="ghost" data-act="sxEditHero" data-id="${id}" title="Edit hero" aria-label="Edit hero" style="flex:0 0 40px;padding:8px;margin-right:6px">${SX_PEN}</button>` + m);
};

/* ---------- map toggle lives in Options now ---------- */
const _sxOptions = optionsHtml;
optionsHtml = function () {
  const sw = `<button class="fx-opt" data-act="sxMapOpt">
      <span><b>Exploration map</b><span class="muted">Walk a dungeon map between fights in Battle. Off means quick back-to-back battles.</span></span>${fxToggle(mapOn())}</button>`;
  const html = _sxOptions(), i = html.lastIndexOf('<button class="primary" data-act="closeModal"');
  return html.slice(0, i) + sw + html.slice(i);
};

document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-act]"); if (!t) return;
  const act = t.dataset.act;
  if (act === "sxExport") { sfx.tick(); SX.msg = ""; return sxExportStart(); }
  if (act === "sxImport") { sfx.tick(); SX.msg = ""; return sxImportStart(); }
  if (act === "sxPick") { const k = t.dataset.k; SX.pick[k] = !SX.pick[k]; sfx.select(); return SX.mode === "export" ? sxExportView() : sxImportView(); }
  if (act === "sxChoose") { SX.choice[t.dataset.k] = t.dataset.v; sfx.tick(); return sxImportView(); }
  if (act === "sxShare") return sxShare();
  if (act === "sxCopy") return sxCopy();
  if (act === "sxPasteGo") { const v = (document.getElementById("sxPaste") || {}).value || ""; return sxLoad(v.trim()); }
  if (act === "sxApply") return sxApply();
  if (act === "sxEditHero") { sfx.tick(); return sxEditHero(t.dataset.id); }
  if (act === "sxHeroSave") return sxHeroSave(t.dataset.id);
  if (act === "sxMapOpt") { settings.mapMode = !mapOn(); saveSettings(); sfx.select(); fxRefreshHome(); return fxShow(optionsHtml()); }
});
document.addEventListener("change", ev => {
  if (ev.target && ev.target.id === "sxFile" && ev.target.files && ev.target.files[0]) {
    const r = new FileReader(); r.onload = () => sxLoad(String(r.result || "")); r.readAsText(ev.target.files[0]);
  }
  if (ev.target && /^sxB\d$/.test(ev.target.id)) {
    const b = boonById(ev.target.value), el = document.getElementById("sxBoonText");
    if (el) el.textContent = b ? b.name + ": " + b.text : "";
  }
});

(function () {
  const css = `
  .sx-pop .fx-opt { animation: fbin .3s var(--ease-pop, ease) both; }
  .sx-pop .fx-opt:nth-of-type(2) { animation-delay: .05s; }
  .sx-arrow { font-size: 20px; color: var(--accent); }
  .sx-row { align-items: flex-start; }
  .sx-row .fx-box { margin-top: 1px; }
  .sx-box.on { background: var(--accent); border-color: var(--accent); }
  .sx-sub { display: block; font-weight: normal; font-size: 12px; margin-top: 3px; line-height: 1.4; }
  .sx-tag { display: inline-block; margin-top: 5px; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 99px;
    background: color-mix(in srgb, var(--ok, #4ade80) 18%, transparent); color: var(--ok, #4ade80); }
  .sx-item { display: grid; gap: 6px; }
  .sx-seg { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--surface2, var(--border)); margin: 0 4px 4px 36px;
    animation: fbin .25s var(--ease-pop, ease); }
  .sx-seg button { flex: 1; border: 0; border-radius: 9px; padding: 8px 6px; font: inherit; font-size: 12.5px; font-weight: bold;
    background: transparent; color: var(--muted); cursor: pointer; transition: background .2s ease, color .2s ease, box-shadow .2s ease; }
  .sx-seg button.on { background: var(--surface); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,.18); }
  .sx-btns { display: grid; gap: 8px; margin-top: 18px; }
  .sx-btns .primary[disabled], .sx-btns .ghost[disabled] { opacity: .45; pointer-events: none; }
  .sx-msg { margin-top: 12px; font-size: 13px; line-height: 1.5; padding: 10px 12px; border-radius: 10px;
    background: color-mix(in srgb, var(--accent) 12%, transparent); animation: fbin .3s var(--ease-pop, ease); }
  .sx-msg.bad { background: var(--badBg, rgba(239,68,68,.15)); }
  .sx-file { display: block; text-align: center; cursor: pointer; }
  .sx-paste { width: 100%; min-height: 90px; box-sizing: border-box; border-radius: 12px; border: 1.5px solid var(--border);
    background: var(--surface); color: var(--text); padding: 10px; font: 12px ui-monospace, monospace; resize: vertical; }
  .sx-input { width: 100%; box-sizing: border-box; }
  .sx-slot { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .sx-slot .muted { flex: 0 0 52px; font-size: 13px; }
  .sx-select { flex: 1; padding: 11px 12px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--surface);
    color: var(--text); font: inherit; font-size: 15px; }`;
  const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
})();
