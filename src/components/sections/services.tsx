"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from "motion/react";
import Image from "next/image";
import SectionHeader from "@/src/components/ui/section-header";
import TextBlockAnimation from "@/src/components/ui/text-block-animation";

const SERVICES = [
  {
    name: "CREATIVE DIRECTION",
    header: "Ideas first. Everything else follows.",
    description:
      " We shape the concept, tone, and visual language behind every project before a single frame exists.",
    bullets: [
      "Campaign Ideation",
      "Visual Storytelling",
      "Concept Development",
      "Creative Consulting",
      "Mood boards & Direction",
    ],
  },
  {
    name: "BRAND IDENTITY",
    header: "Defining how a brand looks, feels, and communicates visually.",
    description:
      "We build visual systems and campaign aesthetics that give brands a distinct and memorable presence.",
    bullets: [
      "Brand Visual Identity",
      "Campaign Aesthetics",
      "Product Visual Language",
      "Brand Guidelines",
      "Marketing Visual Systems",
    ],
  },
  {
    name: "VISUAL PRODUCTION",
    header: "From concept to finished visuals.",
    description:
      "We create advertising films, marketing visuals, and animations designed to capture attention and elevate brands.",
    bullets: [
      "Advertising Films",
      "Marketing Content",
      "Digital Campaign Visuals",
      "Product Visuals",
      "Animation & Motion",
    ],
  },
  {
    name: "CINEMATICS",
    header: "Where ideas become cinematic experiences.",
    description:
      "Concept-driven storytelling that explores bold visuals, narratives, and experimental creative directions.",
    bullets: [
      "Short Films",
      "Conceptual Visuals",
      "Experimental Storytelling",
      "Artistic Projects",
      "Culture & Music Visuals",
    ],
  },
  {
    name: "CONCEPT LAB",
    header: "Where we explore ideas that don’t follow a brief.",
    bullets: [
      "Experimental Concepts",
      "Spec Campaigns",
      "Visual Experiments",
      "Cultural Projects",
      "Unconventional Storytelling",
    ],
  },
];

export default function Services() {
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [isMd, setIsMd] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [boxDone, setBoxDone] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    const hoverMq = window.matchMedia("(hover: hover)");
    let resizeFrame = 0;
    const applySize = () => {
      resizeFrame = 0;
      // Must match the `lg:` breakpoint the grid layout below is keyed to —
      // at 768–1023px the JS took the desktop branch while CSS was still
      // stacked, which left the panel collapsed.
      setIsMd(window.innerWidth >= 1024);
    };
    const checkSize = () => {
      if (!resizeFrame) resizeFrame = requestAnimationFrame(applySize);
    };
    const onHoverChange = () => setCanHover(hoverMq.matches);
    applySize();
    onHoverChange();
    window.addEventListener("resize", checkSize, { passive: true });
    hoverMq.addEventListener("change", onHoverChange);
    return () => {
      window.removeEventListener("resize", checkSize);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      hoverMq.removeEventListener("change", onHoverChange);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // All three keyframe ranges below live in the section's 230dvh progress space
  // (130dvh section + 100dvh viewport). Two boundaries matter, and they are easy
  // to confuse — an earlier pass mistook the second for the first and scheduled
  // the whole reveal after the panel had already let go:
  //
  //   0.435  pin ENGAGES  (100dvh / 230dvh — section top meets viewport top)
  //   0.565  pin RELEASES (130dvh / 230dvh — section bottom meets viewport bottom)
  //
  // So a keyframe belongs in [0, 0.435] to play on the approach, or in
  // [0.435, 0.565] to play while pinned. Anything past 0.565 animates a section
  // that is already scrolling off screen.
  //
  // Choreography: the box scrubs open across the approach and finishes exactly on
  // the pin, then the services land on the pin. Panel opacity therefore has to
  // resolve early — it cannot fade in after the box it belongs to has opened.
  const panelOpacity = useTransform(scrollYProgress, [0.16, 0.28], [0, 1]);

  // The reveal used to animate `width` on both flex children every frame,
  // forcing layout + paint of the whole sticky panel (and its 5 service rows)
  // ~120 times per wheel notch. Driving one grid track instead confines the
  // work to the container's own track sizing.
  // Ends exactly on the pin (0.435): the expand is the approach's animation, so
  // the box is fully open the instant the section locks. Starts at 0.16 rather
  // than 0 so the section is on screen for a beat before it begins opening —
  // from 0 it would already be mid-expand when it first appears.
  const gridColumns = useTransform(
    scrollYProgress,
    [0.16, 0.435],
    ["100fr 0fr", "50fr 50fr"]
  );

  // Guarded: scrollYProgress changes every frame across the whole section.
  // Unguarded this invoked the state updater ~120 times per wheel notch.
  // Fires exactly on the pin, which is the whole point of the sequence: the
  // options appear the moment the section locks. No upper bound — an earlier
  // `<= 0.75` re-hid the entire list near the section's end, so scrolling back
  // up blanked the rows out.
  const boxDoneRef = useRef(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = v >= 0.435;
    if (next !== boxDoneRef.current) {
      boxDoneRef.current = next;
      setBoxDone(next);
    }
  });

  // Three distinct states, not two: before mount we don't yet know the
  // viewport, so neither branch's animation may run. Gating the mobile props on
  // `!(mounted && isMd)` used to let them apply during SSR/first render, and
  // Framer Motion never removes inline values it has already committed — the
  // panel stayed pinned at `width: 0%` on desktop forever.
  const isDesktop = mounted && isMd;
  const isMobile = mounted && !isMd;


  return (
    <section
      ref={sectionRef}
      id="services"
      /* Panel height (100dvh, below) + 30dvh of pinned hold. NOT panel + a full
         viewport: that left ~95dvh pinned with nothing animating, which cost
         5-6 wheel notches of dead scroll to get past the section.
         This height and the keyframe ranges above are coupled arithmetic —
         `useScroll` spans section + viewport, so changing it moves both the
         engage (100/total) and release (section/total) boundaries and every
         range has to be re-derived against the new total. */
      className="relative w-full h-auto lg:h-[130dvh]"
    >
      <motion.div
        /* Exactly 100dvh: a sticky panel taller than the viewport can never show
           its own bottom — at 1366x768 and 1024x600 a flat 736px left the last
           two service rows unreachable. Sizing off the viewport keeps the panel
           full-height on large screens without ever exceeding it, and edge-to-
           edge with no letterboxing above or below. */
        className="lg:sticky lg:top-0 w-full lg:h-dvh flex flex-col lg:grid lg:grid-flow-col overflow-hidden bg-primary-red"
        style={isDesktop ? { gridTemplateColumns: gridColumns } : undefined}
      >
      {/* Left — Background image */}
      <motion.div
        className="relative h-[clamp(220px,45dvh,400px)] lg:h-full overflow-hidden min-w-0"
        initial={isMobile ? { width: "100%" } : undefined}
        whileInView={isMobile ? { width: "100%" } : undefined}
        viewport={{ amount: 0.3 }}
        transition={isMobile ? { type: "tween", duration: 1, ease: [0.76, 0, 0.24, 1] } : undefined}
      >
        <Image
          src="/images/services-bg.webp"
          alt="Services visual"
          fill
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      {/* Right — Red panel */}
      <motion.div
        className={`relative h-full bg-primary-red min-w-0 overflow-hidden ${isDesktop ? "" : "mb-6"}`}
        style={
          isDesktop
            ? {
                opacity: panelOpacity,
                // clamp, not a flat 55px: at 1024px the panel is 512px wide and
                // 110px of padding left 402px for headings that needed more.
                padding: "clamp(24px, 3.6vw, 55px)",
                // Positively reset rather than merely omit: resizing mobile ->
                // desktop at runtime would otherwise leave the mobile tween's
                // inline width/transform stranded and re-collapse the panel.
                width: "auto",
                transform: "none",
              }
            : undefined
        }
        initial={isMobile ? { width: "0%", opacity: 0, y: 50 } : undefined}
        whileInView={
          isMobile
            ? { width: "100%", opacity: 1, y: 0, x: 0, padding: "clamp(16px, 5vw, 24px)" }
            : undefined
        }
        viewport={{ amount: 0.2 }}
        transition={
          isMobile
            ? {
                width: { type: "tween", duration: 0.8, ease: [0.76, 0, 0.24, 1] },
                opacity: { duration: 0.4, delay: 0.2 },
                padding: { duration: 0.8, ease: [0.76, 0, 0.24, 1] },
                default: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
              }
            : undefined
        }
      >
        {/* Variants container: the rows used to run their own `whileInView`,
            which fired on section entry — long before the pin — so their slide-in
            was already over and invisible by the time this wrapper faded them in.
            Driving them as variant children means the single `boxDone` flip at the
            pin cascades the whole list in. Off desktop there is no pin, so the
            shown state is unconditional. */}
        <motion.div
          initial="hidden"
          animate={!isDesktop || boxDone ? "shown" : "hidden"}
          variants={{
            hidden: { opacity: 0, y: 10 },
            shown: {
              opacity: 1,
              y: 0,
              transition: { staggerChildren: 0.05 },
            },
          }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
        <SectionHeader label="SERVICES" number="03" dark className="mb-10" />

        <div className="flex flex-col gap-[0.28em] mt-4">
          {SERVICES.map((service) => (
            <motion.div
              key={service.name}
              /* nowrap on the ROW, not just the name span. The ✦ is a separate
                 sibling span, so the only place a line can break is between the
                 two — the name stayed on one line and the star alone dropped to
                 the next. Holding the break here keeps a name and its marker
                 together as one unit at every width.

                 Type size and leading live HERE rather than on the name span so
                 the row's inline strut is sized off the type. Without them the
                 row inherits Preflight's line-height 1.5, whose strut is a
                 16px/24px box that adds a fixed ~7.7px under every baseline —
                 absolute px against vw type, so it was ~31% of a 24.5px mobile
                 name but ~12% of a 66px desktop one, and the rhythm drifted
                 between breakpoints. At 0.9 the strut can never exceed the
                 name's own box, so row spacing is set purely by the container's
                 em gap. This also drops the ✦'s inherited line-height from 1.5
                 to 0.9, which is what removed the mobile-only line-box
                 inflation (its box, not its glyph — the star looks unchanged). */
              className="relative text-left whitespace-nowrap text-[6.8vw] lg:text-[min(3.6vw,66px)] leading-[0.9]"
              variants={{
                hidden: { opacity: 0, x: 20 },
                shown: { opacity: 1, x: 0 },
              }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={canHover ? () => setExpandedService(service.name) : undefined}
              onMouseLeave={canHover ? () => setExpandedService(null) : undefined}
            >
              <span
                /* Size/leading are inherited from the row (see above); the
                   slopes are documented here because this is the text they were
                   derived for. Two containers, so two slopes. Below lg this panel is
                   full-width; at lg it becomes a grid track that settles at
                   ~50vw. A single vw slope cannot serve both, and BOTH halves of
                   the old clamp(30px,4.6vw,66px) were wrong for their container:
                   on mobile 4.6vw underproduced (18px at 390px) so the size
                   pinned to the 30px floor, which was wider than the panel could
                   hold; on desktop 4.6vw is measured against the full viewport
                   while the panel is only half of it, so the names ran 49-67px
                   past the right edge at 1024/1280/1440 and the ✦ was pushed to
                   the next line. It only stopped overflowing at ~1600px.

                   Both slopes are derived from a measured width, not an estimate
                   (see status.md: CHAR_WIDTH_RATIO was once ~2x off and two
                   findings built on it were wrong). Probed in-browser against
                   the real Manrope 800 face: CREATIVE DIRECTION, the widest of
                   the five, is 10.358em. Budget is the panel's inner width minus
                   the ✦ and its ml-2.

                   Sized for the ✦, not just the text: the marker is align-super
                   with a -0.18em lift, so it needs visible room at the line end
                   or it reads as jammed against the edge. Mobile: fitting text
                   alone allowed 7.8vw but left only 17-30px after the star, so
                   6.8vw (44-66px clear, type 21.8-29.2px). Desktop: the panel
                   admits at most ~3.95vw, so 3.6vw (37-69px clear, type
                   37-58px). The 66px cap is kept — above ~1830px it binds first
                   and the panel has room to spare. */
                className="text-white cursor-pointer"
                style={{
                  fontFamily: 'var(--font-manrope), "Manrope", sans-serif',
                  letterSpacing: '-0.02em',
                }}
                onClick={() =>
                  setExpandedService(
                    expandedService === service.name ? null : service.name
                  )
                }
              >
                {service.name}
              </span>
              <motion.span
                className="inline-block text-[clamp(13px,1.4vw,20px)] text-white ml-2 align-super bg-transparent relative -top-[0.18em] cursor-pointer"
                animate={{
                  rotate: expandedService === service.name ? 90 : 0,
                }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                onClick={() =>
                  setExpandedService(
                    expandedService === service.name ? null : service.name
                  )
                }
              >
                ✦
              </motion.span>
              <AnimatePresence>
                {expandedService === service.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: "hidden" }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    {/* White blocks here: the panel is bg-primary-red, so a red
                        reveal block would be invisible against it. animateOnScroll
                        is off because this reveal is driven by hover, not scroll —
                        the sweep starts on mount and so overlaps the panel's
                        expansion. Safe to measure immediately: the panel animates
                        height only, and line-splitting depends on width, which the
                        grid has already settled. */}
                    <div className="grid lg:grid-cols-3 gap-8 justify-between m-4 overflow-hidden">
                      <div className="col-span-2">
                        {service.header && (
                          <TextBlockAnimation
                            blockColor="#FFFFFF"
                            animateOnScroll={false}
                            delay={0}
                            stagger={0.04}
                          >
                            <p className="text-white font-dm-9pt">
                              {service.header}
                            </p>
                          </TextBlockAnimation>
                        )}
                        {service.description && (
                          <TextBlockAnimation
                            className="mt-2"
                            blockColor="#FFFFFF"
                            animateOnScroll={false}
                            delay={0.06}
                            stagger={0.04}
                          >
                            <p className="text-white font-dm-9pt">
                              {service.description}
                            </p>
                          </TextBlockAnimation>
                        )}
                      </div>
                      <div className="">
                        <TextBlockAnimation
                          blockColor="#FFFFFF"
                          animateOnScroll={false}
                          delay={0.12}
                        >
                          {service.bullets?.map((bullet, i) => (
                            <p key={i} className="text-white font-dm-9pt">
                              ✓ {bullet}
                            </p>
                          ))}
                        </TextBlockAnimation>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
        </motion.div>
      </motion.div>
      </motion.div>
    </section>
  );
}
