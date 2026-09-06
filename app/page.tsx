"use client";

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useScroll, useSpring, useMotionValue } from 'motion/react';
import CustomCursor from '@/src/components/layout/custom-cursor';
import SmoothScroll from '@/src/components/layout/smooth-scroll';
import Preloader from '@/src/components/preloader';
import Navbar from '@/src/components/layout/navbar';
import Hero from '@/src/components/sections/hero';
import About from '@/src/components/sections/about';

// Below-fold sections are split out of the initial bundle. They mount as the
// user approaches them rather than shipping with the hero.
const Services = dynamic(() => import('@/src/components/sections/services'));
const Portfolio = dynamic(() => import('@/src/components/sections/portfolio'));
const VideoStack = dynamic(() => import('@/src/components/sections/video-stack'));
const WhyChooseUs = dynamic(() => import('@/src/components/sections/why-choose-us'));
const Footer = dynamic(() => import('@/src/components/layout/footer'));

export default function Home() {
  const { scrollYProgress } = useScroll();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  /* Gates the hero's and navbar's intro animations, which already accept a
     `loading` prop.

     The Preloader fires this at the SAME INSTANT it unmounts -- both happen in
     its timeline's onComplete, on one frame, the moment its bar has grown to
     cover the viewport. There is no overlap between the two clocks. (An earlier
     comment here claimed a ~0.8s lead; that described the curtain design that
     was removed, and it was wrong for a long time.)

     The hand-off is seamless anyway because the bar's fill and the hero section
     are the same #F5F5F0 -- the overlay is removed onto a surface identical to
     the one it was painting, so nothing flashes. What that DOES mean is that
     the hero cannot start until this fires, so any delay on the hero's own
     first beat is dead blank screen rather than a pause. Its photograph now
     starts at delay 0 for exactly that reason.

     handleDone MUST stay referentially stable. The previous preloader was
     removed because an inline arrow here was recreated on every render and, via
     its effect's dep array, restarted the intro timers forever (status.md
     Phase 1). The new Preloader also holds it in a ref, so this is belt and
     braces rather than the only defence. */
  const [loading, setLoading] = useState(true);
  const handleDone = useCallback(() => setLoading(false), []);

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  // Single rAF-coalesced pointer source. Writes motion values only (no React
  // state), so this never triggers a render.
  useEffect(() => {
    let frame = 0;
    let px = 0;
    let py = 0;

    const flush = () => {
      frame = 0;
      mouseX.set(px);
      mouseY.set(py);
    };

    const handleMouse = (e: MouseEvent) => {
      px = e.clientX / window.innerWidth;
      py = e.clientY / window.innerHeight;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    window.addEventListener('mousemove', handleMouse, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mouseX, mouseY]);

  return (
    <SmoothScroll>
      <CustomCursor />
      {/* Inside SmoothScroll, not outside it: the preloader locks the page with
          lenis.stop() via useLenis(), which only resolves under the provider. */}
      <Preloader onDone={handleDone} />
      {/* Not rendered while the intro runs. The grain is a fixed, full-viewport
          mix-blend-mode layer, so the compositor re-blends the whole screen
          whenever anything beneath it moves. It sits at z-100, under the
          preloader's z-200, so it is invisible for the entire intro anyway --
          this costs nothing visually and takes a full-screen blend out of every
          frame of it. Decorative only, so its absence from the SSR HTML is
          irrelevant, and it is absent on the client's first render too, so
          hydration matches. */}
      <div className="grain-overlay" />

      <div className="relative w-full bg-off-white overflow-clip font-coolvetica-condensed selection:bg-[#D60000] selection:text-off-white">
        <Navbar loading={loading} />

        {/* Opaque and above the footer: the footer below is sticky-pinned, so
            <main> is what keeps it hidden — it slides up over it to produce the
            drawer reveal. The background is not decorative: on desktop Services
            is taller than its own sticky panel, leaving a transparent band that
            would otherwise show the footer straight through. */}
        <main className="relative z-20 bg-off-white">
          <Hero loading={loading} smoothProgress={smoothProgress} mouseX={mouseX} mouseY={mouseY} />
          <About />
          <Services />
          <Portfolio />
          <VideoStack />
          <WhyChooseUs />
        </main>

        <Footer />
      </div>
    </SmoothScroll>
  );
}
