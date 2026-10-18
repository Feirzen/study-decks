/* ===================================================================
   diag.js: boon safety net + boon history
   Every boon roll, fight start, adventure open and hero save is logged
   (last 60 events) to localStorage "fc:boonlog", tagged with which open
   copy of the site did it. The log shows at the bottom of the Hall of Fame.
   Safety net: this tab remembers what it last rolled for each hero. If a
   fight starts and the hero's boons don't match that (and nothing newer was
   rolled anywhere), the rolled boons are restored and the event is logged.
   Loaded last.
   =================================================================== */
const DIAG_TAB = Math.random().toString(36).slice(2, 6);
const DIAG_V = ((document.querySelector('script[src*="core.js"]') || {}).src || "").split("v=")[1] || "?";
const _diagMine = {};                       // heroId -> { boons, at } rolled in THIS tab

function boonLog(evt, h, extra) {
  try {
    const log = JSON.parse(localStorage.getItem("fc:boonlog") || "[]");
    log.push({ t: Date.now(), evt, hero: h ? h.name : "", boons: h ? (h.boons || []).slice() : null,
               at: h ? h.boonsAt || 0 : 0, tab: DIAG_TAB, v: DIAG_V, scr: S.screen, x: extra || null });
    localStorage.setItem("fc:boonlog", JSON.stringify(log.slice(-60)));
  } catch (e) {}
}
function diagCheck(where) {
  const b = S.battle; if (!b || !b.h) return;
  const h = b.h, mine = _diagMine[h.id];
  if (!mine) return;
  const now = JSON.stringify(heroBoons(h));
  if (now === JSON.stringify(mine.boons)) return;
  if ((h.boonsAt || 0) > mine.at) { _diagMine[h.id] = { boons: heroBoons(h), at: h.boonsAt }; return; }   // a newer roll elsewhere: fine
  boonLog("RESTORED at " + where, h, { lost: now, back: mine.boons });
  h.boons = mine.boons.slice(); h.boonsAt = mine.at;
  saveHeroes();
}

const _diagRoll = lvlRoll;
lvlRoll = function (i) {
  _diagRoll(i);
  const h = S.battle && S.battle.h;
  if (h) { _diagMine[h.id] = { boons: heroBoons(h), at: h.boonsAt || Date.now() }; boonLog("rolled", h, { slot: i, free: !!(S.battle.lvl && S.battle.lvl.free) }); }
};
const _diagFight = startMapFight;
startMapFight = function (o) { diagCheck("fight"); _diagFight(o); boonLog("fight " + (S.battle.enemy ? S.battle.enemy.name : ""), S.battle.h); };
const _diagOpen = openSlot;
openSlot = function (i) { _diagOpen(i); if (S.battle && S.battle.h) { diagCheck("open"); boonLog("open slot " + (i + 1), S.battle.h); } };
const _diagProceed = proceedNext;
proceedNext = function () { diagCheck("next"); _diagProceed(); };
let _diagLastSaved = {};
const _diagSave = saveHeroes;
saveHeroes = function () {
  _diagSave();
  try { loadHeroes().heroes.forEach(h => { const k = JSON.stringify(h.boons || []); if (_diagLastSaved[h.id] !== k) { _diagLastSaved[h.id] = k; boonLog("saved", h); } }); } catch (e) {}
};
window.addEventListener("storage", ev => {
  if (ev.key !== "fc:heroes" || !ev.newValue) return;
  try { const d = JSON.parse(ev.newValue); (d.heroes || []).forEach(h => boonLog("other copy saved", h)); } catch (e) {}
});
// a page restored from the back/forward cache holds an old copy in memory: re-sync
window.addEventListener("pageshow", ev => { if (ev.persisted) { try { saveHeroes(); boonLog("page restored", S.battle && S.battle.h); } catch (e) {} } });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.battle && S.battle.h) { saveHeroes(); diagCheck("return"); } });

const _diagHall = viewHall;
viewHall = function () {
  const html = _diagHall();
  let log = [];
  try { log = JSON.parse(localStorage.getItem("fc:boonlog") || "[]"); } catch (e) {}
  if (!log.length) return html;
  const name = id => { const bn = boonById(id); return bn ? bn.name : "empty"; };
  const rows = log.slice().reverse().slice(0, 30).map(e => `<div class="dg-row ${/RESTORED|other copy/.test(e.evt) ? "warn" : ""}">
      <span>${new Date(e.t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
      <b>${esc(e.evt)}</b><span>${esc(e.hero || "")}: ${(e.boons || []).map(name).join(", ") || "none"}</span>
      <span class="muted">tab ${esc(e.tab)} · v${esc(e.v)}</span></div>`).join("");
  const block = `<details class="dg"><summary class="eyebrow">Boon history (for troubleshooting)</summary>${rows}</details>`;
  const i = html.lastIndexOf("</div>");
  return html.slice(0, i) + block + html.slice(i);
};
(function () {
  const st = document.createElement("style");
  st.textContent = `.dg { margin-top: 30px; } .dg summary { cursor: pointer; margin-bottom: 8px; }
.dg-row { display: grid; grid-template-columns: 80px 1fr; gap: 2px 10px; font-size: 12px; padding: 6px 8px; border-bottom: 1px solid var(--border); }
.dg-row b { font-size: 12px; } .dg-row span:nth-child(3) { grid-column: 2; color: var(--dim); } .dg-row span:nth-child(4) { grid-column: 2; font-size: 11px; }
.dg-row.warn { background: var(--badBg); }`;
  document.head.appendChild(st);
})();
