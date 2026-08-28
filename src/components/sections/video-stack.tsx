"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import { Volume2Icon, VolumeXIcon } from "lucide-react";

gsap.registerPlugin(SplitText, ScrollTrigger, CustomEase, useGSAP);

interface Slide {
  name: string;
  year: string;
  poster: string;
  video: string;
  instagram: string;
}

/** TODO: replace with the real post URL for this clip — the studio profile is a
 *  placeholder so the card is never a dead link in the meantime. */
const ATWO_PROFILE = "https://www.instagram.com/atwo.io";

const SLIDES: Slide[] = [
  {
    name: "GULLY",
    year: "2025",
    poster:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/so_0,q_auto,f_jpg,w_800/v1778690313/gully_ugoyg5.jpg",
    video:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/q_auto/f_auto/v1778690313/gully_ugoyg5.mp4",
    instagram: ATWO_PROFILE,
  },
  {
    name: "BLUORNG",
    year: "2025",
    poster:
      "https://res.cloudinary.com/tg2nyis2/video/upload/so_0,q_auto,f_jpg,w_800/v1783605155/bluorngXatwo_1_1_drqcrn.jpg",
    video:
      "https://res.cloudinary.com/tg2nyis2/video/upload/q_auto/f_auto/v1783605155/bluorngXatwo_1_1_drqcrn.mp4",
    instagram: "https://www.instagram.com/p/DYZ2_V3Iqay/",
  },
  {
    name: "TROPICAL ESTATE",
    year: "2025",
    poster:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/so_0,q_auto,f_jpg,w_800/v1778690337/kerala_home_ukmfyi.jpg",
    video:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/q_auto/f_auto/v1778690337/kerala_home_ukmfyi.mp4",
    instagram: ATWO_PROFILE,
  },
  {
    name: "ORNATE FLESH",
    year: "2025",
    poster:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/so_0,q_auto,f_jpg,w_800/v1778690343/ornate_foc5ic.jpg",
    video:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/q_auto/f_auto/v1778690343/ornate_foc5ic.mp4",
    instagram:
      "https://www.instagram.com/p/DWg4P3zmJEx/?img_index=2&igsh=MW03Y2VoOGE2aGtxMA==",
  },
  {
    name: "WRANGLER",
    year: "2025",
    poster:
      "https://res.cloudinary.com/tg2nyis2/video/upload/so_0,q_auto,f_jpg,w_800/v1783604529/FINAL_AD_WRANGLER_vezxve.jpg",
    video:
      "https://res.cloudinary.com/tg2nyis2/video/upload/q_auto/f_auto/v1783604529/FINAL_AD_WRANGLER_vezxve.mp4",
    instagram: ATWO_PROFILE,
  },
];

const TOTAL = SLIDES.length;

/** Longest title, used to size the margin text so it always fits the box
 *  instead of relying on the mask to clip an overflowing word mid-letter. */
const LONGEST_TITLE = SLIDES.reduce(
  (a, b) => (b.name.length > a.length ? b.name : a),
  "",
);

/** Coolvetica's per-character advance at 1px, roughly — used only to size the
 *  title down to the space actually available (see the title block below).
 *  Approximate on purpose: it only has to avoid overflow, not be exact, and
 *  the mask's overflow-hidden is the hard backstop if it's ever off. */
const CHAR_WIDTH_RATIO = 0.5;

/** Pure breathing room between the title/year text and the card — NOT the
 *  site's usual side margin. The site's px-5/md:px-10/lg:px-[75px] scale was
 *  tried here and rejected: at the real 75px `lg` padding there was almost no
 *  width left for text on common laptop screens (~21px at 1440x900), so long
 *  titles clipped to a few characters. The only rule that matters for this
 *  element is "never touch or overlap the card" — so the text is sized to the
 *  REAL gap to the card (see marginBoxW below), with just this much clearance,
 *  and is free to be as large as that gap allows. */
const CARD_CLEARANCE_PX = 16;

/** Slack, in px, on each end of the "section fills the viewport" test. The rect
 *  is read mid-interpolation while Lenis eases, so its edges land on fractional
 *  pixels and a strict `top <= 0 && bottom >= innerHeight` flickers at the
 *  boundary. Small enough that the deck cannot arm before the plateau is
 *  visually reached, large enough to absorb sub-pixel noise and browser zoom. */
const PIN_TOLERANCE_PX = 2;

/** The tutorial's own easing, registered once at module scope. */
const EASE = CustomEase.create("cardEase", "0.86, 0, 0.07, 1");

/** Card i in stack order sits at `yPercent: TOP_BASE + TOP_STEP*i` and
 *  `z: -Z_STEP * (depth)`. The last entry in the order array is the front
 *  card, so depth counts backwards from it. TOP_STEP was originally 3 (tuned
 *  for near-invisible slivers), which measured out to ~1.7% of card width —
 *  close to a reference fanned-stack design's own ratio, but the 60px shadow
 *  blur on every card was bleeding adjacent slivers into each other, so the
 *  fan read as one soft smudge rather than distinct cards. Raised to 5 (with
 *  the shadow tightened below) so each card behind the front reads as a
 *  clearly separate edge, then to 6 (+20%) for an even more visible fan,
 *  while the front card stays the dominant element. */
/** The front card sits in the LAST slot, so its seat is
 *  `TOP_BASE + TOP_STEP*(TOTAL-1)` — i.e. exactly FRONT_OFFSET by construction.
 *  With CSS `top: 50%` and yPercent resolving against the card's OWN height,
 *  -50 puts the card's midline exactly on the stage midline. That is dead
 *  centre, and that is what this is: the front card is the element the whole
 *  section is about, so it lands in the middle of the screen both ways (the
 *  horizontal half is xPercent: -50 against `left: 1/2`).
 *
 *  This used to be -38. An earlier round of tuning walked it -50 -> -43 -> -38
 *  as TOP_STEP grew, on the theory that a bigger step pushes the BACK card's
 *  top edge off the top of the viewport. That over-corrected, because it
 *  reasoned about the back card's UNTRANSFORMED box: the back card also carries
 *  `translateZ` of -zStep*(TOTAL-1), and under the stage's perspective: 1200 it
 *  renders at scale 1200/(1200-z) ~= 0.67-0.73, which pulls its top edge back
 *  toward centre. At -50 that edge still clears the viewport top by 56px at the
 *  tightest size checked (1280x720) and by more everywhere else, through
 *  2560x1440. Front-card floor clearance IMPROVES too (~12-15px -> ~79-99px),
 *  since centring lifts the bottom edge as much as it lowers the top.
 *
 *  So FRONT_OFFSET does NOT need to move when TOP_STEP changes. The real bound
 *  is the back card's SCALED top edge; if you raise TOP_STEP much further,
 *  re-check that 56px of headroom at 1280x720 rather than retreating from -50.
 *
 *  TOP_BASE is derived from the front card's slot so tuning the front position
 *  doesn't require re-deriving it from the back card. */
const TOP_STEP = 6;
const FRONT_OFFSET = -50;
const TOP_BASE = FRONT_OFFSET - TOP_STEP * (TOTAL - 1);

/** How far off the bottom of the stage a card sits while it is "away", as
 *  yPercent of its own height. Shared by the forward drop and the backward
 *  rise — those are one flight path travelled in opposite directions, so this
 *  must be a single number. 160 clears the stage's overflow-hidden at every
 *  viewport checked. */
const CARD_EXIT_Y = 160;

/** The tutorial uses a flat `-15 * i` px. Scaled to card width here so the
 *  recession reads the same at every viewport instead of vanishing on a large
 *  screen. Size falloff comes from perspective + translateZ ALONE — no manual
 *  scale, which would double-count the shrink. Raised alongside TOP_STEP so the
 *  depth push still matches the larger vertical step — otherwise the fan would
 *  read as flat cards sliding up rather than receding in consistent 3D. */
const Z_STEP_RATIO = 0.11;

/** Every clip is 16:9 landscape, so every card that holds one is too. */
const RATIO = 9 / 16;

/** Title mask height as a multiple of titleFontPx. Shared with the mask's
 *  inline style in the JSX so the geometry and the animation below can never
 *  drift apart. 1.8 rather than 1: Coolvetica's glyphs overflow their line box,
 *  and were still clipped at 1.2 and 1.5. */
const TITLE_MASK_RATIO = 1.8;

/** How far a title's chars travel to clear the mask, as a % of a char's OWN
 *  height — which is 1em == titleFontPx, since the h2 is leading-none. MUST
 *  exceed TITLE_MASK_RATIO * 100. At the old 100% a char parked "below" landed
 *  at [1em, 2em] while the mask spans [0, 1.8em], so 0.8em of every parked
 *  glyph stayed inside the mask and piled up on top of the front title — the
 *  scroll-up jumble. Symmetric so the up and down reveals read identically. */
const TITLE_TRAVEL = 200;
const PARK_ABOVE = `-${TITLE_TRAVEL}%`;
const PARK_BELOW = `${TITLE_TRAVEL}%`;

/** A single flick emits a BURST of virtual-scroll events with decaying delta,
 *  then goes quiet. This is how long the stream must be silent before the next
 *  event counts as a NEW gesture rather than the tail of the current one.
 *  160ms sits above the ~50ms intra-burst gap and the ~100ms gap between
 *  steadily-spun wheel notches, but below the ~250ms+ gap between two
 *  deliberate flicks. Do not drop below ~120 or one wheel spin double-fires. */
const SETTLE_MS = 160;

/** Escape hatch for a CONTINUOUS scroll (finger held, or a wheel spun without
 *  pause). Such a stream never goes quiet, so the settle timer alone would fire
 *  once and then stall. After this long since the last advance, re-arm anyway,
 *  giving a steady cadence while held. Deliberately just past the ~1.8s
 *  timeline so it never races isAnimating. */
const REARM_MS = 1900;

function geometry(viewportW: number, viewportH: number) {
  // Bounded by height too: the deck fans downward from the top card, so the
  // whole stack plus its fan has to fit the pinned viewport.
  const byWidth = Math.min(viewportW * 0.93, 1350);
  const byHeight = (viewportH * 0.78) / RATIO;
  const cardW = Math.min(byWidth, byHeight);
  return { cardW, cardH: cardW * RATIO, zStep: cardW * Z_STEP_RATIO };
}

/** Touch-only vertical list card: plays its own video while scrolled into
 *  view and pauses otherwise, instead of the desktop deck's single
 *  front-card driver (which touch never reaches — see the isTouch branch). */
function MobileVideoCard({ slide }: { slide: Slide }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={slide.video}
      poster={slide.poster}
      muted
      loop
      playsInline
      preload="metadata"
      className="h-full w-full object-cover"
    />
  );
}

export default function VideoStack() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const titleRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const splitsRef = useRef<(SplitText | null)[]>([]);

  /** Stack order, front card LAST — the tutorial's array, held in a ref because
   *  GSAP owns these transforms. Putting it in state would re-render mid-tween
   *  and let React fight GSAP for the same style properties. */
  const orderRef = useRef<number[]>(SLIDES.map((_, i) => i));

  /** The tutorial's isAnimating flag. A ref, not state: it must be readable
   *  synchronously inside the snap handler, and it must not trigger a render. */
  const isAnimating = useRef(false);

  /** Gesture-tail suppression. `gestureArmed` is false from the moment a flick
   *  fires a card until either the input stream has been silent for SETTLE_MS
   *  (the flick is over) or REARM_MS has elapsed since that card fired (the
   *  user is holding a continuous scroll and wants a steady cadence). Refs, not
   *  state: read and written synchronously inside the virtual-scroll handler. */
  const gestureArmed = useRef(true);
  const lastAdvanceAt = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** The deck owns scroll input while the pointer is over a card. That is the
   *  ONLY condition, and it is sufficient on its own: the cards live inside a
   *  `sticky top-0 h-screen overflow-hidden` box, and `overflow: hidden` clips
   *  hit-testing as well as painting — a card scrolled out of that box cannot
   *  receive pointer events at all. So a card firing pointerenter IS proof it
   *  is on screen; the browser's hit test is the visibility check.
   *
   *  An earlier version also required a ScrollTrigger `isActive` flag. That was
   *  redundant AND wrong: `isActive` is `!!clipped && clipped < 1`, exclusive at
   *  both ends, so it read false across the entire progress-0 plateau where the
   *  deck sits pinned and centred — exactly where it gets hovered.
   *
   *  Refs, not state — read synchronously from pointer/scroll handlers, and they
   *  must not cause renders. */
  const hoveringDeck = useRef(false);
  /** True only while the sticky box exactly fills the viewport: the section's
   *  top has reached 0 and its bottom has not yet risen above the viewport
   *  bottom. Hover alone is not enough — the sticky child is already pinned and
   *  painted while the section is only PARTLY in view, so a cursor resting where
   *  a card sweeps past would otherwise hijack scroll mid-approach, in both
   *  directions. The deck may only own scroll on the full-screen plateau. */
  const sectionPinned = useRef(false);
  /** Whether this section currently owns scroll input (Lenis stopped). */
  const locked = useRef(false);
  /** Assigned inside the GSAP effect; called from pointer handlers on the
   *  cards, which are rendered outside that effect's scope. */
  const syncLockRef = useRef<(() => void) | null>(null);
  const lenis = useLenis();
  /** useLenis() returns undefined on the first render and the instance on the
   *  second. Reading through a ref means syncLock never closes over the
   *  undefined pass — otherwise a pointerenter landing between those two
   *  renders hits a `!lenis` guard and is silently dropped. */
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  const [viewport, setViewport] = useState({ w: 1440, h: 900 });
  const [reduced, setReduced] = useState(false);
  /** No cursor means no way to hover on or off the deck, which is the whole
   *  gating mechanism — so touch gets the static vertical list instead. */
  const [isTouch, setIsTouch] = useState(false);
  const [muted, setMuted] = useState(true);
  // Only for the caption year and aria labels — never for card transforms.
  const [frontSlide, setFrontSlide] = useState(TOTAL - 1);
  /** False until SplitText has run and parked every title's chars. Until then
   *  nothing but a wrapper-level opacity can hide the four non-front titles, so
   *  React owns their visibility; afterwards the CHARS own it, and React must
   *  stop asserting it. Hence a flag rather than a one-shot gsap.set on the h2:
   *  frontSlide changes on every advance, so the next re-render would write the
   *  wrapper's opacity straight back over anything GSAP had set. */
  const [titlesSplit, setTitlesSplit] = useState(false);

  const size = geometry(viewport.w, viewport.h);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // Margin box available for the title on the left, and the year on the
  // right: the REAL gap between the viewport edge and the card, minus only
  // CARD_CLEARANCE_PX of breathing room — not the site's side padding (tried,
  // rejected: see CARD_CLEARANCE_PX's comment). Computed from live geometry
  // rather than a vw guess — the margin does NOT grow monotonically with
  // viewport width (geometry() is height-bound at some sizes, width-bound at
  // others), so a fixed vw fraction either overlaps the card at some sizes or
  // is needlessly cramped at others.
  const marginBoxW = Math.max(0, (viewport.w - size.cardW) / 2 - CARD_CLEARANCE_PX);
  // Size the title to the LONGEST title so every card's text fits the same
  // box without individually re-flowing width as the deck advances. Ceiling
  // of 44 matches the title's original size before any margin-fitting logic
  // existed — "as big as looks good" tops out there. Floor of 14 is the
  // absolute-worst-case backstop; the mask's overflow-hidden is the true
  // guarantee against ever touching the card, in case this estimate runs long.
  const titleFontPx = Math.min(
    44,
    Math.max(14, marginBoxW / (LONGEST_TITLE.length * CHAR_WIDTH_RATIO)),
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);

    // "(hover: none)" is the meaningful half: it is precisely "this device
    // cannot hover", the capability the deck's scroll gating depends on.
    const touchMq = window.matchMedia("(hover: none), (pointer: coarse)");
    const syncTouch = () => setIsTouch(touchMq.matches);
    syncTouch();
    touchMq.addEventListener("change", syncTouch);

    let frame = 0;
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setViewport((prev) =>
          prev.w === window.innerWidth && prev.h === window.innerHeight
            ? prev
            : { w: window.innerWidth, h: window.innerHeight },
        );
      });
    };
    onResize();
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      mq.removeEventListener("change", sync);
      touchMq.removeEventListener("change", syncTouch);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /** Only the front card plays. The rest rewind to frame zero — the same frame
   *  their poster shows — so a paused card is indistinguishable from the still. */
  useEffect(() => {
    videoRefs.current.forEach((el, i) => {
      if (!el) return;
      if (i === frontSlide) {
        el.muted = muted;
        void el.play().catch(() => {});
      } else {
        el.pause();
        el.muted = true;
        el.currentTime = 0;
      }
    });
  }, [frontSlide, muted]);

  /** Position every card from the current order. The tutorial's initializeCards:
   *  index in the array drives both the vertical offset and the depth. */
  const initializeCards = useCallback(
    (animated: boolean, exclude?: number) => {
      const order = orderRef.current;
      const { zStep } = sizeRef.current;

      // Slot index has to travel with the element, because excluding a card
      // would otherwise shift every later card's index by one.
      const seats = order
        .map((slideIndex, i) => ({ el: cardRefs.current[slideIndex], slot: i }))
        .filter(
          (s): s is { el: HTMLDivElement; slot: number } =>
            s.el !== null && order[s.slot] !== exclude,
        );
      if (!seats.length) return;

      const els = seats.map((s) => s.el);
      const depth = order.length - 1;

      // Function-based vars: GSAP calls these per target, which is what lets a
      // SINGLE tween carry per-card values. The previous code ran one gsap.to
      // per element inside a loop, so each tween had exactly one target and
      // `stagger` was silently a no-op — there was no stagger at all.
      const vars = {
        // GSAP owns the whole transform once it writes yPercent, so the
        // horizontal centring has to come from here too — a CSS
        // translateX(-50%) would be overwritten and the deck would jump right.
        xPercent: -50,
        // yPercent, not `top: %`. A percentage `top` resolves against the stage
        // (the full viewport), which spread the deck across 60% of the screen;
        // yPercent resolves against the card's OWN height, which is what makes
        // the tutorial's 15% steps read as a tight deck.
        yPercent: (i: number) => TOP_BASE + TOP_STEP * seats[i].slot,
        z: (i: number) => -zStep * (depth - seats[i].slot),
        zIndex: (i: number) => seats[i].slot,
      };

      if (animated) {
        gsap.to(els, {
          ...vars,
          duration: 0.8,
          ease: EASE,
          // from "end" because the front card is the LAST entry in the order
          // array: the motion starts at the front and ripples backward.
          stagger: { each: 0.06, from: "end" },
        });
      } else {
        gsap.set(els, vars);
      }
    },
    [],
  );

  /** One step of the carousel — the tutorial's click handler, gated by the lock.
   *
   *  The two directions are one flight path travelled in opposite directions:
   *  `dir` 1 drops the front card off the bottom of the frame and steps the
   *  rest forward; -1 is its time-reverse, stepping the rest back and lifting
   *  the rearmost card up that same path from below the frame into the front
   *  seat. In both cases the moving card is excluded from the staggered reseat
   *  so it flies IN FRONT of the deck rather than along the fan. */
  const advance = useCallback((dir: 1 | -1) => {
    if (isAnimating.current || reduced) return;
    isAnimating.current = true;

    const order = orderRef.current;
    const last = order.length - 1;

    // The front card is the LAST entry of `order`, so the title that leaves the
    // mask is always order[last] — in BOTH directions. Only the arrival differs:
    // forward the card behind the front steps up (order[last - 1]); backward the
    // rearmost card is promoted (order[0] — see the reorder in step 3, which for
    // dir === -1 is [...order.slice(1), order[0]]).
    // These two were previously swapped for dir === -1, which left the outgoing
    // title sitting at y: 0% while the incoming one was parked outside the mask.
    // Two <h2>s then occupied the same absolute slot and their letters rendered
    // on top of each other — the "jumbled text on scroll up" bug.
    const leavingIdx = order[last];
    const arrivingIdx = dir === 1 ? order[last - 1] : order[0];

    const leavingCard = cardRefs.current[leavingIdx];
    const leavingChars = splitsRef.current[leavingIdx]?.chars ?? [];
    const arrivingChars = splitsRef.current[arrivingIdx]?.chars ?? [];

    const tl = gsap.timeline({
      onComplete: () => {
        // No extra guard: the next card may fire the instant the timeline ends.
        // A single flick double-firing is prevented by the gesture-settle gate
        // in handleGesture, not by padding the lock — the old LOCK_MS pushed
        // the deaf window to ~2.8s, which swallowed the user's next scroll.
        isAnimating.current = false;
      },
    });

    // 1. The leaving title fades out IN PLACE rather than sliding through the
    //    mask — a positional exit read as "the whole text block moving down"
    //    (matching the card's own downward flight), which looked like the
    //    title was relocating rather than being replaced. A fade keeps the
    //    text's position fixed; only the incoming title still slides in, so it
    //    reads as "old text goes away, new text arrives," not "text moves."
    tl.to(leavingChars, {
      opacity: 0,
      duration: 0.35,
      stagger: 0.015,
      ease: EASE,
    });

    // Bookkeeping shared by both directions: advance the order, park the
    // departed title clear of the mask, and point the video/year/a11y state at
    // the new front card.
    //
    // The parked chars stay at opacity 0 (put there by the fade in step 1) for
    // as long as they are parked: distance alone would leave the mask's exact
    // height load-bearing forever, so a resting title is held invisible by
    // BOTH. The entry tween in step 5 puts opacity back to 1 as the chars start
    // moving, while they are still outside the mask — so the visible motion is
    // a pure slide, never a fade-in.
    const commit = () => {
      orderRef.current =
        dir === 1
          ? [leavingIdx, ...order.slice(0, last)]
          : [...order.slice(1), order[0]];
      gsap.set(leavingChars, {
        y: dir === 1 ? PARK_ABOVE : PARK_BELOW,
        opacity: 0,
      });
      setFrontSlide(arrivingIdx);
    };

    if (dir === 1) {
      // 2. The front card flies straight down out of the frame, staying at
      //    front depth so it passes IN FRONT of the deck, not through it.
      tl.to(
        leavingCard,
        {
          // Same property and unit as initializeCards — mixing `top` in px with
          // yPercent left the card animating one axis while seated by another.
          yPercent: CARD_EXIT_Y,
          duration: 0.8,
          ease: EASE,
        },
        "-=0.2",
      );

      // 3. Then the rest step FORWARD one slot each, staggered. The fallen card
      //    is excluded so it does not fly back up through the deck to reach its
      //    rear slot.
      tl.add(() => {
        commit();
        initializeCards(true, leavingIdx);
      });

      // 4. Once the others have advanced, drop the fallen card into the vacated
      //    rear slot instantly. It is still below the frame at this point, so
      //    the reset is never seen — it simply appears at the back.
      tl.add(() => {
        const el = cardRefs.current[leavingIdx];
        if (!el) return;
        const { zStep } = sizeRef.current;
        gsap.set(el, {
          xPercent: -50,
          yPercent: TOP_BASE,
          z: -zStep * (orderRef.current.length - 1),
          zIndex: 0,
        });
      }, ">-0.15");
    } else {
      // 2. Backward is the forward step run in reverse. First the deck opens:
      //    every card EXCEPT the one being promoted steps BACK one slot,
      //    staggered from the front backward (initializeCards' `from: "end"`,
      //    whose highest remaining slot is now the old front card), vacating
      //    the front seat.
      tl.add(() => {
        commit();
        initializeCards(true, arrivingIdx);
      }, 0.15);

      // 3. Then the promoted card RISES from below the frame into that seat —
      //    the exact reverse of the forward drop — instead of travelling
      //    forward along the fan, which is what an unexcluded initializeCards
      //    used to do to it and what read as a card ploughing through the deck.
      //
      //    fromTo, not to: the from-vars teleport the card from its rear seat
      //    to the bottom of the flight path at FRONT depth (z: 0 and the top
      //    zIndex, so it overlays the deck as it climbs). Those three values
      //    are exactly what initializeCards assigns the front slot — TOP_BASE +
      //    TOP_STEP*last is FRONT_OFFSET by construction and its z works out to
      //    0 — so the card lands in a state indistinguishable from a normal
      //    reseat, and a later resize or forward step sees nothing unusual.
      //
      //    immediateRender: false is load-bearing — fromTo renders its from-vars
      //    at BUILD time by default, which would yank the card off-frame the
      //    instant the gesture fired instead of 0.3s in, after the fan has
      //    visibly started opening. That 0.15s gap after the recede begins is
      //    what stops the rear sliver's disappearance reading as a card popping
      //    out of existence.
      tl.fromTo(
        cardRefs.current[arrivingIdx],
        {
          xPercent: -50,
          yPercent: CARD_EXIT_Y,
          z: 0,
          zIndex: order.length - 1,
        },
        {
          yPercent: FRONT_OFFSET,
          duration: 0.8,
          ease: EASE,
          immediateRender: false,
        },
        0.3,
      );
    }

    // 5. The arriving card's letters travel into view, entering from the side
    //    the deck is turning from.
    tl.fromTo(
      arrivingChars,
      { y: dir === 1 ? PARK_ABOVE : PARK_BELOW, opacity: 1 },
      {
        y: "0%",
        duration: 0.6,
        stagger: 0.02,
        ease: EASE,
      },
      "+=0.1",
    );
  }, [initializeCards, reduced]);

  /** advance() is not in the useGSAP deps array. That is harmless today — its
   *  only unstable dep, `reduced`, is already in that array — but routing the
   *  call through a ref makes handleGesture structurally immune to it. */
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  /** Split the titles, seat the deck, and wire the scroll-jack driver. */
  useGSAP(
    () => {
      if (reduced || isTouch) return;

      let cancelled = false;
      let unsubscribeGesture: (() => void) | null = null;

      // One PHYSICAL gesture = one card, for as long as the pointer stays on the
      // deck. A flick emits a burst of virtual-scroll events (Lenis re-emits per
      // native wheel/touchmove), so the raw event stream is not the unit of
      // intent: fire on the first event of a burst, then stay disarmed until the
      // stream falls silent for SETTLE_MS.
      //
      // Deliberately NOT an accumulated-delta threshold — wheel deltaY (hundreds,
      // after Lenis's deltaMode and wheelMultiplier scaling) and touch deltaY
      // (single-digit px) are not on a comparable scale, so no single threshold
      // serves both inputs. Timing is the one signal that behaves alike for both.
      //
      // There is no edge or budget: advance() rotates orderRef cyclically both
      // ways, so the hundredth gesture behaves exactly like the first. Direction
      // sign matches raw WheelEvent.deltaY (down = positive) — Lenis scales
      // magnitude but never flips sign.
      const handleGesture = ({ deltaY }: { deltaY: number }) => {
        if (deltaY === 0) return;

        // Every event — fired or dropped — pushes the settle deadline out. The
        // burst keeps the gate shut; only silence reopens it.
        if (settleTimer.current) clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(() => {
          settleTimer.current = null;
          gestureArmed.current = true;
        }, SETTLE_MS);

        if (isAnimating.current) return;

        // A continuous scroll never goes silent, so the settle timer alone would
        // fire once and stall. Re-arm on elapsed time instead, giving one card
        // per REARM_MS for as long as the user keeps scrolling.
        if (!gestureArmed.current) {
          if (performance.now() - lastAdvanceAt.current < REARM_MS) return;
          gestureArmed.current = true;
        }

        gestureArmed.current = false;
        lastAdvanceAt.current = performance.now();
        advanceRef.current(deltaY > 0 ? 1 : -1);
      };

      /** Leaving the deck ends the gesture by definition — never carry a
       *  half-consumed burst into the next hover. */
      const resetGate = () => {
        if (settleTimer.current) {
          clearTimeout(settleTimer.current);
          settleTimer.current = null;
        }
        gestureArmed.current = true;
      };

      // The deck captures scroll ONLY while the pointer is over a card — see
      // the hoveringDeck comment for why that alone is a sound visibility
      // test. Lenis is stopped so the page holds still, and
      // gestures are read through Lenis's own 'virtual-scroll' event rather
      // than a competing native listener — it fires for both wheel and touch
      // with one normalized delta, and (per Lenis's source) keeps firing while
      // stopped, so input still arrives the whole time the deck owns scroll.
      //
      // Releasing deliberately does NOT reposition the scroll. The previous
      // version jumped to `trigger.end + 1` on release, which is what made the
      // handoff to the next section a teleport rather than a scroll. It is
      // unnecessary here: the page never moved while locked, so Lenis's
      // internalStart() -> reset() simply resyncs it to where it already is.
      const syncLock = () => {
        const want = hoveringDeck.current && sectionPinned.current;
        if (want === locked.current) return;
        // Bail AFTER the no-change check but BEFORE mutating `locked`, so a
        // call with no instance yet leaves state untouched and a later call
        // still succeeds — rather than desyncing `locked` from reality.
        const l = lenisRef.current;
        if (!l) return;
        locked.current = want;

        if (want) {
          l.stop();
          unsubscribeGesture = l.on("virtual-scroll", handleGesture);
        } else {
          unsubscribeGesture?.();
          unsubscribeGesture = null;
          resetGate();
          l.start();
        }
      };
      syncLockRef.current = syncLock;

      /** Recompute the full-viewport plateau from the section's own rect.
       *
       *  Driven by GSAP's ticker rather than Lenis's 'scroll' event, which was
       *  the obvious choice and is wrong: navbar.tsx:91 scrolls to anchors with
       *  `lenis.scrollTo(target, { force: true })`, and `force` exists precisely
       *  to move the page WHILE LENIS IS STOPPED. A stopped Lenis emits no
       *  'scroll', so a menu jump fired while the deck holds the lock would move
       *  the section out from under a stale `true` flag and leave the deck
       *  eating wheel events off-plateau — the exact bug this gate removes.
       *  The ticker runs unconditionally (smooth-scroll.tsx owns it as the app's
       *  single RAF loop), so the flag tracks reality in both states.
       *
       *  getBoundingClientRect() on one element per frame is a read of already-
       *  computed layout, and nothing here writes style before it, so this does
       *  not trigger layout thrash. */
      const syncPinned = () => {
        const el = sectionRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        // Inclusive at both ends, with tolerance, so the plateau is a reachable
        // band rather than an infinitely thin instant that smooth-scroll
        // interpolation can step straight over between frames.
        const want =
          r.top <= PIN_TOLERANCE_PX &&
          r.bottom >= window.innerHeight - PIN_TOLERANCE_PX;
        if (want === sectionPinned.current) return;
        sectionPinned.current = want;
        // Losing the plateau mid-lock must release: syncLock's own no-change
        // guard makes this a no-op whenever the lock state already agrees.
        syncLock();
      };
      // Seed before the first tick so a reload deep-linked into #videos, or a
      // remount with the cursor already over a card, starts out correct.
      syncPinned();
      gsap.ticker.add(syncPinned);

      void document.fonts.ready.then(() => {
        if (cancelled || !sectionRef.current) return;

        // Split once per card, not per index change.
        titleRefs.current.forEach((el, i) => {
          if (!el) return;
          const split = new SplitText(el, { type: "chars" });
          gsap.set(split.chars, {
            display: "inline-block",
            position: "relative",
          });
          splitsRef.current[i] = split;
          // Every title starts parked above the mask AND transparent, except
          // the front card's, which is already visible on load.
          const front = orderRef.current[orderRef.current.length - 1];
          gsap.set(split.chars, {
            y: i === front ? "0%" : PARK_ABOVE,
            opacity: i === front ? 1 : 0,
          });
        });

        // Every title's chars are now parked, so the wrapper-level guard in the
        // JSX can stand down and let the chars carry visibility from here on.
        setTitlesSplit(true);
        initializeCards(false);
      });

      return () => {
        cancelled = true;
        // Unconditional: must never leave the page unscrollable on unmount,
        // hot-reload, or Strict Mode's double-invoke. Read through the ref so
        // the double-invoke pass that captured `undefined` still releases the
        // real instance.
        unsubscribeGesture?.();
        // The ticker is app-global and outlives this component, so a callback
        // left on it would keep reading a detached section's rect every frame
        // and accumulate one leak per hot-reload.
        gsap.ticker.remove(syncPinned);
        resetGate();
        syncLockRef.current = null;
        hoveringDeck.current = false;
        sectionPinned.current = false;
        locked.current = false;
        lenisRef.current?.start();
        splitsRef.current.forEach((s) => s?.revert());
        splitsRef.current = [];
        // revert() destroys the chars, taking their parking with them — so hand
        // visibility back to the wrapper guard, or a re-run of this effect would
        // paint all five titles stacked in the gap before the new split lands.
        setTitlesSplit(false);
      };
    },
    // Deliberately NOT keyed on card size: a resize must not tear down the
    // splits and the trigger, which would also reseat a deck mid-rotation.
    // Resizing only repositions, in the effect below.
    { scope: sectionRef, dependencies: [reduced, isTouch, lenis] },
  );

  /** Reposition on resize without rebuilding anything. Skipped mid-sequence so
   *  a resize cannot land cards on top of an in-flight tween. */
  useEffect(() => {
    if (reduced || isTouch || isAnimating.current) return;
    initializeCards(false);
    ScrollTrigger.refresh();
  }, [size.cardW, size.cardH, reduced, isTouch, initializeCards]);

  // Reduced motion (any device) and touch (any motion preference) both skip
  // the scroll-jacked deck for a plain vertical list. Reduced motion gets
  // static posters, matching the user's OS preference; touch alone still
  // gets real playing video, gated per-card by MobileVideoCard's own
  // IntersectionObserver instead of the desktop deck's hover-driven gating.
  if (reduced || isTouch) {
    return (
      <section id="videos" className="relative w-full bg-black py-24">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/images/project-bg.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-4xl px-5 md:px-10">
          <div className="flex flex-col gap-12">
            {SLIDES.map((slide) => (
              <figure key={slide.name} className="w-full">
                <a
                  href={slide.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${slide.name} on Instagram`}
                  className="relative block aspect-video w-full overflow-hidden rounded-none shadow-2xl"
                >
                  {reduced ? (
                    <Image
                      src={slide.poster}
                      alt={slide.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 60vw"
                      className="object-cover"
                    />
                  ) : (
                    <MobileVideoCard slide={slide} />
                  )}
                </a>
                <figcaption className="mt-4">
                  <h3 className="font-coolvetica text-[clamp(20px,2vw,28px)] tracking-tight text-white">
                    {slide.name}
                  </h3>
                  <span
                    className="text-lg text-medium-gray"
                    style={{
                      fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {slide.year}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 200vh, not 100vh: a sticky child the same height as its container has zero
  // travel and never actually pins. The extra screen is the runway the deck
  // holds against, and what the pointer scrolls past on the margins.
  return (
    <section
      ref={sectionRef}
      id="videos"
      className="relative w-full bg-black h-[200vh]"
    >
      {/* Atmospheric background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 left-0 h-screen w-full">
          <Image
            src="/images/project-bg.webp"
            alt="Projects atmosphere"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
        </div>
      </div>

      {/* Pinned viewport — CSS sticky, not ScrollTrigger pin: the page wrapper
          has overflow-clip, and an injected pin-spacer misbehaves inside a
          clipping ancestor. The overflow-hidden here is also what makes hover
          a sound visibility test: it clips hit-testing, so an off-screen card
          cannot fire pointerenter. */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Stage — owns the perspective the deck recedes into */}
        <div
          ref={stageRef}
          className="absolute inset-0"
          style={{
            perspective: 1200,
            // 50% 50%, matching the now-centred front card, so the recession
            // stays symmetric about it rather than leaning downward-away.
            perspectiveOrigin: "50% 50%",
            transformStyle: "preserve-3d",
          }}
        >
          {SLIDES.map((slide, i) => (
            <div
              key={slide.name}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              onPointerEnter={() => {
                hoveringDeck.current = true;
                syncLockRef.current?.();
              }}
              onPointerLeave={() => {
                hoveringDeck.current = false;
                syncLockRef.current?.();
              }}
              // Tighter blur than the original 60px: at the fan's ~35px vertical
              // step, a wide blur bled adjacent card edges into each other and
              // into the front card, turning distinct slivers into one smudge.
              className="group absolute left-1/2 overflow-hidden rounded-none bg-black shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
              style={{
                width: size.cardW,
                height: size.cardH,
                // Vertically centred in the stage; GSAP takes it from here via
                // xPercent/yPercent/z. No CSS transform — GSAP owns that.
                top: "50%",
                transformStyle: "preserve-3d",
              }}
            >
              <a
                href={slide.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${slide.name} on Instagram`}
                tabIndex={i === frontSlide ? 0 : -1}
                aria-hidden={i !== frontSlide}
                className="block h-full w-full"
              >
                <video
                  ref={(el) => {
                    videoRefs.current[i] = el;
                  }}
                  src={slide.video}
                  poster={slide.poster}
                  loop
                  muted
                  playsInline
                  preload={i === frontSlide ? "auto" : "metadata"}
                  className="h-full w-full object-cover"
                />
              </a>

              {/* Always mounted, hidden unless this is the front card —
                  remounting it as the deck turns would drop hover state. */}
              <button
                onClick={(e) => {
                  // Both are required: this sits inside the Instagram <a>, so
                  // without preventDefault the click navigates away.
                  e.preventDefault();
                  e.stopPropagation();
                  setMuted((m) => !m);
                }}
                aria-label={muted ? "Unmute video" : "Mute video"}
                tabIndex={i === frontSlide ? 0 : -1}
                aria-hidden={i !== frontSlide}
                className={`absolute right-3 top-3 z-20 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-black/60 focus-visible:opacity-100 ${
                  i === frontSlide
                    ? "opacity-0 group-hover:opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                {muted ? <VolumeXIcon size={16} /> : <Volume2Icon size={16} />}
              </button>
            </div>
          ))}
        </div>

        {/* Title + year — vertically centred on the LEFT.

            All five titles are absolutely stacked in this ONE mask, so what
            keeps four of them off screen is entirely the animation: the reveal
            moves individual CHARACTERS by `y: ±TITLE_TRAVEL%`, a percentage of
            a single char's own height (1em == titleFontPx, leading-none), while
            the mask is TITLE_MASK_RATIO em tall. The invariant is therefore
            TITLE_TRAVEL > TITLE_MASK_RATIO * 100 — otherwise a parked char is
            still inside the mask and renders on top of the front title, which
            is exactly what a 1.8em mask against a 100% travel used to do. Both
            constants live at the top of this file and are used by the height
            below, so they cannot drift; parked chars are additionally held at
            opacity 0 so the geometry is not the only guard.

            pointer-events-none is load-bearing too, not hygiene: the margins are
            the scroll-past zone, and anything hoverable here would lock scroll. */}
        {/* Width is an inline style, computed from the CARD's actual live
            position, not a vw guess — the deck's margin does not grow
            monotonically with viewport width (geometry() is height-bound at
            some sizes, width-bound at others), so a fixed vw fraction either
            overlaps the card at some sizes or is needlessly cramped at others.
            (viewport.w - size.cardW) / 2 is the real gap between the viewport
            edge and the card's left edge; subtracting the container's own
            padding leaves exactly the room available for the title, so the
            text can never reach the card regardless of viewport. Must be a
            DEFINITE width, not max-w: the <h2>s inside the mask are all
            absolutely positioned and contribute nothing to an intrinsic width,
            so a shrink-to-fit container collapses the mask to 0px. */}
        <div
          className="pointer-events-none absolute left-0 top-1/2 z-20 -translate-y-1/2 px-4 text-right"
          style={{ width: marginBoxW }}
        >
          {/* Mask height is a FIXED pixel budget derived from titleFontPx, not an
              em-relative one — leading-tight clipped this font's glyphs at
              1.2em and still at 1.5em, so Coolvetica's line box overshoots what
              those ratios assume. leading-none on the text puts its own
              line-height at exactly 1 line; sizing the mask independently, with
              headroom, means the actual glyph metrics can't out-grow it.
              whitespace-nowrap stops a long title ("TROPICAL ESTATE") wrapping
              to a second line and getting cut instead of just clipped left-right;
              titleFontPx (sized to fit marginBoxW) is what keeps it from also
              overflowing sideways into the card. */}
          <div
            className="relative overflow-hidden"
            style={{ height: titleFontPx * TITLE_MASK_RATIO }}
          >
            {SLIDES.map((slide, i) => (
              <h2
                key={slide.name}
                ref={(el) => {
                  titleRefs.current[i] = el;
                }}
                className="absolute inset-x-0 top-0 whitespace-nowrap text-right font-coolvetica leading-none tracking-tight text-white"
                style={{
                  fontSize: titleFontPx,
                  // FIRST-PAINT GUARD ONLY. The parking GSAP applies waits on
                  // document.fonts.ready, and until that resolves nothing else
                  // hides the four non-front titles — they would all render
                  // stacked. Once titlesSplit flips this must go back to a flat
                  // 1: opacity on this WRAPPER pins the title invisible no
                  // matter what GSAP does to the char spans inside it, so a
                  // permanent `i === SLIDES.length - 1 ? 1 : 0` left every title
                  // but the last one blank forever.
                  opacity: titlesSplit || i === SLIDES.length - 1 ? 1 : 0,
                }}
              >
                {slide.name}
              </h2>
            ))}
          </div>
        </div>

        {/* Year — vertically centred on the RIGHT, mirroring the title. Not in a
            mask: it is plain React state (frontSlide), swapped by re-render, and
            was never part of the SplitText char animation. */}
        <div
          className="pointer-events-none absolute right-0 top-1/2 z-20 -translate-y-1/2 px-4"
          style={{ width: marginBoxW }}
        >
          <span
            className="block text-left text-lg text-medium-gray"
            style={{
              fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
              letterSpacing: "-0.03em",
            }}
          >
            {SLIDES[frontSlide].year}
          </span>
        </div>
      </div>
    </section>
  );
}
