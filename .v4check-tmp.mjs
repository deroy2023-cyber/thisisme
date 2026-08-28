import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:3003';
const SHOTS = process.argv[3];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => {
  const f = document.querySelector('.pl-fill');
  return f && new DOMMatrix(getComputedStyle(f).transform).a > 0.005;
}, null, { timeout: 15000 });
const t0 = Date.now();
const rows = [];
while (Date.now() - t0 < 9000) {
  const t = +((Date.now() - t0) / 1000).toFixed(2);
  const s = await p.evaluate(() => {
    const field = document.querySelector('[class*="z-[200]"]');
    if (!field) return null;
    const halves = [...document.querySelectorAll('.pl-half')];
    const m = (n) => new DOMMatrix(getComputedStyle(n).transform);
    const ra = halves[0].getBoundingClientRect();
    const rb = halves[1].getBoundingClientRect();
    return {
      fill: +m(document.querySelector('.pl-fill')).a.toFixed(3),
      sx: +m(halves[0].parentElement).a.toFixed(1),
      sy: +m(halves[0].parentElement).d.toFixed(1),
      yA: Math.round(m(halves[0].parentElement.parentElement).m42),
      yB: Math.round(m(halves[1].parentElement.parentElement).m42),
      gap: Math.round(rb.top - ra.bottom),
      fieldBg: getComputedStyle(field).backgroundColor,
    };
  });
  if (!s) { rows.push({ t, gone: true }); break; }
  rows.push({ t, ...s });
  await p.waitForTimeout(110);
}
const at = (x) => rows.reduce((best, r) => (r.gone ? best : (Math.abs(r.t - x) < Math.abs(best.t - x) ? r : best)), rows[0]);
for (const mk of [1.0, 2.0, 3.0, 4.3, 5.1, 6.0, 6.8, 7.5]) console.log(`t=${mk.toFixed(1)}`, JSON.stringify(at(mk)));
console.log('unmounted at:', (rows.find(r => r.gone) || {}).t);
console.log('errors:', errs.length ? errs : 'none');
if (SHOTS) {
  for (const [n, ms] of [['v4-split', 5100], ['v4-cover', 6800], ['v4-part', 7450]]) {
    const q = await ctx.newPage();
    await q.goto(URL, { waitUntil: 'domcontentloaded' });
    await q.waitForFunction(() => {
      const f = document.querySelector('.pl-fill');
      return f && new DOMMatrix(getComputedStyle(f).transform).a > 0.005;
    }, null, { timeout: 15000 });
    await q.waitForTimeout(ms);
    await q.screenshot({ path: `${SHOTS}/${n}.png` });
    await q.close();
  }
  console.log('frames captured');
}
await b.close();
