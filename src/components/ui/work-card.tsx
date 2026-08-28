"use client";

import Image from 'next/image';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import GlassmorphicPill from '@/src/components/ui/glassmorphic-pill';

export interface Project {
  title: string;
  image: string;
  tags: string[];
  link: string;
}

/** Expo-out. Same family as the [0.22, 1, 0.36, 1] used in services.tsx. */
const EASE = [0.16, 1, 0.3, 1] as const;

/** Stagger lives on the grid; each card consumes `hidden`/`visible` by name. */
export const gridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function WorkCard({ title, image, tags, link }: Project) {
  const reduced = useReducedMotion();

  // Reduced motion still gets a fade — it reads as intentional rather than
  // as a section that pops in — but no travel and no scale.
  const cardVariants: Variants = reduced
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.4 } },
      }
    : {
        hidden: { opacity: 0, y: 40, scale: 0.97 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 1, ease: EASE },
        },
      };

  // The image settles out of an overscale on its own wrapper. It must not
  // share an element with the hover scale below — see the comment there.
  const imageVariants: Variants = reduced
    ? { hidden: {}, visible: {} }
    : {
        hidden: { scale: 1.08 },
        visible: { scale: 1, transition: { duration: 1, ease: EASE } },
      };

  return (
    <motion.div
      variants={cardVariants}
      className="relative w-full aspect-[634/511] overflow-hidden group"
    >
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full"
      >
        {/* Two nested elements, one transform owner each: Motion drives the
            entrance scale on this wrapper, CSS drives the hover scale on the
            <Image>. Sharing one element would make them overwrite each other. */}
        <motion.div variants={imageVariants} className="absolute inset-0">
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </motion.div>

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-between p-5 lg:p-[30px]">
          {/* Top row */}
          <div className="flex items-start justify-between">
            <span
              style={{
                fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                fontWeight: 300,
                fontSize: '21.36px',
                lineHeight: '38.4px',
                letterSpacing: '-0.51px',
                color: 'white',
              }}
            >
              {title}
            </span>
            <span className="font-coolvetica text-white text-base">✦</span>
          </div>

          {/* Bottom tags */}
          <div className="flex gap-2 flex-wrap">
            {tags.map((tag) => (
              <GlassmorphicPill key={tag} label={tag} />
            ))}
          </div>
        </div>
      </a>
    </motion.div>
  );
}
