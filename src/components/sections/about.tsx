"use client";

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import SectionHeader from '@/src/components/ui/section-header';
import TextBlockAnimation from '@/src/components/ui/text-block-animation';

export default function About() {
  const [isMd, setIsMd] = useState(false);

  useEffect(() => {
    const checkSize = () => setIsMd(window.innerWidth >= 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return (
    <section id="about-us" className="relative w-full min-h-[736px] bg-white overflow-hidden">
      <div className="px-5 md:px-10 lg:px-[75px] pt-12 lg:pt-[48px] relative z-10">
        <SectionHeader label="ABOUT US" number="02" />
      </div>

      <div className="flex flex-col lg:flex-row w-full min-h-[660px] pb-12 lg:pb-0">
        <motion.div
          className="relative lg:absolute lg:right-0 lg:top-0 lg:bottom-0 w-full lg:w-[50%] h-[500px] lg:h-full order-2 lg:order-none"
          initial={{ opacity: 0, x: isMd ? -900 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ margin: isMd ? '-100px' : '-50px' }}
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

        <div className="relative px-5 md:px-10 lg:px-[75px] pt-[30px] lg:pt-[30px] lg:w-[55%] order-1 lg:order-none">
          <h2
            className="text-[clamp(80px,12vw,160px)] leading-[0.839] text-white whitespace-nowrap relative mix-blend-difference"
            style={{ fontFamily: '"Coolvetica Regular", Coolvetica, sans-serif' }}
          >
            INSIDE<br />ATWO STUDIOS
          </h2>

          <TextBlockAnimation className="mt-[80px] max-w-[484px]" stagger={0.03}>
            <p
              className="font-medium text-[20px] text-black leading-[1.02] text-left"
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
