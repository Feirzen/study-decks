/* ===================================================================
   scrolls.js: Scrolls of Wisdom (lessons found during Battle / Explore)
   When Battle walks the deck in order (no filter on), reaching a lesson's
   spot in the deck "discovers" it: a pop-up announces the scroll and lets
   you read it. Found scrolls are kept per adventure in s.scrolls and can
   be re-read any time from the 📜 button in the battle or map header.
   Loaded last (after audio.js, so narrated lessons get their player).
   =================================================================== */

/* every lesson with its position in the full deck order */
function scrollIndex() {
  const out = [];
  let start = 0;
  S.set.categories.forEach(c => {
    catLessons(c).forEach(l => out.push({ l, c, pos: start + Math.min(l.at || 0, c.questions.length) }));
    start += c.questions.length;
  });
  return out;
}
/* called by pickQuestion in deck-order mode: anything at or before this spot is found */
function scrollCheck(b, s, all) {
  if (!Array.isArray(s.scrolls)) s.scrolls = [];
  const got = new Set(s.scrolls);
  const fresh = scrollIndex().filter(x => x.pos <= s.qpos && !got.has(x.l.id)).map(x => x.l.id);
  if (fresh.length) b.scrollPending = (b.scrollPending || []).concat(fresh.filter(id => !(b.scrollPending || []).includes(id)));
}
function scrollFound() { const s = S.battle && S.battle.s; return (s && s.scrolls) || []; }

function scrollChime() {
  [79, 84, 88, 91].forEach((n, i) => mallet(NOTE(n), i * 0.09, { dur: 0.8, vol: 0.08, wet: 0.35 }));
  bell(NOTE(100), 0.38, { vol: 0.04, dur: 1.8 });
}
const SCROLL_SVG = `<svg class="scr-svg" viewBox="0 0 120 70" aria-hidden="true">
  <rect class="scr-paper" x="22" y="14" width="76" height="42" rx="3"/>
  <g class="scr-lines"><rect x="32" y="24" width="56" height="3" rx="1.5"/><rect x="32" y="32" width="48" height="3" rx="1.5"/><rect x="32" y="40" width="52" height="3" rx="1.5"/></g>
  <rect class="scr-rod l" x="12" y="8" width="12" height="54" rx="6"/><rect class="scr-rod r" x="96" y="8" width="12" height="54" rx="6"/>
</svg>`;

function scrollFoundHtml(ids) {
  const items = ids.map(id => findLesson(id)).filter(Boolean);
  const many = items.length > 1;
  return `<div class="scr-found">
    <div class="scr-glow">${SCROLL_SVG}</div>
    <div class="eyebrow" style="color:var(--star);margin-top:6px">Scroll of Wisdom</div>
    <h2 style="margin:6px 0 10px">You discovered ${many ? items.length + " Scrolls" : "a Scroll"} of Wisdom!</h2>
    <div class="scr-names">${items.map(x => `<div><span style="color:${ck(x.c.color)}">${esc(x.c.category)}</span> · <b>${esc(x.l.title)}</b></div>`).join("")}</div>
    <div class="muted" style="font-size:12.5px;margin:10px 0 16px">It's yours for the rest of this adventure. Find it any time under the 📜 button.</div>
    <div class="btns" style="display:flex;gap:10px">
      <button class="ghost" data-act="closeModal" style="flex:1">Save for later</button>
      <button class="primary" data-act="scrRead" data-id="${esc(items[0].l.id)}" style="flex:1;background:var(--star);color:#1a1a1a">📜 Read it</button>
    </div>
  </div>`;
}
function scrollReadHtml(id) {
  const hit = findLesson(id); if (!hit) return "";
  const { c, l } = hit, col = ck(c.color);
  const found = scrollIndex().filter(x => scrollFound().includes(x.l.id));
  const k = found.findIndex(x => x.l.id === id);
  const prev = found[k - 1], next = found[k + 1];
  const player = l.audio && typeof audPlayer === "function" ? `<div style="margin-bottom:14px">${audPlayer(l.audio, l.title, c.category, l.audioSecs)}</div>` : "";
  return `<div class="rd-head">
      <div><div class="eyebrow" style="color:${col}">📜 Scroll of Wisdom · ${esc(c.category)}</div>
      <div style="font-size:20px;font-weight:bold;line-height:1.3;margin-top:4px">${esc(l.title)}</div></div>
      <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    </div>
    ${player}
    <div class="ls-body scr-body">${renderBlocks(l.blocks)}</div>
    <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap">
      ${prev ? `<button class="ghost" data-act="scrRead" data-id="${esc(prev.l.id)}">← ${esc(prev.l.title)}</button>` : ""}
      <button class="ghost" data-act="scrLib">All scrolls (${found.length})</button>
      ${next ? `<button class="ghost" data-act="scrRead" data-id="${esc(next.l.id)}">${esc(next.l.title)} →</button>` : ""}
    </div>
    <button class="primary" data-act="closeModal" style="background:${col};margin-top:12px">Back to the adventure</button>`;
}
function scrollLibHtml() {
  const all = scrollIndex(), got = new Set(scrollFound());
  const n = all.filter(x => got.has(x.l.id)).length;
  let lastCat = null;
  const rows = all.map(x => {
    const head = x.c !== lastCat ? `<div class="eyebrow" style="margin:14px 0 6px;color:${ck(x.c.color)}">${esc(x.c.category)}</div>` : "";
    lastCat = x.c;
    return head + (got.has(x.l.id)
      ? `<button class="scr-row" data-act="scrRead" data-id="${esc(x.l.id)}"><span>📜</span><b>${esc(x.l.title)}</b>${x.l.audio ? '<span class="muted">🎧</span>' : ""}</button>`
      : `<div class="scr-row locked"><span>🔒</span><span>Undiscovered scroll</span></div>`);
  }).join("");
  return `<div class="rd-head">
      <div><div class="eyebrow" style="color:var(--star)">Scrolls of Wisdom</div>
      <div style="font-size:22px;font-weight:bold;margin-top:2px">${n} of ${all.length} found</div></div>
      <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    </div>
    <div class="muted" style="font-size:12.5px;line-height:1.5">Scrolls turn up as you battle through the deck in order (no filters on).</div>
    ${rows}`;
}
function showWide(html) {
  const open = document.querySelector("#overlay .modal");
  if (open) { open.innerHTML = html; open.scrollTop = 0; open.classList.add("wide"); return; }
  showModal(html);
  const m = document.querySelector("#overlay .modal");
  if (m) m.classList.add("wide");
}

document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act;
  if (act === "scrRead") { sfx.tick(); return showWide(scrollReadHtml(t.dataset.id)); }
  if (act === "scrLib") { sfx.tick(); return showWide(scrollLibHtml()); }
});

/* after every render: announce new scrolls, and add the 📜 header button */
const _scrBaseRender = render;
render = function () {
  _scrBaseRender();
  const b = S.battle;
  if (!b || !S.set || (S.screen !== "battle" && S.screen !== "map")) return;
  const head = document.querySelector("#app .bhead");
  if (head && !head.querySelector(".scrbtn") && scrollIndex().length) {
    const btn = document.createElement("button");
    btn.className = "iconbtn scrbtn"; btn.dataset.act = "scrLib"; btn.dataset.nonav = "1";
    btn.title = "Scrolls of Wisdom";
    btn.innerHTML = `📜<span>${scrollFound().length}</span>`;
    const last = head.lastElementChild;
    if (last && last.tagName === "DIV") last.prepend(btn);
    else { const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;align-items:center;gap:10px"; head.appendChild(wrap); wrap.appendChild(btn); if (last) wrap.appendChild(last); }
  }
  const ready = b.scrollPending && b.scrollPending.length && !modalOpen() && !S.feedback &&
    ((S.screen === "battle" && !b.lvl && !b.over) || (S.screen === "map" && S.mapQ));
  if (ready) {
    const ids = b.scrollPending; b.scrollPending = null;
    b.s.scrolls = (b.s.scrolls || []).concat(ids.filter(id => !(b.s.scrolls || []).includes(id)));
    saveAdv();
    setTimeout(() => {
      showModal(scrollFoundHtml(ids));
      scrollChime();
      const sb = document.querySelector(".scrbtn span"); if (sb) sb.textContent = scrollFound().length;
    }, S.screen === "battle" ? 650 : 150);     // let the foe walk in first
  }
};

(function () {
  const st = document.createElement("style");
  st.id = "scrolls-css";
  st.textContent = `
.scrbtn { display: inline-flex; align-items: center; gap: 4px; font-size: 15px; padding: 4px 9px; border-radius: 999px; background: var(--surface); border: 1px solid var(--border2); color: var(--text); cursor: pointer; }
.scrbtn span { font-size: 12px; color: var(--star); font-weight: bold; }
.scr-found { text-align: center; }
.scr-glow { width: 150px; margin: 4px auto 0; filter: drop-shadow(0 0 18px color-mix(in srgb, var(--star) 45%, transparent)); animation: scrFloat 3s ease-in-out infinite; }
.scr-svg { width: 100%; display: block; }
.scr-paper { fill: color-mix(in srgb, var(--star) 22%, var(--surface)); stroke: var(--star); stroke-width: 1.5; transform-origin: 60px 35px; animation: scrOpen .7s cubic-bezier(.22,.8,.3,1) both; }
.scr-lines rect { fill: var(--star); opacity: .55; transform-origin: 60px 35px; animation: scrOpen .7s .15s cubic-bezier(.22,.8,.3,1) both; }
.scr-rod { fill: color-mix(in srgb, var(--star) 70%, #6b3f12); }
.scr-rod.l { animation: scrRodL .7s cubic-bezier(.22,.8,.3,1) both; } .scr-rod.r { animation: scrRodR .7s cubic-bezier(.22,.8,.3,1) both; }
@keyframes scrOpen { from { transform: scaleX(.05); opacity: .4; } to { transform: none; opacity: 1; } }
@keyframes scrRodL { from { transform: translateX(42px); } to { transform: none; } }
@keyframes scrRodR { from { transform: translateX(-42px); } to { transform: none; } }
@keyframes scrFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@media (prefers-reduced-motion: reduce) { .scr-glow, .scr-paper, .scr-lines rect, .scr-rod { animation: none !important; } }
.scr-names { font-size: 14.5px; line-height: 1.7; }
.scr-row { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 11px 12px; margin-bottom: 6px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface2); color: var(--text); font-family: inherit; font-size: 14px; cursor: pointer; }
.scr-row b { flex: 1; }
.scr-row.locked { cursor: default; color: var(--muted); opacity: .7; }
.idk { flex: 0 0 auto; white-space: nowrap; }
`;
  document.head.appendChild(st);
})();
