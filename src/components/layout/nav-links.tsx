"use client";

import { useRef } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useLenis } from 'lenis/react';
import { TextRoll } from '@/src/components/ui/text-roll';
import { useHoverState } from '@/src/components/ui/use-hover-state';
import { scrollToSection } from '@/src/lib/scroll-to-section';

/** The pill's entrance timing. Lives here rather than in navbar.tsx because BOTH
 *  consumers need it now: the pill's own motion.nav transition, and the hero's
 *  gate for the blended label row, which has to arrive on the same beat.
 *
 *  0.5 matches HERO_START in hero.tsx exactly, so the top bar rises with the
 *  wordmark's first letter rather than trailing it. It was 1.2, which put the
 *  nav 0.7s BEHIND an H1 that had already started -- the top bar read as a
 *  detached second event instead of part of the hero's arrival. Keep these two
 *  numbers equal; they are the same beat. */
export const PILL_INTRO_DELAY = 0.5;
export const PILL_INTRO_DURATION = 0.8;

/** The label row rides the pill's beat exactly: same delay, same duration, same
 *  ease. Only the per-label stagger below is new, so the top bar reads as ONE
 *  gesture with the logo rather than a second event queued behind it. The two
 *  timings are derived from PILL_INTRO_* above and never re-typed, so they
 *  cannot drift apart.
 *
 *  0.09s x 4 labels = 0.27s of spread: enough to read left-to-right, short
 *  enough that the row still feels attached to the pill (the logo starts at
 *  0.50s with it, the last label at 0.86s; the row lands 1.30-1.66s). The ease
 *  is the pill's and the hero h1's, so the motion signature matches the rest of
 *  the page.
 *
 *  Those absolute figures are derived from PILL_INTRO_DELAY above -- re-derive
 *  them if it moves rather than leaving stale numbers here. */
export const NAV_LABEL_STAGGER = 0.09;
export const NAV_LABEL_EASE = [0.22, 1, 0.36, 1] as const;

/** The row's entrance, derived per slot. Shared by the logo (index 0) and the
 *  four labels (1-4) so the whole top bar reads as ONE staggered gesture rather
 *  than a logo dropping in while the labels rise. Never inline these literals at
 *  a call site — two copies of this arithmetic is exactly how the logo and the
 *  labels drifted apart in the first place. */
/* Every consumer of this pairs it with `initial={{ y: '-130%' }}` -> `y: '0%'`:
   the row drops DOWN from above. That direction is shared by the logo and by
   BOTH overlaid copies of each label (the blended resting one and the flat-red
   hover one) -- give those two different signs and the red copy visibly tears
   away from the resting copy mid-entrance.

   It also matches the mobile pill, whose motion.nav in navbar.tsx already enters
   y:-100 -> 0, so desktop and mobile agree on which way the nav arrives from.

   The negative translate needs no CSS change: .nav-label-mask (globals.css) is
   symmetric -- overflow:hidden with padding-block 0.25em against margin-block
   -0.25em -- so it clips equally above and below without moving the glyph. */
const rowReveal = (index: number) => ({
  duration: PILL_INTRO_DURATION,
  delay: PILL_INTRO_DELAY + index * NAV_LABEL_STAGGER,
  ease: NAV_LABEL_EASE,
});

/** The four desktop labels. Rendered by hero.tsx (see NavLinks below), not by
 *  the pill — the pill only keeps the logo and the mobile toggle. */
export const NAV_LINKS = [
  { label: 'ABOUT US', href: '#about-us' },
  { label: 'WORK', href: '#work' },
  { label: 'SERVICES', href: '#services' },
  { label: 'CONTACT US', href: '#contact-us' },
];

export function MagneticLink({
  children,
  className,
  href,
  postNav,
  isHovered: controlledHover,
  exitClassName,
  enterClassName,
}: {
  children: string | React.ReactNode;
  className?: string;
  href?: string;
  postNav?: () => void;
  /** Optional controlled hover. NavLink below owns the hover for the four
   *  desktop labels, because ONE hover state has to drive two sibling TextRolls
   *  — the blended resting copy and the unblended red one. Left undefined (the
   *  logo in navbar.tsx, the fullscreen menu's links) this component keeps its
   *  own internal hover exactly as before. */
  isHovered?: boolean;
  exitClassName?: string;
  enterClassName?: string;
}) {
  const { isHovered: ownHover, hoverProps } = useHoverState<HTMLAnchorElement>();
  const isHovered = controlledHover ?? ownHover;

  /* Mirrored into a ref for the same reason as in fullscreen-menu.tsx:
     useLenis() returns undefined on the first render and the instance on the
     second, and handleClick must read whatever is current at click time rather
     than closing over the undefined pass. */
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href) return;

    /* Both the pill nav and the fullscreen menu land here, and both take exactly
       the same path — `postNav` is passed only by the menu's links, and is
       purely "also close the overlay", not a different way to scroll.

       The ORDER below is the whole point, and it is the opposite of what it
       looks like it should be. Closing the menu makes fullscreen-menu's effect
       call lenis.start() on the NEXT COMMIT, and start() is destructive:
       start() -> internalStart() -> reset(), and reset() both snaps
       animatedScroll/targetScroll back to actualScroll and calls
       animate.stop(). So a scroll started synchronously here is cancelled one
       commit later and the page never moves — clicking a menu link did nothing
       at all. `force: true` gets a scroll STARTED while Lenis is stopped; it
       does not protect it from being reset afterwards.

       So the close goes first and the scroll is deferred one frame, past the
       commit that runs start(). The two still overlap visually — the 0.8s close
       tween begins on this commit and the scroll begins a frame later — which
       was the point of routing both through one helper to begin with. */
    if (!href.startsWith('#') || !document.querySelector(href)) return;
    e.preventDefault();
    postNav?.();
    requestAnimationFrame(() => scrollToSection(lenisRef.current, href));
  };

  return (
    <a
      href={href || '#'}
      className={`nav-magnetic ${className || ''}`}
      onClick={handleClick}
      {...hoverProps}
    >
      {/* TextRoll stays MOUNTED and is driven by isHovered — it is deliberately
          not conditionally rendered and carries no remount key. Its coloured
          exit layer rests in the visible state, so unmounting it mid-roll strands
          letters showing red after the pointer has left; a fast swipe across the
          nav did exactly that. See the isHovered note in text-roll.tsx. */}
      {postNav ? (
        typeof children === 'string' ? <span>{children}</span> : children
      ) : typeof children === 'string' ? (
        <TextRoll
          isHovered={isHovered}
          exitClassName={exitClassName}
          enterClassName={enterClassName}
        >
          {children}
        </TextRoll>
      ) : (
        children
      )}
    </a>
  );
}

/** One desktop nav label, drawn as TWO overlaid copies.
 *
 *  This split exists because mix-blend-mode renders an element AND its entire
 *  descendant subtree as one group, then blends that finished group against the
 *  backdrop. So a red child inside the blended wrapper does not stay red — it
 *  gets inverted along with everything else. Measured: #D60000 inside a
 *  `difference` wrapper renders rgb(31,245,240), i.e. cyan. `isolation: isolate`
 *  on the child does NOT rescue it (same cyan) — isolation only stops descendants
 *  reaching outward, it cannot exempt an element from an ancestor's blend.
 *
 *  Nor can the blend move inside TextRoll: its letter spans carry
 *  `perspective:10000px` + `preserve-3d`, and both roll layers carry a rotateX
 *  transform. All three create stacking contexts, so a blend placed there
 *  composites against an empty transparent buffer and renders flat (measured
 *  243-255). Those properties are load-bearing for the roll — see text-roll.tsx.
 *
 *  Hence two SIBLINGS rather than a nesting:
 *    - restingLayer: carries mix-blend-difference, holds the real <a>, and hides
 *      its own red exit layer.
 *    - hoverLayer:   no blend at all, so its red stays exactly #D60000; hides its
 *      own resting layer, is aria-hidden and pointer-events-none.
 *
 *  Both are driven by ONE hover state owned here, which is why MagneticLink grew
 *  a controlled `isHovered`. Typography lives on the shared container so the two
 *  copies cannot drift out of alignment. */
function NavLink({
  label,
  href,
  index,
  className = '',
}: {
  label: string;
  href: string;
  /** Position in the row, left to right. Drives the entrance stagger only. */
  index: number;
  /** Per-slot spacing only (the ml-* utilities the row used to carry). */
  className?: string;
}) {
  const { isHovered, hoverProps } = useHoverState<HTMLDivElement>();

  /* ONE transition object, consumed by BOTH layers below. They are pixel-
     overlaid copies of the same label, so any divergence in delay/duration/ease
     shows up as the red hover copy tearing away from the blended resting copy
     partway through the entrance. Derived from the shared helper, so a label
     also cannot drift from the logo that leads the row. */
  const revealTransition = rowReveal(index);

  return (
    <div
      {...hoverProps}
      /* `relative` with z-auto does NOT create a stacking context, so the resting
         layer's blend still reaches the photograph through it. Do not add a
         z-index, transform, filter, opacity<1 or isolation to this element. */
      className={`relative pointer-events-auto text-[24px] 2xl:text-[clamp(24px,1.56vw,36px)] tracking-wide ${className}`}
    >
      <div className="text-off-white mix-blend-difference">
        {/* The mask and the translate are DESCENDANTS of the blend, never
            ancestors of it. That is the whole trick, and it is the one the hero
            h1 already uses (hero.tsx): mix-blend-mode groups an element with its
            entire subtree, composites that subtree normally into the group's own
            buffer, and only then blends the finished buffer against the backdrop.
            So a transform on a child is painted INTO the group and is invisible
            to the blend — while the same transform on a PARENT would isolate the
            group and flatten these labels to white, which is the bug the whole
            placement of this row exists to avoid.

            Do not hoist this motion.span above the mix-blend-difference div. */}
        <span className="nav-label-mask">
          <motion.span
            className="nav-label-inner"
            initial={{ y: '-130%' }}
            animate={{ y: '0%' }}
            transition={revealTransition}
          >
            <MagneticLink
              href={href}
              isHovered={isHovered}
              /* The red belongs to the sibling below, not in here — inside this
                 blended group it would inverted to cyan. */
              exitClassName="opacity-0"
            >
              {label}
            </MagneticLink>
          </motion.span>
        </span>
      </div>

      {/* The flat-red copy. No blend, so #D60000 renders literally — and it takes
          the IDENTICAL mask and translate, off the same transition object, so the
          two copies stay registered to the pixel throughout the entrance. */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <span className="nav-label-mask">
          <motion.span
            className="nav-label-inner"
            initial={{ y: '-130%' }}
            animate={{ y: '0%' }}
            transition={revealTransition}
          >
            <MagneticLink
              href={href}
              isHovered={isHovered}
              enterClassName="opacity-0"
              exitClassName="text-[#D60000]"
            >
              {label}
            </MagneticLink>
          </motion.span>
        </span>
      </div>
    </div>
  );
}

/** The four desktop nav labels, rendered INSIDE `<section id="hero">` rather than
 *  inside the pill — see the placement note in hero.tsx.
 *
 *  That location is the entire reason `mix-blend-difference` works here. A blend
 *  composites against the backdrop accumulated inside its own stacking context,
 *  and nothing outside it. In the pill it had two isolating ancestors: the
 *  motion.nav's own `z-[100]` (a transparent group on desktop) and, above that,
 *  `<main class="relative z-20">` holding the photograph in a SEPARATE group. So
 *  the labels resolved against flat #F5F5F0 and cancelled to white.
 *
 *  Here they are a later-painted sibling of the photo inside hero.tsx's
 *  `absolute inset-y-0` div, which is z-auto and untransformed and therefore does
 *  NOT isolate — exactly the arrangement the hero wordmark (hero.tsx) and the
 *  "INSIDE ATWO STUDIOS" h2 (about.tsx) already use.
 *
 *  Consequences for anyone editing this: keep every ancestor between these labels
 *  and the photograph free of transform, filter, opacity<1, isolation and a
 *  non-auto z-index. Such a property on the blending element ITSELF is harmless;
 *  on an ANCESTOR it silently kills the effect. That distinction is why the row
 *  wrapper below deliberately carries no z-index even though the hero wordmark,
 *  which blends on its own element, can. */
export default function NavLinks({ visible }: { visible: boolean }) {
  /* Mount gate, NOT a fade — and no longer the entrance either.
     It used to be BOTH: the labels simply appeared, because an `opacity` between
     0 and 1 creates a stacking context that would isolate the blend for the whole
     duration of a fade and flash the labels flat white on the way in. That
     constraint is unchanged and still absolute AT THIS LEVEL AND ABOVE — nothing
     here may animate opacity or transform.
     What changed is that it never applied to a masked TRANSLATE placed INSIDE the
     blend, which is what each NavLink now runs. So this flag's job shrank to
     holding the row out of the DOM until the beat its reveal begins on; the
     motion.spans below animate on mount from there. */
  if (!visible) return null;

  return (
    <div
      /* NO z-index. This is the trap: `absolute` + any non-auto z-index makes
         this wrapper a stacking context, and because the blend lives on the
         CHILDREN, they would then composite against this empty transparent box
         instead of the photograph — flat white again. (The hero wordmark can
         carry z-10 only because the blend is on that same element, not below it.)

         Painting order is handled by DOM position instead: this renders after the
         photograph and before the wordmark, so it layers correctly with z-auto.

         Geometry mirrors the pill's row (navbar.tsx) so the labels land exactly
         where they always did: same top ladder, same 122px desktop gutter, same
         max-w-page-max box. Centred with mx-auto rather than a translate, since
         a transform here would isolate the blend just as surely.

         That shared width is why the spacing is solved with `justify-between`
         INSIDE the row rather than by narrowing the row: the width tokens are
         the pill's too, and changing them would pull the desktop logo out of
         alignment with the mobile toggle.

         `justify-between` spreads all five children — the logo and the four
         labels — evenly across that width, so every adjacent gap is equal. The
         gap is wide by design (~213px at 1280, ~469px at 2560) and self-limits
         there, because --spacing-page-max caps the row at 2343px; 2560 and 3840
         are identical. */
      className="hidden md:flex justify-between absolute top-[50px] 2xl:top-[clamp(50px,3.255vw,83px)] left-0 right-0 mx-auto w-[calc(100%-122px)] max-w-page-max items-center pointer-events-none"
    >
      {/* The logo, index 0 of the row's stagger — NOT a reserved spacer any more.
          It used to live in the pill (navbar.tsx), where it rode that element's
          rigid y:-100 -> 0 drop while these labels rose on the same beat: two
          opposing gestures at the same instant, which is what made the logo read
          as detached from the nav. Here it takes the same mask + translate the
          labels do, off the same rowReveal(), so the bar enters as one thing.

          Deliberately NOT wrapped in mix-blend-difference, unlike every label
          beside it. The mark is not a flat silhouette: the "2" is an iridescent
          holographic gradient, and difference would inverted those pastels to
          garish complements. It stays literal. */}
      <div className="shrink-0 pointer-events-auto">
        <span className="nav-label-mask">
          <motion.span
            className="nav-label-inner"
            initial={{ y: '-130%' }}
            animate={{ y: '0%' }}
            transition={rowReveal(0)}
          >
            <MagneticLink href="#hero">
              <Image
                src="/images/a2-logo.png"
                alt="ATWO Studios Logo"
                width={48}
                height={32}
                className="w-auto h-[32px] 2xl:h-[clamp(32px,2.083vw,53px)] object-contain"
                referrerPolicy="no-referrer"
              />
            </MagneticLink>
          </motion.span>
        </span>
      </div>

      {/* The four labels are DIRECT children of the row, deliberately NOT wrapped
          in a group of their own. `justify-between` on the row above can only
          distribute the children it actually has, so a wrapper here would make
          the four labels one flex item and collapse them back into a cluster —
          which is exactly what this row looked like before: everything bunched
          right, with the whole slack pooled in the empty stretch after the logo.

          Spacing comes ENTIRELY from `justify-between`. Do not add a `gap` or
          per-slot ml-* here: those add to the distributed space rather than
          replacing it, so the first and last gaps stop matching the middle ones
          and the row goes uneven again.

          `index` is authored literally rather than mapped: it must stay
          continuous with the logo's 0 above, and a .map would silently restart
          at 0 and fire the first label on the logo's beat. */}
      <NavLink href="#about-us" label="ABOUT US" index={1} />
      <NavLink href="#work" label="WORK" index={2} />
      <NavLink href="#services" label="SERVICES" index={3} />
      <NavLink href="#contact-us" label="CONTACT US" index={4} />
    </div>
  );
}
