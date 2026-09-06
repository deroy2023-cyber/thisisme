import type Lenis from 'lenis';

/**
 * The single path from "a nav control was clicked" to "the page is moving".
 *
 * Every entry point on the site routes through here — the fullscreen menu's
 * links, the pill nav's links and the hero's CTA button — so the jump feels
 * identical wherever it is triggered. Before this, the three did three
 * different things: the menu used lenis.scrollTo, the pill and the hero used
 * native scrollIntoView, and only the menu path was tuned.
 */

/**
 * Fixed, and deliberately NOT the global `duration: 1.1` from smooth-scroll.tsx.
 *
 * That value is tuned for wheel inertia, where a long tail reads as weight. For
 * a nav jump the same tail reads as lag: the global easing there
 * (`1.001 - 2^(-8t)`) has covered 99.6% of the distance by t≈0.7 but keeps
 * running to t=1, so a third of the runtime is spent visually stationary. On a
 * hero-to-footer jump that is most of a second of nothing happening.
 *
 * Passed per call, so the global config is untouched and wheel scrolling keeps
 * its own feel.
 */
export const NAV_SCROLL_DURATION = 0.65;

/**
 * Ease-out cubic. Unlike the exponential global easing this actually arrives at
 * 1 when t is 1, which matters beyond aesthetics: `onComplete` is tied to the
 * animation's end, so an easing that never quite lands delays it.
 */
const NAV_EASE = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Scrolls to `href` (a `#id`). Returns false — without moving anything — when
 * the hash does not resolve to an element, which is the caller's cue to leave
 * the click alone and let the browser do its native hash jump rather than
 * calling preventDefault() on a navigation it cannot perform.
 */
export function scrollToSection(
  lenis: Lenis | null | undefined,
  href: string,
  onComplete?: () => void
): boolean {
  if (!href.startsWith('#')) return false;
  const target = document.querySelector<HTMLElement>(href);
  if (!target) return false;

  if (lenis) {
    lenis.scrollTo(target, {
      /* Required whenever an overlay holds Lenis stopped — scrollTo early-returns
         while stopped, so without this a click inside the open fullscreen menu
         does nothing at all. (A native scrollIntoView cannot stand in there
         either: `.lenis.lenis-stopped` puts overflow:hidden on the root, and a
         document whose root is clipped will not scroll.)

         NOTE the limit: `force` gets a scroll STARTED while Lenis is stopped, it
         does not keep it alive. A later lenis.start() runs reset(), which calls
         animate.stop() and snaps the scroll back — so a caller that closes an
         overlay must not start a scroll in the same commit. See the ordering
         comment in navbar.tsx's handleClick. */
      force: true,
      duration: NAV_SCROLL_DURATION,
      easing: NAV_EASE,
      onComplete,
    });
  } else {
    /* Lenis resolves as undefined on a component's first render, so this is the
       genuine pre-hydration path rather than dead code. */
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onComplete?.();
  }
  return true;
}
