"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Volume2Icon, VolumeXIcon } from "lucide-react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import { MENU_DESKTOP_MQ } from "@/src/lib/breakpoints";

gsap.registerPlugin(SplitText, CustomEase, useGSAP);

/** The reference menu's signature ease — slow in, hard out. Created once at
 *  module scope; CustomEase.create is idempotent per name, but re-running it on
 *  every mount is pointless work. */
const HOP = CustomEase.create("hop", "0.9, 0, 0.1, 1");

/** clip-path keyframes for the overlay. Collapsed against the BOTTOM edge, so
 *  the panel rises up into view on open and drops back down on close — one
 *  constant drives both directions. clip-path is compositor-only, so this costs
 *  nothing per frame. */
const MENU_HIDDEN = "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)";
const MENU_SHOWN = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";

/** Same idea for the video, revealed bottom-up so it feels like it grows into
 *  the frame rather than sliding. */
const VIDEO_HIDDEN = "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)";
const VIDEO_SHOWN = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";

/** The same project reels used in video-stack.tsx's portfolio showcase, kept as
 *  a small local { video, poster } list rather than importing that file's
 *  `SLIDES` — SLIDES also carries `instagram`/`year`, which the menu doesn't
 *  need, and the two sections aren't otherwise coupled. Cycled in order, one
 *  clip per `ended` event; wraps back to index 0 after the last. */
const MENU_VIDEOS: { video: string; poster: string }[] = [
  {
    video:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/q_auto/f_auto/v1778690313/gully_ugoyg5.mp4",
    poster:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/so_0,q_auto,f_jpg,w_800/v1778690313/gully_ugoyg5.jpg",
  },
  {
    video:
      "https://res.cloudinary.com/tg2nyis2/video/upload/q_auto/f_auto/v1783605155/bluorngXatwo_1_1_drqcrn.mp4",
    poster:
      "https://res.cloudinary.com/tg2nyis2/video/upload/so_0,q_auto,f_jpg,w_800/v1783605155/bluorngXatwo_1_1_drqcrn.jpg",
  },
  {
    video:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/q_auto/f_auto/v1778690337/kerala_home_ukmfyi.mp4",
    poster:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/so_0,q_auto,f_jpg,w_800/v1778690337/kerala_home_ukmfyi.jpg",
  },
  {
    video:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/q_auto/f_auto/v1778690343/ornate_foc5ic.mp4",
    poster:
      "https://res.cloudinary.com/dcmbfe9at/video/upload/so_0,q_auto,f_jpg,w_800/v1778690343/ornate_foc5ic.jpg",
  },
  {
    video:
      "https://res.cloudinary.com/tg2nyis2/video/upload/q_auto/f_auto/v1783604529/FINAL_AD_WRANGLER_vezxve.mp4",
    poster:
      "https://res.cloudinary.com/tg2nyis2/video/upload/so_0,q_auto,f_jpg,w_800/v1783604529/FINAL_AD_WRANGLER_vezxve.jpg",
  },
];

type InfoItem = { label: string; href?: string };

/** The menu's info row, at every size: the original two-column caps row, with
 *  SHORT labels. The client chose this over an eyebrow/value redesign (built,
 *  then rejected on both mobile and desktop). Its one flaw was the uppercase
 *  address, which pushed INSTAGRAM/LINKEDIN off a phone's right edge, so the
 *  address is replaced by a "GMAIL" link to Gmail's compose page, addressed to
 *  the studio (client's call, knowing visitors without a Google account land
 *  on a sign-in page). The aria-label keeps the real address audible.
 *  TODO: add the postal address / Behance / phone here if they should be public. */
const INFO_ROW: { left: (InfoItem & { ariaLabel?: string })[]; right: InfoItem[] } = {
  left: [
    { label: "ATWO STUDIOS" },
    {
      label: "GMAIL",
      href: "https://mail.google.com/mail/?view=cm&fs=1&to=contact@atwostudios.com",
      ariaLabel: "Email contact@atwostudios.com via Gmail",
    },
  ],
  right: [
    { label: "INSTAGRAM", href: "https://www.instagram.com/atwo.io" },
    { label: "LINKEDIN", href: "https://www.linkedin.com/company/atwo-studios/" },
  ],
};

/** Top edge of the nav links at `wide:` — just under the logo. (The info block
 *  uses its own top, clearing the close button; see its comment.) */
const WIDE_TOP =
  "wide:top-[calc(var(--spacing-menu-gutter)+32px+clamp(15px,1.9vw,18px))]";

/** Short on purpose: it has to scale to ~340px and bleed toward the right edge,
 *  the way AVARO does in the reference. */
const MENU_WORDMARK = "ATWO";

/** One entry in an info/social column. Module scope, NOT inside the component:
 *  a component defined in a render body is a new type on every render, so React
 *  would remount these nodes on every open/close and destroy the elements GSAP
 *  is mid-tween on.
 *
 *  No initial `opacity-0 translate-y-full` here — see the gsap.set() below. */
function InfoLine({ label, href, ariaLabel }: InfoItem & { ariaLabel?: string }) {
  const external = !!href?.startsWith("http");
  return (
    <div className="overflow-hidden">
      {href ? (
        /* The hover underline is an ::after pseudo-element, so its scale never
           touches the transform GSAP tweens on this .menu-reveal node.
           Tailwind's hover: is already gated on (hover: hover), so it does not
           latch on after a tap. */
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          aria-label={ariaLabel}
          className="menu-reveal relative inline-block
            transition-colors duration-300 hover:text-accent-red focus-visible:text-accent-red focus-visible:outline-none
            after:absolute after:left-0 after:right-0 after:bottom-[0.18em] after:h-px after:bg-current
            after:origin-left after:scale-x-0 after:transition-transform after:duration-500
            after:ease-[cubic-bezier(0.22,1,0.36,1)]
            hover:after:scale-x-100 focus-visible:after:scale-x-100"
        >
          {label}
        </a>
      ) : (
        <p className="menu-reveal inline-block">{label}</p>
      )}
    </div>
  );
}


interface FullscreenMenuProps {
  isOpen: boolean;
  /** The nav links, rendered by the parent so `MagneticLink` — and its
   *  close-once-the-section-is-in-view behaviour — stays owned by the navbar. */
  children: React.ReactNode;
}

export default function FullscreenMenu({ isOpen, children }: FullscreenMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  /** Which MENU_VIDEOS entry is loaded. Always restarts at 0 when the menu
   *  (re)opens — the playlist does not remember position across closes. */
  const [videoIndex, setVideoIndex] = useState(0);
  /** Starts muted (autoplay policy); reset to muted on close alongside
   *  videoIndex, so every fresh open starts silent. */
  const [muted, setMuted] = useState(true);
  /** Holds the SplitText chars between renders so the timeline animates the same
   *  nodes it split, and so the split can be reverted exactly once on unmount. */
  const charsRef = useRef<Element[]>([]);

  const lenis = useLenis();
  /** useLenis() returns undefined on the first render and the instance on the
   *  second. Mirroring into a ref means the open/close effect never closes over
   *  the undefined pass and silently skips the scroll lock. */
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  /* Split the header once, on mount. Doing it inside the open/close timeline
     would re-split on every toggle and orphan the previous spans. */
  useGSAP(
    () => {
      /* Seed the reveals hidden from JS, not from Tailwind classes. This looks
         like a job for `opacity-0 translate-y-full`, but it is not: Tailwind v4
         compiles `translate-y-full` to the standalone `translate` property
         (`translate: var(--tw-translate-x) var(--tw-translate-y)`), while GSAP
         writes `transform`. The browser COMPOSES the two rather than letting one
         win, so the element keeps a permanent 100% offset that GSAP can never
         tween away — the stagger runs but nothing visibly moves. Opacity is a
         plain declaration and does get overridden, which is why the old code
         read as "everything fades in at once".
         Repo convention, stated in video-stack.tsx: GSAP owns the transform. */
      gsap.set(".menu-reveal", { y: "100%", opacity: 0 });

      if (!headerRef.current) return;
      const split = new SplitText(headerRef.current, { type: "chars" });
      charsRef.current = split.chars;
      gsap.set(split.chars, { rotateY: 90, scale: 0.7, y: 40, opacity: 0 });
      return () => split.revert();
    },
    { scope: menuRef }
  );

  /* Pausing Lenis is the only thing that actually locks the page: it drives
     scroll imperatively on documentElement, so `overflow: hidden` alone does not
     hold it (see the note in smooth-scroll.tsx). */
  useEffect(() => {
    const l = lenisRef.current;
    if (!l) return;
    if (isOpen) l.stop();
    else l.start();
    return () => l.start();
  }, [isOpen]);

  /* The video panel is `hidden` below md (the reference has no video on mobile),
     but `hidden` only stops it painting — the load()/play() calls below would
     still pull the clip over the network on a phone.

     This MUST be the same condition as the `wide:` variant that renders the
     element (MENU_DESKTOP_MQ, shared from src/lib/breakpoints.ts), not the bare
     min-width:768px it used to be. The video is `wide:block hidden`, so on a
     landscape phone — wide enough for md, too short for the desktop layout —
     the old width-only query returned true for an element that is never
     displayed, and pulled the clip over a mobile connection to render nothing.

     Read at call time, not held in state: both effects already re-run on
     `isOpen`, so a resize is picked up on the next open. */
  const isVideoEnabled = () =>
    typeof window !== "undefined" &&
    window.matchMedia(MENU_DESKTOP_MQ).matches;

  /* The video is `preload="none"`, so it has no data until the menu first opens.
     Play/pause with the overlay rather than letting a hidden element decode. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isOpen) {
      /* Guards ONLY the play branch — the close branch below must stay reachable
         at every width, or a desktop→mobile resize with the menu open would
         leave the element playing with no way to reset it. */
      if (!isVideoEnabled()) return;
      v.muted = muted;
      // Autoplay can reject (policy, reduced data). Nothing to recover — the
      // poster stays up — so swallow it rather than throwing into the console.
      void v.play().catch(() => {});
    } else {
      v.pause();
      // Restart the playlist at clip 1 for the next open. `.load()` re-reads
      // the (now index-0) <source>, so the element shows clip 1's poster
      // rather than a stale mid-clip frame the next time it's seen.
      setVideoIndex(0);
      setMuted(true);
      v.load();
    }
  }, [isOpen, muted]);

  /* Advance to the next clip whenever the index changes. load() re-runs the
     resource selection algorithm against the new `src` — without it the element
     keeps playing whatever source it first resolved. play() then starts it,
     since a source change does not auto-resume. Only runs while the menu is
     open; the close branch above already paused and reset.

     This also fires on open for index 0, overlapping with the effect above; a
     redundant load()+play() on the same clip is harmless and keeps both effects
     independently correct. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isOpen) return;
    if (!isVideoEnabled()) return;
    v.load();
    v.muted = muted;
    void v.play().catch(() => {});
  }, [isOpen, videoIndex, muted]);

  const handleVideoEnded = () => {
    setVideoIndex((i) => (i + 1) % MENU_VIDEOS.length);
  };

  useGSAP(
    () => {
      const tl = gsap.timeline();

      if (isOpen) {
        /* Only the text reveals sequence. The wipe, the video and the wordmark
           letters all stay simultaneous — hence the "<" positions below, which
           start each at the same instant as the tween before it. */
        /* yPercent alongside pointerEvents: the close tween below leaves the
           panel translated off the top, and a close interrupted mid-flight (rapid
           toggling) can leave a partial offset behind. The open tween only writes
           clipPath, so without this the menu would wipe in already shifted up. */
        tl.set(menuRef.current, { pointerEvents: "auto", yPercent: 0 })
          .to(menuRef.current, {
            clipPath: MENU_SHOWN,
            duration: 1,
            ease: HOP,
          })
          .to(
            ".menu-reveal",
            {
              y: "0%",
              opacity: 1,
              duration: 0.9,
              /* Position-based, NOT DOM order — do not flatten this to a plain
                 `stagger: 0.08`. At md+ the three blocks sit side by side in one
                 horizontal band (links 21%, info grid over the wordmark), while DOM
                 order runs links → info → socials. A DOM-order stagger would
                 reveal bottom-left "Contact Us" before top-right "ATWO STUDIOS".
                 `axis: "x"` ranks by real on-screen x instead, so the reveal
                 sweeps left to right across the screen. */
              stagger: { each: 0.08, from: "start", axis: "x" },
              ease: HOP,
            },
            "-=0.65"
          )
          .to(
            ".menu-video-wrapper",
            { clipPath: VIDEO_SHOWN, duration: 0.9, ease: HOP },
            "<"
          )
          .to(
            charsRef.current,
            {
              rotateY: 0,
              scale: 1,
              y: 0,
              opacity: 1,
              duration: 0.9,
              ease: HOP,
            },
            "<"
          );
      } else {
        /* The panel leaves through the TOP as one block — the vertical mirror of
           the bottom-up wipe it enters with. Deliberately a translate and not a
           clip-path: tweening back to MENU_HIDDEN would collapse it against the
           bottom edge again, i.e. retreat the way it came instead of inverting.

           yPercent rather than y: "-100%" — GSAP resolves yPercent against the
           element's own height with no string-unit parse, and the overlay is
           `fixed inset-0`, so 100% of its height is exactly one viewport.

           NOTE: GSAP now writes both `transform` and `clipPath` on this element.
           That is fine — different properties — but it extends the convention in
           the gsap.set() comment above: no Tailwind translate-* utility may ever
           be added to this root, or the browser will COMPOSE it with GSAP's
           transform rather than letting one win. */
        tl.to(menuRef.current, {
          yPercent: -100,
          duration: 0.8,
          ease: HOP,
        })
          .set(menuRef.current, { pointerEvents: "none" })
          /* yPercent and clipPath in ONE set, not two. Snapping the panel back to
             yPercent 0 while it is still clipped open would show the whole menu
             for a frame before the clip re-collapsed it. */
          .set(menuRef.current, { yPercent: 0, clipPath: MENU_HIDDEN })
          // Reset every animated child so the next open plays from the start
          // rather than from its finished state.
          .set(".menu-reveal", { y: "100%", opacity: 0 })
          .set(".menu-video-wrapper", { clipPath: VIDEO_HIDDEN })
          .set(charsRef.current, {
            rotateY: 90,
            scale: 0.7,
            y: 40,
            opacity: 0,
          });
      }
    },
    { dependencies: [isOpen], scope: menuRef }
  );

  return (
    <div
      ref={menuRef}
      data-lenis-prevent
      aria-hidden={!isOpen}
      /* Below md this is a normal scrolling stack; from md up every block is
         absolutely placed, as in the reference — a grid cannot express that
         composition.

         `p-menu-gutter` sets the inset on all four edges from the single
         --spacing-menu-gutter token, and the absolutely-positioned children
         below anchor to `inset-menu-gutter` rather than to arbitrary
         percentages, so every edge shares one source of truth. The top padding
         additionally clears the logo, hence the calc(). */
      /* overflow-y-auto, not overflow-hidden: below `wide:` this is a flex
         column whose intrinsic height (~793px at 390px wide) exceeds a short
         viewport. With the old overflow-hidden the excess was not merely
         off-screen but UNREACHABLE — Lenis is stopped while the menu is open,
         and data-lenis-prevent exempts this subtree from Lenis without giving
         it a scroller of its own. On a 360x640 phone the wordmark and the
         socials were simply gone. overscroll-contain stops a rubber-band at
         either end chaining to the locked page behind. At `wide:` the layout is
         absolutely positioned and never overflows, so this is inert there. */
      className="fixed inset-0 z-[105] bg-[#0E0E0E] text-off-white pointer-events-none
        flex flex-col wide:block
        p-menu-gutter
        overflow-y-auto overscroll-contain wide:overflow-hidden"
      style={{ clipPath: MENU_HIDDEN }}
    >
      {/* Logo, pinned to the top-left gutter. The menu gets its own mark rather
          than the pill nav's — WebP, since the source has a real alpha channel
          that must survive against the dark overlay. width/height are the
          asset's true intrinsic size so Next can reserve the right box and not
          warn about a changed aspect ratio; `h-[32px] w-auto` sizes it on screen. */}
      {/* Below md this row is the reference's top bar: logo left, and space
          reserved at the right for the navbar's circular close button, which is
          `fixed` at z-[110] and so paints over this row rather than sitting in
          it. `wide:contents` dissolves the row at desktop so the logo keeps the
          absolute placement it has always had. */}
      <div
        /* Below md the logo must line up with the navbar's circular close
           button, which is NOT in this row — it is `fixed` at z-[110] and
           paints over it (see the note above). That button's centre sits at a
           fixed 70px from the viewport top: the nav is `top-[30px]` with `py-4`
           (16px) and the circle is 48px tall, so 30 + 16 + 24 = 70.

           This row starts at the overlay's `p-menu-gutter` top padding, so the
           32px logo's centre would otherwise land at gutter + 16 — about 29px
           on a phone, i.e. ~41px too high. The margin below closes exactly that
           difference: 70 - 16 - gutter. Written against the token rather than as
           a literal so it stays aligned across the gutter's whole clamp range.

           A margin, not a translate: per the convention documented on the
           wordmark below, Tailwind's translate-* compiles to the standalone
           `translate` property and the browser composes it with GSAP's
           `transform`. Nothing tweens this row today, but the rule holds. */
        className="flex items-center justify-between pr-[56px] wide:contents wide:pr-0
          max-wide:mt-[calc(54px-var(--spacing-menu-gutter))]"
      >
        <div className="wide:absolute wide:top-menu-gutter wide:left-menu-gutter">
          <Image
            src="/images/menu-logo.webp"
            alt="ATWO Studios"
            title="ATWO Studios"
            width={155}
            height={128}
            className="w-auto h-[32px] object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* ── Links — indented from the left, upper-middle ─────────── */}
      {/* Family declared inline rather than via a `font-*` utility to match the
          convention the major headings already use (about, portfolio,
          why-choose-us, services, section-header, footer) — same face as the
          "OUR WORK" heading in portfolio.tsx. */}
      <nav
        className={`flex flex-col wide:absolute wide:left-[21%] ${WIDE_TOP}
          max-wide:mt-[clamp(16px,12dvh,96px)]
          text-[clamp(40px,11vw,56px)] leading-[1.08]
          wide:text-[clamp(23px,3.4vw,44px)] wide:leading-[1.25] font-light`}
        style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {children}
      </nav>

      {/* The reference's hairline rule under the links. `wide:hidden` keeps it out
          of the desktop composition entirely, where the absolutely-placed blocks
          leave no band for it. `menu-reveal` on the inner element (with an
          overflow-hidden parent) makes it wipe in like every other block —
          see the gsap.set() note above for why the hidden state is not a class. */}
      {/* Original mobile spacing, restored at the client's request.
          (Do not re-tune without asking: a tighter rhythm was rejected.) */}
      <div className="wide:hidden overflow-hidden mt-[clamp(12px,6dvh,48px)] mb-[clamp(12px,4dvh,32px)]">
        <div className="menu-reveal h-px w-full bg-off-white/15" />
      </div>

      {/* ── Right column: info block over the wordmark ─────────────
          At `wide:` ONE absolutely-placed column holds both, shrink-wrapped
          (`w-max`) to its widest child — the nowrap wordmark. The info grid
          then spans exactly the wordmark's width: `justify-between` puts the
          left column's edge on the "A" and the right-aligned socials on the
          "O", at every viewport, with no percentage to keep in sync. (A first
          pass placed the grid on a `left-[58%]` band; the wordmark is
          right-aligned inside that band, so the email hung ~190px left of the
          "A" at 1920.)
          Top = gutter + 48px close button + 12px, so the socials always
          clears the button that sits directly above it.

          Below `wide:` the column is `contents`, so the row and the wordmark
          stay direct children of the menu's mobile flex stack. */}
      <div
        className="contents wide:absolute wide:right-menu-gutter wide:bottom-menu-gutter
          wide:top-[calc(var(--spacing-menu-gutter)+60px)]
          wide:flex wide:flex-col wide:justify-between wide:w-max"
      >
        {/* One caps row at every size (see INFO_ROW): left column on the
            gutter / the "A", right column flush to the gutter / the "O".
            Mobile keeps its original 15-17px; desktop is 13-18px — the old
            fixed 11px is what read as fine print beside 44px links. */}
        <div
          className="flex justify-between gap-3 wide:gap-8 wide:w-full
            text-[clamp(15px,4.2vw,17px)] wide:text-[clamp(13px,0.95vw,18px)]
            uppercase tracking-[0.096em] leading-[1.6]"
          style={{ fontFamily: 'var(--font-manrope), "Manrope", sans-serif' }}
        >
          <div className="flex flex-col">
            {INFO_ROW.left.map((item) => (
              <InfoLine key={item.label} {...item} />
            ))}
          </div>
          {/* Right-aligned to the gutter on a phone; left-aligned on larger
              screens (client request): the column box still ends on the "O",
              and INSTAGRAM / LINKEDIN share one left edge inside it. */}
          <div className="flex flex-col max-wide:items-end max-wide:text-right min-[1280px]:mr-[30%]">
            {INFO_ROW.right.map((item) => (
              <InfoLine key={item.label} {...item} />
            ))}
          </div>
        </div>

      {/* ── Wordmark — huge, flush to the bottom-right gutter ────── */}
      {/* SplitText wraps each char in an inline-block, which sits on the text
          baseline — so the font's descender space is reserved *inside* the box,
          below the glyphs. The box bottom meets the gutter while the visible
          letterforms stop ~10px short of the video frame's bottom edge.
          A negative margin pulls the box down to close that gap.

          Deliberately a margin and NOT a translate: per the note above (and the
          convention in video-stack.tsx) GSAP owns the transform here, and
          Tailwind's translate-* compiles to the standalone `translate` property
          which the browser COMPOSES with GSAP's `transform` rather than letting
          one win. A margin touches no transform, so the chars' rotateY/scale/y
          tween is untouched. em, not px, so it scales with the clamp()'d
          font-size below ~1308px instead of drifting.

          As the last item of the right column's flex box (justify-between), the
          negative margin-bottom still lets the box run 0.021em past the gutter,
          so the glyphs land on it exactly as they did when this was absolute.

          whitespace-nowrap is load-bearing, not cosmetic, and doubly so now:
          the right column is `w-max`, sized BY this element. "ATWO" at 476px
          measures 565px in Coolvetica Heavy Compressed but ~1392px in the
          fallback sans, so while the webfont is unavailable (loading under
          font-display:swap, blocked, offline) a wrapping mark would grow two
          0.78 line boxes ~743px tall, escape the viewport and bury the info
          block. Measured before: the h1 went from 371px tall at y=516 to
          1114px at y=-227. hero.tsx:162 pairs this face with nowrap for the
          same reason. Any horizontal overflow is clipped by the root's
          wide:overflow-hidden.

          Mobile sizing is the ORIGINAL, restored at the client's request
          ("exactly like this"): min(73vw,34vh), centred in the leftover space
          via flex-1 + content-center. A tighter bottom-anchored variant
          (flex items-end, 30vh, overflow-clip) was built and rejected. */}
      <div
        ref={headerRef}
        aria-hidden
        className="max-wide:flex-1 max-wide:content-center
          font-coolvetica-heavy select-none
          text-[min(73vw,34vh)] wide:text-[clamp(101px,36.4vw,476px)]
          leading-[0.78] tracking-normal whitespace-nowrap
          max-wide:text-center wide:text-right
          wide:mb-[-0.021em]"
        style={{ perspective: 800 }}
      >
        {MENU_WORDMARK}
      </div>
      </div>

      {/* ── Video — small, bottom-left, in a lighter-grey frame ──── */}
      <div
        className="menu-video-wrapper hidden wide:block wide:absolute wide:left-menu-gutter wide:bottom-menu-gutter
          w-full wide:w-[clamp(305px,38vw,510px)] shrink-0"
        style={{ clipPath: VIDEO_HIDDEN }}
      >
        {/* The visible padded frame from the reference — square corners. */}
        <div className="bg-[#131313] p-[10px]">
          {/* Inset the video within the frame, leaving the grey frame
              background visible as a margin — px/py scaled off the wrapper's
              own vw curve so it stays proportional at any frame width. */}
          <div className="group relative px-[clamp(24px,8vw,43px)] py-[clamp(14px,4.4vw,23px)]">
            {/* src set directly on the element, as in video-stack.tsx — NOT a
                nested <source>. A <source> list is only read by the resource
                selection algorithm at load time, so swapping the child element
                (even with a key) does nothing once a source has been resolved:
                the element keeps its original currentSrc and replays clip 1
                forever. Changing the src attribute does re-trigger selection,
                and the effect above calls load() to make that explicit.

                No `muted` attribute here — muted state is applied imperatively
                in the effects above, since `.load()` (clip changes, reopen)
                would otherwise reset the element back to the JSX default. */}
            <video
              ref={videoRef}
              className="w-full aspect-video object-cover block"
              src={MENU_VIDEOS[videoIndex].video}
              poster={MENU_VIDEOS[videoIndex].poster}
              preload="none"
              playsInline
              onEnded={handleVideoEnded}
            />

            {/* Same treatment as the portfolio deck's sound toggle in
                video-stack.tsx, reused here rather than reinvented. */}
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute video" : "Mute video"}
              className="absolute right-3 top-3 z-20 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm opacity-100 [@media(hover:hover)]:opacity-0 transition-opacity duration-200 hover:bg-black/60 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100"
            >
              {muted ? <VolumeXIcon size={16} /> : <Volume2Icon size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
