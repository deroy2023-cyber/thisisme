import { chromium } from 'playwright';

// Spike: does a mix-blend-mode:multiply panel at z-200 actually let the hero
// show through white text? Everything in v3 depends on this. Injected at
// body level, which is where the real overlay sits (ReactLenis root adds no
// wrapper, so the preloader is a sibling of the page content).
const SHOTS = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
await p.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });
// Let the existing intro finish so the hero is fully up underneath.
await p.waitForTimeout(11000);

const result = await p.evaluate(() => {
  const panel = document.createElement('div');
  panel.id = 'spike';
  panel.style.cssText =
    'position:fixed;inset:0;z-index:200;background:#000;mix-blend-mode:multiply;' +
    'display:flex;align-items:center;justify-content:center;pointer-events:none';
  const t = document.createElement('div');
  t.id = 'spike-word';
  t.textContent = 'ATWO';
  t.style.cssText =
    'color:#fff;font-family:"Coolvetica Heavy Compressed",sans-serif;' +
    'font-size:22vw;line-height:0.8;white-space:nowrap';
  panel.appendChild(t);
  document.body.appendChild(panel);
  return {
    parent: panel.parentElement.tagName,
    blend: getComputedStyle(panel).mixBlendMode,
    wordBox: (() => { const r = t.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
  };
});
console.log('panel:', JSON.stringify(result));
await p.waitForTimeout(400);
await p.screenshot({ path: SHOTS + '/spike-knockout.png' });

// Sample pixels: inside a letter stroke should be photo (non-black); outside
// the word should be pure black.
const px = await p.evaluate(async () => {
  const t = document.getElementById('spike-word');
  const r = t.getBoundingClientRect();
  return { left: r.left, top: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
});
console.log('word rect:', JSON.stringify(px));
await b.close();
