/* ===================================================================
   spooky.js: Halloween decorations (toggle in Settings → Look)
   On by default from Oct 16 to Nov 10, off the rest of the year unless
   you switch it on. Everything here is decoration: it never blocks taps.
   - cobwebs in the top corners, a spider bobbing on its thread
   - bats that flap across now and then
   - autumn leaves drifting down, low fog along the bottom
   - a jack-o'-lantern on the wordmark, candy-corn progress bars,
     a warm pumpkin glow on cards, a ghost that peeks out sometimes
   =================================================================== */
function hwOn() {
  if (settings.halloween === true || settings.halloween === false) return settings.halloween;
  return typeof seasonNow === "function" && seasonNow() === "halloween";
}
const HW = { layer: null, timers: [] };
const HW_BAT = '<svg viewBox="0 0 64 28" aria-hidden="true"><path d="M32 10c-2-4-5-5-5-5s1 3 0 5c-4-5-12-8-22-6 5 2 8 6 8 10 3-3 7-3 9 0 1-2 5-3 7-1 1-1 2-2 3-2s2 1 3 2c2-2 6-1 7 1 2-3 6-3 9 0 0-4 3-8 8-10-10-2-18 1-22 6-1-2 0-5 0-5s-3 1-5 5z" fill="currentColor"/></svg>';
const HW_WEB = '<svg viewBox="0 0 120 120" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M0 0L120 120M0 0L60 120M0 0L120 60M0 0L0 120M0 0L120 0"/><path d="M0 22Q12 12 22 0M0 46Q26 30 46 0M0 72Q42 46 72 0M0 100Q58 62 100 0"/></g></svg>';
const HW_SPIDER = '<svg viewBox="0 0 30 30" aria-hidden="true"><g stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M10 14L3 9M10 16L2 16M10 18L3 23M11 20L6 27M20 14L27 9M20 16L28 16M20 18L27 23M19 20L24 27"/></g><ellipse cx="15" cy="17" rx="6" ry="5.5" fill="currentColor"/><circle cx="15" cy="11" r="3.5" fill="currentColor"/><circle cx="13.6" cy="10.6" r=".9" fill="#f97316"/><circle cx="16.4" cy="10.6" r=".9" fill="#f97316"/></svg>';
const HW_GHOST = '<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M20 2C10 2 4 10 4 20v24l5-4 5 4 6-4 6 4 5-4 5 4V20C36 10 30 2 20 2z" fill="#f8fafc"/><ellipse cx="14" cy="20" rx="3" ry="4" fill="#1e1b2e"/><ellipse cx="26" cy="20" rx="3" ry="4" fill="#1e1b2e"/><ellipse cx="20" cy="30" rx="3" ry="2.5" fill="#1e1b2e"/></svg>';
const HW_PUMPKIN = '<svg viewBox="0 0 40 36" aria-hidden="true"><path d="M20 6c2-4 5-5 7-4-3 1-4 3-5 5z" fill="#4d7c0f"/><ellipse cx="12" cy="21" rx="9" ry="12" fill="#ea580c"/><ellipse cx="28" cy="21" rx="9" ry="12" fill="#ea580c"/><ellipse cx="20" cy="21" rx="9" ry="13" fill="#f97316"/><path d="M13 17l4 3h-5zM27 17l-4 3h5z" fill="#fde047"/><path d="M12 25q8 6 16 0l-3 1-2-2-3 2-3-2-2 2z" fill="#fde047"/></svg>';
const HW_LEAF = ["#ea580c", "#f59e0b", "#b45309", "#dc2626", "#a16207"];

function hwBuild() {
  if (HW.layer) return;
  const L = document.createElement("div");
  L.className = "hw-layer"; L.setAttribute("aria-hidden", "true");
  let leaves = "";
  for (let i = 0; i < 9; i++) {
    const c = HW_LEAF[i % HW_LEAF.length], d = 14 + Math.random() * 14, del = -Math.random() * d, x = Math.random() * 100, sz = 10 + Math.random() * 8;
    leaves += `<i class="hw-leaf" style="left:${x}vw;--d:${d}s;animation-delay:${del}s;--c:${c};width:${sz}px;height:${sz}px;--sw:${(Math.random() * 60 - 30).toFixed(0)}px"></i>`;
  }
  L.innerHTML = `<span class="hw-web l">${HW_WEB}</span><span class="hw-web r">${HW_WEB}</span>
    <span class="hw-spider"><span class="hw-thread"></span>${HW_SPIDER}</span>
    ${leaves}<span class="hw-fog"></span><span class="hw-ghost">${HW_GHOST}</span>`;
  document.body.appendChild(L);
  HW.layer = L;
  // a few bats every so often
  const bats = () => {
    if (!HW.layer || document.hidden) return;
    const n = 1 + Math.floor(Math.random() * 3), top = 8 + Math.random() * 35, rev = Math.random() < 0.5;
    for (let i = 0; i < n; i++) {
      const b = document.createElement("span");
      b.className = "hw-bat" + (rev ? " rev" : "");
      b.innerHTML = HW_BAT;
      b.style.top = (top + i * 4 + Math.random() * 4) + "vh";
      b.style.animationDelay = (i * 0.35) + "s";
      b.style.setProperty("--s", (0.7 + Math.random() * 0.5).toFixed(2));
      HW.layer.appendChild(b);
      setTimeout(() => b.remove(), 9000);
    }
  };
  HW.timers.push(setTimeout(bats, 2500), setInterval(bats, 22000));
  // the ghost peeks out of a bottom corner now and then
  HW.timers.push(setInterval(() => {
    const g = HW.layer && HW.layer.querySelector(".hw-ghost"); if (!g || document.hidden) return;
    g.classList.toggle("left", Math.random() < 0.5);
    g.classList.remove("peek"); void g.offsetWidth; g.classList.add("peek");
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
  .hw-bat { position: absolute; left: -80px; width: calc(54px * var(--s)); color: #1e1033; animation: hwFly 7.5s linear both; }
  [data-theme="midnight"] .hw-bat, [data-theme="sepia"] .hw-bat { color: #0a0510; filter: drop-shadow(0 0 3px rgba(249,115,22,.4)); }
  .hw-bat svg { display: block; animation: hwFlap .22s ease-in-out infinite alternate; }
  .hw-bat.rev { left: auto; right: -80px; animation-name: hwFlyR; }
  .hw-bat.rev svg { transform: scaleX(-1); }
  @keyframes hwFlap { from { transform: scaleY(1); } to { transform: scaleY(.55); } }
  @keyframes hwFly { 0% { transform: translate(0, 0); } 25% { transform: translate(28vw, -3vh); } 50% { transform: translate(55vw, 2vh); } 75% { transform: translate(80vw, -4vh); } 100% { transform: translate(115vw, 0); } }
  @keyframes hwFlyR { 0% { transform: translate(0, 0); } 50% { transform: translate(-55vw, 3vh); } 100% { transform: translate(-115vw, -2vh); } }
  .hw-ghost { position: absolute; right: 14px; bottom: -70px; width: 46px; opacity: .85; }
  .hw-ghost.left { right: auto; left: 14px; }
  .hw-ghost.peek { animation: hwPeek 4.5s ease-in-out both; }
  @keyframes hwPeek { 0% { transform: translateY(0); } 25%,70% { transform: translateY(-82px) rotate(-6deg); } 45% { transform: translateY(-88px) rotate(5deg); } 100% { transform: translateY(0); } }
  .hw-jack { display: inline-block; width: .62em; height: .56em; margin-left: .12em; vertical-align: .05em; animation: hwBob 3s ease-in-out infinite; }
  .hw-jack svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 0 6px rgba(249,115,22,.55)); }
  @keyframes hwBob { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-3px) rotate(4deg); } }
  body.hw .wordmark .l2 { text-shadow: 0 0 18px rgba(249,115,22,.45); }
  body.hw .card { box-shadow: 0 0 0 1px rgba(249,115,22,.08), 0 6px 22px -14px rgba(249,115,22,.55); }
  body.hw .card:hover { box-shadow: 0 0 0 1px rgba(249,115,22,.25), 0 10px 28px -12px rgba(168,85,247,.55); }
  body.hw .segbar, body.hw .tw-progbar, body.hw .xpbar { background-image: repeating-linear-gradient(115deg, rgba(253,224,71,.12) 0 8px, rgba(249,115,22,.12) 8px 16px, rgba(255,255,255,.08) 16px 24px); }
  body.hw .rule { background: linear-gradient(90deg, #f97316, #a855f7, transparent); height: 2px; }
  body.hw .modal { box-shadow: 0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(249,115,22,.18); }
  @media (prefers-reduced-motion: reduce) { .hw-leaf, .hw-bat, .hw-fog, .hw-ghost, .hw-spider, .hw-jack { animation: none !important; } .hw-bat, .hw-leaf { display: none; } }`;
  const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
})();
document.addEventListener("DOMContentLoaded", () => setTimeout(hwApply, 50));
if (document.readyState !== "loading") setTimeout(hwApply, 50);
