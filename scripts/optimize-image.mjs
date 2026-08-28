/**
 * Convert a source image to a compressed WebP derivative.
 *
 * Usage:
 *   node scripts/optimize-image.mjs <input> <output> [--height N] [--quality N]
 *
 * WebP rather than AVIF for logos/marks: it keeps a real alpha channel at very
 * small file sizes, decodes faster, and is supported everywhere Next's image
 * pipeline runs. next.config.mjs still lists AVIF first, so Next will serve an
 * AVIF derivative to browsers that accept one — this just makes the *source*
 * small so every derivative starts from less data.
 */
import sharp from "sharp";

const [, , input, output, ...rest] = process.argv;

if (!input || !output) {
  console.error(
    "usage: node scripts/optimize-image.mjs <input> <output> [--height N] [--quality N]"
  );
  process.exit(1);
}

const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(rest[i + 1]);
};

const height = flag("height", null);
const quality = flag("quality", 82);

const src = sharp(input);
const meta = await src.metadata();

let pipeline = src;
// Only ever downscale. Enlarging a source adds bytes without adding detail.
if (height && meta.height && height < meta.height) {
  pipeline = pipeline.resize({ height, withoutEnlargement: true });
}

const info = await pipeline
  .webp({ quality, effort: 6, alphaQuality: 100 })
  .toFile(output);

const before = meta.size ?? (await sharp(input).toBuffer()).length;
const pct = ((1 - info.size / before) * 100).toFixed(1);

console.log(`${input} → ${output}`);
console.log(`  ${meta.width}x${meta.height} → ${info.width}x${info.height}`);
console.log(
  `  ${(before / 1024).toFixed(1)} KB → ${(info.size / 1024).toFixed(1)} KB  (-${pct}%)`
);
