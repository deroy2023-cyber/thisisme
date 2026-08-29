"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";

gsap.registerPlugin(useGSAP);

/** Playback multiplier for the whole timeline. 1 = the ~8s clock the beats below
 *  are choreographed against. Raise it to compress without re-choreographing
 *  (2 → ~4s). The ONLY timing knob; nothing below should be edited to change the
 *  overall duration.
 *
 *  Trade-off recorded in status.md: at 1 this sits ~8s in front of the LCP
 *  element, so Phase 7's "LCP < 2.5s" will not pass cold. Signed off. */
const TIMESCALE = 1;

/* ── Beat positions, in seconds ────────────────────────────────────
   Absolute timeline positions, so this reads 1:1 against the storyboard rather
   than as a chain of relative offsets that all shift when one duration changes.

   One gesture — fill, then grow — and then the page is simply there. Earlier
   versions kept adding to this beat: a red flash, an 18 degree tilt, a diagonal
   part, and later a vertical split into two bars that held before expanding.
   All removed. The split in particular parted the bar upward and downward and
   then the expand grew it upward and downward again — the same motion in the
   same axis with a stall in between, so the hold never read as a pose. Nothing
   here changes colour, nothing rotates, and nothing separates. */
const T_ROLL_START = 0;
const T_ROLL_DUR = 4.0;
const T_UI_OUT = 4.0;
const T_UI_OUT_DUR = 0.45;
/** The expand starts as soon as the counter is clear of the screen — there is no
 *  intervening beat to wait for any more. */
const T_EXPAND = 4.55;
const T_EXPAND_DUR = 1.2;
/** Full off-white cover: the bar now IS the viewport. */
const T_COVER_END = T_EXPAND + T_EXPAND_DUR;
/** A breath on clean off-white, and then the preloader simply stands down.
 *
 *  There is deliberately no parting beat. The expansion is not a cover to be
 *  removed afterwards -- it IS the page arriving, in the page's own #F5F5F0. An
 *  earlier version did expand and then part to uncover the hero, and the frame
 *  captured mid-part was a completely blank off-white screen: a light cover
 *  lifting off a light page has no contrast, so nothing read as a reveal at all.
 *  Here the hero's own entrance animation is the reveal. */
const T_END = 6.05;

/** Bar geometry — one 270x24 bar. Fixed values because the cover maths divides
 *  by them; the rendered box is measured at runtime anyway, so a narrow viewport
 *  that shrinks the bar still resolves correctly. */
const BAR_W = 270;
const BAR_H = 24;

/** Whether the once-per-tab skip may suppress the intro. Off in development, and
 *  off for any URL carrying `?intro`.
 *
 *  The skip is right in production — a returning visitor should not sit through
 *  eight seconds on every navigation. It is hostile while the intro is being
 *  worked on: the key is written when the timeline completes, so it plays once
 *  and then every reload in that tab silently skips, which looks exactly like
 *  the animation is broken.
 *
 *  A function, not a constant, so it cannot go stale against the URL after a
 *  client-side navigation and is never evaluated during SSR. */
function skipAllowed() {
  if (process.env.NODE_ENV !== "production") return false;
  return !new URLSearchParams(window.location.search).has("intro");
}

/** The load curve. `t` is a fraction of T_ROLL_DUR, `p` the counter value.
 *
 *  Near-even by choice. This deliberately replaces a curve measured off the
 *  reference video — ~017 / ~056 / ~099 at one, two and three seconds, then a
 *  crawl from 99 to 100 across a full second. That shape was faithful to the
 *  reference and defended here as "what makes it read as loading rather than as
 *  a metronome", but on this site it read as too fast: the middle covered 39
 *  numbers in a single second, fast enough to be a blur, and then the count
 *  visibly stalled at 99 for a quarter of the roll.
 *
 *  Dead linear: 25 per quarter, every quarter. An intermediate version eased the
 *  tail very slightly (26/52/77/100) so the number would settle onto 100 rather
 *  than slam into it, but any ease at all is still a change of rate, and a
 *  change of rate is exactly what reads as "not smooth" on an integer counter.
 *  The count is meant to crawl at one speed from 000 to 100 and simply stop.
 *
 *  Keep the roll length in T_ROLL_DUR if adjusting this: the two are independent
 *  knobs and evenness is the point here, not duration. */
const LOAD_CURVE = [
  { t: 0.0, p: 0 },
  { t: 0.25, p: 25 },
  { t: 0.5, p: 50 },
  { t: 0.75, p: 75 },
  { t: 1.0, p: 100 },
];

/* Monotone cubic Hermite (Fritsch–Carlson) through LOAD_CURVE, precomputed once.

   One smooth curve replaces what used to be four separate linear tweens, which
   hit every sample exactly but left three visible velocity kinks in the roll.

   Monotone specifically, NOT plain Catmull-Rom: Catmull-Rom overshoots around
   the sharp 99 → 100 crawl, and on an integer counter any overshoot shows up as
   the number ticking backwards. Fritsch–Carlson clamps the tangents so the
   interpolant can never reverse. */
const CURVE_X = LOAD_CURVE.map((k) => k.t);
const CURVE_Y = LOAD_CURVE.map((k) => k.p);
const CURVE_M = (() => {
  const n = CURVE_X.length;
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    slope.push((CURVE_Y[i + 1] - CURVE_Y[i]) / (CURVE_X[i + 1] - CURVE_X[i]));
  }
  const m = new Array<number>(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const f = 3 / Math.sqrt(s);
      m[i] = f * a * slope[i];
      m[i + 1] = f * b * slope[i];
    }
  }
  return m;
})();

function curveAt(u: number) {
  let i = 0;
  while (i < CURVE_X.length - 2 && u > CURVE_X[i + 1]) i++;
  const h = CURVE_X[i + 1] - CURVE_X[i];
  const t = (u - CURVE_X[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * CURVE_Y[i] +
    (t3 - 2 * t2 + t) * h * CURVE_M[i] +
    (-2 * t3 + 3 * t2) * CURVE_Y[i + 1] +
    (t3 - t2) * h * CURVE_M[i + 1]
  );
}

/** Digits 0-9 plus a repeated 0. The trailing duplicate makes the odometer wrap
 *  seamless: a column rolls to the 11th cell (a 0) and is reset to the 1st (also
 *  a 0), so the snap lands on an identical glyph and is invisible. A plain 0-9
 *  strip would visibly rewind through 9-8-7 on every carry. */
const DIGIT_STRIP = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const CELL = 100 / DIGIT_STRIP.length;

/** Value shown by the digit column at 10^place, as a FLOAT — the fractional part
 *  is what slices the glyphs mid-roll.
 *
 *  EVERY place now rolls continuously: this is just the column's true value, so
 *  the tens column drifts a tenth of a digit for every digit the ones column
 *  travels, and the hundreds a tenth of that again. An odometer, geared.
 *
 *  This deliberately removes a park-and-carry threshold (CARRY = 0.85) that held
 *  the tens and hundreds still for 85% of each cycle and then snapped them
 *  through a whole digit in the remaining 15%. That was defended here as
 *  avoiding "constant slow motion" on the upper places — but against a linear
 *  count it is the single most visible non-smoothness in the whole roll: ten
 *  hard jerks on the tens column over four seconds. Slow continuous drift is
 *  what an odometer actually does, and it is what reads as smooth.
 *
 *  The `% 10` is applied ONLY to the ones column. It wraps many times across the
 *  roll, and each wrap is hidden by the strip's duplicate trailing 0 — the
 *  column reaches 9.9, then 10 lands on the 11th cell, which is the same glyph
 *  as the 1st.
 *
 *  The tens and hundreds columns are deliberately NOT wrapped. Each only ever
 *  reaches 10 once, on the very last frame, when the count lands on 100 — and
 *  `% 10` there would snap the tens column from 9.99 straight back to 0 in full
 *  view, which is precisely the backwards rewind the duplicate 0 exists to
 *  prevent. Left unwrapped they simply roll on to the 11th cell and stop there,
 *  showing "100" with no jump. (Verified numerically: with the modulo applied to
 *  every place, the tens column reads 9.99 at p=99.9 and 0.00 at p=100.) */
function digitValue(raw: number, place: number) {
  const scaled = raw / Math.pow(10, place);
  return place === 0 ? scaled % 10 : scaled;
}

interface PreloaderProps {
  /** Fired at T_END, at the same instant this unmounts, so the hero's entrance
   *  animation IS the reveal: the photograph fades up from scale 1.3 and the
   *  letters rise onto the off-white the bar just became.
   *
   *  One gate, not two. A previous revision split this into `mediaLoading` and
   *  `loading` so the photograph could be up before a knockout reveal opened
   *  onto it; that reveal is gone, and here the whole entrance is wanted as one
   *  piece. Safe to release the image only now: it is network-loaded by ~2.2s
   *  (measured `complete: true`), so this fades an already-decoded image. */
  onDone: () => void;
}

export default function Preloader({ onDone }: PreloaderProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  /** The digit row itself. Translated up inside its overflow-hidden parent to
   *  clip the counter away on exit, rather than fading it. */
  const counterRef = useRef<HTMLDivElement>(null);

  const [gone, setGone] = useState(false);

  /* Callbacks are mirrored into refs and the timeline's dep array is empty. This
     is the fix for the bug that got the original preloader deleted (status.md
     Phase 1): its effect listed `onComplete` — an inline arrow recreated on
     every render of page.tsx — in its deps, so any re-render restarted the
     timers and the overlay never lifted. Nothing the parent does can restart
     this timeline. */
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const lenis = useLenis();

  /* Scroll lock. This effect is the SOLE owner of Lenis here; the timeline
     deliberately does not touch it.
     useLenis() returns undefined on the first render and the instance on the
     second, and the timeline runs once, on mount, with an empty dep array — so
     it would only ever see the undefined pass. Mirroring into a ref (the
     fullscreen-menu.tsx pattern) does not rescue that: a ref only helps an
     effect that re-runs later, and that one would not. Measured with the lock
     wired that way, the page scrolled to 9851px behind the overlay during the
     intro. Keying on `lenis` is what makes the lock actually apply. */
  useEffect(() => {
    if (!lenis) return;
    if (gone) {
      lenis.start();
      return;
    }
    /* Assert the position before freezing it, rather than only freezing. Wheel
       events landing between first paint and hydration are handled by neither
       Lenis nor this lock.
       stop() FIRST and the reset second, which is not the intuitive order:
       called before stop(), the scrollTo is simply cancelled by it. `force` is
       what lets a scrollTo land while Lenis is stopped — MagneticLink in
       navbar.tsx relies on the same behaviour. */
    const toTop = () => lenis.scrollTo(0, { immediate: true, force: true });
    lenis.stop();
    toTop();
    /* Once more a beat later. The reset above loses a race intermittently: a
       wheel event dispatched before hydration can be applied just after this
       effect runs but before .lenis-stopped's overflow:hidden takes hold, which
       left the page pinned 400px down for the rest of the intro. Measured
       leaking on roughly one run in three. */
    const retry = window.setTimeout(toTop, 300);
    return () => {
      window.clearTimeout(retry);
      lenis.start();
    };
  }, [lenis, gone]);

  useGSAP(
    () => {
      /* Skip check lives HERE and not in a useState initializer: the server
         always renders the overlay, so an initializer reading sessionStorage
         would return true on the client's first render of a repeat visit and
         hydration would mismatch. useGSAP runs in a layout effect, so this
         unmounts before the browser paints — no flash either way. */
      let skip = false;
      if (skipAllowed()) {
        try {
          skip = sessionStorage.getItem("atwo-intro") === "1";
        } catch {
          // Private mode / blocked storage. Play the intro rather than crash.
        }
      }
      if (skip) {
        doneRef.current();
        setGone(true);
        return;
      }

      /* Guarded so each hand-off runs exactly once whichever path reaches it —
         timeline callback, reduced-motion branch, or the failsafe. */
      const fired = { done: false };
      const finish = () => {
        if (fired.done) return;
        fired.done = true;
        try {
          sessionStorage.setItem("atwo-intro", "1");
        } catch {
          /* storage blocked; the intro simply replays next navigation */
        }
        doneRef.current();
      };
      // No Lenis calls here — the lock is owned entirely by the effect above.

      let failsafe = 0;
      const armFailsafe = () => {
        /* Last line of defence against the failure mode that killed the original
           preloader: a black screen that never lifts. Armed when the timeline
           actually starts, not at setup — the start is deferred, and a failsafe
           measured from setup could otherwise fire mid-animation. */
        failsafe = window.setTimeout(
          () => {
            finish();
            setGone(true);
          },
          ((T_END + 1.5) / TIMESCALE) * 1000
        );
      };

      const mm = gsap.matchMedia();

      /* ── Reduced motion: a plain 300ms fade, no roll and no reveal. ── */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        armFailsafe();
        const tl = gsap.timeline();
        tl.to(fieldRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power1.out",
          onComplete: () => {
            finish();
            setGone(true);
          },
        });
        return () => tl.kill();
      });

      /* ── Full choreography ───────────────────────────────────── */
      let cancelStart: (() => void) | null = null;

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        /* Still a toArray of a single element rather than barRef's own child:
           the quickSetter mapping and the per-frame loop below are written
           against a list, and keeping the shape means the fill stays a class
           the JSX owns rather than a second ref threaded through. */
        const fills = gsap.utils.toArray<HTMLElement>(".pl-fill");
        const strips = gsap.utils.toArray<HTMLElement>(".pl-digit-strip");

        /* Normalise the fills through GSAP before quickSetter touches them. The
           inline scaleX(0) in the JSX exists only so the bar is not briefly
           full-width before hydration; this makes GSAP the owner of the
           transform from here on. */
        gsap.set(fills, { scaleX: 0, transformOrigin: "left center" });

        /* Promote what is written per frame, for the duration only. Each digit
           strip is a tall layer of very large text; a yPercent write on an
           unpromoted layer that size risks a full re-raster every frame. Cleared
           at the end — a permanent will-change is its own leak, and hero.tsx had
           exactly that removed in Phase 2. */
        const promoted = [
          ...strips,
          ...fills,
          scaleRef.current!,
          counterRef.current!,
          uiRef.current!,
        ];
        gsap.set(promoted, { willChange: "transform" });

        const setFills = fills.map((el) => gsap.quickSetter(el, "scaleX"));
        // No unit argument: yPercent is already a percentage, and passing "%"
        // would have GSAP write "-9.09%%".
        const setDigits = strips.map((el) => gsap.quickSetter(el, "yPercent"));

        /* One driver for the whole roll: `u` runs 0 → 1 linearly and the counter
           value comes from the monotone curve. */
        const driver = { u: 0 };
        const writeProgress = () => {
          const p = curveAt(driver.u);
          const f = p / 100;
          for (let i = 0; i < setFills.length; i++) setFills[i](f);
          // Column order in the DOM is hundreds, tens, ones → places 2, 1, 0.
          for (let i = 0; i < setDigits.length; i++) {
            setDigits[i](-CELL * digitValue(p, setDigits.length - 1 - i));
          }
        };

        /* Cover geometry: simply the viewport over the bar. Nothing rotates, so
           there is no projection onto rotated axes, and the bar grows from its
           own centre, so it covers the FULL height on its own — an earlier
           two-half version halved this (`vh / 2 / h`) because each half only had
           to reach one edge from the shared seam. That halving would now leave
           the top and bottom thirds of the screen uncovered.
           Measured off the real box rather than the constants, so a narrow
           viewport that shrinks the bar (max-w-[72vw]) still resolves. */
        const rect = barRef.current!.getBoundingClientRect();
        const w = rect.width || BAR_W;
        const h = rect.height || BAR_H;
        /* The cover scale is computed ONCE here, at timeline-build time, but the
           expand tween it feeds does not run until several seconds later. If the
           viewport changes in between -- a phone rotated mid-intro, or iOS
           Safari's URL bar collapsing, which is a ~13% height change -- the
           scale is stale and the off-white cover no longer reaches the edge,
           exposing the black field beneath as a band.

           Rebuilding the timeline on resize is not an option: status.md records
           that restarting it is exactly the Phase 1 bug that left the page
           blank. So the margin absorbs it instead. Both axes are sized off the
           LARGER of the two viewport dimensions, which makes the cover
           orientation-proof (a portrait->landscape rotation cannot present an
           extent bigger than the longest side), and the safety factor goes from
           1.05 to 1.2 to swallow the URL-bar delta.

           The cost is a larger composited quad during the expand. status.md
           notes the factor was trimmed 1.6 -> 1.15 for exactly that reason and
           measured 7.3% -> 6.1% dropped frames; 1.2 sits just above that trim,
           so the win is essentially retained while the correctness hole closes. */
        const vmax = Math.max(window.innerWidth, window.innerHeight);
        const coverX = (vmax / w) * 1.2;
        const coverY = (vmax / h) * 1.2;
        /* finish() and the unmount happen on the SAME frame. The cover is
           #F5F5F0 and so is the page beneath it, so removing the overlay is
           invisible -- and the hero's entrance then plays onto exactly the
           surface the bar just became. */
        const tl = gsap.timeline({
          paused: true,
          onComplete: () => {
            gsap.set(promoted, { willChange: "auto" });
            finish();
            setGone(true);
          },
        });
        tl.timeScale(TIMESCALE);

        // ── The count.
        tl.to(
          driver,
          { u: 1, duration: T_ROLL_DUR, ease: "none", onUpdate: writeProgress },
          T_ROLL_START
        );

        /* ── The counter leaves. The bar stays.

           It slides UP behind the hard top edge of its overflow-hidden parent
           rather than fading: the digits spent the whole roll travelling
           vertically inside clipping columns, so exiting the same way finishes
           the gesture instead of introducing a second, softer one.

           yPercent: -100 is exactly the row's own height (the digit cells are
           h-[0.8em] and the row is one cell tall), so the number ends fully
           above the mask with nothing peeking. No opacity in this tween — the
           mask does all the hiding, and a simultaneous fade would make it read
           as a fade with a bit of drift rather than as a clean wipe.

           power3.in, deliberately accelerating: the counter should look pulled
           offscreen, not eased to a stop somewhere behind the edge. */
        tl.to(
          counterRef.current,
          { yPercent: -100, duration: T_UI_OUT_DUR, ease: "power3.in" },
          T_UI_OUT
        );

        /* The track goes off-white as the expand begins. Invisible — at 100% the
           fill already covers it — but it stops a dark hairline of the #333333
           track surviving at the edges once the bar is scaled ~60x. An instant
           set, not a tween: backgroundColor is a paint property, and there is
           nothing to see. */
        tl.set(barRef.current, { backgroundColor: "#F5F5F0" }, T_EXPAND);

        /* ── The expand. One bar, growing from its own centre until it is the
           viewport. The fill is #F5F5F0, the site's own background, so this is
           not a panel covering the page so much as the bar growing into it. */
        tl.to(
          scaleRef.current,
          {
            scaleX: coverX,
            scaleY: coverY,
            duration: T_EXPAND_DUR,
            ease: "power2.inOut",
          },
          T_EXPAND
        );

        /* Hold on the clean off-white, then stop. Nothing parts and nothing is
           uncovered, so the field's own background never needs clearing -- the
           bar is opaque and stays that way until the whole overlay goes.

           An empty tween purely to give the timeline its full length, so
           onComplete lands on T_END rather than the moment the expand finishes. */
        tl.to({}, { duration: T_END - T_COVER_END }, T_COVER_END);

        writeProgress();

        /* Defer the start until the main thread is quiet and the webfont has
           landed. Profiling showed the roll otherwise beginning inside hydration
           — a 680ms long task ~875ms in, with 17 of 23 dropped frames landing
           across the counter, so the number visibly froze and jumped.
           Waiting on document.fonts.ready also means the counter's `ch`-based
           columns are measured against the real face. The overlay is not blank
           meanwhile: it is a still field with an empty bar, so nothing can be
           seen to stutter. */
        cancelStart = whenReady(() => {
          armFailsafe();
          gsap.to(uiRef.current, {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
          });
          tl.play();
        });

        return () => {
          cancelStart?.();
          gsap.set(promoted, { willChange: "auto" });
          tl.kill();
        };
      });

      return () => {
        window.clearTimeout(failsafe);
        cancelStart?.();
        mm.revert();
      };
    },
    { scope: fieldRef }
  );

  if (gone) return null;

  return (
    <div
      ref={fieldRef}
      aria-hidden
      /* z-[200]: above the navbar (100) and the fullscreen menu (105), below the
         custom cursor (9998/9999). */
      className="fixed inset-0 z-[200] bg-off-black overflow-hidden flex items-center justify-center pointer-events-none"
    >
      {/* ── The bar: one 270x24 track that fills left to right, then grows into
          the viewport. It never separates.

          An earlier revision built this as two stacked 12px halves whose scale
          origins sat on their inner edges, so they could part to spell A-TWO and
          still meet at a shared seam at any scale. That was removed: the split
          and the expand were the same outward motion in the same axis with a
          stall between them, so the hold never read as a pose. One bar, one
          gesture. The origin is now `center center` — with no seam to hold,
          there is nothing for an inner-edge origin to buy.

          The fill is #F5F5F0, the site's own background colour, so the expansion
          is the bar growing into the page rather than an arbitrary panel
          covering it.

          No Tailwind transform utilities in here. Tailwind v4 compiles
          translate/scale classes to the standalone CSS properties of the same
          names, which the browser COMPOSES with GSAP's `transform` rather than
          letting one win. GSAP owns the transform — the convention stated in
          fullscreen-menu.tsx and video-stack.tsx. That is also why this uses
          flex centring instead of top-1/2 with a -50% translate. */}
      <div ref={scaleRef} style={{ transformOrigin: "center center" }}>
        <div
          ref={barRef}
          className="pl-half relative w-[270px] max-w-[72vw] h-[24px] bg-[#333333] overflow-hidden"
        >
          {/* scaleX from a left origin — compositor-only. The first preloader
              animated width/height/padding/borderWidth, i.e. layout properties,
              on every frame. */}
          <div
            className="pl-fill absolute inset-0 bg-off-white"
            style={{
              transform: "scaleX(0)",
              transformOrigin: "left center",
            }}
          />
        </div>
      </div>

      {/* ── The counter. Starts at opacity 0 and fades in when the timeline
          starts: the `ch` columns below are remeasured when Coolvetica lands, and
          this keeps that reflow invisible. */}
      <div ref={uiRef} className="absolute inset-0" style={{ opacity: 0 }}>
        {/* Anchored on the shared --spacing-menu-gutter token at both edges so it
            keeps an even, identical border off each.

            This box is also the EXIT MASK. Its `overflow-hidden` was already
            here to clip the digit strips; the counter leaves by translating
            `counterRef` up inside it, so the number slides out under a hard top
            edge rather than fading. Same language as the digit columns' own
            roll — the figure exits the way its digits move. */}
        <div className="absolute left-menu-gutter bottom-menu-gutter overflow-hidden select-none font-coolvetica-heavy text-off-white text-[clamp(96px,17vw,240px)] leading-[0.8]">
          {/* The travelling layer. Separate from the mask above because the mask
              must stay put to clip; and separate from the flex row below because
              GSAP owns this transform while the row is pure layout. */}
          <div ref={counterRef} className="flex">
            {[0, 1, 2].map((col) => (
              /* 1ch IS the font's own zero advance, so this is normal figure
                 spacing by definition and self-tunes to whatever face is loaded.
                 An earlier 0.62em was a hand-picked guard against glyph metrics,
                 but Coolvetica Heavy Compressed has a digit advance nearer
                 0.4em — so every column carried ~0.2em of dead air and the number
                 read as three separate digits rather than one figure. */
              <div key={col} className="h-[0.8em] w-[1ch] overflow-hidden">
                <div className="pl-digit-strip">
                  {DIGIT_STRIP.map((d, i) => (
                    <div key={i} className="h-[0.8em] leading-[0.8] text-center">
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Runs `go` once the webfont has landed AND the main thread has a quiet slot,
 *  whichever safety net trips first. Returns a canceller.
 *
 *  The hard timeout is not optional: `document.fonts.ready` hangs indefinitely
 *  if the Framer CDN is unreachable, and an intro that never starts is the exact
 *  black-screen failure this component exists to avoid. */
function whenReady(go: () => void) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    go();
  };

  const hardStop = window.setTimeout(run, 1400);

  const idle = () => {
    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    if (ric) ric(run, { timeout: 500 });
    // Safari has no requestIdleCallback: two frames clears the synchronous tail
    // of hydration.
    else requestAnimationFrame(() => requestAnimationFrame(run));
  };

  if (document.fonts?.ready) void document.fonts.ready.then(idle).catch(idle);
  else idle();

  return () => {
    done = true;
    window.clearTimeout(hardStop);
  };
}
