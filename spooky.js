/* ===================================================================
   spooky.js: Halloween decorations (toggle in Settings → Look)
   On by default from Oct 16 to Nov 10, off the rest of the year unless
   you switch it on. Everything here is decoration: it never blocks taps.
   - cobwebs in the top corners, a spider bobbing on its thread
   - quiet sounds: a ghost "boo", wind, tap the pumpkin for an organ run
   - autumn leaves drifting down, low fog along the bottom
   - a jack-o'-lantern on the wordmark, candy-corn progress bars,
     a warm pumpkin glow on cards, a ghost that peeks out sometimes
   =================================================================== */
function hwOn() {
  if (settings.halloween === true || settings.halloween === false) return settings.halloween;
  return typeof seasonNow === "function" && seasonNow() === "halloween";
}
const HW = { layer: null, timers: [] };
function hwWeb(seed) {
  let x = seed; const R = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  const spokes = [], n = 8;
  for (let i = 0; i < n; i++) { const ang = (i / (n - 1)) * Math.PI / 2 + (i && i < n - 1 ? (R() - 0.5) * 0.12 : 0); spokes.push({ ang, len: 96 + R() * 22 }); }
  const pt = (sp, r) => [Math.cos(sp.ang) * r, Math.sin(sp.ang) * r];
  let d = spokes.map(sp => { const [ex, ey] = pt(sp, sp.len); return `M0 0L${ex.toFixed(1)} ${ey.toFixed(1)}`; }).join("");
  [16, 31, 47, 63, 79, 95].forEach((r0, k) => {
    for (let i = 0; i < n - 1; i++) {
      if (k > 3 && R() < 0.18) continue;                      // a few broken strands
      const r1 = Math.min(r0 + R() * 4, spokes[i].len - 2), r2 = Math.min(r0 + R() * 4, spokes[i + 1].len - 2);
      const [x1, y1] = pt(spokes[i], r1), [x2, y2] = pt(spokes[i + 1], r2);
      const mid = (spokes[i].ang + spokes[i + 1].ang) / 2, sag = (r1 + r2) / 2 * 0.8;
      d += `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${(Math.cos(mid) * sag).toFixed(1)} ${(Math.sin(mid) * sag).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
  });
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round"/></svg>`;
}
const HW_SPIDER = '<svg viewBox="0 0 30 30" aria-hidden="true"><g stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M10 14L3 9M10 16L2 16M10 18L3 23M11 20L6 27M20 14L27 9M20 16L28 16M20 18L27 23M19 20L24 27"/></g><ellipse cx="15" cy="17" rx="6" ry="5.5" fill="currentColor"/><circle cx="15" cy="11" r="3.5" fill="currentColor"/><circle cx="13.6" cy="10.6" r=".9" fill="#f97316"/><circle cx="16.4" cy="10.6" r=".9" fill="#f97316"/></svg>';
const HW_GHOST = '<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M20 2C10 2 4 10 4 20v24l5-4 5 4 6-4 6 4 5-4 5 4V20C36 10 30 2 20 2z" fill="#f8fafc"/><ellipse cx="14" cy="20" rx="3" ry="4" fill="#1e1b2e"/><ellipse cx="26" cy="20" rx="3" ry="4" fill="#1e1b2e"/><ellipse cx="20" cy="30" rx="3" ry="2.5" fill="#1e1b2e"/></svg>';
const HW_PUMPKIN = '<svg viewBox="0 0 40 36" aria-hidden="true"><path d="M20 6c2-4 5-5 7-4-3 1-4 3-5 5z" fill="#4d7c0f"/><ellipse cx="12" cy="21" rx="9" ry="12" fill="#ea580c"/><ellipse cx="28" cy="21" rx="9" ry="12" fill="#ea580c"/><ellipse cx="20" cy="21" rx="9" ry="13" fill="#f97316"/><path d="M13 17l4 3h-5zM27 17l-4 3h5z" fill="#fde047"/><path d="M12 25q8 6 16 0l-3 1-2-2-3 2-3-2-2 2z" fill="#fde047"/></svg>';
const HW_LEAF = ["#ea580c", "#f59e0b", "#b45309", "#dc2626", "#a16207"];

/* soft, sparse sounds (quiet when the app is muted) */
const hwSfx = {
  boo() {                                                  // a wobbly little ghost "ooOOoo"
    chip(NOTE(64), 0, 1.1, { wave: "tri", vol: 0.035, vib: 6, to: NOTE(57), slide: 1.1, wet: 0.5 });
    chip(NOTE(71), 0.08, 0.9, { wave: "tri", vol: 0.018, vib: 5, to: NOTE(64), slide: 0.9, wet: 0.5 });
    hush(0, 0.9, { type: "lowpass", f1: 900, f2: 300, vol: 0.025, atk: 0.3, wet: 0.3 });
  },
  wind() { hush(0, 2.6, { type: "bandpass", f1: 300, f2: 900, q: 0.8, vol: 0.022, atk: 1.1, wet: 0.4 }); },
  pumpkin() {                                              // a spooky little organ run
    [57, 60, 63, 66, 69].forEach((n, i) => mallet(NOTE(n), i * 0.11, { dur: 0.7, vol: 0.06, bright: 0.4, wet: 0.5 }));
    bell(NOTE(81), 0.6, { vol: 0.025, dur: 1.6 });
  },
  skitter() { for (let i = 0; i < 5; i++) crunch(i * 0.045, 0.025, { f1: 4000, f2: 2500, vol: 0.02, step: 2 }); },
};
function hwBuild() {
  if (HW.layer) return;
  const L = document.createElement("div");
  L.className = "hw-layer"; L.setAttribute("aria-hidden", "true");
  let leaves = "";
  for (let i = 0; i < 9; i++) {
    const c = HW_LEAF[i % HW_LEAF.length], d = 14 + Math.random() * 14, del = -Math.random() * d, x = Math.random() * 100, sz = 10 + Math.random() * 8;
    leaves += `<i class="hw-leaf" style="left:${x}vw;--d:${d}s;animation-delay:${del}s;--c:${c};width:${sz}px;height:${sz}px;--sw:${(Math.random() * 60 - 30).toFixed(0)}px"></i>`;
  }
  L.innerHTML = `<span class="hw-web l">${hwWeb(7)}</span><span class="hw-web r">${hwWeb(31)}</span>
    <span class="hw-spider"><span class="hw-thread"></span>${HW_SPIDER}</span>
    ${leaves}<span class="hw-fog"></span><span class="hw-ghost">${HW_GHOST}</span>`;
  document.body.appendChild(L);
  HW.layer = L;
  // a soft gust of wind now and then
  HW.timers.push(setInterval(() => { if (!document.hidden && Math.random() < 0.5) hwSfx.wind(); }, 47000));
  // the ghost peeks out of a bottom corner now and then
  HW.timers.push(setInterval(() => {
    const g = HW.layer && HW.layer.querySelector(".hw-ghost"); if (!g || document.hidden) return;
    g.classList.toggle("left", Math.random() < 0.5);
    g.classList.remove("peek"); void g.offsetWidth; g.classList.add("peek");
    if (Math.random() < 0.6) setTimeout(() => hwSfx.boo(), 900);
  }, 31000));
}
function hwTear() {
  HW.timers.forEach(t => { clearTimeout(t); clearInterval(t); }); HW.timers = [];
  if (HW.layer) HW.layer.remove(); HW.layer = null;
}
function hwApply() {
  const on = hwOn();
  document.body.classList.toggle("hw", on);
  if (on) { hwBuild(); hwDecorate(); } else hwTear();
}
/* small touches inside the app's own screens, redone after each render */
function hwDecorate() {
  if (!document.body.classList.contains("hw")) return;
  const wm = document.querySelector("#app .wordmark");
  if (wm && !wm.querySelector(".hw-jack")) (wm.querySelector(".l2") || wm).insertAdjacentHTML("beforeend", `<span class="hw-jack">${HW_PUMPKIN}</span>`);
}
document.addEventListener("click", ev => {
  if (!document.body.classList.contains("hw")) return;
  const j = ev.target.closest(".hw-jack");
  if (j) { ev.stopPropagation(); hwSfx.pumpkin(); j.classList.remove("hop"); void j.offsetWidth; j.classList.add("hop"); return; }
  const g = ev.target.closest(".hw-ghost");
  if (g) { hwSfx.boo(); g.classList.remove("peek"); void g.offsetWidth; g.classList.add("peek"); }
}, true);
const _hwRender = render;
render = function () { _hwRender(); hwDecorate(); document.body.classList.toggle("hw-busy", ["quiz", "shuffle", "battle", "exam"].includes(S.screen)); };

(function () {
  const css = `
  .hw-layer { position: fixed; inset: 0; pointer-events: none; z-index: 5; overflow: hidden; }
  .hw-web { position: absolute; top: 0; width: 110px; height: 110px; color: rgba(226,232,240,.18); }
  .hw-web.l { left: 0; } .hw-web.r { right: 0; transform: scaleX(-1); }
  [data-theme="light"] .hw-web, [data-theme="sepia"] .hw-web { color: rgba(60,40,30,.16); }
  .hw-spider { position: absolute; top: 0; left: 18px; width: 22px; animation: hwDangle 7s ease-in-out infinite; transform-origin: top center; color: #1c1917; }
  .hw-spider svg { display: block; width: 22px; height: 22px; filter: drop-shadow(0 0 2px rgba(249,115,22,.35)); }
  .hw-thread { display: block; width: 1px; height: 34px; margin: 0 auto; background: rgba(226,232,240,.35); }
  [data-theme="midnight"] .hw-spider, body:not([data-theme]) .hw-spider { color: #2e1065; }
  @keyframes hwDangle { 0%,100% { transform: translateY(-22px) rotate(-3deg); } 50% { transform: translateY(0) rotate(3deg); } }
  .hw-leaf { position: absolute; top: -20px; border-radius: 0 70% 0 70%; background: var(--c); opacity: .5;
    animation: hwFall var(--d) linear infinite; }
  @keyframes hwFall { 0% { transform: translate(0, -5vh) rotate(0); } 50% { transform: translate(var(--sw), 50vh) rotate(200deg); } 100% { transform: translate(0, 108vh) rotate(380deg); } }
  body.hw-busy .hw-leaf { opacity: .14; }
  .hw-leaf { transition: opacity .6s ease; }
  .hw-fog { position: absolute; left: -10%; right: -10%; bottom: -30px; height: 120px;
    background: radial-gradient(ellipse at 30% 100%, rgba(167,139,250,.16), transparent 60%), radial-gradient(ellipse at 75% 100%, rgba(249,115,22,.12), transparent 60%);
    animation: hwFog 18s ease-in-out infinite alternate; }
  @keyframes hwFog { from { transform: translateX(-3%); } to { transform: translateX(3%); } }
  .hw-ghost { position: absolute; right: 14px; bottom: -70px; width: 46px; opacity: .85; pointer-events: auto; cursor: pointer; }
  .hw-ghost.left { right: auto; left: 14px; }
  .hw-ghost.peek { animation: hwPeek 4.5s ease-in-out both; }
  @keyframes hwPeek { 0% { transform: translateY(0); } 25%,70% { transform: translateY(-82px) rotate(-6deg); } 45% { transform: translateY(-88px) rotate(5deg); } 100% { transform: translateY(0); } }
  .hw-jack { cursor: pointer; display: inline-block; width: .62em; height: .56em; margin-left: .12em; vertical-align: .05em; animation: hwBob 3s ease-in-out infinite; }
  .hw-jack svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 0 6px rgba(249,115,22,.55)); }
  .hw-jack.hop { animation: hwHop .5s cubic-bezier(.2,.9,.3,1.4); }
  @keyframes hwHop { 40% { transform: translateY(-10px) rotate(10deg) scale(1.15); } }
  @keyframes hwBob { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-3px) rotate(4deg); } }
  body.hw .wordmark .l2 { text-shadow: 0 0 18px rgba(249,115,22,.45); }
  body.hw .card { box-shadow: 0 0 0 1px rgba(249,115,22,.08), 0 6px 22px -14px rgba(249,115,22,.55); }
  body.hw .card:hover { box-shadow: 0 0 0 1px rgba(249,115,22,.25), 0 10px 28px -12px rgba(168,85,247,.55); }
  body.hw .segbar, body.hw .tw-progbar, body.hw .xpbar { background-image: repeating-linear-gradient(115deg, rgba(253,224,71,.12) 0 8px, rgba(249,115,22,.12) 8px 16px, rgba(255,255,255,.08) 16px 24px); }
  body.hw .rule { background: linear-gradient(90deg, #f97316, #a855f7, transparent); height: 2px; }
  body.hw .modal { box-shadow: 0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(249,115,22,.18); }
  @media (prefers-reduced-motion: reduce) { .hw-leaf, .hw-fog, .hw-ghost, .hw-spider, .hw-jack { animation: none !important; } .hw-leaf { display: none; } }`;
  const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
})();
document.addEventListener("DOMContentLoaded", () => setTimeout(hwApply, 50));
if (document.readyState !== "loading") setTimeout(hwApply, 50);
