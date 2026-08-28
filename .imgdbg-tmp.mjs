import { chromium } from 'playwright';
const ROOT = '[class*="z-[200]"]';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
p.on('response', r => { if (r.url().includes('_next/image') || r.url().includes('cloudinary')) console.log('IMG', r.status(), Math.round(performance.now()), r.url().slice(0, 80)); });
await p.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });
const t0 = Date.now();
for (let i = 0; i < 12; i++) {
  await p.waitForTimeout(700);
  const s = await p.evaluate(() => {
    const img = document.querySelector('#hero img');
    const wrap = img ? img.closest('[style*="opacity"]') : null;
    return {
      exists: !!img,
      complete: img ? img.complete : null,
      natW: img ? img.naturalWidth : 0,
      imgOpacity: img ? +getComputedStyle(img).opacity : 0,
      parentOpacity: wrap ? +getComputedStyle(wrap).opacity : null,
      currentSrc: img ? (img.currentSrc || '').slice(-40) : '',
    };
  });
  console.log(`${((Date.now()-t0)/1000).toFixed(1)}s`, JSON.stringify(s));
}
await b.close();
