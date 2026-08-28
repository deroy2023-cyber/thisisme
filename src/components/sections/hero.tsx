"use client";

import { motion, useSpring, useTransform, MotionValue } from 'motion/react';
import Image from 'next/image';
import { TextRoll } from '@/src/components/ui/text-roll';
import { useHoverState } from '@/src/components/ui/use-hover-state';
import FloatingParticles from '@/src/components/layout/floating-particles';

const HERO_TEXT = "ATWO STUDIOS.";
const LETTER_STAGGER = 0.04;
const HERO_START = 0.5;
const TAGLINE_START = 0.8;

function MagneticButton({ children }: { children: string }) {
  const { isHovered, hoverProps } = useHoverState<HTMLButtonElement>();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = document.querySelector("#work");
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <button
      className="bg-off-black text-off-white px-[38px] py-[14px] rounded-[30px] text-[24px] tracking-wider transition-all duration-200 hover:bg-[#D60000] hover:mix-blend-color-burn pointer-events-auto overflow-hidden md:min-w-[240px] font-coolvetica-condensed"
      {...hoverProps}
      onClick={handleClick}
    >
      {/* Mounted always, driven by isHovered — see the note in navbar.tsx and the
          isHovered doc in text-roll.tsx. The stranding bug is invisible here
          (exitClassName is off-white against off-white text) but the mechanism is
          identical, and the two consumers are kept consistent. */}
      <TextRoll
        isHovered={isHovered}
        transition={{ ease: [0.32, 0.72, 0, 1] }}
        exitClassName="text-off-white"
      >
        {children}
      </TextRoll>
    </button>
  );
}

function WordReveal({ text, baseDelay, className, loading = false }: { text: string; baseDelay: number; className?: string; loading?: boolean }) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i} className={`word-clip inline-block overflow-hidden align-top ${i !== words.length - 1 ? 'mr-[0.3em]' : ''}`}>
          <motion.span
            className="word-clip-inner inline-block"
            initial={{ y: '110%' }}
            animate={!loading ? { y: '0%' } : {}}
            transition={{ duration: 0.8, delay: baseDelay + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function StaticWordReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i} className={`word-clip inline-block overflow-hidden align-top ${i !== words.length - 1 ? 'mr-[0.3em]' : ''}`}>
          <span className="word-clip-inner inline-block">{word}</span>
        </span>
      ))}
    </span>
  );
}

const MotionImage = motion.create(Image);

interface HeroProps {
  /** Gates this section's whole entrance -- photograph, H1 letters, taglines,
   *  strike, CTA and the particles.
   *
   *  Deliberately ONE flag. A previous revision split it so the photograph could
   *  be up before a knockout reveal opened onto it; that reveal is gone. The
   *  preloader now expands its bar until it IS the viewport in #F5F5F0 and then
   *  stands down, so this entrance is the reveal and every part of it should
   *  arrive together. */
  loading: boolean;
  smoothProgress: MotionValue<number>;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}

export default function Hero({ loading, smoothProgress, mouseX, mouseY }: HeroProps) {
  const darkOverlayOpacity = useTransform(smoothProgress, [0, 0.4], [0, 0.4]);
  const titleScale = useTransform(smoothProgress, [0, 0.4], [1, 2]);
  const titleOpacity = useTransform(smoothProgress, [0.1, 0.4], [1, 0]);
  const lowerOpacity = useTransform(smoothProgress, [0, 0.1], [1, 0]);

  const rawBgX = useTransform(mouseX, [0, 1], [15, -15]);
  const rawBgY = useTransform(mouseY, [0, 1], [10, -10]);
  const bgX = useSpring(rawBgX, { stiffness: 50, damping: 30 });
  const bgY = useSpring(rawBgY, { stiffness: 50, damping: 30 });

  const bgScale = useTransform(smoothProgress, [0, 1], [1, 1.2]);

  const heroLetters = HERO_TEXT.split('');

  return (
    /* bg-off-white, not bg-light-gray: this is the surface the preloader hands
       over to. The bar expands to #F5F5F0 and then unmounts, so anything other
       than the same colour here flashes for a frame before the photograph fades
       up. It is only ever visible in that gap and before the image decodes. */
    <section id='hero' className="relative w-full h-screen overflow-hidden bg-off-white">
      <div className="absolute inset-y-0 left-0 w-full h-full">
        {/* Background with parallax */}
        <motion.div
          className="absolute inset-[-30px]"
          style={{ x: bgX, y: bgY, scale: bgScale }}
        >
          <MotionImage
            src="https://res.cloudinary.com/ddooeqf5m/image/upload/v1772986604/final_hero_fiaghh.png"
            alt="Hero background"
            fill
            priority
            sizes="100vw"
            className="object-cover pointer-events-none"
            referrerPolicy="no-referrer"
            initial={{ scale: 1.3, opacity: 0 }}
            animate={!loading ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute inset-0 bg-off-black pointer-events-none"
            style={{ opacity: darkOverlayOpacity }}
          />
        </motion.div>

        <FloatingParticles loading={loading} />

        {/* Hero Title */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 mix-blend-difference pointer-events-none w-full text-center flex justify-center items-center"
          style={{ scale: titleScale, opacity: titleOpacity }}
        >
          <h1 className="font-coolvetica-heavy text-[22vw] md:text-[280px] lg:text-[367px] leading-[0.8] text-off-white tracking-normal whitespace-nowrap select-none">
            {heroLetters.map((letter, i) => (
              <span key={i} className="letter-mask">
                <motion.span
                  className="letter-inner"
                  initial={{ y: '120%', rotate: 8, opacity: 0 }}
                  animate={!loading ? { y: '0%', rotate: 0, opacity: 1 } : {}}
                  transition={{ duration: 0.7, delay: HERO_START + i * LETTER_STAGGER, ease: [0.22, 1, 0.36, 1] }}
                >
                  {letter === ' ' ? '\u00A0' : letter}
                </motion.span>
              </span>
            ))}
          </h1>
        </motion.div>

        {/* Taglines */}
        <div className="absolute bottom-[30px] left-0 w-full pointer-events-none px-5 md:px-[61px]">
          <div className="max-w-[1318px] mx-auto w-full text-left relative">
            <motion.div className="mix-blend-difference text-off-white" style={{ opacity: lowerOpacity }}>
              <p className="text-[clamp(16px,3vw,24px)] tracking-wider leading-tight font-coolvetica-condensed">
                <WordReveal text="PRODUCTION OVERHEAD?" baseDelay={TAGLINE_START} loading={loading} />
                <br />
                <WordReveal text="NOT OUR VIBE." baseDelay={TAGLINE_START + 0.25} loading={loading} />
              </p>
              <p className="text-[clamp(18px,3.5vw,28px)] tracking-wider leading-tight mt-4 md:mt-6 font-coolvetica-condensed">
                <WordReveal text="STAND OUT," baseDelay={TAGLINE_START + 0.5} loading={loading} />
                {' '}
                <span className="relative inline-block">
                  <WordReveal text="DONT BLEND IN" baseDelay={TAGLINE_START + 0.65} loading={loading} />
                </span>
                <span className="word-clip inline-block overflow-hidden align-top">
                  <motion.span
                    className="word-clip-inner inline-block"
                    initial={{ y: '110%' }}
                    animate={!loading ? { y: '0%' } : {}}
                    transition={{ duration: 0.8, delay: TAGLINE_START + 0.65 + 2 * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  >
                    .
                  </motion.span>
                </span>
              </p>
            </motion.div>

            {/* Red strikethrough layer */}
            <motion.div
              className="absolute top-0 left-0 w-full h-full pointer-events-none mix-blend-color-burn"
              style={{ opacity: lowerOpacity }}
            >
              <p className="text-[clamp(16px,3vw,24px)] tracking-wider leading-tight opacity-0 select-none font-coolvetica-condensed">
                <WordReveal text="PRODUCTION OVERHEAD?" baseDelay={TAGLINE_START} loading={loading} />
                <br />
                <WordReveal text="NOT OUR VIBE." baseDelay={TAGLINE_START + 0.25} loading={loading} />
              </p>
              <p className="text-[clamp(18px,3.5vw,28px)] tracking-wider leading-tight mt-4 md:mt-6 font-coolvetica-condensed">
                <span className="opacity-0 select-none"><StaticWordReveal text="STAND OUT," /></span>
                {' '}
                <span className="relative inline-block">
                  <span className="opacity-0 select-none"><StaticWordReveal text="DONT BLEND IN" /></span>
                  <motion.span
                    className="strike-line"
                    initial={{ scaleX: 0 }}
                    animate={!loading ? { scaleX: 1 } : {}}
                    transition={{ duration: 0.6, delay: TAGLINE_START + 1.1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
                <span className="opacity-0 select-none">.</span>
              </p>
            </motion.div>
          </div>
        </div>

        {/* CTA Button */}
        <motion.div
          className="absolute bottom-[30px] right-0 z-20 w-full flex justify-end overflow-hidden pb-1 px-5 md:px-[61px] pointer-events-none"
          style={{ opacity: lowerOpacity }}
        >
          <div className="max-w-[1318px] mx-auto w-full flex justify-end">
            <motion.div
              initial={{ y: '110%' }}
              animate={!loading ? { y: '0%' } : {}}
              transition={{ duration: 0.8, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto"
            >
              <MagneticButton>VIEW OUR WORK</MagneticButton>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
