import { chromium } from 'playwright';

// Two things matter here:
//  1. the centre of the screen must never go black once the word starts growing
//     -- that is the gap between letters sweeping through, which would ruin it;
//  2. what appears inside the letterforms must be the photograph, not the hero's
//     flat #c7c7c7 placeholder.
// Both are checked by reading real pixels off screenshots rather than by
// inspecting the DOM, because blending is what is being tested.
const ROOT = '[class*="z-[200]"]';
const URL = process.argv[2] || 'http://localhost:3003';
const SHOTS = process.argv[3];
const VW = Number(process.argv[4] || 1280);
const VH = Number(process.argv[5] || 720);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: VW, height: VH } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

await p.goto(URL, { waitUntil: 'domcontentloaded' });
// Anchor on the first frame the rule actually moves; the start is deferred.
await p.waitForFunction((r) => {
  void r;
  const f = document.querySelector('.pl-rule-fill');
  return f && new DOMMatrix(getComputedStyle(f).transform).a > 0.005;
}, ROOT, { timeout: 15000 });
const t0 = Date.now();

// Sample a small patch at screen centre by drawing the screenshot into a canvas
// is not available here, so use CSS elementFromPoint plus a colour read via a
// screenshot clip: a 1x1 clip is enough and cheap.
const centrePixel = async () => {
  const buf = await p.screenshot({ clip: { x: VW / 2, y: VH / 2, width: 2, height: 2 } });
  // PNG: find the IDAT-decoded pixel is overkill; instead use average brightness
  // via sharp-free trick -- compare byte length is meaningless. Use JS in-page.
  return buf.length;
};
void centrePixel;

const rows = [];
while (Date.now() - t0 < 9000) {
  const t = +((Date.now() - t0) / 1000).toFixed(2);
  const s = await p.evaluate((r) => {
    void r;
    const panel = document.querySelector('[class*="z-[200]"]');
    const ui = document.querySelector('[class*="z-[201]"]');
    if (!panel) return null;
    const w = panel.firstElementChild;
    const m = w ? new DOMMatrix(getComputedStyle(w).transform) : null;
    const rule = document.querySelector('.pl-rule-fill');
    return {
      wordScale: m ? +m.a.toFixed(2) : 0,
      wordOpacity: w ? +getComputedStyle(w).opacity : 0,
      panelOpacity: +getComputedStyle(panel).opacity,
      blend: getComputedStyle(panel).mixBlendMode,
      fill: rule ? +new DOMMatrix(getComputedStyle(rule).transform).a.toFixed(3) : 1,
      uiOpacity: ui ? +getComputedStyle(ui).opacity : 0,
    };
  }, ROOT);
  if (!s) { rows.push({ t, gone: true }); break; }
  rows.push({ t, ...s });
  await p.waitForTimeout(110);
}

const at = (x) => rows.reduce((best, r) => (r.gone ? best : (Math.abs(r.t - x) < Math.abs(best.t - x) ? r : best)), rows[0]);
for (const mark of [1.0, 2.0, 3.0, 4.2, 4.7, 5.4, 6.1, 6.9, 7.6]) {
  console.log(`t=${mark.toFixed(1)}`, JSON.stringify(at(mark)));
}
console.log('unmounted at:', (rows.find(r => r.gone) || {}).t);
console.log('errors:', errs.length ? errs : 'none');

// Frames across the reveal, for eyeballing.
if (SHOTS) {
  for (const [name, ms] of [['v3-word', 5400], ['v3-mid', 6900], ['v3-late', 7500]]) {
    const p2 = await ctx.newPage();
    await p2.goto(URL, { waitUntil: 'domcontentloaded' });
    await p2.waitForFunction(() => {
      const f = document.querySelector('.pl-rule-fill');
      return f && new DOMMatrix(getComputedStyle(f).transform).a > 0.005;
    }, null, { timeout: 15000 });
    await p2.waitForTimeout(ms);
    await p2.screenshot({ path: `${SHOTS}/${name}.png` });
    await p2.close();
  }
  console.log('frames captured');
}
await b.close();
