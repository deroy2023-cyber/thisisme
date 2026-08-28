"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';

/** Hover state for the TextRoll affordances (hero CTA, nav links).
 *
 *  A plain `onMouseLeave` is not enough for these. TextRoll's exit layer parks at
 *  `rotateX: 0` — fully visible — so the coloured state is where the animation
 *  *rests*, not a transient. Any leave event that never fires strands it.
 *
 *  And they do get missed: the hero CTA sits in a wrapper whose opacity is
 *  scroll-driven to 0, so scrolling away from a hovered button removes it from
 *  under a stationary cursor without the pointer ever crossing its edge. Same
 *  story for a flick out of the window and for the tab losing focus mid-hover.
 *
 *  So the leave events are kept as the fast path, and a scroll/blur-triggered
 *  `:hover` re-check backstops them. The listeners only exist while hovered,
 *  which is also what keeps this off the per-frame path — no state is written
 *  on mouse move, per the Phase 1 constraint. */
export function useHoverState<T extends HTMLElement>() {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<T>(null);
  const lenis = useLenis();

  /* A plain setter. This used to also bump a `rollKey` that consumers passed as
     TextRoll's `key` to force a remount on re-entry — which turned out to be the
     cause of the stuck-red nav links: remounting a component whose coloured
     layer rests in the visible state strands it mid-roll. TextRoll is now driven
     by an `isHovered` prop and retargets from wherever it is, so nothing needs a
     restart signal. */
  const onEnter = useCallback(() => setIsHovered(true), []);

  const onLeave = useCallback(() => setIsHovered(false), []);

  useEffect(() => {
    if (!isHovered) return;

    /* `:hover` is the browser's own answer, so this stays correct regardless of
       why the pointer stopped being over the element. */
    const clearIfNotHovered = () => {
      const el = ref.current;
      if (el && !el.matches(':hover')) setIsHovered(false);
    };

    /* Lenis drives documentElement imperatively, so it is the primary scroll
       signal here; the native listener stays as a backstop for the paths Lenis
       does not own (anchor jumps, keyboard, a stopped instance). */
    lenis?.on('scroll', clearIfNotHovered);
    window.addEventListener('scroll', clearIfNotHovered, { passive: true });
    window.addEventListener('blur', clearIfNotHovered);
    document.addEventListener('visibilitychange', clearIfNotHovered);

    return () => {
      lenis?.off('scroll', clearIfNotHovered);
      window.removeEventListener('scroll', clearIfNotHovered);
      window.removeEventListener('blur', clearIfNotHovered);
      document.removeEventListener('visibilitychange', clearIfNotHovered);
    };
  }, [isHovered, lenis]);

  /** Spread onto the hovered element; `ref` included so the `:hover` check has
   *  a node to test. */
  const hoverProps = {
    ref,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onPointerLeave: onLeave,
    onPointerCancel: onLeave,
    onBlur: onLeave,
  };

  return { isHovered, hoverProps };
}
