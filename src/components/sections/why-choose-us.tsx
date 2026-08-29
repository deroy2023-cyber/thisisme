"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import SectionHeader from "@/src/components/ui/section-header";

interface FeatureCard {
  title: string;
  description: string;
}

// Card height, the gap between cards, and the last card's hold runway. These
// drive both the rendered styles and the section's height calc, so the two
// cannot drift apart.
const CARD_H = 440;
const CARD_GAP = 240; // matches gap-60 (15rem) on the card column
// The last card's motionless hold. 40 was ~400px at a 1000px viewport — about
// two wheel notches of a still card, which on top of the runway that used to
// follow it read as the card being stuck rather than as a deliberate beat.
const HOLD_VH = 20;
// Top padding on the content column (pt-[60dvh]). Named because the section
// height below has to include it: the column starts this far down, so a height
// that omits it ends the section before the last card has finished.
const COL_PAD_VH = 60;

const FEATURES: FeatureCard[] = [
  {
    title: "Idea-First Approach",
    description:
      "Great visuals start with great thinking. At A2, every project begins with a strong idea before anything else takes shape.",
  },
  {
    title: "Production Without Production",
    description:
      "No rented studios. No camera crews. We create visuals that feel like full productions — without the usual production chaos.",
  },
  {
    title: "Creative Direction Focus",
    description:
      "Tools are accessible to everyone. Direction isn't. We focus on shaping ideas, storytelling, and visual language that make brands stand out.",
  },
  {
    title: "Fast & Flexible",
    description:
      "Without traditional production barriers, ideas move faster. We turn concepts into finished visuals quickly and efficiently.",
  },
];

export default function WhyChooseUs() {
  const containerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // The overlay is pinned inside the sticky video for the whole section, so left
  // static it sits under the cards for the entire scroll and has to lift away.
  //
  // The fade wraps BOTH SectionHeader and the h2, not the h2 alone. SectionHeader
  // renders a full-width `h-px` rule and animates itself in with whileInView +
  // `once: true`; pinned on screen for the section's whole runway, that rule
  // reaches opacity 1 and stays there forever. Fading only the h2 left the title
  // invisible but stranded the BENEFITS row and its horizontal line on screen.
  //
  // Enclosing SectionHeader rather than sitting beside it also fixes the opacity
  // clobber this comment used to describe: as a *child* the parent's opacity
  // multiplies with the child's own tween, instead of two writes competing for
  // the same inline style as siblings did.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });
  // The fade cut-off cannot be a hardcoded fraction. This section is several
  // thousand px tall — its height is derived from CARD_H/CARD_GAP/HOLD_VH and
  // grows with FEATURES — so any fixed fraction of scrollYProgress means a
  // different, and much longer, amount of real scrolling than it reads as. A
  // flat 0.22 was ~684px at a 1000px viewport: several scroll gestures, with the
  // title still sitting over the first cards.
  //
  // Instead, measure the fraction that corresponds to a fixed pixel distance, so
  // the fade always finishes inside ~one viewport of scrolling no matter how
  // tall the card runway is or how large the window gets.
  const [fadeEnd, setFadeEnd] = useState(0.08);
  // How far the overlay must travel to clear the top of the frame. Measured, not
  // guessed: the heading is clamp(40px,10vw,121px) and the BENEFITS row sits above
  // it, so a fixed nudge leaves the block dimming in place instead of departing.
  const [liftPx, setLiftPx] = useState(240);
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const runway = el.offsetHeight - window.innerHeight;
      if (runway <= 0) return;
      setFadeEnd(Math.min(1, (window.innerHeight * 0.55) / runway));
      const overlay = overlayRef.current;
      if (overlay) setLiftPx(overlay.offsetHeight);
    };
    measure();
    // The Coolvetica faces are remote with font-display: swap, so a mount-time
    // measurement can land against fallback metrics and then reflow, leaving the
    // lift too short to clear the frame. Re-measure once the real face is in.
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // No longer applied as a visual style — the header must stay solid #0E0E0E,
  // and a partial opacity composited it against the light footage into grey.
  // Kept purely as the scroll-progress signal for overlayPointer below, which
  // needs to know when the block has left the frame.
  const titleOpacity = useTransform(scrollYProgress, [0, fadeEnd], [1, 0]);
  const titleY = useTransform(
    scrollYProgress,
    [0, fadeEnd * 1.5],
    [0, -(liftPx + 80)]
  );

  // Lifted away, the overlay still occupies its layout box. The wrapper is
  // pointer-events-none but SectionHeader's own div re-enables them, which would
  // leave an invisible strip intercepting clicks meant for the cards below.
  const overlayPointer = useTransform(titleOpacity, (v) =>
    v < 0.05 ? "none" : "auto"
  );

  // The background video used to autoplay and download on mount regardless of
  // viewport position. Play only while the section is actually on screen.
  useEffect(() => {
    const video = videoRef.current;
    const section = containerRef.current;
    if (!video || !section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={containerRef}
      id="why-choose-us"
      className="relative w-full bg-black"
      /* The section must end exactly where the card column ends, or the last
         card scrolls off the top and the user keeps scrolling against a
         motionless background video — which is what "the last card gets
         stuck" actually was. ~500px of it at a 1000px viewport.

         The column's bottom edge, measured from the section's top:

             COL_PAD_VH  the pt-[60dvh] the column opens with
           + cards       CARD_H each, CARD_GAP between
           + HOLD_VH     the last card's sticky release runway

         Plus the leading 100dvh for the sticky video — which the column's own
         -mt-[100dvh] cancels, so it is what makes the two coordinate systems
         line up rather than extra height.

         Nothing trails that sum. The previous +10dvh had nothing cancelling
         it and was pure dead scroll. */
      style={{
        height: `calc(100dvh + ${COL_PAD_VH}dvh + ${
          CARD_H * FEATURES.length + CARD_GAP * (FEATURES.length - 1)
        }px + ${HOLD_VH}dvh)`,
      }}
    >
      {/* Sticky Background Video & Title */}
      <div className="sticky top-0 left-0 w-full h-dvh overflow-hidden">
        <video
          src="https://res.cloudinary.com/dcmbfe9at/video/upload/q_auto/f_auto/v1778690282/why-us_irb2hb.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Header overlay + title — title sits directly below the BENEFITS
            line at the same tight gap BENEFITS keeps from its own line. The
            whole block fades and lifts as one so the rule leaves with it.

            No mix-blend-mode here: the text is #0E0E0E and blending near-black
            with difference is close to a no-op, so it rendered as invisible
            over the footage. The colour is painted literally instead. If a
            blend is ever wanted back, it belongs on THIS wrapper — the sibling
            of the <video> — and not on the label/rule/h2 inside it, because
            every wrapper below this one establishes its own stacking context
            and a blend set there composites against a transparent parent
            rather than the video.

            No opacity fade either: a partial opacity composited the #0E0E0E
            against the light footage and read as washed-out grey rather than
            the solid colour. The block still LIFTS out of frame on scroll
            (titleY), which is what keeps it from sitting over the cards — the
            departure is now purely positional. */}
        <motion.div
          ref={overlayRef}
          className="absolute top-0 left-0 w-full px-gutter pt-12 lg:pt-[62px] z-20 pointer-events-none"
          style={{ y: titleY }}
        >
          <motion.div style={{ pointerEvents: overlayPointer }}>
            <SectionHeader label="BENEFITS" number="05" color="#0E0E0E" solid />
          </motion.div>
          <h2
            className="mt-2 text-[clamp(40px,10vw,121px)] leading-[0.839]"
            style={{
              fontFamily: 'var(--font-manrope), "Manrope", sans-serif',
              letterSpacing: '-0.012em',
              color: '#0E0E0E',
            }}
          >
            WHY CHOOSE US?
          </h2>
        </motion.div>
      </div>

      {/* Content container that scrolls over the sticky video. The last card's
          hold runway lives in its own wrapper, not in trailing padding here. */}
      {/* pt comes from COL_PAD_VH rather than a literal: the section height
          above includes this same padding, and a drift between the two puts
          dead scroll back at the end of the section. */}
      <div
        className="relative z-20 w-full -mt-[100dvh]"
        style={{ paddingTop: `${COL_PAD_VH}dvh` }}
      >
        <div className="px-gutter">
          {/* Cards alternating left and right */}
          <div className="flex flex-col gap-60 max-w-[1300px] w-full mx-auto items-center">
            {FEATURES.map((feature, i) => (
              <FeatureCard
                key={feature.title}
                feature={feature}
                i={i}
                isLast={i === FEATURES.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  i,
  isLast,
}: {
  feature: FeatureCard;
  i: number;
  isLast: boolean;
}) {
  // Cards sit at fixed positions on the plane. Scroll moves the window over
  // them; it does not move them — no entrance, no exit, no slide, no rotation.
  const isRight = i % 2 !== 1;

  const card = (
    <div
      className="bg-black/90 border border-white/10 hover:border-white/30 transition-colors duration-300 p-6 flex flex-col gap-4 shadow-2xl"
      style={{ minHeight: CARD_H }}
    >
      <div className="flex gap-4 items-center pt-2">
        <span className="font-coolvetica text-[40px] leading-none text-white">
          ✦
        </span>
        <h3
          className="font-dm-9pt text-[clamp(22px,2vw,28px)] leading-tight tracking-normal text-white uppercase"
          style={{ fontWeight: 550 }}
        >
          {feature.title}
        </h3>
      </div>

      <div className="w-full h-px bg-white/20 my-2" />

      <div className="font-dm-9pt text-zinc-300 p-4 flex-grow">
        {feature.description}
      </div>
    </div>
  );

  // The final card pins centred, holds for HOLD_VH of scroll, then releases.
  // The hold has to come from this wrapper's own height: a sticky element whose
  // containing block ends where it does has no release runway and stays pinned
  // over whatever follows. Padding on an ancestor cannot supply it.
  if (isLast) {
    return (
      <div
        className={`w-[80%] md:w-[30%] ${isRight ? "md:self-end" : "md:self-start"}`}
        style={{ minHeight: `calc(${CARD_H}px + ${HOLD_VH}dvh)` }}
      >
        <div
          className="sticky"
          // dvh, not vh: the wrapper's runway below is dvh, and mixing the two
          // makes the pin offset and its release runway disagree as the mobile
          // URL bar collapses.
          style={{ top: `calc(50dvh - ${CARD_H / 2}px)` }}
        >
          {card}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-[80%] md:w-[30%] ${isRight ? "md:self-end" : "md:self-start"}`}
    >
      {card}
    </div>
  );
}
