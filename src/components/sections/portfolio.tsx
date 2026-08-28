"use client";

import { motion } from 'motion/react';
import SectionHeader from '@/src/components/ui/section-header';
import TextBlockAnimation from '@/src/components/ui/text-block-animation';
import WorkCard, { gridVariants, type Project } from '@/src/components/ui/work-card';

const PROJECTS: Project[] = [
  {
    title: 'Prada — Tailored Luxury Campaign',
    image: 'https://res.cloudinary.com/dcmbfe9at/image/upload/v1778693071/demo-prada_lzzgkc.jpg',
    tags: ['Luxury', 'Fashion', 'Creative Direction'],
    link: "https://www.instagram.com/p/DWJDaRlDY5B/?igsh=MWVncG1idXMwazA5Yg==",
  },
  {
    title: 'Rhode — Beauty Campaign',
    image: 'https://res.cloudinary.com/dcmbfe9at/image/upload/v1778693073/demo-rhode_cevho0.jpg',
    tags: ['Beauty', 'Skin', 'Commercial'],
    link:"https://www.instagram.com/p/DVBmOJkifrL/?igsh=bXhicnU1cm8wbG54",
  },
  {
    title: 'Ornate Flesh — Artistic Campaign',
    image: 'https://res.cloudinary.com/dcmbfe9at/image/upload/v1778692654/demo-ornate-1_w38vgx.png',
    tags: ['Concept', 'Experimental', 'Form', 'Styling'],
    link:"https://www.instagram.com/p/DWg4P3zmJEx/?img_index=2&igsh=MW03Y2VoOGE2aGtxMA==",
  },
  {
    title: 'Bluorng — Fashion Campaign',
    image: 'https://res.cloudinary.com/dcmbfe9at/image/upload/v1779094379/webp_fhd_kqqwyr.webp',
    tags: ['Fashion', 'Shoot', 'Campaign'],
    link:"https://www.instagram.com/p/DYZ2_V3Iqay/",
  },
];

export default function Portfolio() {
  return (
    <section id="work" className="relative w-full bg-white py-10 lg:py-[40px]">
      <div className="px-5 md:px-10 lg:px-[75px]">
        <SectionHeader label="PORTFOLIO" number="04" />

        {/* Heading area */}
        <div className="relative mt-8 lg:mt-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-0 mb-10 lg:mb-16">
          <h2
            className="text-[12vw] lg:text-[216.4px] leading-[0.839] text-black select-none"
            style={{
              fontFamily: '"Coolvetica Regular", Coolvetica, sans-serif',
              letterSpacing: '-0.01em'
            }}
          >
            OUR<br />WORK
          </h2>

          <TextBlockAnimation className="max-w-[282px]" stagger={0.05}>
            <p
              className="font-normal text-[20px] text-black leading-normal text-left"
              style={{ fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif', letterSpacing: '-0.03em' }}
            >
              Looks like a production circus happened here. Plot twist : It didn&apos;t.
            </p>
          </TextBlockAnimation>
        </div>

        {/* Grid — parent owns the stagger; each WorkCard reveals itself.
            once:true so cards don't replay on every scroll-back. */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6"
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {PROJECTS.map((project, i) => (
            <WorkCard key={i} {...project} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
