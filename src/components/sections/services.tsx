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

  const panelOpacity = useTransform(scrollYProgress, [0.07, 0.21], [0, 1]);

  // The reveal used to animate `width` on both flex children every frame,
  // forcing layout + paint of the whole sticky panel (and its 5 service rows)
  // ~120 times per wheel notch. Driving one grid track instead confines the
  // work to the container's own track sizing.
  const gridColumns = useTransform(
    scrollYProgress,
    [0.07, 0.35],
    ["100fr 0fr", "50fr 50fr"]
  );

  // Guarded: scrollYProgress changes every frame across the whole section.
  // Unguarded this invoked the state updater ~120 times per wheel notch.
  const boxDoneRef = useRef(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = v >= 0.35 && v <= 0.75;
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
      className="relative w-full h-auto lg:h-[calc(736px+100vh)]"
    >
      <motion.div
        className="lg:sticky lg:top-0 w-full lg:h-[736px] flex flex-col lg:grid lg:grid-flow-col overflow-hidden bg-primary-red"
        style={isDesktop ? { gridTemplateColumns: gridColumns } : undefined}
      >
      {/* Left — Background image */}
      <motion.div
        className="relative h-[400px] lg:h-full overflow-hidden min-w-0"
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
                padding: "55px",
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
            ? { width: "100%", opacity: 1, y: 0, x: 0, padding: "20px" }
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={
            isDesktop
              ? boxDone
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 10 }
              : { opacity: 1, y: 0 }
          }
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
        <SectionHeader label="SERVICES" number="03" dark className="mb-10" />

        <div className="flex flex-col gap-1 mt-4">
          {SERVICES.map((service, i) => (
            <motion.div
              key={service.name}
              className="relative text-left"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.5 + i * 0.01,
                ease: [0.22, 1, 0.36, 1],
              }}
              onMouseEnter={canHover ? () => setExpandedService(service.name) : undefined}
              onMouseLeave={canHover ? () => setExpandedService(null) : undefined}
            >
              <span
                className="text-[66px] text-white leading-[0.9] cursor-pointer"
                style={{
                  fontFamily: '"Coolvetica Regular", Coolvetica, sans-serif',
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
                className="inline-block text-[20px] text-white ml-2 align-super bg-transparent relative -top-[12px] cursor-pointer"
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
                    <div className="grid md:grid-cols-3 gap-8 justify-between m-4 overflow-hidden">
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
