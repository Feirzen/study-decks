/* ===================================================================
   god.js: God mode, an editor for your own adventure save
   For when the game gets in the way of studying: undo a misclick, skip to
   the chapter you need, top up HP or charge, swap a boon, open a stuck
   room, forgive misses. Off by default. Turn it on from the switch on the
   Battle save screen (or Settings → God mode); then a small crown button
   shows in the battle and map headers. Edits only ever touch this device's
   saves (fc:adv:<deck>, fc:heroes, fc:<deck>), never the decks themselves.
   New saved field: run.godOpen (floors God mode opened). Old saves without
   it work as before. Loaded last.
   =================================================================== */

const GM = { open: false, last: null, toastT: 0 };
function gmOn() { return !!settings.godMode; }
const CROWN = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z"/></svg>';

/* ===================== SAVING ===================== */
/* saveHeroes() keeps the higher XP/kills/deaths from disk (so another tab
   can't undo your progress). God mode sometimes lowers them on purpose, so
   it writes the hero straight back, still taking newer boons from disk. */
function gmSaveHeroes() {
  const st = loadHeroes();
  try {
    const raw = localStorage.getItem("fc:heroes"), disk = raw ? JSON.parse(raw) : null;
    if (disk && Array.isArray(disk.heroes)) disk.heroes.forEach(dh => {
      const mh = st.heroes.find(h => h.id === dh.id);
      if (mh && (dh.boonsAt || 0) > (mh.boonsAt || 0)) { mh.boons = dh.boons; mh.boonsAt = dh.boonsAt; }
    });
    localStorage.setItem("fc:heroes", JSON.stringify(st));
  } catch (e) { if (typeof heroSaveFailed === "function") heroSaveFailed(e); }
}
function gmSave() {
  const b = S.battle; if (!b) return;
  b.s.updated = Date.now();
  if (S.screen === "battle" && b.enemy && !b.pend) b.s.enemyHits = b.enemy.hits;
  saveAdv(); gmSaveHeroes(); saveProgress();
}

/* ===================== UNDO: snapshot every battle answer ===================== */
const _gmSubmit = submitBattle;
submitBattle = function () {
  const b = S.battle;
  if (b && b.cur && !S.feedback && S.set) {
    const q = b.cur, h = b.h, P = progress;
    GM.last = {
      set: S.set.id, slot: b.slot, q, ok: null,
      s: JSON.stringify(b.s),
      hero: { xp: h.xp, kills: h.kills, deaths: h.deaths },
      prog: { results: P.results[q.id], missCount: P.missCount[q.id], streaks: P.streaks[q.id], starred: P.starred[q.id] },
      enemy: JSON.stringify(b.enemy), stash: b.bossStash ? JSON.stringify(b.bossStash) : null,
      mapMode: !!b.mapMode, mapFight: b.mapFight || null,
      flags: { curMiss: b.curMiss, curStar: b.curStar, curOrder: b.curOrder, curReview: b.curReview },
    };
  }
  _gmSubmit.apply(this, arguments);
  if (GM.last && b && GM.last.slot === b.slot && GM.last.ok === null) GM.last.ok = S.feedback === "correct";
};
function gmLastOk() {
  const L = GM.last, b = S.battle;
  return !!(L && b && S.set && L.set === S.set.id && L.slot === b.slot && L.ok !== null);
}
/* put the run back exactly as it was before the last answer, same question up */
function gmRewind() {
  const L = GM.last, b = S.battle, s = b.s, h = b.h;
  const old = JSON.parse(L.s);
  Object.keys(s).forEach(k => delete s[k]);
  Object.assign(s, old);                                   // in place: S.adv.slots[i] is this same object
  h.xp = L.hero.xp; h.kills = L.hero.kills; h.deaths = L.hero.deaths;
  ["results", "missCount", "streaks", "starred"].forEach(k => {
    if (L.prog[k] === undefined) delete progress[k][L.q.id]; else progress[k][L.q.id] = L.prog[k];
  });
  b.enemy = JSON.parse(L.enemy);
  b.bossStash = L.stash ? JSON.parse(L.stash) : null;
  b.pendMinion = null; b.minionBack = false;
  b.mapMode = L.mapMode; b.mapFight = L.mapFight;
  b.over = false; b.dying = false; b.victory = false; b.showVictory = false;
  b.pend = null; b.lvl = null; b.fx = null; b.note = null; b.armed = null; b.bossFx = null;
  b.cur = L.q; Object.assign(b, L.flags);
  b.shown = { hp: s.hp, xp: h.xp };
  S.mapQ = null; S.mapDlg = null; S.picker = null;
  resetQ();
  S.screen = "battle";
}
function gmUndo(asRight) {
  if (!gmLastOk()) return gmToast("Nothing to undo yet");
  const q = GM.last.q;
  gmRewind();
  GM.last = null;
  if (asRight) {
    // answer it again, correctly: the hit lands like a normal right answer
    const order = optionOrder(q);
    S.selected = q.type === "mc" ? [order.indexOf(q.answer)]
      : order.map((o, i) => (q.answers || []).includes(o) ? i : -1).filter(i => i >= 0);
    gmClose(true);
    submitBattle();
    gmSaveHeroes();
    return gmToast("Counted as right");
  }
  gmSave();
  gmClose(true);
  render(); window.scrollTo(0, 0);
  gmToast("Answer undone. Try it again");
}

/* ===================== FLOORS ===================== */
if (typeof floorOpen === "function") {
  const _gmFloorOpen = floorOpen;
  floorOpen = function (s, k) { return (s.godOpen || []).includes(k) || _gmFloorOpen(s, k); };
}
/* jump to floor k: every floor below it counts as cleared, so you never redo them */
function gmJump(k) {
  const b = S.battle, s = b.s, N = SL();
  if (!(k >= 1 && k <= N + 1) || typeof twGo !== "function") return;
  s.cf = s.cf || [];
  for (let i = 1; i < Math.min(k, N + 1); i++) if (!s.cf.includes(i)) s.cf.push(i);
  s.godOpen = s.godOpen || [];
  if (!s.godOpen.includes(k)) s.godOpen.push(k);
  GM.last = null;
  gmClose(true);
  twGo(k);
  gmToast("Jumped to " + (k === N + 1 ? "the Throne" : "floor " + k));
}

/* unlock the throne room without skipping or clearing any floors */
function gmUnlockThrone(stay) {
  const b = S.battle; if (!b || !b.s || !b.s.v3) return;
  const s = b.s, k = SL() + 1;
  s.godOpen = s.godOpen || [];
  if (!s.godOpen.includes(k)) s.godOpen.push(k);
  gmSave();
  if (!stay) gmClose(true);
  render();
  gmToast("Throne room unlocked");
}
// on the Floors screen, tapping the sealed throne with God mode on opens it
document.addEventListener("click", ev => {
  const t = ev.target.closest && ev.target.closest('[data-act="twLocked"]');
  if (!t || !gmOn() || !S.battle || !S.battle.s.v3) return;
  if (+t.dataset.f !== SL() + 1) return;
  ev.preventDefault(); ev.stopPropagation();
  gmUnlockThrone(true);
}, true);

/* ===================== HERO ===================== */
function gmHero(what, d) {
  const b = S.battle, s = b.s, h = b.h, C = CLASSES[h.cls], mx = maxHpOf(s, h);
  let msg = "";
  if (what === "lvl") {
    if (d > 0) { h.xp = (h.xp || 0) + XPL; s.picks = (s.picks || 0) + 1; msg = "Level " + levelOf(h.xp) + " (+1 pick)"; }
    else {
      if (levelOf(h.xp) <= 1) return gmToast("Already level 1");
      h.xp -= XPL; if (s.picks > 0) s.picks--;            // takes back an unspent pick if there is one
      msg = "Level " + levelOf(h.xp);
    }
  } else if (what === "hp") {
    s.hp = d === "full" ? mx : Math.max(1, Math.min(mx, s.hp + d));
    msg = d === "full" ? "Fully healed" : "HP " + s.hp + "/" + mx;
  } else if (what === "charge") {
    s.charge = d === "full" ? C.maxCharge : Math.max(0, Math.min(C.maxCharge, (s.charge || 0) + d));
    msg = "Charge " + s.charge + "/" + C.maxCharge;
  }
  gmSave(); gmAfter(msg);
}
function gmBoon(slot, id) {
  const b = S.battle, h = b.h, slots = heroBoons(h);
  if (!(slot >= 0 && slot < slots.length)) return;
  if (id && slots.some((x, i) => x === id && i !== slot)) return gmToast("Already in your other slot"), gmPanel();
  slots[slot] = id || null;
  h.boons = slots; h.boonsAt = Date.now();
  if (typeof _diagMine !== "undefined") _diagMine[h.id] = { boons: slots.slice(), at: h.boonsAt };   // the boon safety net should keep this, not undo it
  if (typeof boonLog === "function") boonLog("god mode", h, { slot });
  gmSave(); gmAfter(id ? boonById(id).name + " in slot " + (slot + 1) : "Slot " + (slot + 1) + " emptied");
}

/* ===================== ROOM / FIGHT ===================== */
function gmFoeLow() {
  const b = S.battle, s = b.s;
  if (S.screen !== "battle" || !b.enemy || b.pend || b.over) return;
  b.enemy.hits = 1;
  if (b.enemy.ward || b.enemy.final) s.passDone = true;   // the ward drops too
  gmSave(); gmAfter("Foe down to 1 HP. Next right answer wins");
}
function gmClearRoom() {
  const b = S.battle, s = b.s, ms = s.map; if (!ms || S.screen !== "map") return;
  const rm = curRoom();
  rm.objs.forEach(o => { if (o.type === "foe" && !ms.cleared.includes(o.id)) mapFoeDown(o.id); });
  if (rm.trial) { ms.trials = ms.trials || {}; ms.trials[rm.idx] = "done"; }
  (rm.doors || []).forEach(d => { if (d.lock) { ms.ul = ms.ul || []; if (!ms.ul.includes(d.id)) ms.ul.push(d.id); } });
  if (rm.lock) ms.unlocked = true;
  S.stoneQ = null;
  gmSave(); gmAfter("Room cleared and doors open");
}
function gmOpenBoss() {
  const b = S.battle, s = b.s, ms = s.map; if (!ms || S.screen !== "map") return;
  floorData(s).rooms.forEach(rm => rm.objs.forEach(o => { if (o.type === "foe" && !ms.cleared.includes(o.id)) mapFoeDown(o.id); }));
  if (typeof chapterFloor === "function" && chapterFloor()) {
    s.seen = s.seen || [];
    towerChaps()[s.floor - 1].questions.forEach(q => { if (!s.seen.includes(q.id)) s.seen.push(q.id); });
  }
  s.passDone = true; s.qpos = 0;
  gmSave(); gmAfter("Boss door is open");
}

/* ===================== QUESTIONS ===================== */
function gmKnow(q) {
  if (!q) return;
  progress.results[q.id] = "correct";
  delete progress.missCount[q.id]; delete progress.streaks[q.id];
}
function gmKnowCur() {
  const b = S.battle, q = b && b.cur; if (!q) return;
  gmKnow(q);
  gmSave(); gmAfter("Marked as known");
}
function gmChapterQs() {
  const b = S.battle, s = b && b.s;
  if (!s || typeof towerChaps !== "function" || s.floor > SL()) return [];
  const ch = towerChaps()[s.floor - 1];
  return ch ? ch.questions : [];
}
function gmForgiveChapter() {
  const qs = gmChapterQs().filter(q => progress.missCount[q.id] || progress.results[q.id] === "incorrect");
  if (!qs.length) return gmToast("No misses on this floor");
  qs.forEach(gmKnow);
  gmSave(); gmAfter(qs.length + " miss" + (qs.length === 1 ? "" : "es") + " forgiven");
}

/* ===================== PANEL ===================== */
function gmSwitch() {
  return `<button class="gm-sw ${gmOn() ? "on" : ""}" data-gm="toggle" role="switch" aria-checked="${gmOn()}">
    <span class="gm-swt"><b>God mode</b><small>${gmOn() ? "On. Edits save right away." : "Off. Turn on to edit your save."}</small></span><span class="gm-knob"></span></button>`;
}
function gmBtn(act, label, opts) {
  opts = opts || {};
  return `<button class="gm-b ${opts.cls || ""}" data-gm="${act}"${opts.arg != null ? ` data-a="${opts.arg}"` : ""}${opts.off ? " disabled" : ""}${opts.title ? ` title="${esc(opts.title)}"` : ""}>${label}</button>`;
}
function gmShort(t, n) { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
function gmBody() {
  const b = S.battle;
  if (!gmOn()) return `<p class="gm-note">God mode lets you edit your own adventure save: undo a misclick, skip ahead to a chapter, heal, swap boons and more. It never changes the decks.</p>`;
  if (!b || !b.s || !b.h || !(S.screen === "battle" || S.screen === "map")) return `<p class="gm-note">Open an adventure (Battle → Continue) and tap the crown in the top bar to edit it.</p>`;
  const s = b.s, h = b.h, C = CLASSES[h.cls], mx = maxHpOf(s, h), N = SL(), fight = S.screen === "battle";
  const L = gmLastOk() ? GM.last : null;
  const last = L
    ? `<div class="gm-last ${L.ok ? "ok" : "bad"}"><span class="gm-pill">${L.ok ? "Right" : "Wrong"}</span>${esc(gmShort(L.q.question, 70))}</div>
       <div class="gm-row">${gmBtn("right", "Count it right", { cls: "pri", off: L.ok })}${gmBtn("undo", "Undo, ask again")}</div>`
    : `<div class="gm-note">Answer a battle question and it shows up here.</div>`;
  const step = (what, label, val) => `<div class="gm-step"><span class="gm-sl">${label}</span>
      ${gmBtn(what, "−", { arg: what === "hp" ? -10 : -1, cls: "sq", title: "Less" })}<span class="gm-val">${val}</span>${gmBtn(what, "+", { arg: what === "hp" ? 10 : 1, cls: "sq", title: "More" })}
      ${what === "lvl" ? "<span></span>" : gmBtn(what, what === "hp" ? "Full heal" : "Max", { arg: "full", cls: "sm" })}</div>`;
  const slots = heroBoons(h);
  const boons = slots.map((id, i) => `<label class="gm-boon"><span class="gm-sl">Slot ${i + 1}</span>
      <select data-gm="boon" data-a="${i}" style="${id ? `--rc:${RARITY[boonById(id).r].color}` : ""}">
        <option value="">Empty</option>
        ${Object.keys(RARITY).map(r => `<optgroup label="${RARITY[r].label}">${BOONS.filter(x => x.r === r).map(x => `<option value="${x.id}" ${x.id === id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</optgroup>`).join("")}
      </select></label>`).join("");
  const cq = fight && b.cur && !b.lvl ? b.cur : null;
  const nMiss = gmChapterQs().filter(q => progress.missCount[q.id] || progress.results[q.id] === "incorrect").length;
  const room = fight
    ? gmBtn("foe", "Foe to 1 HP", { off: !!(b.pend || b.over || !b.enemy) })
    : gmBtn("room", "Clear this room") + gmBtn("boss", "Open boss door");
  const floors = s.v3 && typeof twGo === "function" ? (() => {
    const chips = [];
    for (let k = 1; k <= N + 1; k++) {
      const fi = floorInfo(s, k);
      chips.push(`<button class="gm-fl ${k === s.floor ? "cur" : ""} ${(s.cf || []).includes(k) ? "done" : ""}" data-gm="jump" data-a="${k}" title="${esc(fi.name)}">${k === N + 1 ? "👑" : k}</button>`);
    }
    const tOpen = floorOpen(s, N + 1);
    const tBtn = gmBtn("throne", tOpen ? "👑 Throne room open" : "👑 Unlock the throne room", { off: tOpen, title: "Opens the throne without clearing any floors" });
    return `<div class="gm-sec"><div class="gm-h">Jump to floor <span class="muted">· floors below count as cleared</span></div><div class="gm-fls">${chips.join("")}</div><div class="gm-row" style="margin-top:8px">${tBtn}</div></div>`;
  })() : "";
  return `
    <div class="gm-sec"><div class="gm-h">Last answer</div>${last}</div>
    ${floors}
    <div class="gm-sec"><div class="gm-h">${esc(h.name)} · ${C.name}</div>
      ${step("lvl", "Level", levelOf(h.xp))}
      ${step("hp", "HP", s.hp + "/" + mx)}
      ${step("charge", "Charge", (s.charge || 0) + "/" + C.maxCharge)}</div>
    <div class="gm-sec"><div class="gm-h">Boons</div>${boons}</div>
    <div class="gm-sec"><div class="gm-h">${fight ? "This fight" : "This room"}</div><div class="gm-row">${room}</div></div>
    <div class="gm-sec"><div class="gm-h">Questions</div><div class="gm-row">
      ${cq ? gmBtn("know", "Mark this one known", { title: gmShort(cq.question || "", 90) }) : ""}
      ${gmBtn("forgive", "Forgive floor misses" + (nMiss ? " (" + nMiss + ")" : ""), { off: !nMiss })}</div></div>`;
}
function gmPanel() {
  let el = document.getElementById("gmLayer");
  if (!GM.open) { if (el) { el.classList.add("out"); setTimeout(() => { if (!GM.open && el.parentNode) el.remove(); }, 220); } return; }
  const fresh = !el;
  if (fresh) { el = document.createElement("div"); el.id = "gmLayer"; el.className = "gm-wrap"; el.setAttribute("data-nonav", ""); document.body.appendChild(el); }
  el.classList.remove("out");
  const scroll = el.querySelector(".gm-panel") ? el.querySelector(".gm-panel").scrollTop : 0;
  el.innerHTML = `<div class="gm-panel ${fresh ? "in" : ""}" role="dialog" aria-label="God mode">
      <button class="rd-x gm-x" data-gm="close" aria-label="Close">✕</button>
      <div class="eyebrow" style="color:var(--star)">${CROWN.replace('width="17" height="17"', 'width="12" height="12"')} Your save, your rules</div>
      <h2>God mode</h2>
      ${gmSwitch()}
      <div class="gm-body ${gmOn() ? "" : "off"}">${gmBody()}</div>
    </div>`;
  el.querySelector(".gm-panel").scrollTop = scroll;
}
function gmOpen() { GM.open = true; sfx.tick(); gmPanel(); }
function gmClose(quiet) {
  GM.open = false; gmPanel();
  const b = S.battle;
  // picks handed out by God mode: offer them on the map right away
  if (b && S.screen === "map" && b.s.picks > 0 && !b.lvl) { b.lvl = { stage: "choose" }; render(); }
  if (!quiet) sfx.tick();
}
/* after an edit: redraw the game underneath and the panel on top */
function gmAfter(msg) {
  sfx.select();
  render();
  gmPanel();
  if (msg) gmToast(msg);
}
function gmToast(text) {
  let t = document.getElementById("gmToast");
  if (!t) { t = document.createElement("div"); t.id = "gmToast"; t.className = "gm-toast"; document.body.appendChild(t); }
  t.textContent = text;
  t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
  clearTimeout(GM.toastT);
  GM.toastT = setTimeout(() => t.classList.remove("show"), 1900);
}

/* ===================== WIRING ===================== */
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-gm], [data-act='gmOpen'], [data-act='gmToggle']");
  if (!t) { if (GM.open && ev.target.id === "gmLayer") gmClose(); return; }
  if (t.dataset.act === "gmOpen") return gmOpen();
  if (t.dataset.act === "gmToggle") { settings.godMode = !gmOn(); saveSettings(); sfx.select(); gmToast(gmOn() ? "God mode on" : "God mode off"); return render(); }
  const a = t.dataset.gm, arg = t.dataset.a;
  if (a === "boon") return;                                  // handled on change
  if (a === "close") return gmClose();
  if (a === "toggle") { settings.godMode = !gmOn(); saveSettings(); sfx.select(); render(); gmPanel(); return gmToast(gmOn() ? "God mode on" : "God mode off"); }
  if (!gmOn() || !S.battle) return;
  if (a === "right") return gmUndo(true);
  if (a === "undo") return gmUndo(false);
  if (a === "jump") return gmJump(+arg);
  if (a === "throne") { gmUnlockThrone(true); return gmPanel(); }
  if (a === "lvl" || a === "hp" || a === "charge") return gmHero(a, arg === "full" ? "full" : +arg);
  if (a === "foe") return gmFoeLow();
  if (a === "room") return gmClearRoom();
  if (a === "boss") return gmOpenBoss();
  if (a === "know") return gmKnowCur();
  if (a === "forgive") return gmForgiveChapter();
});
document.addEventListener("change", ev => {
  const t = ev.target;
  if (t && t.dataset && t.dataset.gm === "boon" && gmOn() && S.battle) gmBoon(+t.dataset.a, t.value);
});
// while the panel is open, keys belong to it (no walking or answering underneath)
window.addEventListener("keydown", ev => {
  if (!GM.open) return;
  if (ev.key === "Escape") { ev.preventDefault(); gmClose(); }
  ev.stopPropagation();
}, true);
if (typeof mapBusy === "function") { const _gmBusy = mapBusy; mapBusy = function () { return GM.open || _gmBusy(); }; }

/* the crown button in the battle and map headers (only while God mode is on) */
const GM_HEAD = `<button class="iconbtn gm-crown" data-act="gmOpen" data-nonav title="God mode" aria-label="God mode">${CROWN}</button>`;
const _gmViewBattle = viewBattle;
viewBattle = function () {
  const html = _gmViewBattle();
  if (!gmOn() || !S.battle || !html.includes('class="bhead"')) return html;
  return html.replace(/(<div class="bhead">[\s\S]*?<\/span>\s*<div style="display:flex;align-items:center;gap:12px">)/, "$1" + GM_HEAD);
};
const _gmViewMap = viewMap;
viewMap = function () {
  const html = _gmViewMap();
  if (!gmOn()) return html;
  return html.replace('<button class="iconbtn helpq"', GM_HEAD + '<button class="iconbtn helpq"');
};
/* the on/off switch on the Battle save screen */
const _gmMenu = viewAdvMenu;
viewAdvMenu = function () {
  const html = _gmMenu();
  const row = `<button class="gm-sw gm-menu ${gmOn() ? "on" : ""}" data-act="gmToggle" role="switch" aria-checked="${gmOn()}">
    <span class="gm-swt"><b>${CROWN.replace('width="17" height="17"', 'width="14" height="14"')} God mode</b><small>${gmOn() ? "On. Tap the crown in a battle to edit your save." : "Edit your own save when the game gets in the way."}</small></span><span class="gm-knob"></span></button>`;
  return html.replace(/<\/div>\s*$/, row + "</div>");
};
/* and in the shared settings tray */
if (window.KitConfig && Array.isArray(KitConfig.tray)) KitConfig.tray.push({ id: "god", label: "God mode", icon: CROWN, onClick: () => gmOpen() });
// leaving the adventure: the undo snapshot belongs to that run only
const _gmOpenAdv = openAdvMenu;
openAdvMenu = function () { GM.last = null; if (GM.open) gmClose(true); return _gmOpenAdv.apply(this, arguments); };

/* ===================== STYLES ===================== */
(function () {
  const css = `
  .gm-wrap { position: fixed; inset: 0; z-index: 9980; display: flex; justify-content: center; align-items: flex-start; overflow-y: auto; padding: 24px 12px;
    background: color-mix(in srgb, var(--bg) 35%, transparent); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: gmFade .25s ease both; }
  .gm-wrap.out { opacity: 0; transition: opacity .2s ease; }
  .gm-panel { position: relative; width: 100%; max-width: 440px; padding: 20px 16px 18px; border-radius: 20px;
    background: color-mix(in srgb, var(--surface) 88%, transparent); border: 1px solid var(--border);
    box-shadow: 0 20px 60px var(--shadow), inset 0 1px 0 color-mix(in srgb, #fff 10%, transparent); }
  .gm-panel.in { animation: gmRise .38s cubic-bezier(.2,.9,.3,1.15) both; }
  .gm-panel h2 { margin: 2px 0 12px; font-size: 24px; }
  .gm-panel .eyebrow svg { vertical-align: -1px; }
  .gm-x { position: absolute; top: 14px; right: 14px; }
  .gm-sw { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; border: 1px solid var(--border); background: var(--surface2);
    color: var(--text); border-radius: 12px; padding: 10px 12px; font: inherit; cursor: pointer; transition: border-color .25s ease, background-color .25s ease; }
  .gm-sw.on { border-color: color-mix(in srgb, var(--star) 55%, var(--border)); background: color-mix(in srgb, var(--star) 8%, var(--surface2)); }
  .gm-swt { flex: 1; min-width: 0; }
  .gm-swt b { display: flex; align-items: center; gap: 6px; font-size: 14.5px; }
  .gm-swt small { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; line-height: 1.35; }
  .gm-knob { flex: 0 0 38px; height: 22px; border-radius: 11px; background: var(--border2, var(--border)); position: relative; transition: background .25s ease; }
  .gm-knob::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform .28s cubic-bezier(.2,.9,.3,1.3); }
  .gm-sw.on .gm-knob { background: var(--star); }
  .gm-sw.on .gm-knob::after { transform: translateX(16px); }
  .gm-menu { margin-top: 14px; }
  .gm-body { margin-top: 4px; }
  .gm-body.off { opacity: .9; }
  .gm-note { color: var(--dim); font-size: 13.5px; line-height: 1.55; margin: 12px 2px 0; }
  .gm-sec { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
  .gm-panel.in .gm-sec { animation: gmIn .35s ease both; }
  .gm-h { font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted); font-weight: bold; margin-bottom: 8px; }
  .gm-h .muted { text-transform: none; letter-spacing: 0; font-weight: normal; }
  .gm-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .gm-b { flex: 1 1 auto; min-height: 38px; padding: 8px 12px; border-radius: 11px; border: 1.5px solid var(--border); background: var(--surface);
    color: var(--text); font: inherit; font-size: 13.5px; font-weight: bold; cursor: pointer; transition: transform .12s ease, border-color .2s ease, background-color .2s ease; }
  .gm-b:not(:disabled):hover { border-color: var(--accent); }
  .gm-b:not(:disabled):active { transform: scale(.96); }
  .gm-b:disabled { opacity: .45; cursor: default; }
  .gm-b.pri { background: color-mix(in srgb, var(--ok) 16%, var(--surface)); border-color: color-mix(in srgb, var(--ok) 55%, var(--border)); }
  .gm-b.sq { flex: 0 0 36px; width: 36px; padding: 0; font-size: 18px; }
  .gm-b.sm { flex: 0 0 auto; font-size: 12.5px; padding: 6px 10px; min-height: 36px; }
  .gm-step { display: grid; grid-template-columns: 58px 36px 1fr 36px 84px; align-items: center; gap: 8px; margin-bottom: 8px; }
  .gm-step .gm-b.sm { width: 100%; }
  .gm-sl { flex: 0 0 58px; font-size: 13.5px; color: var(--dim); }
  .gm-val { flex: 1; text-align: center; font-weight: bold; font-variant-numeric: tabular-nums; font-size: 15px; }
  .gm-last { display: flex; align-items: center; gap: 8px; font-size: 13.5px; line-height: 1.4; color: var(--dim); margin-bottom: 9px; }
  .gm-pill { flex: 0 0 auto; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 99px; color: #fff; background: var(--bad); }
  .gm-last.ok .gm-pill { background: var(--ok); }
  .gm-boon { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .gm-boon select { flex: 1; min-width: 0; min-height: 38px; border-radius: 11px; border: 1.5px solid var(--rc, var(--border)); background: var(--surface);
    color: var(--text); font: inherit; font-size: 14px; padding: 6px 10px; cursor: pointer; }
  .gm-fls { display: flex; flex-wrap: wrap; gap: 6px; }
  .gm-fl { width: 38px; height: 38px; border-radius: 11px; border: 1.5px solid var(--border); background: var(--surface); color: var(--text);
    font: inherit; font-weight: bold; font-size: 14px; cursor: pointer; transition: transform .12s ease, border-color .2s ease; }
  .gm-fl.done { color: var(--muted); }
  .gm-fl.cur { border-color: var(--star); color: var(--star); background: color-mix(in srgb, var(--star) 10%, var(--surface)); }
  .gm-fl:hover { border-color: var(--accent); }
  .gm-fl:active { transform: scale(.94); }
  .gm-crown { color: var(--star); opacity: .8; }
  .bhead .gm-crown { width: 30px; height: 30px; flex: 0 0 30px; background: none; border-color: transparent; }
  .gm-crown:hover { opacity: 1; }
  .mapwrap .bhead .gm-crown { margin-left: auto; margin-right: 8px; }
  .gm-toast { position: fixed; left: 50%; bottom: calc(26px + env(safe-area-inset-bottom)); z-index: 9995; padding: 10px 16px; border-radius: 99px;
    background: color-mix(in srgb, var(--surface) 82%, transparent); color: var(--text); border: 1px solid var(--border); font-size: 14px; font-weight: bold;
    box-shadow: 0 10px 30px var(--shadow); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    opacity: 0; transform: translate(-50%, 12px); pointer-events: none; transition: opacity .3s ease, transform .35s cubic-bezier(.2,.9,.3,1.2); white-space: nowrap; max-width: 92vw; }
  .gm-toast.show { opacity: 1; transform: translate(-50%, 0); }
  @keyframes gmFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes gmRise { from { opacity: 0; transform: translateY(16px) scale(.98); } to { opacity: 1; transform: none; } }
  @keyframes gmIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .gm-panel.in, .gm-sec, .gm-wrap { animation: none !important; } }`;
  const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
})();
