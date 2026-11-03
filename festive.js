/* ===================================================================
   festive.js: Christmas decorations (toggle in Settings → Look)
   On by default from Dec 1 to Dec 31, off the rest of the year unless
   you switch it on. Everything here is decoration: it never blocks taps.
   - snow drifting down, a soft snowbank along the bottom
   - a string of twinkling lights across the top
   - a red ornament on the wordmark (tap it for sleigh bells)
   - candy-cane progress bars, a warm red and green glow on cards
   =================================================================== */
function xmOn() {
  if (settings.christmas === true || settings.christmas === false) return settings.christmas;
  return typeof seasonNow === "function" && seasonNow() === "christmas";
}
const XM = { layer: null, timers: [] };
const XM_BULBS = ["#ef4444", "#22c55e", "#facc15", "#3b82f6", "#f472b6"];
const XM_ORNAMENT = '<svg viewBox="0 0 36 42" aria-hidden="true"><path d="M18 2v5" stroke="#a8a29e" stroke-width="1.5"/><rect x="13" y="6" width="10" height="5" rx="1.2" fill="#eab308"/><circle cx="18" cy="26" r="15" fill="#dc2626"/><path d="M4 23q14 6 28 0" stroke="#fde68a" stroke-width="2" fill="none"/><path d="M4.6 30q13.4 6 26.8 0" stroke="#fde68a" stroke-width="1.4" fill="none" opacity=".7"/><ellipse cx="12" cy="18" rx="3.5" ry="5" fill="#fff" opacity=".35" transform="rotate(30 12 18)"/></svg>';
const XM_FLAKE = '<svg viewBox="0 0 20 20" aria-hidden="true"><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M10 1v18M2.2 5.5l15.6 9M2.2 14.5l15.6-9"/><path d="M7.5 2.8 10 5l2.5-2.2M7.5 17.2 10 15l2.5 2.2"/></g></svg>';

const xmSfx = {
  bells() {                                                // a little sleigh-bell jingle
    for (let i = 0; i < 7; i++) bell(NOTE(88 + (i % 3) * 2), i * 0.07 + Math.random() * 0.02, { vol: 0.02, dur: 0.5, wet: 0.35 });
    [76, 79, 84].forEach((n, i) => mallet(NOTE(n), 0.12 + i * 0.13, { dur: 0.6, vol: 0.045, bright: 0.6, wet: 0.45 }));
  },
};
function xmBuild() {
  if (XM.layer) return;
  const L = document.createElement("div");
  L.className = "xm-layer"; L.setAttribute("aria-hidden", "true");
  let flakes = "";
  for (let i = 0; i < 16; i++) {
    const d = 12 + Math.random() * 14, del = -Math.random() * d, x = Math.random() * 100, sz = 5 + Math.random() * 9;
    flakes += `<i class="xm-flake" style="left:${x}vw;--d:${d}s;animation-delay:${del}s;width:${sz}px;height:${sz}px;--sw:${(Math.random() * 50 - 25).toFixed(0)}px">${sz > 10 ? XM_FLAKE : ""}</i>`;
  }
  let bulbs = "";
  const n = 14;
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n * 100, y = 6 + Math.sin((i + 0.5) / n * Math.PI * 3) * 4 + 6;
    bulbs += `<i class="xm-bulb" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}px;--c:${XM_BULBS[i % XM_BULBS.length]};animation-delay:${(-(i * 0.37) % 2.4).toFixed(2)}s"></i>`;
  }
  const wire = Array.from({ length: 61 }, (_, i) => { const t = i / 60; return `${(t * 100).toFixed(2)},${(6 + Math.sin(t * Math.PI * 3) * 4 + 4).toFixed(2)}`; }).join(" ");
  L.innerHTML = `<span class="xm-lights"><svg viewBox="0 0 100 20" preserveAspectRatio="none"><polyline points="${wire}" fill="none" stroke="currentColor" stroke-width=".6" vector-effect="non-scaling-stroke"/></svg>${bulbs}</span>
    ${flakes}<span class="xm-bank"></span>`;
  document.body.appendChild(L);
  XM.layer = L;
}
function xmTear() {
  XM.timers.forEach(t => { clearTimeout(t); clearInterval(t); }); XM.timers = [];
  if (XM.layer) XM.layer.remove(); XM.layer = null;
}
function xmApply() {
  const on = xmOn();
  document.body.classList.toggle("xm", on);
  if (on) { xmBuild(); xmDecorate(); } else { xmTear(); document.querySelectorAll(".xm-orn").forEach(x => x.remove()); }
}
/* small touches inside the app's own screens, redone after each render */
function xmDecorate() {
  if (!document.body.classList.contains("xm")) return;
  const wm = document.querySelector("#app .wordmark");
  if (wm && !wm.querySelector(".xm-orn")) (wm.querySelector(".l2") || wm).insertAdjacentHTML("beforeend", `<span class="xm-orn">${XM_ORNAMENT}</span>`);
}
document.addEventListener("click", ev => {
  if (!document.body.classList.contains("xm")) return;
  const o = ev.target.closest(".xm-orn");
  if (o) { ev.stopPropagation(); xmSfx.bells(); o.classList.remove("swing"); void o.offsetWidth; o.classList.add("swing"); }
}, true);
const _xmRender = render;
render = function () { _xmRender(); xmDecorate(); document.body.classList.toggle("xm-busy", ["quiz", "shuffle", "battle", "exam"].includes(S.screen)); };

(function () {
  const css = `
  .xm-layer { position: fixed; inset: 0; pointer-events: none; z-index: 5; overflow: hidden; }
  .xm-lights { position: absolute; top: 0; left: 0; right: 0; height: 26px; color: rgba(148,163,184,.45); }
  .xm-lights svg { position: absolute; inset: 0; width: 100%; height: 20px; }
  .xm-bulb { position: absolute; width: 7px; height: 10px; margin-left: -3.5px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    background: var(--c); box-shadow: 0 0 8px var(--c); animation: xmTwinkle 2.4s ease-in-out infinite; }
  @keyframes xmTwinkle { 0%,100% { opacity: 1; } 50% { opacity: .35; box-shadow: none; } }
  .xm-flake { position: absolute; top: -20px; border-radius: 50%; background: rgba(255,255,255,.75); color: rgba(255,255,255,.8);
    animation: xmFall var(--d) linear infinite; transition: opacity .6s ease; }
  .xm-flake:has(svg) { background: none; }
  .xm-flake svg { display: block; width: 100%; height: 100%; }
  [data-theme="paper"] .xm-flake, [data-theme="sepia"] .xm-flake { background: rgba(148,163,184,.55); color: rgba(100,116,139,.55); }
  [data-theme="paper"] .xm-flake:has(svg), [data-theme="sepia"] .xm-flake:has(svg) { background: none; }
  @keyframes xmFall { 0% { transform: translate(0, -5vh) rotate(0); } 50% { transform: translate(var(--sw), 50vh) rotate(90deg); } 100% { transform: translate(0, 108vh) rotate(180deg); } }
  body.xm-busy .xm-flake { opacity: .15; }
  .xm-bank { position: absolute; left: -10%; right: -10%; bottom: -40px; height: 110px;
    background: radial-gradient(ellipse at 25% 100%, rgba(255,255,255,.14), transparent 62%), radial-gradient(ellipse at 70% 100%, rgba(186,230,253,.12), transparent 60%); }
  .xm-orn { cursor: pointer; display: inline-block; width: .5em; height: .58em; margin-left: .12em; vertical-align: .02em; transform-origin: 50% 0; animation: xmSway 3.4s ease-in-out infinite; }
  .xm-orn svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 0 6px rgba(220,38,38,.55)); }
  .xm-orn.swing { animation: xmSwing .9s cubic-bezier(.2,.9,.3,1.2); }
  @keyframes xmSway { 0%,100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
  @keyframes xmSwing { 20% { transform: rotate(22deg); } 45% { transform: rotate(-16deg); } 70% { transform: rotate(8deg); } }
  body.xm .wordmark .l2 { text-shadow: 0 0 18px rgba(220,38,38,.4); }
  body.xm .card { box-shadow: 0 0 0 1px rgba(34,197,94,.08), 0 6px 22px -14px rgba(220,38,38,.55); }
  body.xm .card:hover { box-shadow: 0 0 0 1px rgba(220,38,38,.25), 0 10px 28px -12px rgba(34,197,94,.5); }
  body.xm .segbar, body.xm .tw-progbar, body.xm .xpbar { background-image: repeating-linear-gradient(115deg, rgba(239,68,68,.16) 0 8px, rgba(255,255,255,.1) 8px 16px); }
  body.xm .rule { background: linear-gradient(90deg, #dc2626, #16a34a, transparent); height: 2px; }
  body.xm .modal { box-shadow: 0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(220,38,38,.18); }
  @media (prefers-reduced-motion: reduce) { .xm-flake, .xm-bulb, .xm-orn { animation: none !important; } .xm-flake { display: none; } }`;
  const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
})();
document.addEventListener("DOMContentLoaded", () => setTimeout(xmApply, 50));
if (document.readyState !== "loading") setTimeout(xmApply, 50);
