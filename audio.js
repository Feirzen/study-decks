/* ===================================================================
   audio.js: narrated lessons + overview tracks
   Optional per-set data:
     categories[i].lessons[j].audio = "audio/<class>/<id>.mp3", audioSecs = 245
     set.audio = [{ id, title, file, secs }]          (overview tracks)
   One shared <audio> element plays everything, so a track keeps going
   while you move around the deck. A mini bar at the bottom shows what's
   playing whenever its own player isn't on screen.
   Remembers playback speed (fc:audioSpeed) and where you left off in
   each track (fc:audioPos:<file>). Loaded after exam.js.
   =================================================================== */

const AUD = { el: null, file: null, title: "", sub: "" };
const SPEEDS = [1, 1.25, 1.5, 0.85];
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function audSpeed() { const s = lsGet("fc:audioSpeed", 1); return SPEEDS.includes(s) ? s : 1; }
function audFmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

function audEl() {
  if (AUD.el) return AUD.el;
  const a = new Audio();
  a.preload = "metadata";
  a.addEventListener("timeupdate", () => { audPaint(); if (AUD.file && Math.floor(a.currentTime) % 5 === 0) lsSet("fc:audioPos:" + AUD.file, a.currentTime); });
  a.addEventListener("play", audPaint);
  a.addEventListener("pause", () => { if (AUD.file) lsSet("fc:audioPos:" + AUD.file, a.currentTime); audPaint(); });
  a.addEventListener("loadedmetadata", audPaint);
  a.addEventListener("ended", () => { if (AUD.file) lsSet("fc:audioPos:" + AUD.file, 0); audPaint(); });
  AUD.el = a;
  return a;
}
function audPlay(file, title, sub) {
  const a = audEl();
  if (AUD.file === file) { if (a.paused) a.play().catch(() => {}); else a.pause(); return; }
  if (AUD.file) lsSet("fc:audioPos:" + AUD.file, a.currentTime);
  AUD.file = file; AUD.title = title || ""; AUD.sub = sub || "";
  a.src = file;
  a.playbackRate = audSpeed();
  const pos = lsGet("fc:audioPos:" + file, 0);
  a.addEventListener("loadedmetadata", function once() {
    a.removeEventListener("loadedmetadata", once);
    if (pos > 3 && pos < a.duration - 5) a.currentTime = pos - 2;    // back up a hair so you catch the sentence
    a.playbackRate = audSpeed();
  });
  a.play().catch(() => {});
  if ("mediaSession" in navigator) {
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: AUD.title, artist: AUD.sub || "Study Decks" }); } catch (e) {}
  }
  audPaint();
}

/* ---------- player markup ---------- */
function audPlayer(file, title, sub, secs, big) {
  const playing = AUD.file === file && AUD.el && !AUD.el.paused;
  const cur = AUD.file === file && AUD.el ? AUD.el.currentTime : lsGet("fc:audioPos:" + file, 0);
  const dur = AUD.file === file && AUD.el && AUD.el.duration ? AUD.el.duration : secs || 0;
  return `<div class="au ${big ? "au-big" : ""} ${playing ? "on" : ""}" data-aud="${esc(file)}">
    <button class="au-btn" data-act="audToggle" data-file="${esc(file)}" data-title="${esc(title)}" data-sub="${esc(sub || "")}" aria-label="${playing ? "Pause" : "Play"}">${playing ? AU_PAUSE : AU_PLAY}</button>
    <div class="au-mid">
      <div class="au-t">${esc(title)}</div>
      <input class="au-range" type="range" min="0" max="${Math.round(dur) || 1}" step="1" value="${Math.round(cur)}" data-file="${esc(file)}" aria-label="Seek" data-nonav>
      <div class="au-time"><span class="au-cur">${audFmt(cur)}</span><span>${audFmt(dur)}</span></div>
    </div>
    <button class="au-sp" data-act="audSpeed" title="Playback speed">${audSpeed()}x</button>
  </div>`;
}
const AU_PLAY = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const AU_PAUSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>';

/* live-update every player on screen without re-rendering the page */
function audPaint() {
  const a = AUD.el;
  document.querySelectorAll(".au").forEach(box => {
    const mine = a && box.dataset.aud === AUD.file;
    const playing = mine && !a.paused;
    box.classList.toggle("on", !!playing);
    const btn = box.querySelector(".au-btn");
    if (btn) { const want = playing ? AU_PAUSE : AU_PLAY; if (btn.innerHTML !== want) btn.innerHTML = want; }
    if (!mine) return;
    const r = box.querySelector(".au-range");
    if (r && a.duration) { r.max = Math.round(a.duration); if (!r._drag) r.value = Math.round(a.currentTime); }
    const c = box.querySelector(".au-cur"); if (c) c.textContent = audFmt(a.currentTime);
    const t = box.querySelectorAll(".au-time span")[1]; if (t && a.duration) t.textContent = audFmt(a.duration);
  });
  audMini();
}

/* mini bar: shows when something is playing and its full player isn't visible */
function audMini() {
  let bar = document.getElementById("auMini");
  const a = AUD.el;
  const show = a && AUD.file && !a.ended && (a.currentTime > 0 || !a.paused) &&
    !document.querySelector(`#app .au[data-aud="${CSS.escape(AUD.file)}"]`);
  if (!show) { if (bar) bar.classList.remove("up"); return; }
  if (!bar) {
    bar = document.createElement("div"); bar.id = "auMini";
    document.body.appendChild(bar);
  }
  const p = a.duration ? (a.currentTime / a.duration) * 100 : 0;
  bar.innerHTML = `<div class="aum-fill" style="width:${p}%"></div>
    <button class="au-btn" data-act="audToggle" data-file="${esc(AUD.file)}" aria-label="Play or pause">${a.paused ? AU_PLAY : AU_PAUSE}</button>
    <div class="aum-t"><b>${esc(AUD.title)}</b><span>${audFmt(a.currentTime)} / ${audFmt(a.duration)}</span></div>
    <button class="aum-x" data-act="audStop" aria-label="Stop">✕</button>`;
  requestAnimationFrame(() => bar.classList.add("up"));
}

/* ---------- events ---------- */
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act;
  if (act === "audToggle") { ev.stopPropagation(); return audPlay(t.dataset.file, t.dataset.title || AUD.title, t.dataset.sub || AUD.sub); }
  if (act === "audSpeed") {
    const s = SPEEDS[(SPEEDS.indexOf(audSpeed()) + 1) % SPEEDS.length];
    lsSet("fc:audioSpeed", s);
    if (AUD.el) AUD.el.playbackRate = s;
    document.querySelectorAll(".au-sp").forEach(b => b.textContent = s + "x");
    return;
  }
  if (act === "audStop") { if (AUD.el) { AUD.el.pause(); lsSet("fc:audioPos:" + AUD.file, AUD.el.currentTime); } AUD.file = null; return audMini(); }
}, true);
document.addEventListener("input", ev => {
  const r = ev.target.closest && ev.target.closest(".au-range");
  if (!r) return;
  r._drag = true;
  const c = r.closest(".au").querySelector(".au-cur"); if (c) c.textContent = audFmt(+r.value);
});
document.addEventListener("change", ev => {
  const r = ev.target.closest && ev.target.closest(".au-range");
  if (!r) return;
  r._drag = false;
  const f = r.dataset.file;
  if (AUD.file !== f) { lsSet("fc:audioPos:" + f, +r.value + 2); const box = r.closest(".au"); const b = box.querySelector(".au-btn"); return audPlay(f, b.dataset.title, b.dataset.sub); }
  AUD.el.currentTime = +r.value;
});
// keep arrow keys / Enter from the app's keyboard nav off the slider
document.addEventListener("keydown", ev => { if (ev.target.classList && ev.target.classList.contains("au-range")) ev.stopPropagation(); }, true);

/* ---------- hooks ---------- */
const _audBaseLesson = viewLesson;
viewLesson = function () {
  const html = _audBaseLesson();
  const hit = findLesson(S.lessonId);
  if (!hit || !hit.l.audio) return html;
  const anchor = '<div class="card ls-body"';
  const i = html.indexOf(anchor);
  if (i < 0) return html;
  const player = `<div class="au-wrap">${audPlayer(hit.l.audio, hit.l.title, hit.c.category, hit.l.audioSecs, true)}</div>`;
  return html.slice(0, i) + player + html.slice(i);
};
const _audBasePeek = lessonPeekHtml;
lessonPeekHtml = function (id) {
  const html = _audBasePeek(id);
  const hit = findLesson(id);
  if (!html || !hit || !hit.l.audio) return html;
  // docked at the bottom of the pop-up so play/pause stays in reach while you scroll the reading
  return html + `<div class="pk-au">${audPlayer(hit.l.audio, hit.l.title, hit.c.category, hit.l.audioSecs)}</div>`;
};
const _audBaseSetHome = viewSetHome;
viewSetHome = function () {
  const html = _audBaseSetHome();
  const tracks = S.set.audio || [];
  const nLessons = S.set.categories.reduce((n, c) => n + catLessons(c).filter(l => l.audio).length, 0);
  if (!tracks.length) return html;
  const block = `<div class="eyebrow" style="margin:0 0 10px">🎧 Listen</div>
    <div class="au-list">${tracks.map(t => audPlayer(t.file, t.title, S.set.class, t.secs)).join("")}</div>
    ${nLessons ? `<div class="muted" style="font-size:12px;margin:-4px 0 20px">Every 📖 lesson page also has its own narrated track at the top.</div>` : ""}`;
  const anchor = '<div class="eyebrow" style="margin-bottom:10px">Quiz by chapter</div>';
  const i = html.indexOf(anchor);
  return i < 0 ? html : html.slice(0, i) + block + html.slice(i);
};
const _audBaseRender = render;
render = function () { _audBaseRender(); audPaint(); };

(function () {
  const st = document.createElement("style");
  st.id = "audio-css";
  st.textContent = `
.au { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px; padding: 10px 12px; margin-bottom: 8px; transition: border-color .25s, box-shadow .25s; }
.au.on { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accBg); }
.au-big { margin-bottom: 14px; }
.au-wrap { animation: auIn .35s cubic-bezier(.22,.8,.3,1) both; }
@keyframes auIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.au-btn { flex: 0 0 42px; width: 42px; height: 42px; border-radius: 50%; border: none; background: var(--accent); color: var(--bg); display: grid; place-items: center; cursor: pointer; padding: 0; transition: transform .15s cubic-bezier(.175,.885,.32,1.275); }
.au-btn:active { transform: scale(.9); }
.au-btn svg { margin-left: 1px; }
.au.on .au-btn { animation: auPulse 2.4s ease-in-out infinite; }
@keyframes auPulse { 0%,100% { box-shadow: 0 0 0 0 var(--accBg); } 50% { box-shadow: 0 0 0 7px transparent; } }
@media (prefers-reduced-motion: reduce) { .au.on .au-btn, .au-wrap { animation: none; } }
.au-mid { flex: 1; min-width: 0; }
.au-t { font-size: 13.5px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
.au-range { width: 100%; height: 18px; margin: 0; accent-color: var(--accent); cursor: pointer; background: transparent; }
.au-time { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
.au-sp { flex: 0 0 auto; background: var(--surface2); border: 1px solid var(--border); color: var(--dim); border-radius: 999px; padding: 6px 10px; font-size: 12px; cursor: pointer; font-family: inherit; min-width: 50px; }
.au-list { margin-bottom: 14px; }
.pk-au { position: sticky; bottom: -22px; z-index: 2; margin: 14px -20px -22px; padding: 10px 20px 14px; background: var(--surface); border-top: 1px solid var(--border); box-shadow: 0 -10px 18px -12px var(--shadow); }
.pk-au .au { margin-bottom: 0; }
#auMini { position: fixed; left: 50%; bottom: 14px; transform: translate(-50%, 140%); width: min(560px, calc(100% - 24px)); display: flex; align-items: center; gap: 12px;
  background: var(--surface); border: 1.5px solid var(--accent); border-radius: 16px; padding: 8px 10px; box-shadow: 0 10px 30px var(--shadow); z-index: 60; overflow: hidden;
  transition: transform .4s cubic-bezier(.22,.8,.3,1); }
#auMini.up { transform: translate(-50%, 0); }
#auMini .au-btn { flex-basis: 36px; width: 36px; height: 36px; }
.aum-fill { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--accent); transition: width .3s linear; }
.aum-t { flex: 1; min-width: 0; display: flex; flex-direction: column; font-size: 12.5px; }
.aum-t b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.aum-t span { color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.aum-x { background: none; border: none; color: var(--muted); font-size: 15px; cursor: pointer; padding: 6px 8px; }
`;
  document.head.appendChild(st);
})();
