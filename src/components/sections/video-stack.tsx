"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";
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

/** LONGEST_TITLE's per-character advance at 1px — used only to size the title
 *  down to the space actually available (see the title block below).
 *
 *  MEASURED FOR MANROPE 800, the face this heading actually renders in since
 *  the 2026-08-29 migration (app/layout.tsx). The previous 0.31 was measured
 *  against the OLD Coolvetica Condensed face (status.md: `TROPICAL ESTATE` =
 *  4.574em, 0.305/char) and was never re-measured when the font changed, so it
 *  under-estimated Manrope by ~2x: the title was sized for twice the room it
 *  had, overflowed, and the mask clipped it by 82-149px at every common
 *  desktop width. layout.tsx's note that Manrope reads "narrower than the brand
 *  mark it replaces" is true of a DISPLAY face, not of the condensed one this
 *  number came from — which is exactly how the stale value survived.
 *
 *  Derived from the two Manrope 800 widths already measured elsewhere in this
 *  repo, so this is not a fresh estimate:
 *
 *      width("ATWO") as one run          2.9600em   (footer.tsx KERN_EM note)
 *      width("CREATIVE DIRECTION")      10.3580em   (services.tsx size note)
 *
 *  A per-glyph advance model fitted to BOTH (one correction factor, 0.9404,
 *  covering kerning plus this element's -0.02em tracking) reproduces them to
 *  ±0.6%, and yields `TROPICAL ESTATE` = 8.776em / 15 chars = 0.585 per char.
 *  Rounded up to 0.60 for margin.
 *
 *  RE-MEASURED 2026-09-05 in a real browser against the LIVE element's own
 *  computed style, at 2560x1440, after the geometry() cap raise below removed
 *  the slack the 44px ceiling used to hide:
 *
 *      TROPICAL ESTATE  8.383em / 15 = 0.559 per char   <- the binding title
 *      ORNATE FLESH     6.946em / 12 = 0.579
 *      BLUORNG          4.627em /  7 = 0.661 per char, but only 4.63em total
 *      GULLY            2.954em /  5 = 0.591
 *
 *  Two things the derivation above got wrong, both harmless at 0.60 but worth
 *  recording. (a) The heading computes to font-weight 400, NOT 800 -- the
 *  h2 sets no weight and Manrope's variable face resolves to 400 here, so the
 *  "MANROPE 800" figures overstate it slightly. (b) LONGEST_TITLE picks by
 *  CHARACTER COUNT, and BLUORNG is the widest per char (0.661); it is still
 *  the right choice because sizing is driven by TOTAL width and TROPICAL
 *  ESTATE is widest overall at 8.383em, but a future title could break that
 *  assumption -- if one does, pick by measured em width, not by length.
 *
 *  0.60 remains correct and conservative: it over-estimates the binding title
 *  by 7.4%, so at 2560x1440 the text renders 336.8px inside a 361.6px mask,
 *  25px of slack, first glyph at x=34.8 against a mask starting at x=16.
 *
 *  If the font stack changes again this MUST be re-measured — status.md already
 *  records one round of wrong conclusions drawn from a stale value of this very
 *  constant, and footer.tsx:47-51 carries the same warning for its kern table.
 *  The mask's overflow-hidden remains the hard backstop if it is ever off. */
const CHAR_WIDTH_RATIO = 0.6;

/** Horizontal padding on the title container, which MUST equal the px-4 class
 *  on that element. It is subtracted from the text budget below. Previously it
 *  was not: marginBoxW subtracted only CARD_CLEARANCE_PX, then px-4 ate another
 *  32px out of the same box, so the title was sized for 32px more room than it
 *  had and clipped by exactly that at every 16:9 desktop from 1280x720 through
 *  1920x1080. The comment on the container claimed the padding was accounted
 *  for; the arithmetic did not do it. */
const TITLE_PAD_X = 32;

/** Pure breathing room between the title/year text and the card — NOT the
 *  site's usual side margin. The site's px-5/md:px-10/lg:px-[75px] scale was
 *  tried here and rejected: at the real 75px `lg` padding there was almost no
 *  width left for text on common laptop screens (~21px at 1440x900), so long
 *  titles clipped to a few characters. The only rule that matters for this
 *  element is "never touch or overlap the card" — so the text is sized to the
 *  REAL gap to the card (see marginBoxW below), with just this much clearance,
 *  and is free to be as large as that gap allows. */
const CARD_CLEARANCE_PX = 16;

/** Slack, in px, on each end of the "section fills the viewport" test that gates
 *  wheel capture. The rect is read mid-interpolation while Lenis eases, so its
 *  edges land on fractional pixels and a strict `top <= 0 && bottom >= innerHeight`
 *  flickers at the boundary. Small enough that the deck cannot arm before the
 *  plateau is visually reached, large enough to absorb sub-pixel noise and
 *  browser zoom. */
const PIN_TOLERANCE_PX = 2;

/** dvh of scroll runway allotted to each card. The deck is driven by SCROLL
 *  POSITION through this section, so this number alone decides what a gesture
 *  costs: 12 dvh is ~108px at a 900px viewport, which is about one Lenis wheel
 *  notch (wheelMultiplier 1, duration 1.1 — see smooth-scroll.tsx). So one
 *  deliberate notch advances roughly one card, while a flick crosses the whole
 *  section and lands in the next one.
 *
 *  Below ~10 a single notch skips two cards; above ~18 the section costs more
 *  than two screens to pass.
 *
 *  This is the driver whenever the pointer is NOT over the deck. While it IS,
 *  the wheel is captured and steps the deck directly instead of scrolling the
 *  page — see onWheel/stepDeck. That capture is deliberately narrow: wheel
 *  only, on this section's own node, and it loops rather than dead-ending. An
 *  earlier version stopped Lenis outright while hovered and metered the reader
 *  through with no exit, and a lock that outlived the component could leave the
 *  PAGE unscrollable. Nothing global is touched now — see the teardown. */
const DVH_PER_CARD = 12;

/** Accumulated |deltaY| that commits one card step while the deck holds the
 *  wheel. 60 sits below one mouse notch (100-120px in Chrome, and ~120 once
 *  Firefox's line-mode deltas are normalised) so a single deliberate notch
 *  always steps exactly one card, and above the 1-40px dribble a trackpad emits
 *  so a resting two-finger touch does nothing. */
const WHEEL_STEP_THRESHOLD = 60;

/** Minimum gap between two committed steps. A trackpad flick emits 20-50 events
 *  with ~8-16ms between them, so this is far longer than any intra-gesture gap
 *  and comfortably shorter than a deliberate second notch: one physical gesture
 *  buys one card. It does not need to match the ~1.5s animation, because the
 *  one-slot queue in advance()'s onComplete absorbs anything arriving mid-flight. */
const GESTURE_COOLDOWN_MS = 420;

/** Silence that ends a gesture and zeroes the accumulator. ~8 frames: longer
 *  than any gap inside a flick, short enough that two deliberate notches are
 *  never merged into one. Compared against event timestamps rather than run
 *  through setTimeout, so there is no timer to cancel on teardown. */
const GESTURE_IDLE_MS = 140;

/** Lenis's own line-height constant for deltaMode 1 (see getDeltaMultiplier in
 *  lenis.mjs). Firefox reports wheel deltas in LINES, not pixels — roughly 3 per
 *  notch — so without this normalisation the accumulator never reaches its
 *  threshold there and the deck silently never steps. */
const WHEEL_LINE_HEIGHT = 100 / 6;

/** 100dvh of pin box plus one runway band per card. The sticky child needs
 *  travel > 0 to pin at all (a sticky child the same height as its container
 *  never moves), and TOTAL bands is what maps scroll progress onto the TOTAL
 *  card slots. */
const SECTION_DVH = 100 + DVH_PER_CARD * TOTAL;

/** The viewport the deck needs, in CSS px. This is a test of viewport SHAPE, not
 *  of input hardware, because shape is what the fallback is actually about: the
 *  deck is a wide 3D fan flanked by side rails, and a SECTION_DVH-tall
 *  scroll-linked pin is a poor phone experience. The vertical list is simply the
 *  right design for a narrow or short window.
 *
 *  This used to be `matchMedia("(hover: none)")`, which asked the wrong
 *  question. The deck has no hover dependency left at all — it is driven by
 *  scroll position (syncDeck chasing readProgress), which touch scrolling drives
 *  identically; the wheel capture and pointermove tracking below are pure
 *  enhancement and degrade cleanly when absent. Testing hover also meant the
 *  deck could never appear in DevTools' responsive mode, which forces
 *  `hover: none` at EVERY emulated size — so a 2560x1440 view fell back to the
 *  list even though the deck fits there beautifully.
 *
 *  WIDTH: below 1024 the side rails fall under MIN_LEGIBLE_TITLE_PX and
 *  showSideTitles hides them outright — 768x1024 and 834x1112 both compute an
 *  11px title. HEIGHT: 600 matches the threshold the `wide:` variant already
 *  uses for the fullscreen menu, and keeps the tall pin off short landscape
 *  phones (844x390). Measured cardW x cardH at the sizes that matter:
 *  1280x720 -> 870x490, 1920x1080 -> 1306x734, 2560x1440 -> 1741x979. */
const DECK_MIN_W = 1024;
const DECK_MIN_H = 600;

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
 *  while the front card stays the dominant element. Finally to 9 when the deck
 *  was centred — that move put 6 below the visibility threshold derived in the
 *  next block, not because a bigger fan was wanted for its own sake. */
/** The front card sits in the LAST slot, so its seat is
 *  `TOP_BASE + TOP_STEP*(TOTAL-1)` — i.e. exactly FRONT_OFFSET by construction.
 *  With CSS `top: 50%` and yPercent resolving against the card's OWN height,
 *  -50 puts the card's midline exactly on the stage midline — dead centre, and
 *  that is the point. The front card is the element this whole section is
 *  about, so it sits in the middle of the viewport with equal gaps top and
 *  bottom, matching the horizontal half (xPercent: -50 against `left: 1/2`).
 *
 *  This was briefly -38, seating the deck 12% of card height LOW on the theory
 *  that the upward fan needed extra headroom above it. That bought headroom by
 *  spending it at the floor — the drop moves the front card's bottom edge down
 *  exactly as much as it frees space up top — and it decentred the one element
 *  that most needed to read as centred. Two things silently depend on the
 *  centre and were both wrong at -38: the left/right text rails are pinned to
 *  true centre (`top-1/2 -translate-y-1/2`), so they floated 12% of cardH above
 *  the card's midline; and `perspectiveOrigin: 50% 50%` put the vanishing point
 *  above the front card, tilting the recession upward-away rather than straight
 *  back. Centring aligns all three by construction.
 *
 *  Centring has one non-obvious cost, and TOP_STEP pays it. The binding
 *  constraint at -50 is a LOWER bound on TOP_STEP, not the upper (clipping) one
 *  an earlier version of this comment warned about. Two effects fight over a
 *  back card's RENDERED top edge: the layout stagger lifts it by TOP_STEP
 *  yPercent per slot, while the perspective shrink pulls it back down toward the
 *  vanishing point at H/2 by (1 - scale) * |top - H/2|. Moving the deck to
 *  centre moved it closer to that vanishing point, where the shrink term grows
 *  faster than the stagger term. Slot n's edge coincides with the front card's
 *  when
 *
 *      (FRONT_OFFSET - TOP_STEP*(TOTAL-1-n)) * scale_n = FRONT_OFFSET
 *
 *  For the back card (scale ~0.669) at FRONT_OFFSET -50 that solves to
 *  TOP_STEP > 6.187. At the old TOP_STEP of 6 the deck sat just BELOW that
 *  threshold: the stagger was still applied, but every card behind the front
 *  rendered its top edge ~3.8px INSIDE the front card and the fan vanished
 *  behind it. Nothing was clipped and no constant had been lost — the fan was
 *  simply occluded, which is why it read as "almost right".
 *
 *  9 clears the threshold with margin, showing ~57px of fan above the front card
 *  at 1920x1080. Expect the slivers to read roughly UNIFORM rather than
 *  ascending front-to-back: this close to the vanishing point the scale ladder,
 *  not the raw step, does most of the differentiating.
 *
 *  Clipping is not the constraint here and there is no need to retreat from a
 *  larger step for fear of it: TOP_STEP would have to reach ~21 before the back
 *  card's rendered top edge reached 0 at 1920x1080. If FRONT_OFFSET is ever
 *  decentred again, re-derive from the formula above rather than reusing 9.
 *
 *  TOP_BASE is derived from the front card's slot so tuning the front position
 *  doesn't require re-deriving it from the back card. */
const TOP_STEP = 9;
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

function geometry(viewportW: number, viewportH: number) {
  // Bounded by height too: the deck fans downward from the top card, so the
  // whole stack plus its fan has to fit the pinned viewport.
  // Cap raised 1350 -> 1800 for large monitors. This is provably inert at every
  // viewport where the side rails were ever at risk, because those are exactly
  // the HEIGHT-bound ones where byWidth is not the binding term: 1280x720,
  // 1366x768, 1440x900, 1512x982, 1920x1080 and 2560x1080 all compute the
  // identical cardW before and after. The old 1350 only ever bound on a tall
  // large screen -- at 2560x1440 it held the card to 53% of viewport height
  // when the whole point of the 0.68 factor below is that it fills 68%. There
  // the card now goes 1350 -> 1741 (byHeight binds, not this cap), the margin
  // box 589 -> 394px and the title 44 -> 40.2px, still well clear of
  // MIN_LEGIBLE_TITLE_PX. 1800 itself only actually binds at >=3840 wide.
  const byWidth = Math.min(viewportW * 0.93, 1800);
  // 0.68, reduced from 0.78, to leave the side rails a legible margin. At
  // <=1512px wide this branch — not byWidth — is what binds, so it alone sets
  // how much room is left beside the card for the title/year (marginBoxW
  // below). At 0.78 that margin was so thin that an honestly-sized title (see
  // CHAR_WIDTH_RATIO) came out at ~11px and tripped MIN_LEGIBLE_TITLE_PX, which
  // HID both rails outright at 1280x720, 1366x768, 1440x900 and 1512x982.
  // Lowering the width factor does not help: those sizes are height-bound, so
  // byWidth is not the binding term. At 0.68 the rails are visible at every
  // desktop size checked (title 12.7-28.8px) and the card still fills 68% of
  // the viewport height, so it remains the dominant element. Raising this back
  // toward 0.78 re-hides the rails on <=1512px screens.
  //
  // Safe for the fan: a shorter card moves the back card's SCALED top edge DOWN
  // (82->118px at 1280x720, 164->176px at 1920x1080, measured with the ~0.67
  // perspective foreshortening described at TOP_BASE), and lifts the front
  // card's bottom edge. The stack gains headroom here, it does not lose it.
  const byHeight = (viewportH * 0.68) / RATIO;
  const cardW = Math.min(byWidth, byHeight);
  return { cardW, cardH: cardW * RATIO, zStep: cardW * Z_STEP_RATIO };
}

/** Vertical-list card for the small-viewport fallback: plays its own video
 *  while scrolled into view and pauses otherwise, instead of the deck's single
 *  front-card driver (which this branch never reaches — see DECK_MIN_W). */
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
  /** The sticky pinned box. Measured — not assumed — because the deck's scroll
   *  progress must divide the section's rect by the SAME unit the section is
   *  sized in. See readProgress. */
  const stickyRef = useRef<HTMLDivElement>(null);
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

  /** How many forward steps the DECK has actually realised, 0..TOTAL-1. Not the
   *  scroll's target — the two are allowed to diverge, and closing that gap one
   *  step per animation is the whole chase mechanism (see syncDeck). advance()
   *  moves the deck exactly one slot, so this must be incremented by ±1 to
   *  mirror it; assigning the scroll's target here would desync the ref from
   *  the deck and strand cards. */
  const stepRef = useRef(0);

  /** Pointer is over the deck, so the wheel belongs to the deck rather than to
   *  the page. A ref, not state: onWheel must read it synchronously, and a
   *  re-render per hover would fight GSAP for the card transforms (see the
   *  orderRef and titlesSplit notes above). */
  const capturedRef = useRef(false);
  /** Pointer is inside the card stack's bounds. One half of the capture gate;
   *  see syncCapture for why it is not sufficient alone. */
  const hoveringStackRef = useRef(false);
  /** True only while the section exactly fills the viewport — its top has reached
   *  0 and its bottom has not yet risen above the viewport bottom.
   *
   *  Hover alone is NOT enough, and this is the gate that says so. The sticky
   *  child is pinned and painted while the section is still only PARTLY in view,
   *  so a cursor resting where the deck sweeps past would otherwise hijack the
   *  wheel mid-approach — in both directions — and step cards before the deck
   *  had visually settled. The deck may own the wheel only on the full-screen
   *  plateau. */
  const sectionPinnedRef = useRef(false);
  /** Signed, pixel-normalised wheel delta banked toward the next step. Zeroed on
   *  commit, on a direction reversal, and after GESTURE_IDLE_MS of silence. */
  const wheelAccumRef = useRef(0);
  /** Event timestamp of the last wheel event, for the idle reset. Event
   *  timestamps only — never mixed with Date.now()/performance.now(), which have
   *  a different origin. */
  const lastWheelTsRef = useRef(0);
  /** Event timestamp of the last COMMITTED step, for the cooldown. */
  const gestureLockRef = useRef(0);
  /** At most one pending step, or null. Overwritten rather than appended, so a
   *  reader who reverses mid-animation gets their latest intent, not a backlog. */
  const queuedDirRef = useRef<1 | -1 | null>(null);

  const [viewport, setViewport] = useState({ w: 1440, h: 900 });
  const [reduced, setReduced] = useState(false);
  /** False until the first client effect has run. Load-bearing for HYDRATION,
   *  not just tidiness: `viewport` is SEEDED to 1440x900 above, so a branch
   *  derived from it would render the deck on the server and then flip to the
   *  list on a small screen the moment the real size arrives — changing the
   *  SHAPE of the first client render, which is React #418. status.md records
   *  this exact trap from floating-particles.tsx: "Any client-only media/pointer
   *  state must not change the shape of the first client render."
   *
   *  Rendering the LIST until mounted is the safe direction: it is the simpler
   *  tree, it is what a no-JS visitor keeps, and it means the seeded 1440x900
   *  default never gets to decide the branch. */
  const [mounted, setMounted] = useState(false);
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
  /** Does this viewport have room for the deck? Derived from the SAME `viewport`
   *  state the resize handler below already maintains — deliberately not a
   *  second listener or a matchMedia, so the size the deck is drawn at and the
   *  size that decides whether to draw it can never disagree.
   *
   *  `mounted` gates it so the server and the first client render always agree
   *  on the list (see the mounted declaration above). */
  const deckFits =
    mounted && viewport.w >= DECK_MIN_W && viewport.h >= DECK_MIN_H;
  /** Same mirror-into-a-ref trick, for onWheel's deltaMode 2 (pages) case. */
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

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
  // Subtract the container's own px-4 before sizing: `width: marginBoxW` is
  // the BORDER box, and px-4 comes out of it, so the text only ever had
  // marginBoxW - TITLE_PAD_X to live in.
  const titleTextBoxW = Math.max(0, marginBoxW - TITLE_PAD_X);
  const titleFontPx = Math.min(
    44,
    Math.max(11, titleTextBoxW / (LONGEST_TITLE.length * CHAR_WIDTH_RATIO)),
  );
  // Below the floor the box is genuinely too narrow for the longest title even
  // at 11px, and no font size rescues it -- geometry() is height-bound at these
  // sizes, so the card eats almost the whole width (48px of text room at
  // 1440x900 and 1024x600 for a title needing 51px). Rendering it anyway put an
  // illegible, clipped sliver beside the card. Hiding the side rails there is
  // the honest outcome: the card itself still carries the work, and the layout
  // reads as deliberate rather than broken.
  const MIN_LEGIBLE_TITLE_PX = 12;
  const showSideTitles =
    titleTextBoxW >= LONGEST_TITLE.length * CHAR_WIDTH_RATIO * MIN_LEGIBLE_TITLE_PX;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);

    // Whether the deck runs is decided by viewport SIZE (see DECK_MIN_W), and
    // the size itself arrives from onResize below — which runs immediately, so
    // this same effect both unblocks the branch and supplies the measurement it
    // reads. Nothing else is needed here beyond announcing that we are on the
    // client and the seeded 1440x900 no longer stands in for a real viewport.
    setMounted(true);

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

  /** One step of the carousel — the tutorial's click handler, now driven by
   *  scroll position rather than by a captured gesture (see syncDeck).
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
        isAnimating.current = false;

        // The SCROLL driver needs nothing drained: syncDeck re-derives its
        // target from live scroll position every ticker frame, so the next card
        // fires on the very next tick if the reader is still ahead of the deck,
        // and a queued direction there would be worse than useless — it could
        // fire a card the wrong way after the reader had already reversed.
        //
        // Capture has no such live source to re-read. The page does not move
        // while the deck holds the wheel, so a notch arriving mid-flight leaves
        // no trace anywhere and would simply be lost. Hence exactly one queued
        // slot, and only ever written by stepDeck. The reversal hazard above is
        // handled by stepDeck OVERWRITING that slot rather than appending, so
        // what lands here is the reader's latest intent, never a stale backlog.
        const queued = queuedDirRef.current;
        // Cleared before dispatch, or a re-entrant step could read it twice.
        queuedDirRef.current = null;
        // Dropped if the pointer has since left: the reader has moved on, and
        // firing now would re-open the stepRef/scroll divergence that
        // exitCapture just reconciled.
        if (queued && capturedRef.current) stepDeckRef.current?.(queued);
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
   *  call through a ref makes the ticker driver structurally immune to it. */
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  /** stepDeck is defined inside useGSAP (it closes over ready/readProgress), but
   *  advance()'s onComplete — declared above that effect — has to reach it to
   *  drain the queue. Same indirection as advanceRef above. Null until that
   *  effect runs, and permanently null on the reduced/touch path where it
   *  early-returns, so the call site optional-chains rather than asserting.
   *
   *  The capture and pointer callbacks need no such handle: their listeners are
   *  attached natively inside that same effect, so nothing outside it calls them. */
  const stepDeckRef = useRef<((dir: 1 | -1) => void) | null>(null);

  /** Split the titles, seat the deck, and wire the scroll-linked driver. */
  useGSAP(
    () => {
      if (reduced || !deckFits) return;

      let cancelled = false;
      /** The deck cannot turn before document.fonts.ready has split the titles:
       *  advance() would animate empty char arrays and the reveal would be lost
       *  for that step. Set at the end of the split callback below. */
      let ready = false;

      /** Where the reader is within this section's pinned runway, 0..1.
       *
       *  `-r.top` is exactly how far the section has scrolled under the viewport
       *  top; `travel` is how far it CAN before the sticky child unsticks. The
       *  clamp is what lets this one number serve the whole section: it reads 0
       *  across the entire approach and 1 once the section has passed, so no
       *  separate "is it pinned" flag is needed.
       *
       *  Measure the pin box rather than reading window.innerHeight. The section
       *  is sized in dvh and this box is h-dvh, but innerHeight is the CURRENT
       *  viewport while dvh resolves against the LARGEST one (browser UI
       *  retracted). With any UI chrome showing the two disagree by the toolbar
       *  height, which would bias every progress reading. Measuring the box that
       *  actually carries the dvh makes both sides of the division the same unit
       *  by construction, so this cannot drift if the units change. */
      const readProgress = () => {
        const el = sectionRef.current;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const pinH =
          stickyRef.current?.getBoundingClientRect().height ??
          window.innerHeight;
        const travel = r.height - pinH;
        if (travel <= 0) return null;
        return Math.min(1, Math.max(0, -r.top / travel));
      };

      /** Which step the SCROLL is asking for, 0..TOTAL-1. TOTAL equal bands over
       *  the runway; the min is required rather than defensive, since at
       *  progress === 1 the floor yields TOTAL, one past the last slot. */
      const stepFor = (progress: number) =>
        Math.min(TOTAL - 1, Math.floor(progress * TOTAL));

      /** Step the deck by one card under POINTER CAPTURE, as opposed to
       *  syncDeck's scroll-position chase.
       *
       *  stepRef wraps modulo TOTAL here, and that is load-bearing rather than
       *  tidy. advance() already rotates orderRef cyclically in both directions
       *  (see its commit()), so the deck itself has no end state and loops for
       *  free — but syncDeck's `stepRef.current += dir` is unbounded and stays in
       *  range only because stepFor() clamps what it is compared against. Under
       *  capture nothing clamps it, so without the modulo this ref would walk out
       *  of the 0..TOTAL-1 domain that exitCapture's re-adoption depends on. */
      const stepDeck = (dir: 1 | -1) => {
        if (isAnimating.current) {
          // Overwrite, never append: one slot holds the reader's LATEST intent.
          // A reader who flicks down then immediately up must not be shown the
          // stale downward step first.
          queuedDirRef.current = dir;
          return;
        }
        queuedDirRef.current = null;
        stepRef.current = (stepRef.current + dir + TOTAL) % TOTAL;
        advanceRef.current(dir);
      };
      stepDeckRef.current = stepDeck;

      /** THE one place capture is armed or released.
       *
       *  Capture requires BOTH conditions — the pointer over the card stack and
       *  the section on its full-screen plateau — and either can change without
       *  the other: the pointer moves (pointermove/leave) or the page scrolls
       *  (the ticker). Two independent setters would each have to know the other
       *  half's state and would drift apart, so both edges route through here and
       *  this function alone owns `capturedRef` and the attribute.
       *
       *  Nothing global is touched. The attribute lives on a node this component
       *  owns and dies with it, so unlike the lenis.stop() this replaced there is
       *  no lock that could survive teardown and strand the page unscrollable. */
      const syncCapture = () => {
        const want = hoveringStackRef.current && sectionPinnedRef.current;
        if (want === capturedRef.current) return;
        capturedRef.current = want;

        if (want) {
          // Stale values from a previous capture must not carry into this one.
          wheelAccumRef.current = 0;
          queuedDirRef.current = null;
          // Lenis reads this off the event's composedPath and bails BEFORE it
          // would scroll — the wheel-specific variant, since touch takes the
          // vertical-list branch and never reaches this code at all.
          stickyRef.current?.setAttribute("data-lenis-prevent-wheel", "");
          return;
        }

        wheelAccumRef.current = 0;
        queuedDirRef.current = null;
        stickyRef.current?.removeAttribute("data-lenis-prevent-wheel");
        // Hand the deck back to syncDeck consistently. While captured the page
        // did not move but stepRef did, so the two have diverged by however many
        // cards the reader turned. syncDeck un-suppresses on the very next tick,
        // compares a walked stepRef against an unchanged scroll position, and
        // would fire a burst of up to TOTAL-1 advances — seconds of animation in
        // a direction nobody asked for. Re-adopting the scroll's own step
        // silently is the same trade the initial adoption below already makes
        // and justifies: a silent mismatch (the visible card is not the one this
        // scroll band implies) beats a burst, and the reader's next gesture
        // resolves it in one step.
        const p = readProgress();
        if (p !== null) stepRef.current = stepFor(p);
      };

      /** Recompute the full-viewport plateau from the section's own rect, and
       *  release capture if it has been lost.
       *
       *  Folded into syncDeck's existing tick rather than given its own ticker
       *  callback — it measures an element syncDeck already reads, and the two
       *  must agree within a frame. Driving it from the ticker rather than
       *  Lenis's 'scroll' event matters for the same reason spelled out on
       *  syncDeck: navbar.tsx jumps anchors with scrollTo(…, { force: true }),
       *  and a STOPPED Lenis emits no 'scroll', so a menu jump would move the
       *  section out from under a stale `true` and leave the deck eating wheel
       *  events off-plateau. */
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
        if (want === sectionPinnedRef.current) return;
        sectionPinnedRef.current = want;
        // syncCapture's own no-change guard makes this a no-op unless this flip
        // actually changes the gate.
        syncCapture();
      };
      // Seed before the first tick so a reload deep-linked into #videos, or a
      // remount with the cursor already over the deck, starts out correct.
      syncPinned();

      /** Is this client point inside the card stack? A pure arithmetic test
       *  against the stack's bounds, NOT a DOM hit test.
       *
       *  Deliberately not handlers on the cards themselves: they are in constant
       *  3D motion, so during a step the front card drops out from under the
       *  cursor and the fan re-seats. A cursor near the stack's edge would land
       *  in a gap between cards and fire pointerleave mid-gesture, dropping
       *  capture. A static rectangle has no gaps and does not move.
       *
       *  Nor a transparent hit-area ELEMENT: GSAP gives each card an explicit
       *  zIndex and the side rails sit at z-20, so any wrapper would create a new
       *  stacking context and collapse the deck below the rails. Arithmetic costs
       *  no DOM node and cannot perturb the layering at all. */
      const overStack = (clientX: number, clientY: number) => {
        const stage = stageRef.current;
        if (!stage) return false;
        const r = stage.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const { cardW, cardH, zStep } = sizeRef.current;

        // The rear card's top edge must be measured AS RENDERED, not from the
        // raw stagger. Both terms are needed and they pull opposite ways: the
        // stagger lifts slot n by TOP_STEP yPercent, while the perspective
        // shrink pulls it back toward the vanishing point at the stage centre.
        // Using the stagger alone overshoots the top edge by 140-210px at common
        // desktop sizes — literally off the top of the viewport — which would
        // swallow the escape area above the deck. This is the same scale ladder
        // TOP_BASE's comment derives; it is what makes the fan read as uniform
        // slivers rather than an ascending ramp.
        const persp = Math.round(cardW * 0.889);
        const rearScale = persp / (persp + zStep * (TOTAL - 1));
        // Slot 0 (rearmost) sits at TOP_BASE, scaled about the centre.
        const above = -((TOP_BASE / 100) * cardH) * rearScale;
        // The front card is unscaled (z = 0) and its bottom edge is the lowest
        // point of the stack in every configuration.
        const below = cardH / 2;
        // Width takes the front card's, the widest: every card behind it is
        // scaled down, so the front card's edges bound the whole fan.
        const halfW = cardW / 2;
        return (
          clientX >= cx - halfW &&
          clientX <= cx + halfW &&
          clientY >= cy - above &&
          clientY <= cy + below
        );
      };

      const onPointerMove = (e: PointerEvent) => {
        const want = overStack(e.clientX, e.clientY);
        if (want === hoveringStackRef.current) return;
        hoveringStackRef.current = want;
        syncCapture();
      };

      const onPointerOut = () => {
        if (!hoveringStackRef.current) return;
        hoveringStackRef.current = false;
        syncCapture();
      };

      const onWheel = (e: WheelEvent) => {
        if (!capturedRef.current || !ready || reduced) return;
        // Pinch-zoom arrives as a ctrl-modified wheel event. Lenis lets it
        // through for the same reason; swallowing it would break page zoom.
        if (e.ctrlKey) return;

        // Non-passive listener, so this is honoured — it kills the NATIVE
        // scroll. Lenis is a separate problem: it writes scroll imperatively and
        // never consults defaultPrevented, which is why the attribute above,
        // not this call, is what stops the smooth scroll.
        e.preventDefault();

        // Firefox reports lines, some setups report pages. Normalise to px
        // exactly as Lenis does, or the threshold is never reached there.
        const multiplier =
          e.deltaMode === 1
            ? WHEEL_LINE_HEIGHT
            : e.deltaMode === 2
              ? viewportRef.current.h
              : 1;
        const delta = e.deltaY * multiplier;

        // A quiet gap means the previous gesture ended; do not let its residue
        // arm this one. Timestamps rather than a timer: nothing to cancel.
        if (e.timeStamp - lastWheelTsRef.current > GESTURE_IDLE_MS) {
          wheelAccumRef.current = 0;
        }
        lastWheelTsRef.current = e.timeStamp;

        // Still captured, but the delta is dropped: this is the decaying tail of
        // a flick whose step already committed.
        if (e.timeStamp - gestureLockRef.current < GESTURE_COOLDOWN_MS) return;

        // A reversal starts from zero rather than paying off the opposite
        // direction first, which would make the deck feel stuck for one gesture.
        if (
          wheelAccumRef.current !== 0 &&
          Math.sign(delta) !== Math.sign(wheelAccumRef.current)
        ) {
          wheelAccumRef.current = 0;
        }
        wheelAccumRef.current += delta;

        if (Math.abs(wheelAccumRef.current) < WHEEL_STEP_THRESHOLD) return;
        const dir: 1 | -1 = wheelAccumRef.current > 0 ? 1 : -1;
        // Zero, not subtract: leftover from a hard flick would immediately arm
        // the next step, which is the "one gesture, many cards" this prevents.
        wheelAccumRef.current = 0;
        gestureLockRef.current = e.timeStamp;
        stepDeck(dir);
      };

      /** Drive the deck from scroll position.
       *
       *  Driven by GSAP's ticker rather than Lenis's 'scroll' event, which was
       *  the obvious choice and is wrong: navbar.tsx scrolls to anchors with
       *  `lenis.scrollTo(target, { force: true })`, and `force` exists precisely
       *  to move the page WHILE LENIS IS STOPPED. A stopped Lenis emits no
       *  'scroll', so a menu jump would move the section out from under a stale
       *  reading and leave the deck showing the wrong card. The ticker runs
       *  unconditionally (smooth-scroll.tsx owns it as the app's single RAF
       *  loop), so this tracks reality in both states.
       *
       *  getBoundingClientRect() on two elements per frame is a read of already-
       *  computed layout, and nothing here writes style before it, so this does
       *  not trigger layout thrash.
       *
       *  CHASE, don't snap: a fast flick can jump the target several steps while
       *  a card is still flying. Rather than fast-forwarding the deck (which
       *  would bypass the tuned flight path, and — since char parking lives in
       *  the timeline's commit(), not in initializeCards — risks stranding
       *  titles inside the mask), take one step per landed animation. The reader
       *  is already gone; the deck catches up behind them while the page scrolls
       *  freely. Self-limiting: at most one timeline in flight, no backlog. */
      const syncDeck = () => {
        // Re-derive the plateau first: scroll is the other thing that can arm or
        // release capture, and the gate must be current before it is read below.
        syncPinned();

        // While the deck holds the wheel the page cannot move, so readProgress()
        // is frozen while stepDeck walks stepRef. Letting the chase run would see
        // that mismatch every frame and fire a correcting advance, oscillating
        // the deck one step forward and one back forever. Suppression is
        // required, not an optimisation.
        if (capturedRef.current) return;
        if (!ready || isAnimating.current) return;
        const progress = readProgress();
        if (progress === null) return;
        const step = stepFor(progress);
        if (step === stepRef.current) return;
        const dir: 1 | -1 = step > stepRef.current ? 1 : -1;
        // ±1, never `= step`: advance() moves the deck exactly one slot, so this
        // ref has to mirror the deck rather than the scroll. The rest of the gap
        // closes on later ticks.
        stepRef.current += dir;
        advanceRef.current(dir);
      };
      gsap.ticker.add(syncDeck);

      // Native listener with { passive: false }, NOT React's onWheel: React 19
      // attaches wheel passively at the root, where preventDefault() is ignored.
      // The sticky box, not stageRef: it is the node carrying
      // data-lenis-prevent-wheel (so Lenis's composedPath test and this listener
      // agree on one element), and the stage is absolute inset-0 inside it, so
      // the two cover the same rectangle anyway.
      const pinBox = stickyRef.current;
      pinBox?.addEventListener("wheel", onWheel, { passive: false });
      // Hover is tracked by MOVE, not enter/leave, because the capture region is
      // a computed rectangle rather than this element's own box: the pointer can
      // cross into and out of the stack without ever crossing the stage's edge.
      // pointerout on the stage catches the pointer actually leaving it (and,
      // because it bubbles, a card's own pointerout too — harmless, since the
      // next move re-evaluates the rectangle).
      pinBox?.addEventListener("pointermove", onPointerMove, { passive: true });
      pinBox?.addEventListener("pointerleave", onPointerOut);
      pinBox?.addEventListener("pointercancel", onPointerOut);
      // Alt-tabbing away with the cursor parked on the deck never fires
      // pointerleave, so the reader could return to a still-captured deck.
      window.addEventListener("blur", onPointerOut);
      document.addEventListener("visibilitychange", onPointerOut);

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

        // Adopt whatever step the reader is already parked at BEFORE arming the
        // driver, so a reload deep-linked into #videos (or browser scroll
        // restoration landing mid-section) starts still instead of firing up to
        // TOTAL-1 advances back to back. The deck is seated at step 0 and this
        // claims a different one without animating, so the card on screen will
        // not be the one the scroll position implies until the reader moves —
        // the correct trade: a silent mismatch beats a burst of animation the
        // reader did not ask for, and the very first gesture resolves it.
        const progress = readProgress();
        if (progress !== null) stepRef.current = stepFor(progress);
        ready = true;
      });

      return () => {
        cancelled = true;
        ready = false;
        // The ticker is app-global and outlives this component, so a callback
        // left on it would keep reading a detached section's rect every frame
        // and accumulate one leak per hot-reload.
        gsap.ticker.remove(syncDeck);
        pinBox?.removeEventListener("wheel", onWheel);
        pinBox?.removeEventListener("pointermove", onPointerMove);
        pinBox?.removeEventListener("pointerleave", onPointerOut);
        pinBox?.removeEventListener("pointercancel", onPointerOut);
        window.removeEventListener("blur", onPointerOut);
        document.removeEventListener("visibilitychange", onPointerOut);
        // Drop both halves of the gate and reconcile, which takes the attribute
        // off. Nothing here can actually leak — and that is the point of the
        // MECHANISM rather than of this call: capture is an attribute on
        // `pinBox` plus a listener on `pinBox`, so both die with the node and a
        // missed teardown, a thrown handler or a hot reload cannot strand it.
        // The lenis.stop() this replaced wrote to a SHARED singleton, where
        // exactly those paths left the whole page unscrollable. What this call
        // is really for is state: leaving these refs true across a re-run would
        // misreport the gate to the next effect.
        hoveringStackRef.current = false;
        sectionPinnedRef.current = false;
        syncCapture();
        // A queue drain landing between this teardown and the next effect run
        // would otherwise reach a stale closure and advance a deck that no
        // longer exists. The call site optional-chains, so null is a no-op.
        stepDeckRef.current = null;
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
    { scope: sectionRef, dependencies: [reduced, deckFits] },
  );

  /** Reposition on resize without rebuilding anything. Skipped mid-sequence so
   *  a resize cannot land cards on top of an in-flight tween. */
  useEffect(() => {
    if (reduced || !deckFits || isAnimating.current) return;
    initializeCards(false);
    ScrollTrigger.refresh();
  }, [size.cardW, size.cardH, reduced, deckFits, initializeCards]);

  // Reduced motion (any viewport) and a viewport too small for the deck (any
  // motion preference) both skip the scroll-linked deck for a plain vertical
  // list. Reduced motion gets static posters, matching the user's OS
  // preference; a small viewport alone still gets real playing video, gated
  // per-card by MobileVideoCard's own IntersectionObserver.
  //
  // Also the pre-hydration branch: deckFits is false until mounted, so this is
  // what the server renders at every size (see the mounted declaration).
  if (reduced || !deckFits) {
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
                  <h3
                    className="text-[clamp(20px,2vw,28px)] tracking-tight text-white"
                    style={{
                      fontFamily: 'var(--font-manrope), "Manrope", sans-serif',
                    }}
                  >
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

  // Taller than the pin box by DVH_PER_CARD * TOTAL: a sticky child the same
  // height as its container has zero travel and never actually pins, and that
  // surplus is the runway the deck is driven across. Inline style rather than
  // an h-[160dvh] class because Tailwind cannot consume a runtime constant in
  // an arbitrary value, and restating the number beside the constant that
  // derives it is exactly how the two drift apart.
  return (
    <section
      ref={sectionRef}
      id="videos"
      className="relative w-full bg-black"
      style={{ height: `${SECTION_DVH}dvh` }}
    >
      {/* Atmospheric background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 left-0 h-dvh w-full">
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
          clipping ancestor. Its measured height is also the denominator of the
          deck's scroll progress — see readProgress. */}
      {/* The wheel and pointer listeners are attached to this node natively in
          the GSAP effect, not as JSX props: wheel must be non-passive to
          preventDefault (React 19 attaches it passively at the root), and
          data-lenis-prevent-wheel is toggled imperatively by syncCapture —
          hover must not re-render, since that would fight GSAP for the card
          transforms. Which region actually captures is decided by geometry
          (overStack), not by this box: only the card stack does, so the rails
          and the margins beside the cards stay escape area. */}
      <div
        ref={stickyRef}
        className="sticky top-0 h-dvh w-full overflow-hidden"
      >
        {/* Stage — owns the perspective the deck recedes into */}
        <div
          ref={stageRef}
          className="absolute inset-0"
          style={{
            // Ratio-scaled, not a flat 1200px. zStep is already cardW * 0.11,
            // so with a fixed perspective the back card's scale swung 0.669 to
            // 0.755 across the card-width range and the recession read visibly
            // deeper on a wide screen. Tying it to cardW makes the perspective/
            // card-width ratio constant, which is what Z_STEP_RATIO was
            // introduced to achieve for the z-spacing. 0.889 was derived as
            // 1200/1350 back when 1350 was geometry()'s width cap; that cap is
            // now 1800, but this is a RATIO of the live cardW and so is
            // unaffected -- the derivation is history, not a dependency.
            perspective: Math.round(size.cardW * 0.889),
            // 50% 50% — the stage centre, which is exactly where the front
            // card's midline sits (FRONT_OFFSET = -50). The vanishing point
            // therefore coincides with the front card, so the deck recedes
            // straight back rather than leaning away. If FRONT_OFFSET is ever
            // decentred again, this origin no longer matches the card and the
            // recession tilts; move the two together or not at all.
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

            pointer-events-none is load-bearing too, not hygiene: this box is
            stacked at z-20 over the full height of the stage, so without it the
            rail would swallow clicks meant for the front card's Instagram link
            and mute button. */}
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
          style={{ width: marginBoxW, display: showSideTitles ? undefined : "none" }}
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
                className="absolute inset-x-0 top-0 whitespace-nowrap text-right leading-none tracking-tight text-white"
                style={{
                  // Manrope, not Coolvetica: the 2026-08-29 heading migration
                  // (see globals.css) moved site headings off Coolvetica, which
                  // has no free commercial licence. There is no font-manrope
                  // Tailwind utility — it is a next/font CSS variable, applied
                  // inline exactly as services.tsx and about.tsx do.
                  fontFamily: 'var(--font-manrope), "Manrope", sans-serif',
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
          // Hidden with the title: a lone year floating beside the card, with
          // its opposite rail gone, reads as a rendering fault rather than a
          // choice. The pair is the design element, not either half.
          style={{ width: marginBoxW, display: showSideTitles ? undefined : "none" }}
        >
          <span
            className="block text-left text-medium-gray"
            style={{
              fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
              letterSpacing: "-0.03em",
              fontSize: titleFontPx,
            }}
          >
            {SLIDES[frontSlide].year}
          </span>
        </div>
      </div>
    </section>
  );
}
