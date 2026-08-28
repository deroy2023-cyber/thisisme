import { chromium } from 'playwright';
import { PNG } from 'pngjs';

// The seam is the whole illusion: the overlay unmounts and the hero's entrance
// plays onto the surface the bar just became. If the colour jumps on that frame,
// it reads as a cut. Sampled as REAL PIXELS off screenshots, because what is
// being tested is what the compositor actually paints.
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

// One pixel near the top-left corner: it is covered by the expanded bar, and
// after the handover it is hero background. Centre would be dominated by the
// photograph's subject and is a poor colour probe.
const probe = async () => {
  const buf = await p.screenshot({ clip: { x: 40, y: 40, width: 4, height: 4 } });
  const png = PNG.sync.read(buf);
  return [png.data[0], png.data[1], png.data[2]];
};

const rows = [];
for (let i = 0; i < 26; i++) {
  const target = t0 + 5800 + i * 180;
  const wait = target - Date.now();
  if (wait > 0) await p.waitForTimeout(wait);
  const t = +((Date.now() - t0) / 1000).toFixed(2);
  const present = await p.evaluate(() => !!document.querySelector('[class*="z-[200]"]'));
  const rgb = await probe();
  rows.push({ t, overlay: present, rgb });
}

console.log('t      overlay  corner rgb');
for (const r of rows) console.log(`${r.t.toFixed(2)}  ${r.overlay ? 'yes' : 'NO '}      ${r.rgb.join(',')}`);

const last = rows.filter(r => r.overlay).slice(-1)[0];
const first = rows.filter(r => !r.overlay)[0];
if (last && first) {
  const d = Math.max(...[0, 1, 2].map(i => Math.abs(last.rgb[i] - first.rgb[i])));
  console.log(`\nlast covered frame : ${last.rgb.join(',')} @ ${last.t}`);
  console.log(`first bare frame   : ${first.rgb.join(',')} @ ${first.t}`);
  console.log(`max channel delta  : ${d} -> ${d <= 6 ? 'SEAM INVISIBLE' : 'SEAM VISIBLE (colour jump)'}`);
}
console.log('errors:', errs.length ? errs : 'none');

if (SHOTS) {
  const q = await ctx.newPage();
  await q.goto(URL, { waitUntil: 'domcontentloaded' });
  await q.waitForFunction(() => {
    const f = document.querySelector('.pl-fill');
    return f && new DOMMatrix(getComputedStyle(f).transform).a > 0.005;
  }, null, { timeout: 15000 });
  await q.waitForTimeout(7900);
  await q.screenshot({ path: `${SHOTS}/v5-hero-entrance.png` });
  console.log('entrance frame captured');
}
await b.close();
