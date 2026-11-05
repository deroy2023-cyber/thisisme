/**
 * Global next/image loader (wired up as `images.loaderFile` in next.config.mjs).
 *
 * Why this exists: by default every <Image> went through Vercel's optimizer at
 * /_next/image. On a cache miss Vercel downloads the ORIGINAL from Cloudinary
 * (one work image is a 7.4 MB PNG) and re-encodes it before answering. Every new
 * width x format x deploy is another cold miss, and plan limits on image
 * transformations make new variants fail while cached ones still load. That
 * was the "work pictures / logo sometimes don't load" bug.
 *
 * Cloudinary is already an image CDN, so its URLs get Cloudinary transforms
 * instead. Local /images/* files are pre-compressed (all under 200 KB) and every
 * <Image> pointing at one is marked `unoptimized`, so it is served as one plain
 * static URL (which is also what lets app/layout.tsx preload the logo by exact
 * URL). Nothing goes through /_next/image any more.
 */

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(.*)$/;

/** Params this loader owns; an existing transform's other params (e.g. a
 *  video poster's `so_0` start offset) are kept. */
const OWNED = /^(f|q|w|c)_/;

export function cloudinaryUrl(src: string, width: number, quality?: number): string {
  const m = src.match(CLOUDINARY_UPLOAD);
  if (!m) return src;
  const [, base, rest] = m;

  const segments = rest.split('/');
  let kept: string[] = [];
  // The first segment is a transform unless it is the version (v123) or the
  // public id itself (the last segment).
  if (segments.length > 1 && !/^v\d+$/.test(segments[0])) {
    kept = segments.shift()!.split(',').filter((p) => !OWNED.test(p));
  }

  const transform = [
    ...kept,
    'f_auto',
    `q_${quality ?? 'auto'}`,
    'c_limit', // never upscale past the original
    `w_${width}`,
  ].join(',');

  return `${base}${transform}/${segments.join('/')}`;
}

export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (CLOUDINARY_UPLOAD.test(src)) return cloudinaryUrl(src, width, quality);
  // Fallback for a local file not marked `unoptimized`. The query param is
  // ignored by the file server; it only satisfies next/image's check that the
  // loader uses `width`. Prefer `unoptimized` on local images (see above).
  return `${src}${src.includes('?') ? '&' : '?'}w=${width}`;
}
