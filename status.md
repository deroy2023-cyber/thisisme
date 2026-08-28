# Project Status

## Current Phase: Optimization complete — pending browser QA
**Status:** Phases 0–4 done. Phase 5 (design tweaks) and Phase 6 (SEO/meta) still open.

Last updated: 2026-08-28

---

## Phase Progress

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Dev-server process leak (machine hangs) | ✅ Done |
| Phase 1 | Blank-screen bug + hangs | ✅ Done |
| Phase 2 | Scroll / animation performance | ✅ Done |
| Phase 3 | Orbit slider optimization | ✅ Done |
| Phase 4 | Bundle, assets, config | ✅ Done |
| Phase 5 | Minor Design Changes | 🚧 In Progress |
| Phase 6 | Meta Tags & SEO | Not Started |
| Phase 7 | Final browser verification | ⏳ Pending (see below) |

---

## What changed

### Phase 0 — Dev server was crashing the laptop
Root cause was **not** the website code. 279 orphaned `node.exe` processes running
`.next/dev/build/postcss.js` had accumulated (parent long dead), holding ~1 GB and
leaving 0.7 GB free of 15.3 GB. Starting a dev server pushed the machine into swap.

- Killed the 279 orphans; free RAM 0.7 GB → 3.85 GB.
- Added `scripts/clean-workers.mjs` + a `predev` hook so stale dev processes for
  **this project only** are reaped before every `npm run dev`.
- Added `npm run dev:clean` (also wipes `.next`).
- Cleared the 281 MB stale `.next`; excluded `node_modules` from Windows indexing.
- Verified live: a stop leaves 1 stale process, and `predev` reaps it on next start.

Note on project size: `src` + `app` + `public` total **under 1 MB**. The 1.25 GB is
`.git` (651 MB, mostly old committed videos now on Cloudinary — left alone by
choice), `node_modules` (417 MB, normal), `.next` (regenerable).

### Phase 1 — Blank screen and hangs
- **Removed the preloader entirely.** Its effect depended on `onComplete`, an inline
  arrow recreated on every render, while `page.tsx` re-rendered on every scroll
  frame — so scrolling during the 3s intro reset its timers forever and the black
  overlay never lifted. That was the blank page.
- Guarded per-frame `setState` in `page.tsx` (`setIsScrolled`) and `services.tsx`
  (`setBoxDone`).
- Rewrote `custom-cursor.tsx` to motion values — **zero React re-renders** on mouse
  move (was `setState` at pointer rate).
- Batched `ScrollTrigger.refresh()` in `text-block-animation.tsx` — 3 instances
  mount per service hover, each previously forcing a synchronous full-document
  reflow.

### Phase 2 — Scroll smoothness
- Lenis `duration` 2.0 → 1.1 (was multiplying every scroll listener's cost by ~120
  frames per wheel notch); restored GSAP `lagSmoothing`.
- Services split-reveal: animated flex `width` → animated **CSS grid `fr` track**.
- `.strike-line`: `width` → `scaleX`. Removed permanent `willChange` from the hero.
- Grain overlay: kept the texture, dropped the infinite full-viewport blend repaint.
- Particles 35 → 12, paused when the hero leaves the viewport.
- WhyChooseUs cards: dropped `backdrop-blur` over a playing video (kept the look via
  `bg-black/90`); `boxShadow` spring → CSS border transition.
- Consolidated 3 unthrottled global `mousemove` listeners into rAF-coalesced ones.
- Removed a leaked `IntersectionObserver` in `hero.tsx`.

### Phase 3 — Orbit slider
- `memo()` on `OrbitPanel`; stable `useCallback`/`useMemo` handlers (the old inline
  closures made React re-run every video `ref` on every render).
- `PASSES` 2 → 1: ten panels → five.
- `<video>` now mounts only for the active panel ±1; others show their poster.
- Moved a render-phase ref mutation into an effect.

### Phase 4 — Bundle and assets
- Below-fold sections converted to `next/dynamic`.
- Deleted `projects-showcase.tsx` (dead, not imported anywhere).
- **`public/images` 82 MB → 284 KB**: removed 10 unreferenced files (verified by
  grep), converted `services-bg.png` (16 MB) and `project-bg.jpg` (6 MB) to WebP at
  2560px — visually compared before/after, no perceptible difference.
- `next.config.mjs`: AVIF+WebP formats, 30-day `minimumCacheTTL`, pinned Turbopack
  root (silences the wrong-workspace warning).
- `layout.tsx`: preconnect/dns-prefetch for Cloudinary and framerusercontent.
- WhyChooseUs background video: added poster, `preload="none"`, plays only in view.

### Phase 5 — Minor design changes (in progress)
**Portfolio card entrance animation.** The OUR WORK grid was the only repeated card
surface on the site with no reveal at all — cards sat at full opacity while every
neighbouring section animated in, so the grid read as unfinished.

- Extracted the inline card JSX from `portfolio.tsx` into `src/components/ui/work-card.tsx`.
- Staggered reveal via `motion/react` variants: card `opacity 0→1`, `y 40→0`,
  `scale 0.97→1`; image settles `1.08→1`. Expo-out `[0.16, 1, 0.3, 1]`, 1s, 0.12s apart.
- `viewport={{ once: true }}` — cards do not replay on scroll-back. (Several existing
  `whileInView` usages in the codebase omit this and do replay; not changed here.)
- Entrance scale and the existing `group-hover:scale-105` are split across two nested
  elements so Motion and CSS never write `transform` on the same node.
- `useReducedMotion()` respected — fade only, no travel or scale. Second place in the
  codebase to honour the preference (after `video-stack.tsx`).
- Only `opacity`/`transform` animate, so the reveal is layout-neutral and does not
  affect the Phase 7 CLS target. No per-frame React state added.
- Fixed the card anchors while extracting: `target='blank'` → `_blank`, added
  `rel="noopener noreferrer"`, and made the `<a>` a block filling the card.

Known leftover, out of scope: `footer.tsx:66` and `:75` still use `target="blank"`.

**Preloader — "two bars" (ATWO)** (`src/components/preloader.tsx`).
Choreographed against a reference video the client supplied. In the reference a
loading bar resolves into that studio's "L" logomark and scales up until its white
fill becomes the page. The transferable idea is not the letter: the bar WAS the mark
all along, so 100% is a *reveal of identity*, and the mark's fill doubles as the page
transition. ATWO's version, the client's own idea: the bar splits into **two** bars —
A-TWO — then expands to cover and parts like curtains to reveal the hero.

- Beats (reference seconds): roll `0–4.0` · flash + tilt `4.0–4.9` · **split `4.9–5.6`**
  · expand `5.6–6.7` · **hand-off 6.7** · hold · **curtains `7.2–8.0`**.
- The stacked split is nearly free geometrically: each half's scale origin sits on its
  INNER edge (top grows up, bottom grows down), so the two always meet exactly at the
  shared seam at any scale — no position maths, no gap to keep closed. Both fills share
  one `scaleX`, so while loading it reads as a single unbroken bar.
- Cover-scale is projected from the live viewport onto the slab's rotated axes.
  Verified 5/5 coverage at 1280×720, 2560×1080, 3440×1440, 768×1180, 375×812.
- Rotation, offset and scale sit on **separate nested nodes**: GSAP composes
  translate→rotate→scale, so a translate is never multiplied by the scale beneath it,
  and the curtains follow the tilt for free.
- `onDone` fires at 6.7, 1.3 s before unmount, so the hero's own 2 s image fade runs
  behind full cover. Released at the reveal instead, the red parted onto a bare
  `#c7c7c7` placeholder.
- The overlay's own background is dropped to transparent at hand-off, or the curtains
  reveal `bg-off-black` rather than the site.

**Counter.** Rolls `000→100` on 3 masked columns over an 11-cell strip (0-9 plus a
repeated 0, so the odometer wrap lands on an identical glyph and is invisible).
- The load curve is **measured off the reference** — 17/56/99 at 1/2/3 s, then a full
  second crawling 99→100 — interpolated with **monotone cubic Hermite
  (Fritsch–Carlson)**. Monotone specifically: plain Catmull-Rom overshoots the 99→100
  crawl and on an integer counter that shows as the number ticking backwards. Replaces
  four linear segment tweens that left three velocity kinks in the roll.
- The ones column rolls continuously; only tens and hundreds park and carry. Applying
  the carry threshold to every place (the first version) meant each digit snapped
  through in the last 15% of its cycle — near the fast middle that is a ~6 ms jump every
  ~40 ms, which read as flicker.
- **Fixed `em` column widths, not width-from-content.** Sized to the glyph, a column
  resizes the instant Coolvetica arrives from the Framer CDN (`font-display: swap`) and
  the whole number jumps off its anchor mid-roll. Verified with the woff2 held back
  3.2 s: `left` and `bottom` both constant at 33 px, cell width constant at 134.9 px
  across the swap.
- Anchored on `--spacing-menu-gutter` at both edges, so the margins are even and equal.

**Performance.** Profiled with a rAF + Long Task harness, production build, before and
after. Numbers at 1× CPU, measuring the *visible intro window* rather than whole-page
frames (frames dropped before the roll begins are invisible):
- **Long tasks inside the intro: 0.** The intro's start is now deferred until
  `document.fonts.ready` AND an idle slot (1.4 s hard cap so a dead CDN cannot stall it).
  Previously the roll began inside hydration — a 680 ms long task ~875 ms in, with 17 of
  23 dropped frames landing across the counter. The number visibly froze and jumped,
  which was most of what "the numbers aren't smooth" actually was.
- Dropped frames in the intro: 7.3% → **6.1%** after trimming the slab cover-scale
  safety factor from 1.6 to 1.15 (a smaller composited quad).
- `FloatingParticles` now takes `loading`: it was animating 12 `mix-blend-mode` layers
  for the whole intro, behind an opaque overlay, invisibly.
- Animated layers are promoted with `will-change: transform` for the duration and
  cleared on completion (a permanent one is its own leak — hero.tsx had exactly that
  removed in Phase 2). The `#D60000` flash is an instant `set`, not a `backgroundColor`
  tween, which is a paint property.
- Residual jank is the last ~2 s: the hero's own entrance (full-viewport image scaling
  1.3→1, `mix-blend-difference` title) overlapping the curtains. Compositing, not
  main-thread. Untouched — it is the approved hero design, and 0 long tasks occur there.

**Two things measured and rejected, recorded so they are not retried:**
- *Gating the grain overlay on `!loading`.* Looked like a free win (it is invisible under
  the z-200 overlay anyway). Measured identical: 33 dropped / 1330 ms of long tasks
  ungated vs 33 / 1475 ms gated. Reverted. An earlier run appeared to show a dramatic
  improvement, but that was a stale `next start` holding the port and serving a 500 for a
  renamed chunk — the page never hydrated, so nothing was animating. The profiler now
  asserts the intro actually ran before reporting.
- *Deferring the below-fold sections.* In dev they cost 318 ms + 237 ms of long tasks
  mid-roll, but that is a dev artifact of lazy chunk loading. In production the cost is
  ~886 ms and mostly outside the roll. Not worth pulling server-rendered markup out of
  the SSR HTML against Phase 6 (SEO).

**Scroll lock.** Owned by a dedicated effect keyed on `lenis` — **not** the ref-mirror
pattern, which cannot work here: `useLenis()` is undefined on first render and the
once-only timeline would capture only that pass. `stop()` must precede the
`scrollTo(0, { force: true })` reset or the reset is cancelled. A second reset 300 ms
later catches a wheel event dispatched pre-hydration that the compositor applies just as
the lock engages — that leaked ~400 px on roughly one run in three, and the curtains then
parted onto the wrong part of the site.

**Not repeating the Phase 1 deletion bug.** The timeline lives in `useGSAP` with an empty
dep array and `onDone` held in a ref, so no parent re-render can restart it; `page.tsx`
also passes a `useCallback`. A failsafe timeout, armed when the timeline actually starts,
releases the page if it never completes. Regression-tested with continuous scroll spam
from first paint: still clears, Lenis restarts.

**Session skip is production-only.** Disabled in development, and `?intro` forces a play
in production — otherwise the intro plays once and every reload in that tab silently
skips it, which looks exactly like the animation is broken.

⚠️ **Accepted trade-off, signed off by the client:** the reference's ~8 s timing sits in
front of the LCP element, so **LCP < 2.5 s will not pass on a cold first load**.
`TIMESCALE` at the top of the file is the single knob that compresses the whole timeline
without re-choreographing it (2 → ~4 s). Phase 7 should record the measured LCP rather
than treat it as a failure.

Caveat for future measurement: `smooth-scroll.tsx` sets `gsap.ticker.lagSmoothing(500, 33)`,
so GSAP absorbs dropped frames and the timeline drifts behind wall-clock whenever
something stalls rAF. Screenshot-per-beat harnesses report the later beats as late; poll
with cheap `evaluate()` calls instead.

---

## Verified so far
- `npm run build` passes, no type errors, no warnings.
- Dev server starts in ~950 ms; page returns HTTP 200 with 77 KB of HTML.
- Optimized image endpoints return 200 at ~46–51 KB.
- Preloader verified in a real browser (Playwright): beat timings, cover integrity
  across 5 viewports, scroll lock, reduced motion, session skip. Zero console errors.
- Dev-process leak contained across start/stop/restart cycles.

## Still to do (Phase 7)
Needs a real browser — cannot be checked from the terminal:
1. Scroll immediately and continuously on load; the site must always paint.
2. Sweep the mouse fast across the Services list — no freeze.
3. DevTools Performance: ~5 s scroll through Services → Orbit → WhyChooseUs; watch
   for long tasks > 50 ms and Layout/Recalculate-Style spikes.
4. React DevTools Profiler: mouse movement should cause **zero** renders.
5. Lighthouse mobile: Performance > 90, LCP < 2.5 s, CLS < 0.1, INP < 200 ms.
6. Visual QA at desktop/tablet/mobile — especially the Services split-reveal, the
   grain texture, and the WhyChooseUs card frosting, which were re-implemented.
