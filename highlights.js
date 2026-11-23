/* ===================================================================
   highlights.js: highlight lines on lesson pages, review them later
   Select text on any lesson page (the full lesson screen, the 📖 Lesson
   pop-up, or a Scroll of Wisdom) and tap the floating "Highlight" pill.
   Tap a highlight to get a "Remove" pill instead.
   Saved per deck in localStorage "fc:hl:<setId>", kept apart from deck
   progress so resetting a deck never wipes your notes:
     { [lessonId]: { cat, title, items: [{ id, t, s, o, b, at }] } }
       t = highlighted text, s = whole sentence around it,
       o = where t starts inside s, b = block index on the page
   The set home shows a Highlights panel (right side on wide screens).
   Loaded last, after audio.js and scrolls.js, so it wraps their pages.
   =================================================================== */

/* the text pieces a sentence can live in; a highlight never crosses one */
const HL_BLOCKS = "p, li, td, th, h3, summary, .ls-ans, .ls-call, figcaption";

/* ---------- storage ---------- */
function hlKey() { return "fc:hl:" + (S.set ? S.set.id : ""); }
function hlLoad() {
  try { const d = JSON.parse(localStorage.getItem(hlKey())); return d && typeof d === "object" ? d : {}; }
  catch (e) { return {}; }
}
function hlSave(d) { try { localStorage.setItem(hlKey(), JSON.stringify(d)); } catch (e) {} }

/* ---------- text helpers ---------- */
function hlNodes(block) {
  const out = [];
  const w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement && n.parentElement.closest(".ls-tag, .fig-img") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  let n;
  while ((n = w.nextNode())) out.push(n);
  return out;
}
function hlText(block) { return hlNodes(block).map(n => n.data).join(""); }
function hlBlocks(body) { return [...body.querySelectorAll(HL_BLOCKS)]; }

/* character offset of a selection boundary inside a block */
function hlOffset(block, node, off) {
  const nodes = hlNodes(block);
  let sum = 0;
  if (node.nodeType === 3 && nodes.includes(node)) {
    for (const n of nodes) { if (n === node) return sum + off; sum += n.data.length; }
  }
  if (node.nodeType === 3) { off = [...node.parentNode.childNodes].indexOf(node); node = node.parentNode; }
  const child = node.childNodes[off];
  nodes.forEach(n => {
    const before = child
      ? !!(child.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_PRECEDING)
      : node.contains(n) || !!(node.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_PRECEDING);
    if (before) sum += n.data.length;
  });
  return sum;
}

/* whole sentence around [a, b) in the block text */
function hlSentence(T, a, b) {
  let st = 0;
  for (let i = a - 2; i >= 0; i--) {
    if (/[.!?]/.test(T[i]) && /\s/.test(T[i + 1])) { st = i + 1; break; }
  }
  let en = T.length;
  for (let i = Math.max(b - 1, st); i < T.length; i++) {
    if (/[.!?]/.test(T[i]) && (i + 1 === T.length || /\s/.test(T[i + 1])) && i + 1 >= b) { en = i + 1; break; }
  }
  while (st < a && /\s/.test(T[st])) st++;
  while (en > b && /\s/.test(T[en - 1])) en--;
  return { s: T.slice(st, en), o: a - st };
}

/* wrap [a, b) of a block in <mark class="hl"> pieces */
function hlWrap(block, a, b, id, fresh) {
  const nodes = hlNodes(block);
  let pos = 0;
  const cuts = nodes.map(n => { const r = { n, s: pos, e: pos + n.data.length }; pos = r.e; return r; });
  let first = null;
  cuts.forEach(({ n, s, e }) => {
    const x = Math.max(a, s), y = Math.min(b, e);
    if (x >= y) return;
    let piece = n;
    if (x > s) piece = piece.splitText(x - s);
    if (y - x < piece.data.length) piece.splitText(y - x);
    if (!piece.data.trim()) return;
    const m = document.createElement("mark");
    m.className = "hl" + (fresh ? " new" : "");
    m.dataset.hlid = id;
    piece.parentNode.insertBefore(m, piece);
    m.appendChild(piece);
    if (!first) first = m;
  });
  return first;
}
function hlUnwrap(body, id) {
  body.querySelectorAll(`mark.hl[data-hlid="${CSS.escape(id)}"]`).forEach(m => {
    const p = m.parentNode;
    while (m.firstChild) p.insertBefore(m.firstChild, m);
    p.removeChild(m);
    p.normalize();
  });
}

/* where a saved highlight sits now: { bi, a, b } or null if the page changed */
function hlLocate(blocks, texts, h) {
  const order = [h.b, ...blocks.map((_, i) => i).filter(i => i !== h.b)].filter(i => i >= 0 && i < blocks.length);
  for (const i of order) {
    const T = texts[i];
    const p = T.indexOf(h.s);
    if (p < 0) continue;
    let a = p + h.o;
    if (T.substr(a, h.t.length) !== h.t) {
      const k = h.s.indexOf(h.t);
      if (k < 0) continue;
      a = p + k;
    }
    return { bi: i, a, b: a + h.t.length };
  }
  return null;
}

/* paint saved highlights onto any lesson body that just appeared */
function hlPaint() {
  const bodies = document.querySelectorAll(".ls-body[data-hl]:not([data-hlp])");
  if (!bodies.length || !S.set) return;
  const d = hlLoad();
  bodies.forEach(body => {
    body.dataset.hlp = "1";
    const rec = d[body.dataset.hl];
    if (!rec || !Array.isArray(rec.items) || !rec.items.length) return;
    const blocks = hlBlocks(body), texts = blocks.map(hlText);
    rec.items.forEach(h => {
      const at = hlLocate(blocks, texts, h);
      if (at) hlWrap(blocks[at.bi], at.a, at.b, h.id);
    });
  });
  // arrived here from the highlights panel: glide to the one that was tapped
  if (S.hlFocus) {
    const m = document.querySelector(`.ls-body mark.hl[data-hlid="${CSS.escape(S.hlFocus)}"]`) || document.querySelector(".ls-body mark.hl");
    S.hlFocus = null;
    if (m) setTimeout(() => {
      m.scrollIntoView({ block: "center", behavior: "smooth" });
      document.querySelectorAll(`mark.hl[data-hlid="${CSS.escape(m.dataset.hlid)}"]`).forEach(x => x.classList.add("pulse"));
    }, 120);
  }
}
let _hlPaintRaf = 0;
new MutationObserver(() => {
  if (_hlPaintRaf) return;
  _hlPaintRaf = requestAnimationFrame(() => { _hlPaintRaf = 0; hlPaint(); });
}).observe(document.body, { childList: true, subtree: true });

/* ---------- the floating pill ---------- */
const HL = { pend: null, down: false, timer: 0 };
const hlFab = document.createElement("button");
hlFab.id = "hlFab";
hlFab.type = "button";
hlFab.dataset.nonav = "1";
document.body.appendChild(hlFab);

function hlFabShow(rect, mode) {
  hlFab.innerHTML = mode === "add"
    ? `<span class="hl-swatch"></span>Highlight`
    : `<span class="hl-x">✕</span>Remove highlight`;
  hlFab.className = "on " + mode;
  const w = hlFab.offsetWidth || 130, h = 38;
  // below the selection so it never fights the iPhone copy menu above it
  let top = rect.bottom + 12;
  if (top + h > window.innerHeight - 10) top = rect.top - h - 12;
  top = Math.max(10, top);
  const left = Math.min(window.innerWidth - w - 10, Math.max(10, rect.left + rect.width / 2 - w / 2));
  hlFab.style.top = top + "px";
  hlFab.style.left = left + "px";
}
function hlFabHide() { HL.pend = null; hlFab.className = ""; }

/* read the current selection into a pending highlight */
function hlFromSelection() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
  const r = sel.getRangeAt(0);
  const startEl = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
  const body = startEl && startEl.closest(".ls-body[data-hl]");
  if (!body) return null;
  let block = startEl.closest(HL_BLOCKS);
  if (!block || !body.contains(block)) {
    // selection started between blocks: use the first block it touches
    block = hlBlocks(body).find(b => r.intersectsNode(b));
    if (!block) return null;
  }
  const T = hlText(block);
  let a = block.contains(r.startContainer) ? hlOffset(block, r.startContainer, r.startOffset) : 0;
  let b = block.contains(r.endContainer) ? hlOffset(block, r.endContainer, r.endOffset) : T.length;   // ran past the block: clip to it
  while (a < b && /\s/.test(T[a])) a++;
  while (b > a && /\s/.test(T[b - 1])) b--;
  if (b - a < 2) return null;
  const { s, o } = hlSentence(T, a, b);
  const rects = r.getClientRects();
  const rect = rects.length ? rects[rects.length - 1] : r.getBoundingClientRect();
  return { mode: "add", body, block, a, b, t: T.slice(a, b), s, o, rect };
}

function hlOnSelection() {
  if (HL.down) return;
  const p = hlFromSelection();
  if (p) { HL.pend = p; return hlFabShow(p.rect, "add"); }
  if (HL.pend && HL.pend.mode === "add") hlFabHide();
}
document.addEventListener("selectionchange", () => {
  clearTimeout(HL.timer);
  HL.timer = setTimeout(hlOnSelection, 140);
});
// keep the pill next to its text while a page or pop-up scrolls
window.addEventListener("scroll", () => {
  if (!HL.pend) return;
  if (HL.pend.mode === "add") return hlOnSelection();
  const m = document.querySelector(`mark.hl[data-hlid="${CSS.escape(HL.pend.id)}"]`);
  if (m) hlFabShow(m.getBoundingClientRect(), "remove"); else hlFabHide();
}, { capture: true, passive: true });

function hlAdd(p) {
  const lid = p.body.dataset.hl;
  const hit = findLesson(lid);
  const d = hlLoad();
  const rec = d[lid] || (d[lid] = { cat: hit ? hit.c.category : "", title: hit ? hit.l.title : "", items: [] });
  if (hit) { rec.cat = hit.c.category; rec.title = hit.l.title; }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const bi = hlBlocks(p.body).indexOf(p.block);
  rec.items.push({ id, t: p.t, s: p.s, o: p.o, b: bi, at: Date.now() });
  // keep them in reading order on the page
  rec.items.sort((x, y) => (x.b - y.b) || (x.o - y.o));
  hlSave(d);
  hlWrap(p.block, p.a, p.b, id, true);
  sfx.select();
}
function hlRemove(lid, id) {
  const d = hlLoad();
  const rec = d[lid];
  if (!rec) return;
  rec.items = rec.items.filter(h => h.id !== id);
  if (!rec.items.length) delete d[lid];
  hlSave(d);
  document.querySelectorAll(`.ls-body[data-hl="${CSS.escape(lid)}"]`).forEach(b => hlUnwrap(b, id));
}

// pointerdown keeps the text selected on desktop; the action runs on click
hlFab.addEventListener("pointerdown", ev => { ev.preventDefault(); HL.down = true; });
document.addEventListener("pointerup", () => { if (HL.down) setTimeout(() => { HL.down = false; }, 300); }, true);
hlFab.addEventListener("click", ev => {
  ev.stopPropagation();
  HL.down = false;
  const p = HL.pend;
  if (!p) return hlFabHide();
  if (p.mode === "add") {
    hlAdd(p);
    const sel = window.getSelection(); if (sel) sel.removeAllRanges();
  } else {
    hlRemove(p.lid, p.id);
    sfx.tick();
  }
  hlFabHide();
});

/* tap a highlight to offer removing it; tap anywhere else to dismiss */
document.addEventListener("click", ev => {
  if (ev.target === hlFab) return;
  const m = ev.target.closest && ev.target.closest(".ls-body[data-hl] mark.hl");
  const sel = window.getSelection();
  if (m && (!sel || sel.isCollapsed)) {
    HL.pend = { mode: "remove", id: m.dataset.hlid, lid: m.closest(".ls-body").dataset.hl };
    return hlFabShow(m.getBoundingClientRect(), "remove");
  }
  if (HL.pend && HL.pend.mode === "remove") hlFabHide();
});
// keyboard: H highlights the selected text, Esc drops the pill
document.addEventListener("keydown", ev => {
  if (!HL.pend || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if ((ev.key === "h" || ev.key === "H") && HL.pend.mode === "add") {
    ev.preventDefault(); ev.stopPropagation();
    hlFab.click();
  } else if (ev.key === "Escape" && HL.pend.mode === "remove") hlFabHide();
}, true);

/* ---------- tag every lesson body with its lesson id ---------- */
const _hlBaseLesson = viewLesson;
viewLesson = function () {
  const html = _hlBaseLesson();
  return html.replace('<div class="card ls-body"', `<div class="card ls-body" data-hl="${esc(S.lessonId || "")}"`);
};
const _hlBasePeek = lessonPeekHtml;
lessonPeekHtml = function (id) {
  const html = _hlBasePeek(id);
  return html && html.replace('<div class="ls-body">', `<div class="ls-body" data-hl="${esc(id)}">`);
};
if (typeof scrollReadHtml === "function") {
  const _hlBaseScroll = scrollReadHtml;
  scrollReadHtml = function (id) {
    const html = _hlBaseScroll(id);
    return html && html.replace('<div class="ls-body scr-body">', `<div class="ls-body scr-body" data-hl="${esc(id)}">`);
  };
}
// a fresh screen means the old selection is gone
const _hlBaseRender = render;
render = function () {
  _hlBaseRender();
  const p = HL.pend;
  if (p && (p.mode === "remove" ? !document.querySelector(`mark.hl[data-hlid="${CSS.escape(p.id)}"]`) : !document.contains(p.body))) hlFabHide();
};

/* ---------- the highlights panel on the set home ---------- */
/* every lesson with highlights, in deck order; pages that left the deck go last */
function hlEntries() {
  const d = hlLoad(), out = [], seen = new Set();
  S.set.categories.forEach(c => catLessons(c).forEach((l, i) => {
    const rec = d[l.id];
    seen.add(l.id);
    if (!rec || !Array.isArray(rec.items) || !rec.items.length) return;
    // re-render the page off screen to see which highlights still match
    const tmp = document.createElement("template");      // inert, so figure images don't load
    tmp.innerHTML = renderBlocks(l.blocks);
    const blocks = hlBlocks(tmp.content), texts = blocks.map(hlText);
    out.push({ lid: l.id, cat: c.category, col: ck(c.color), no: i + 1, title: l.title,
      items: rec.items.map(h => Object.assign({ gone: !hlLocate(blocks, texts, h) }, h)) });
  }));
  Object.keys(d).forEach(lid => {
    if (seen.has(lid) || !d[lid] || !Array.isArray(d[lid].items) || !d[lid].items.length) return;
    out.push({ lid, cat: d[lid].cat, col: "var(--muted)", no: 0, title: d[lid].title, lost: true,
      items: d[lid].items.map(h => Object.assign({ gone: true }, h)) });
  });
  return out;
}
function hlSentenceHtml(h) {
  const ok = h.s.substr(h.o, h.t.length) === h.t;
  const k = ok ? h.o : h.s.indexOf(h.t);
  if (k < 0) return `<mark>${esc(h.t)}</mark>`;
  return `${esc(h.s.slice(0, k))}<mark>${esc(h.t)}</mark>${esc(h.s.slice(k + h.t.length))}`;
}
function hlEntryHtml(e, opts) {
  const max = opts.rows || Infinity;
  const rows = e.items.slice(0, max).map(h => `<div class="hl-rowwrap">
      <button class="hl-row" data-act="hlOpen" data-id="${esc(e.lid)}" data-h="${esc(h.id)}" ${e.lost ? "disabled" : ""}>${hlSentenceHtml(h)}${h.gone && !e.lost ? `<span class="hl-gone">This page changed since, so it's not marked there anymore</span>` : ""}</button>
      ${opts.del ? `<button class="hl-del" data-act="hlDel" data-id="${esc(e.lid)}" data-h="${esc(h.id)}" title="Remove highlight" aria-label="Remove highlight">✕</button>` : ""}
    </div>`).join("");
  const more = e.items.length > max ? `<div class="hl-more">+${e.items.length - max} more on this page</div>` : "";
  return `<div class="hl-entry" style="--cc:${e.col};--i:${opts.i || 0}">
    <button class="hl-ehead" data-act="hlOpen" data-id="${esc(e.lid)}" ${e.lost ? "disabled" : ""}>
      <span class="hl-ecat">${esc(e.cat)}${e.no ? ` · Lesson ${e.no}` : ""}</span>
      <span class="hl-etitle">${esc(e.title)}${e.lost ? ` <span class="muted">(no longer in this deck)</span>` : ""}</span>
      <span class="hl-ecount">${e.items.length}</span>
    </button>
    ${rows}${more}
  </div>`;
}
function hlPanel() {
  const hasLessons = S.set.categories.some(c => catLessons(c).length);
  const es = hlEntries();
  if (!es.length && !hasLessons) return "";
  const n = es.reduce((a, e) => a + e.items.length, 0);
  const head = `<div class="hl-phead"><span class="eyebrow" style="color:var(--star)"><span class="hl-swatch"></span>Highlights</span>${n ? `<span class="hl-total">${n}</span>` : ""}</div>`;
  if (!es.length) return `<aside class="hl-panel empty">${head}
    <div class="hl-empty">Select any line on a 📖 lesson page and tap <b>Highlight</b>. It'll show up here so you can review it later.</div></aside>`;
  // two pages fit inline; three or more go in the highlights window
  const inline = es.slice(0, 2).map((e, i) => hlEntryHtml(e, { rows: 2, i })).join("");
  const all = es.length > 2 ? `<button class="hl-all" data-act="hlAll">See all ${es.length} pages ›</button>` : "";
  return `<aside class="hl-panel">${head}${inline}${all}</aside>`;
}
function hlWindowHtml() {
  const es = hlEntries();
  const n = es.reduce((a, e) => a + e.items.length, 0);
  return `<div class="rd-head">
      <div><div class="eyebrow" style="color:var(--star)">Highlights</div>
      <div style="font-size:22px;font-weight:bold;margin-top:2px">${n} from ${es.length} page${es.length === 1 ? "" : "s"}</div></div>
      <button class="rd-x" data-act="closeModal" aria-label="Close">✕</button>
    </div>
    <div class="muted" style="font-size:12.5px;line-height:1.5;margin:0 0 14px">Read them over, then tap one to jump to it on its page.</div>
    ${es.length ? es.map((e, i) => hlEntryHtml(e, { del: true, i })).join("") : `<div class="hl-empty">Nothing highlighted yet.</div>`}`;
}
function hlOpenWindow() {
  showModal(hlWindowHtml());
  const m = document.querySelector("#overlay .modal");
  if (m) m.classList.add("wide", "hl-modal");
}

const _hlBaseSetHome = viewSetHome;
viewSetHome = function () {
  const html = _hlBaseSetHome();
  const panel = hlPanel();
  if (!panel) return html;
  // phones: sits just above the chapters; wide screens: CSS floats it to the right
  const anchor = '<div class="eyebrow" style="margin-bottom:10px">Quiz by chapter</div>';
  const i = html.indexOf(anchor);
  const out = i < 0 ? html.replace(/<\/div>\s*$/, panel + "</div>") : html.slice(0, i) + panel + html.slice(i);
  return out.replace('<div class="wrap">', '<div class="wrap hl-wrap">');
};

document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act;
  if (act === "hlAll") { sfx.tick(); return hlOpenWindow(); }
  if (act === "hlOpen") {
    const hit = findLesson(t.dataset.id);
    if (!hit) return;
    if (modalOpen()) closeModal();
    S.cat = hit.c.category;
    S.lessonId = hit.l.id;
    S.hlFocus = t.dataset.h || "first";
    sfx.tick();
    return goto("lesson");
  }
  if (act === "hlDel") {
    hlRemove(t.dataset.id, t.dataset.h);
    sfx.tick();
    const row = t.closest(".hl-rowwrap");
    const swap = () => {
      const m = document.querySelector("#overlay .modal");
      if (m) { const top = m.scrollTop; m.innerHTML = hlWindowHtml(); m.scrollTop = top; }
      if (S.screen === "setHome") render();
    };
    if (row) { row.classList.add("out"); setTimeout(swap, 220); } else swap();
  }
});

(function () {
  const st = document.createElement("style");
  st.id = "highlights-css";
  st.textContent = `
/* the marker: amber from the theme's star color, so it reads in every theme */
mark.hl { color: inherit; border-radius: 3px; padding: 0 1px; cursor: pointer;
  background: linear-gradient(transparent 8%, color-mix(in srgb, var(--star) 34%, transparent) 8%, color-mix(in srgb, var(--star) 34%, transparent) 94%, transparent 94%);
  background-repeat: no-repeat; background-size: 100% 100%;
  -webkit-box-decoration-break: clone; box-decoration-break: clone; }
mark.hl.new { animation: hlSweep .55s cubic-bezier(.22,.8,.3,1) both; }
mark.hl.pulse { animation: hlPulse 1.6s ease-in-out .25s 2; }
@keyframes hlSweep { from { background-size: 0% 100%; } to { background-size: 100% 100%; } }
@keyframes hlPulse { 50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--star) 35%, transparent); } }

#hlFab { position: fixed; z-index: 9995; display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px; border-radius: 999px;
  font-family: inherit; font-size: 13.5px; color: var(--text); cursor: pointer; white-space: nowrap;
  background: color-mix(in srgb, var(--surface) 78%, transparent); border: 1px solid color-mix(in srgb, var(--star) 45%, var(--border2));
  backdrop-filter: blur(14px) saturate(1.3); -webkit-backdrop-filter: blur(14px) saturate(1.3);
  box-shadow: 0 10px 28px var(--shadow), inset 0 1px 0 color-mix(in srgb, #fff 14%, transparent);
  opacity: 0; transform: translateY(6px) scale(.94); pointer-events: none; visibility: hidden;
  transition: opacity .2s ease, transform .26s var(--ease-pop), visibility 0s .2s; -webkit-user-select: none; user-select: none; touch-action: manipulation; }
#hlFab.on { opacity: 1; transform: none; pointer-events: auto; visibility: visible; transition: opacity .2s ease, transform .26s var(--ease-pop); }
#hlFab:active { transform: scale(.95); }
#hlFab .hl-x { color: var(--bad); font-size: 12px; }
.hl-swatch { display: inline-block; width: 12px; height: 12px; border-radius: 4px; vertical-align: -1px; margin-right: 6px;
  background: color-mix(in srgb, var(--star) 55%, transparent); border: 1px solid var(--star); }
#hlFab .hl-swatch { margin-right: 0; }

/* panel on the set home */
.hl-panel { position: relative; text-align: left; margin: 0 0 20px; padding: 14px 14px 12px; border-radius: 16px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--star) 7%, transparent), transparent 55%), color-mix(in srgb, var(--surface) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--star) 22%, var(--border));
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 26px color-mix(in srgb, var(--shadow) 55%, transparent), inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent);
  animation: hlIn .45s cubic-bezier(.22,.8,.3,1) both; }
.hl-phead { display: flex; align-items: center; justify-content: space-between; margin: 0 2px 10px; }
.hl-total { font-size: 12px; font-weight: bold; color: var(--star); background: color-mix(in srgb, var(--star) 14%, transparent); border-radius: 999px; padding: 2px 9px; }
.hl-empty { font-size: 13px; line-height: 1.55; color: var(--dim); margin: 0 2px 2px; }
.hl-panel.empty { padding-bottom: 14px; }
.hl-entry { border-radius: 12px; background: color-mix(in srgb, var(--surface2) 70%, transparent); border: 1px solid var(--border);
  border-left: 3px solid var(--cc); padding: 4px 4px 6px; margin-bottom: 8px;
  animation: hlIn .4s cubic-bezier(.22,.8,.3,1) both; animation-delay: calc(var(--i) * 70ms + 80ms); }
.hl-ehead { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; width: 100%; text-align: left; background: none; border: none; color: var(--text);
  font-family: inherit; padding: 8px 10px 6px; cursor: pointer; border-radius: 9px; }
.hl-ehead:disabled { cursor: default; }
.hl-ecat { grid-column: 1; font-size: 10.5px; letter-spacing: 2px; text-transform: uppercase; color: var(--cc); }
.hl-etitle { grid-column: 1; font-size: 15px; font-weight: bold; line-height: 1.3; }
.hl-ecount { grid-column: 2; grid-row: 1 / span 2; align-self: center; min-width: 22px; text-align: center; font-size: 11.5px; font-weight: bold; color: var(--star); background: color-mix(in srgb, var(--star) 12%, transparent); border-radius: 999px; padding: 2px 7px; }
.hl-rowwrap { display: flex; align-items: stretch; gap: 4px; transition: opacity .2s ease, transform .22s ease; }
.hl-rowwrap.out { opacity: 0; transform: translateX(10px); }
.hl-row { flex: 1; display: block; text-align: left; background: none; border: none; border-radius: 9px; color: var(--dim); cursor: pointer;
  font-family: inherit; font-size: 13.5px; line-height: 1.55; padding: 6px 10px; transition: background-color .18s ease; }
.hl-row:disabled { cursor: default; }
.hl-row mark, .hl-ehead mark { color: var(--text); background: color-mix(in srgb, var(--star) 32%, transparent); border-radius: 3px; padding: 0 2px;
  -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.hl-panel .hl-row { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.hl-gone { display: block; font-size: 11px; color: var(--muted); font-style: italic; margin-top: 3px; }
.hl-del { flex: 0 0 30px; background: none; border: none; color: var(--muted); cursor: pointer; border-radius: 8px; font-size: 12px; }
.hl-more { font-size: 11.5px; color: var(--muted); padding: 2px 10px 2px; }
.hl-all { display: block; width: 100%; margin-top: 2px; padding: 10px; border-radius: 10px; background: none; cursor: pointer; font-family: inherit;
  font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--star); border: 1px dashed color-mix(in srgb, var(--star) 40%, var(--border)); transition: background-color .18s ease; }
@media (hover: hover) {
  .hl-ehead:not(:disabled):hover, .hl-row:not(:disabled):hover { background: color-mix(in srgb, var(--star) 9%, transparent); }
  .hl-del:hover { color: var(--bad); }
  .hl-all:hover { background: color-mix(in srgb, var(--star) 8%, transparent); }
}
.hl-modal .hl-entry { margin-bottom: 10px; }
@keyframes hlIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .hl-panel, .hl-entry, mark.hl.new, mark.hl.pulse { animation: none !important; } }

/* wide screens: the panel floats in its own column on the right */
@media (min-width: 1100px) {
  .wrap.hl-wrap { max-width: 1100px; padding-right: 380px; position: relative; }
  .hl-wrap > .hl-panel { position: absolute; top: 96px; right: 20px; width: 340px; margin: 0; }
}
`;
  document.head.appendChild(st);
})();
