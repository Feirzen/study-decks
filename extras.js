/* extras.js - "extra" chapters (category flag  "extra": true).
   They stay in Battle, Shuffle and filters like any chapter, but on the set home they
   don't count toward the Correct/Incorrect/Unanswered stats and are listed at the
   bottom under "Extra practice", next to the practice exam, instead of with the chapters. */

function extraCats(set) { return (set && set.categories || []).filter(c => c.extra); }

function extraCardsHTML(set) {
  const cats = extraCats(set);
  if (!cats.length) return "";
  const cards = cats.map(c => {
    const t = catTally(c);
    const cc = t.done, ci = t.bad, n = t.total || 1;
    const pct = Math.round((cc / n) * 100) || 0;
    const done = cc === t.total;
    const col = ck(c.color);
    const label = done ? "✓ Complete"
      : t.nL ? `${t.qc}/${t.nQ} cards · ${t.lc}/${t.nL} pages` : `${cc}/${t.total} cards`;
    return `<button class="card" data-act="openCat" data-cat="${esc(c.category)}" style="border-color:${done ? "var(--ok)" : "var(--border)"};border-style:dashed;margin-bottom:10px">
      <div class="fill" style="width:${pct}%;background:${tint(c.color, 9)}"></div>
      <div class="row">
        <div style="flex:1">
          <div class="eyebrow" style="color:${col}">${label}</div>
          <div style="font-size:16px;font-weight:bold;margin-top:2px">${esc(c.category)}</div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:3px">Not counted in your stats or readiness. Still in Battle and Shuffle (turn it off in Filters).</div>
          <div class="segbar" style="margin-top:8px"><span style="width:${(cc / n) * 100}%;background:var(--ok)"></span><span style="width:${(ci / n) * 100}%;background:var(--bad)"></span></div>
        </div>
        <div style="font-size:19px;color:${col};font-weight:bold">${pct}%</div>
      </div>
    </button>`;
  }).join("");
  return `<div class="eyebrow" style="margin:26px 0 10px">Extra practice</div>${cards}`;
}

(function () {
  const base = viewSetHome;
  viewSetHome = function () {
    const set = S.set;
    if (!set || !extraCats(set).length) return base();
    const all = set.categories;
    let html;
    try {
      set.categories = all.filter(c => !c.extra);   // stats + chapter list without extras
      html = base();
    } finally {
      set.categories = all;
    }
    const anchor = '<div style="text-align:center;margin-top:34px">';
    const i = html.lastIndexOf(anchor);
    const extra = extraCardsHTML(set);
    return i < 0 ? html + extra : html.slice(0, i) + extra + html.slice(i);
  };
})();
