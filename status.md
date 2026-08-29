# Project Status

## Current Phase: Optimization complete — pending browser QA
**Status:** Phases 0–4 done. Phase 5 (design tweaks) and Phase 6 (SEO/meta) still open.
Responsiveness audit + fixes done (see "Responsiveness pass" below).

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
| Phase 5.1 | Responsiveness audit & fixes | ✅ Done |
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

**Services took 5-6 wheel notches to scroll past.** Reported as "having to do 5-6
scrolls to get to the next part". Not a Lenis tuning issue — a runway arithmetic one.

The section was `lg:h-[200dvh]` over a `lg:h-dvh` sticky panel, and `useScroll` is
`["start end", "end start"]`, so progress spans section + viewport = **300dvh**. On
that scale the panel pins at progress **0.333**, but the reveal was keyed 0.07→0.35:

- The split ran 0.07→0.333 — i.e. ~95% complete **before the panel ever pinned**, so
  the reveal played while the section was still travelling up the viewport.
- From 0.35 to 0.667 (~95dvh, ~1000px, 5-6 notches at `wheelMultiplier: 1`) the panel
  sat pinned with **nothing animating**. That dead runway was the whole complaint.

Runway shrunk to `lg:h-[130dvh]` (30dvh of pinned hold), which is the right height and
is unchanged since. The keyframe values that first accompanied it were **wrong twice
over** and were corrected in the follow-up below — do not reinstate them.

Two related fixes fell out:
- `boxDone`'s upper bound (`<= 0.75`) re-hid the entire list near the section's end, so
  scrolling back up blanked the rows. Removed — it is now a one-way threshold.
- The rows' own `whileInView` + `delay: 0.5 + i * 0.01` fired on **section entry**, long
  before the pin, so their slide-in was over and invisible; the visible timing was
  entirely the parent's `boxDone` fade. Rows are now variant children of that wrapper
  (`staggerChildren: 0.05`), so the single `boxDone` flip cascades the list in at the
  pin. Off desktop the container is unconditionally `shown`, preserving mobile.

The `boxDoneRef` guard is untouched — it is the Phase 1 fix that keeps this off the
per-frame `setState` path, and the threshold change does not affect it.

**Correction — the keyframes above were wrong on two counts.** Both fixed; recorded
because the first error is very easy to repeat.

*1. `0.565` is the pin RELEASE, not the pin engage.* With a `130dvh` section and
`["start end","end start"]`, progress spans section + viewport = 230dvh and there are
**two** boundaries:

| progress | dvh | event |
|---|---|---|
| **0.435** | 100 | pin **engages** — section top meets viewport top |
| **0.565** | 130 | pin **releases** — section bottom meets viewport bottom |

The values shipped against "the 0.565 pin" (`gridColumns` 0.55→0.70, `boxDone` 0.62)
therefore fired *after the panel had already let go* — the expand and the service
reveal played on a section scrolling off screen. Strictly worse than the original bug.
When deriving these, compute **both** boundaries; the smaller one is the pin.

*2. The choreography was inverted.* "Pin in one scroll" was read as "reach the pinned
state as fast as possible", so the pin was scheduled first and the expand after it. The
client's intent is the opposite order: **the red box expand is scroll-tracked, then the
section pins, and the options appear as the pin engages.**

Current values, confirmed against the client's intended sequence:
- `panelOpacity` **0.16→0.28** — resolves early; the panel cannot fade in *after* the
  box it belongs to has finished opening.
- `gridColumns` **0.16→0.435** — scrubs across the approach, fully open exactly on the
  pin. Starts at 0.16 rather than 0 so the section is on screen a beat before it opens.
- `boxDone` **≥ 0.435** — options land on the pin. `delayChildren` dropped to 0 for the
  same reason; the expand already supplies the lead-in.

⚠️ The section height and these ranges are **coupled arithmetic**. Changing
`lg:h-[130dvh]` moves both boundaries (`100/total` and `section/total`) and every range
must be re-derived. A keyframe belongs in `[0, 0.435]` to play on the approach or
`[0.435, 0.565]` to play while pinned; past 0.565 it animates nothing the user can see.

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

**Footer wordmark overlap + the "Coolvetica Regular" trap** (reported from a
phone screenshot: the A and T collided inside the red block).

The real cause was **`text-[34vw]` sizing a word that lives in an inset block**,
plus a font-resolution trap that sent an earlier attempt at this badly wrong.

**The trap — read this before touching any Coolvetica declaration.**
Eight components declare `'"Coolvetica Regular", Coolvetica, sans-serif'`. That
first name looks dead: no `@font-face` defines it. It is NOT dead. Browsers
resolve it by `local()` name match against a **desktop-installed** Coolvetica
Regular, which is a genuinely wider face than anything this site serves.
Measured, `INSIDE ATWO STUDIOS`:

| source | width @64px |
|---|---|
| local `Coolvetica Rg.otf` | **597.0px** — the intended headings |
| local `Coolvetica Rg Cond.otf` | 372.2px |
| CDN `gWeZipkG.woff2` | 372.2px — **identical to Condensed** |

The single CDN asset is declared twice in globals.css, as both
`"Coolvetica Condensed"` and `"Coolvetica"`. It is the condensed face under two
names, and **the true regular face is not served by this site at all.** So the
headings have always rendered wider on a machine with the font installed than
they do for a visitor without it. That discrepancy is still open — closing it
means self-hosting the real face under `public/fonts/`, which is a **licensing
question** (© 1999-2024 Typodermic Fonts Inc.; desktop and webfont licences are
sold separately). Not done, deliberately.

Adding an `@font-face` for `"Coolvetica Regular"` pointing at the CDN asset
**overrides the local match and silently narrows every heading**. That was tried
and reverted; globals.css now carries a DO-NOT block with the measurements.

**What actually fixed the overlap.** The red block is inset `mx-5 / md:mx-10 /
lg:mx-[138px]`, so its width is the viewport minus up to 276px, but the wordmark
was sized in `vw` — which ignores that inset. "ATWO" is 2.487em wide in the
intended face, so at 1024px a 34vw wordmark is 866px inside a 748px block and
the A and O were clipped by `overflow-hidden`. Now `@container` on the block and
`text-[38cqw]` on the h2, so the gutters are self-cancelling at every width.
Swept 360/390/430/768/1024/1280/1440/1920: fits at all eight, no page scroll.

**`KERN_EM` was correct all along** — `[-0.169, 0, -0.067, 0]`. A prior pass
"corrected" it to `[-0.074, 0, -0.006, 0]`; those were measured while the stray
`@font-face` above was in effect, so they captured the CONDENSED face's metrics
and were wrong for the face actually drawn. Re-measured against the real stack:
`width("ATWO")` as one run 2.487em vs 2.723em summed = **-0.236em total**, per
pair AT -0.169 / TW 0 / WO -0.067. Restored. The split wordmark now matches a
plain text node to within 0.06px at every swept width.

**The kerning gate is a WIDTH PROBE, not a font API call.** Neither API can
answer the question: `"Coolvetica Regular"` may be satisfied by a desktop font
that never appears in `document.fonts`, and `document.fonts.check()` returns
true for a fallback — verified, it also returned true for
`check('1em "NoSuchFaceXYZ"')`. The probe renders "ATWO" off-screen at 1000px in
the wordmark's own stack and compares width-per-em against 2.487 (±2%), which is
indifferent to which mechanism supplied the face.

Also: removed unused `Inter` / `Barlow_Semi_Condensed` from `layout.tsx` (loaded
on every page, referenced nowhere — the only `Inter` greps were
`IntersectionObserver`), and added a `preload` for the CDN woff2, which is only
fetched once layout finds text needing it and so still flashed on mobile data.

**Three measurement traps hit here, recorded so they are not repeated:**
- *A stale `next start` on port 3000 served a 500 and the page never hydrated*,
  so `useEffect` never ran and margins read `0px` regardless of the code — the
  same trap the Phase 5 grain-overlay measurement fell into. Kill the port and
  assert HTTP 200 before trusting any footer measurement.
- *`scrollTo(0, scrollHeight)` does not reveal the footer.* The intro holds a
  scroll lock ~8s and the reveal is gated on a `useInView` sentinel an instant
  jump never crosses; screenshots taken that way show the preloader. Wait out
  the intro, then scroll in increments.
- *Measuring a font while your own `@font-face` is overriding it* produces
  confident, precise, wrong numbers. Confirm which face is actually drawing
  (width-probe it) before recording any metric derived from it.

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

## Responsiveness pass (2026-08-28)

Full audit of all 21 components, then fixes. Verified in Playwright on a
production build at 15 viewports (320x568 through 3840x2160, including
844x390 landscape and 3440x1440 ultrawide): **zero horizontal page overflow and
zero clipped h1/h2/nav at every one**, no page errors.

### The two bugs behind "not responsive on 16:9"
- **Video-stack side titles clipped by exactly 32px at every 16:9 desktop from
  1280x720 to 1920x1080.** `marginBoxW` subtracted `CARD_CLEARANCE_PX` (16) but
  never the title container's own `px-4` (32), so the font was sized for a box
  32px wider than it had. The comment on that container claimed the padding was
  accounted for; the arithmetic did not do it. Titles now fit and are *larger*
  (44px at 1920 vs a clipped 35.9px).
- **Hero H1 froze above `lg`.** `text-[22vw] md:text-[280px] lg:text-[367px]`
  stopped responding at 1024px, so the wordmark was 81% of width at 1440 but 30%
  at 3840 — shrinking into the middle of every large monitor — while overshooting
  and clipping 61-71px per side between 768 and 1023px. Now one continuous
  `clamp(76px,25.5vw,560px)`, which passes through exactly 367px at 1440 so the
  reference viewport is pixel-identical.

### CORRECTION to two earlier claims — measure the font, do not estimate it
`video-stack.tsx`'s `CHAR_WIDTH_RATIO = 0.5` is roughly **double** the truth and
must not be used for reasoning about layout elsewhere. Probed off the live CDN
assets in a real browser:

| string | face | em width | per char |
|---|---|---|---|
| `ATWO STUDIOS.` | Heavy Compressed | **3.178em** | 0.245 |
| `TROPICAL ESTATE` | Condensed | 4.574em | 0.305 |
| `INSIDE ATWO STUDIOS` | Condensed | 5.815em | 0.306 |

`CHAR_WIDTH_RATIO` is now 0.31. Two audit findings derived from the old 0.5 were
**wrong and were not acted on**: the hero H1 does *not* clip at 1920x1080, and
the navbar link row has ~266px of slack at 768px rather than being a dead-heat
overflow. Navbar link sizes were left untouched.

When probing, note the Heavy Compressed asset is
`uLMpONHY7W8PeNow8Qzq598WbM.woff2` — using the wrong URL yields a silent
`status: "error"` and the browser measures a system fallback instead, which is
how the 0.5 figure looks plausible.

### Other confirmed breakages fixed
- **`.letter-mask` clipped every hero letter by 0.175em** (measured: a 340px box
  against 410px of content at 400px type) — `line-height: .85` against glyphs
  needing 1.025em. Padded and pulled back with an equal negative margin, so the
  clip rect grows while the painted position is unchanged.
- **Fullscreen menu on landscape phones.** 844x390 is above `md` on width, so it
  took the desktop layout — nine absolutely-positioned blocks with no flow
  relationship — inside 390px of height, overlapping by ~80px. New `wide:` /
  `max-wide:` custom variants add a `min-height: 600px` condition; short
  landscape now falls through to the stack. Collisions measured: **0**.
- **Menu overflow was unreachable, not just off-screen.** `overflow-hidden` +
  Lenis stopped + `data-lenis-prevent` (which exempts from Lenis without creating
  a scroller) meant the wordmark and socials were simply gone below ~800px of
  height. Now `overflow-y-auto overscroll-contain`, `wide:overflow-hidden`.
- **BookCallModal never locked the page.** It set `document.body.style.overflow`
  only — which this codebase documents twice as insufficient, since Lenis drives
  scroll imperatively on documentElement. Now stops Lenis (same ref-mirror as the
  menu). Verified: page scroll behind the open modal is **0px** at 5 viewports.
- Modal body was sized `calc(85vh - 100px)` where the real header is ~106px;
  now a flex column, so no magic number. Buttons/date-grid/time-grid overflowed
  at 320px; now wrap and step down.
- **about.tsx: `lg:w-[50%]` image + `lg:w-[55%]` text = 105%.** The image is
  absolute so it contributed nothing to flex layout and the text ran *under* it —
  51px at 1024px growing to 128px at 2560px. Both now 50%.
- about.tsx also gated its animation on `>= 768` while the layout it drives is
  keyed to `lg:`, so at 768-1023px a full-width in-flow block was slid in from a
  hardcoded `x: -900`. Now `lg` via the new hook, and the travel is a percentage.
- **Services sticky panel was a flat `lg:h-[736px]`** — taller than the viewport
  at 1366x768 and 1024x600, so its last rows were permanently below the fold.
  Now `min(736px, 100dvh - 2rem)`, with the runway expression kept in sync.
- `dvh` migration across hero/services/video-stack/why-choose-us/footer/menu/modal.
  The footer's `md:h-[200vh]`/`md:-mt-[100vh]` pair was converted together — they
  must share a unit or the cancellation that keeps the page from growing breaks.
- Particles now off on touch and reduced motion; `group-hover:scale-105` confined
  to `(hover: hover)` so it stops latching after a tap.
- SplitText line-splitting now re-splits on **width** change (a vertical-only
  change cannot alter line breaking, and re-splitting on it would tear down the
  animation on every mobile URL-bar collapse). `document.fonts` guarded on both
  branches.
- Preloader cover scale is captured once but used ~5s later; a rotation or
  URL-bar collapse left it stale with only a 1.05 margin. Now sized off
  `max(innerWidth, innerHeight)` at 1.2, which is orientation-proof.

### Trap hit during this pass, recorded
Adding `if (suppressed) return null` to floating-particles threw **React #418**
(hydration mismatch): `suppressed` comes from matchMedia, which is false on the
server and for the first client render, so returning null on the second render
removed a node React expected. Confirmed against a pre-change baseline that the
component rendered clean before. Fix: keep the wrapper mounted, gate only the
children. Any client-only media/pointer state must not change the *shape* of the
first client render.

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
