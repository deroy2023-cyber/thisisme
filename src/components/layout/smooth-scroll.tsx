"use client";

import { useEffect, useRef } from 'react';
import { ReactLenis, type LenisRef } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const LENIS_OPTIONS = {
  // Every scroll listener's cost is multiplied by this. At 2.0 a single wheel
  // notch emitted ~120 scroll frames, each re-measuring every useScroll in the
  // tree plus ScrollTrigger.update.
  duration: 1.1,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -8 * t)),
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
} as const;

/** Wraps the app in Lenis via `ReactLenis` rather than a bare `new Lenis()` so
 *  the instance is reachable through `useLenis()`. Overlays need it: pausing
 *  Lenis is the only way to actually lock the page — it drives scroll
 *  imperatively on documentElement, so `body { overflow: hidden }` alone does
 *  not hold it. */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    // Drive Lenis from GSAP's ticker instead of its own RAF loop, and keep
    // ScrollTrigger in step — it would otherwise read stale native scroll.
    const raf = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(raf);
    // Keep GSAP's jank protection on. With lagSmoothing(0) a dropped frame
    // advanced animations by the full elapsed delta, turning stutter into
    // visible jumps.
    gsap.ticker.lagSmoothing(500, 33);

    const lenis = lenisRef.current?.lenis;
    lenis?.on('scroll', ScrollTrigger.update);

    return () => {
      gsap.ticker.remove(raf);
      lenis?.off('scroll', ScrollTrigger.update);
    };
  }, []);

  return (
    // autoRaf off — the GSAP ticker above is the single RAF loop.
    <ReactLenis root ref={lenisRef} options={{ ...LENIS_OPTIONS, autoRaf: false }}>
      {children}
    </ReactLenis>
  );
}
