"use client";

import { motion } from 'motion/react';
import Image from 'next/image';
import SectionHeader from '@/src/components/ui/section-header';
import TextBlockAnimation from '@/src/components/ui/text-block-animation';
import { useMediaQuery } from '@/src/hooks/use-media-query';
import { BP, mqUp } from '@/src/lib/breakpoints';

export default function About() {
  /* Gated on `lg`, not `md`. This flag drives the image's entrance, but the
     layout that entrance belongs to is keyed to `lg:` on the elements below.
     At 768-1023px the old `>= 768` made this true while the CSS was still in
     the stacked mobile layout, so a full-width, in-flow block was slid in from
     far off-screen left inside the section's overflow-hidden.

     Also now a live subscription rather than a resize listener that read
     window.innerWidth on every event (unthrottled and non-passive, forcing a
     synchronous layout each time). matchMedia fires only on the crossing. */
  const isDesktop = useMediaQuery(mqUp(BP.lg));

  return (
    <section id="about-us" className="relative w-full h-dvh flex flex-col bg-white overflow-hidden">
      <div className="px-gutter pt-12 lg:pt-[48px] relative z-10">
        <SectionHeader label="ABOUT US" number="02" />
      </div>

      <div className="flex flex-col lg:flex-row w-full flex-1 pb-12 lg:pb-0">
        <motion.div
          className="relative lg:absolute lg:right-0 lg:top-0 lg:bottom-0 w-full lg:w-[50%] h-[clamp(280px,55dvh,500px)] lg:h-full order-2 lg:order-none"
          /* Percentage, not a hardcoded -900px. At 900px the travel was longer
             than the element on a 768px viewport and only a third of it on a
             2560px one, so the same animation read as a different gesture at
             every width. -60% is relative to the element, which is what the
             gesture actually is. */
          initial={{ opacity: 0, x: isDesktop ? '-60%' : '-12%' }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ margin: isDesktop ? '-100px' : '-50px' }}
          transition={{ duration: 1.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src="/images/about-model.jpg"
            alt="ATWO Studios creative direction"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-top"
          />
        </motion.div>

        {/* lg:w-[50%], matching the absolutely-positioned image's own 50% —
            these used to be 55% and 50%, summing to 105%. Because the image is
            absolute it contributes nothing to flex layout, so the extra 5% was
            not a wrap but a silent overlap: the last 51px of every text line at
            1024px sat beneath the photograph, growing to 128px at 2560px.
            lg:pr-[75px] keeps the text clear of the seam rather than ending
            flush against it. */}
        <div className="relative px-gutter pt-[30px] lg:w-[50%] lg:pr-[75px] order-1 lg:order-none">
          <h2
            className="text-[clamp(44px,9.5vw,160px)] leading-[0.839] text-white relative z-10 mix-blend-difference lg:whitespace-nowrap"
            style={{ fontFamily: 'var(--font-manrope), "Manrope", sans-serif', letterSpacing: '-0.02em' }}
          >
            INSIDE<br />ATWO STUDIOS
          </h2>

          <TextBlockAnimation className="mt-[clamp(32px,6vw,80px)] max-w-[484px]" stagger={0.03}>
            <p
              className="font-medium text-[clamp(16px,1.35vw,20px)] text-black leading-[1.25] text-left"
              style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif', letterSpacing: '-0.01em' }}
            >
              Ideas run the show. We create ads, films, and brand visuals that look like full productions – minus the rented studios, camera, crews and production chaos. We are less interested in how things are traditionally done and more obsessed with how far an idea can go. The results feel like a real shoot. The Process? Let&apos;s just say it&apos;s unconventional.
            </p>
          </TextBlockAnimation>
        </div>
      </div>
    </section>
  );
}
