---
title: "Images bypass Vercel's optimizer: Cloudinary loader + unoptimized local files"
author: L
date: 2026-11-05
branch: fix/footer-wordmark-fonts
cost: { minutes: 13, tokens: 159123 }
id: l-7b1eb7c7
scope: repo
status: active
src: agent
touches:
  - src/lib/image-loader.ts
  - src/components/layout/navbar.tsx
  - src/components/layout/nav-links.tsx
  - src/components/layout/fullscreen-menu.tsx
  - app/layout.tsx
  - src/components/ui/work-card.tsx
  - src/components/sections/hero.tsx
  - status.md
  - src/components/sections/portfolio.tsx
---

## Decided
- All next/image goes through `images.loaderFile` = src/lib/image-loader.ts. Cloudinary URLs get Cloudinary transforms (f_auto,q_auto,c_limit,w_N; an existing transform's other params like a video poster's so_0 are kept). Local /images/* <Image>s are marked `unoptimized`. Nothing should hit /_next/image.
- Why: the "work pictures / top-left logo sometimes don't load" bug. Vercel's optimizer fetched huge Cloudinary originals (7.4 MB PNG) and re-encoded them (AVIF first) on every cold miss; plan transformation limits make new variants fail while cached ones still load. The production Vercel project is NOT in the connected Vercel MCP account, so its logs weren't readable; this was diagnosed from code plus live curl probes.
- Hero desktop <img> uses cloudinaryUrl() with srcset 768/1280/1510. The source is only 1510 px wide, so don't add larger widths.

## Tried and ruled out
- A manual <link rel=preload> for the logo in app/layout.tsx: React 19 SSR already emits one for the eager/high-priority mobile logo <img> (navbar.tsx), so it came out duplicated. Removed.
- A local-file loader branch returning `src?w=N`: makes the preload URL mismatch and the srcset fake. Use `unoptimized` instead.

## Watch out
- The desktop logo (nav-links.tsx) mounts after the preloader inside an overflow-hidden mask at y:-130%. A lazy image fully clipped by an ancestor isn't fetched until it intersects. Keep it loading="eager" and on the same URL as the navbar.tsx logo (that URL is what React preloads).
- Adding a new local <Image> without `unoptimized` falls into the loader's `?w=` fallback; add `unoptimized`.
- Removing `crossOrigin` from the Cloudinary preconnect was deliberate: images and video are no-cors. Fonts on framerusercontent keep it.
