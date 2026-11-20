/* figs.js - diagrams in lesson pages and questions, with tap-to-zoom.
   Lesson block:   { "img": "img/chem-481/exam-3/x.png", "cap": "caption" }
                   or { "img": { "src": "...", "cap": "..." } }
   Question field: "img": "img/..."  or  { "src": "...", "cap": "..." }
   Loaded after the other add-ons. Other files call figHTML/qFig only when defined. */

function figHTML(f, cls, capOverride) {
  if (!f) return "";
  const src = typeof f === "string" ? f : f.src;
  const cap = capOverride || (typeof f === "string" ? "" : (f.cap || ""));
  const capHTML = cap ? `<figcaption>${typeof fmt === "function" ? fmt(cap) : esc(cap)}</figcaption>` : "";
  return `<figure class="fig ${cls || ""}">
    <button type="button" class="fig-img" data-fig="${esc(src)}" data-cap="${esc(cap)}" aria-label="Zoom diagram">
      <img src="${esc(src)}" alt="${esc(cap || "Diagram")}" loading="lazy" decoding="async">
      <span class="fig-zoom" aria-hidden="true">⤢</span>
    </button>${capHTML}</figure>`;
}
function qFig(q) { return q && q.img ? figHTML(q.img, "qfig") : ""; }

(function () {
  const css = `
  .fig { margin: 4px 0 16px; }
  .fig-img { display: block; width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 14px;
    background: #fff; cursor: zoom-in; position: relative; transition: transform .25s ease, box-shadow .25s ease; }
  .fig-img:hover { transform: translateY(-1px); box-shadow: 0 8px 22px var(--shadow); }
  .fig-img img { display: block; width: 100%; height: auto; margin: 0 auto; border-radius: 6px; }
  .qfig { margin: 0 0 16px; }
  .qfig .fig-img img { max-height: 280px; width: auto; max-width: 100%; }
  .fig-zoom { position: absolute; right: 8px; bottom: 8px; width: 26px; height: 26px; border-radius: 8px;
    background: rgba(15,15,19,.65); color: #fff; font-size: 15px; line-height: 26px; text-align: center;
    opacity: .75; pointer-events: none; }
  .fig figcaption { font-size: 12.5px; color: var(--muted); margin-top: 7px; line-height: 1.45; text-align: center; }
  .figbox { position: fixed; inset: 0; z-index: 9999; background: rgba(8,8,12,.88); backdrop-filter: blur(6px);
    display: flex; flex-direction: column; opacity: 0; transition: opacity .22s ease; }
  .figbox.on { opacity: 1; }
  .figbox-bar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; color: #eee; font-size: 13px; }
  .figbox-bar .cap { flex: 1; opacity: .85; }
  .figbox-bar button { background: rgba(255,255,255,.12); color: #fff; border: 0; border-radius: 10px;
    padding: 8px 12px; font-size: 14px; cursor: pointer; }
  .figbox-scroll { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; padding: 0 12px 24px; }
  .figbox-scroll img { display: block; margin: 0 auto; background: #fff; border-radius: 10px; padding: 8px;
    width: auto; max-width: 100%; transition: width .25s ease; cursor: zoom-in; }
  .figbox.big .figbox-scroll img { max-width: none; width: 230%; cursor: zoom-out; }
  @media (min-width: 900px) { .figbox.big .figbox-scroll img { width: 160%; } }
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function close() {
    const b = document.querySelector(".figbox");
    if (!b) return;
    b.classList.remove("on");
    setTimeout(() => b.remove(), 220);
  }
  function open(src, cap) {
    close();
    const b = document.createElement("div");
    b.className = "figbox";
    b.innerHTML = `<div class="figbox-bar"><span class="cap"></span>
      <button type="button" data-fz="zoom">Zoom</button><button type="button" data-fz="close">✕</button></div>
      <div class="figbox-scroll"><img alt=""></div>`;
    b.querySelector(".cap").textContent = cap || "Tap the picture to zoom, scroll to move around";
    const img = b.querySelector("img");
    img.src = src;
    img.alt = cap || "Diagram";
    b.addEventListener("click", e => {
      const t = e.target;
      if (t.closest('[data-fz="close"]')) return close();
      if (t.closest('[data-fz="zoom"]') || t === img) {
        b.classList.toggle("big");
        b.querySelector('[data-fz="zoom"]').textContent = b.classList.contains("big") ? "Fit" : "Zoom";
        return;
      }
      if (t.classList.contains("figbox-scroll")) close();
    });
    document.body.appendChild(b);
    requestAnimationFrame(() => b.classList.add("on"));
  }
  document.addEventListener("click", e => {
    const btn = e.target.closest && e.target.closest(".fig-img");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    open(btn.dataset.fig, btn.dataset.cap);
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
})();
