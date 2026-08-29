"use client";

import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';

gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP);

/** ScrollTrigger.refresh() is a synchronous, full-document reflow. Services
 *  mounts three TextBlockAnimations per hovered item, so calling it per
 *  instance meant three global reflows in one frame — a visible hover freeze.
 *  Coalesce every request in a frame into a single trailing refresh. */
let refreshFrame = 0;
function requestScrollTriggerRefresh() {
  if (refreshFrame) return;
  refreshFrame = requestAnimationFrame(() => {
    refreshFrame = 0;
    ScrollTrigger.refresh();
  });
}

interface TextBlockAnimationProps {
  children: React.ReactNode;
  /** Fire on scroll into view. Set false to play immediately on mount. */
  animateOnScroll?: boolean;
  delay?: number;
  /** Colour of the revealing block. Defaults to the ATWO brand red. */
  blockColor?: string;
  stagger?: number;
  duration?: number;
  className?: string;
}

export default function TextBlockAnimation({
  children,
  animateOnScroll = true,
  delay = 0,
  blockColor = '#D60000',
  stagger = 0.06,
  duration = 0.45,
  className = '',
}: TextBlockAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;

      let split: SplitText | null = null;
      let tl: gsap.core.Timeline | null = null;
      let cancelled = false;

      // SplitText measures line breaks at mount. Coolvetica loads over the
      // network, so splitting before it settles produces lines against the
      // fallback metric that then reflow. Wait for fonts, then split.
      const build = () => {
        if (cancelled || !containerRef.current) return;

        split = new SplitText(container, {
          type: 'lines',
          linesClass: 'block-line-parent',
        });

        const lines = split.lines as HTMLElement[];
        // Paired, not two parallel arrays: the loop below skips any line whose
        // parentNode is missing, so index n of a `blocks` array would not reliably
        // be the block for line n. The per-line timelines index into this directly.
        const pairs: { line: HTMLElement; block: HTMLElement }[] = [];

        lines.forEach((line) => {
          const parent = line.parentNode;
          if (!parent) return;

          const wrapper = document.createElement('div');
          wrapper.style.position = 'relative';
          wrapper.style.display = 'block';
          wrapper.style.overflow = 'hidden';

          const block = document.createElement('div');
          block.style.position = 'absolute';
          block.style.top = '0';
          block.style.left = '0';
          block.style.width = '100%';
          block.style.height = '100%';
          block.style.backgroundColor = blockColor;
          block.style.zIndex = '2';
          block.style.transform = 'scaleX(0)';
          block.style.transformOrigin = 'left center';
          block.style.pointerEvents = 'none';

          parent.insertBefore(wrapper, line);
          wrapper.appendChild(line);
          wrapper.appendChild(block);

          gsap.set(line, { opacity: 0 });
          pairs.push({ line, block });
        });

        if (!pairs.length) return;

        // Each line owns a cover -> reveal -> uncover sub-timeline. Internal
        // positions depend only on `duration`, so the three beats hold the same
        // relationship for every line no matter the line count, stagger or
        // duration; only the insertion point varies.
        //
        // The previous version chained `<`-relative offsets across three global
        // staggered tweens. `<` is the START of the previously-added tween, and a
        // staggered tween spans duration + (n-1)*stagger, so (a) every line's text
        // flipped on at exactly half its own block's sweep, and (b) the uncover
        // began at duration*0.9 — before the cover finished — flipping
        // transformOrigin while scaleX was still < 1, which snapped the block's
        // anchor mid-sweep. Both worsened as lines were added.
        const holdFraction = 0.15; // block sits fully closed for a beat
        const uncoverStart = duration * (1 + holdFraction);

        const timeline = gsap.timeline({
          defaults: { ease: 'power2.inOut' },
          scrollTrigger: animateOnScroll
            ? {
                trigger: container,
                start: 'top 85%',
                toggleActions: 'play none none none',
              }
            : undefined,
          delay,
        });
        tl = timeline;

        pairs.forEach(({ line, block }, i) => {
          const lineTl = gsap.timeline();

          lineTl
            .to(block, { scaleX: 1, duration, transformOrigin: 'left center' })
            // Hard flip at the instant the block reads scaleX 1. A fade would make
            // the text visible under a block that is already retreating — a softer
            // rerun of the bug this replaces.
            .set(line, { opacity: 1 }, duration)
            // Flipping the origin is only geometrically invisible while
            // scaleX === 1 (a full-width box renders identically from either
            // anchor); starting at/after `duration` guarantees that.
            .to(
              block,
              { scaleX: 0, duration, transformOrigin: 'right center' },
              uncoverStart
            );

          timeline.add(lineTl, i * stagger);
        });

        // Line boxes changed height; let other triggers recompute. Batched —
        // see requestScrollTriggerRefresh above.
        requestScrollTriggerRefresh();
      };

      /* Guarded on both branches. `document.fonts?.status` was optional-chained
         while `document.fonts.ready` on the next line was not, so any
         environment without the Font Loading API took the else branch and threw
         on the property access. footer.tsx guards both. */
      if (document.fonts?.status === 'loaded') {
        build();
      } else if (document.fonts?.ready) {
        document.fonts.ready.then(build).catch(() => {});
      } else {
        build();
      }

      /* SplitText with type:'lines' bakes the CURRENT viewport's line breaks
         into the DOM. Without a re-split, a rotation or window resize leaves
         text wrapped for the old width -- visibly wrong breaks, and reveal
         blocks sized to lines that no longer exist.

         Width only: a vertical-only change (mobile URL bar collapsing, the
         on-screen keyboard) cannot alter horizontal line breaking, and
         re-splitting on it would tear down the animation mid-scroll on every
         phone. rAF-debounced so a drag-resize rebuilds once at the end. */
      let lastW = container.clientWidth;
      let resizeRaf = 0;
      const onResize = () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = 0;
          const w = containerRef.current?.clientWidth ?? lastW;
          if (w === lastW || cancelled) return;
          lastW = w;
          tl?.scrollTrigger?.kill();
          tl?.kill();
          tl = null;
          split?.revert();
          split = null;
          build();
        });
      };
      window.addEventListener('resize', onResize, { passive: true });

      return () => {
        cancelled = true;
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        window.removeEventListener('resize', onResize);
        tl?.scrollTrigger?.kill();
        tl?.kill();
        // revert() restores the original markup, discarding the wrapper divs
        // and blocks we injected. Without this, remounts stack duplicates.
        split?.revert();
      };
    },
    {
      scope: containerRef,
      dependencies: [animateOnScroll, delay, blockColor, stagger, duration],
    }
  );

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative' }}>
      {children}
    </div>
  );
}
