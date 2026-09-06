"use client";

import { motion } from 'motion/react';

interface SectionHeaderProps {
  label: string;
  number: string;
  dark?: boolean;
  /** Explicit colour for the label, number, and rule. Overrides `dark`, which
   *  only toggles white/black — pass this when a section needs a specific hue. */
  color?: string;
  /** Skip the opacity fade-in. A partial opacity composites the text against
   *  whatever sits behind it, which washes a solid colour out to grey — pass
   *  this where the colour must render exactly as given. */
  solid?: boolean;
  className?: string;
}

export default function SectionHeader({ label, number, dark = false, color, solid = false, className = '' }: SectionHeaderProps) {
  const textColor = color ? '' : dark ? 'text-white' : 'text-black';
  const lineColor = color ? '' : dark ? 'bg-white' : 'bg-black';

  const inner = (
    <>
      <div className="flex justify-between items-baseline pb-1">
        <span className={`text-[clamp(13px,1.3vw,18px)] 2xl:text-[clamp(18px,1.17vw,26px)] uppercase min-w-0 ${textColor}`} style={{ fontFamily: 'var(--font-manrope), "Manrope", sans-serif', letterSpacing: '-0.02em', color }}>{label}</span>
        <span className={`text-[clamp(13px,1.3vw,18px)] 2xl:text-[clamp(18px,1.17vw,26px)] uppercase min-w-0 ${textColor}`} style={{ fontFamily: 'var(--font-manrope), "Manrope", sans-serif', letterSpacing: '-0.02em', color }}>({number.replace(/[()]/g, '')})</span>
      </div>
      <div className={`w-full h-px ${lineColor}`} style={{ backgroundColor: color }} />
    </>
  );

  // A plain div, not a motion.div with the animation props switched off: the
  // fade-in is the ONLY thing motion was providing here, so with it gone there
  // is nothing left to animate.
  if (solid) {
    return <div className={`w-full flex flex-col ${className}`}>{inner}</div>;
  }

  return (
    <motion.div
      className={`w-full flex flex-col ${className}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
    >
      {inner}
    </motion.div>
  );
}
