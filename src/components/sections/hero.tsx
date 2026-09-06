"use client";

import { useRef, useState, useEffect } from 'react';
import { motion, useSpring, useTransform, MotionValue } from 'motion/react';
import { TextRoll } from '@/src/components/ui/text-roll';
import { useHoverState } from '@/src/components/ui/use-hover-state';
import FloatingParticles from '@/src/components/layout/floating-particles';
/* PILL_INTRO_DURATION is no longer imported: the label row's duration now lives
   with its transition in nav-links.tsx, and only the shared START beat is needed
   here. navbar.tsx still consumes both, so the export stays. */
import NavLinks, { PILL_INTRO_DELAY } from '@/src/components/layout/nav-links';
import { useLenis } from 'lenis/react';
import { scrollToSection } from '@/src/lib/scroll-to-section';

const HERO_TEXT = "ATWO STUDIOS.";
const LETTER_STAGGER = 0.04;
const HERO_START = 0.5;
/* Pulled in from 0.8. The preloader no longer holds on blank off-white, so every
   beat after the hand-off moved up with it; 0.65 keeps the taglines reading as a
   beat AFTER the wordmark without leaving the lower third empty while the H1
   finishes. The strike-line below is keyed to TAGLINE_START + 1.1 and follows
   this automatically -- keep that offset relative, never a literal. */
const TAGLINE_START = 0.65;

function MagneticButton({ children }: { children: string }) {
  const { isHovered, hoverProps } = useHoverState<HTMLButtonElement>();

  /* Mirrored into a ref for the same reason as in navbar.tsx: useLenis()
     returns undefined on the first render and the instance on the second, and
     the handler must read whatever is current at click time. */
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  /* Routed through the shared helper rather than a bare scrollIntoView so this
     button lands on #work with exactly the same timing as the nav links. */
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (scrollToSection(lenisRef.current, '#work')) e.preventDefault();
  };

  return (
    <button
      className="bg-off-black text-off-white px-[clamp(20px,4vw,38px)] py-[clamp(10px,1.6vw,14px)] rounded-[30px] text-[clamp(15px,2vw,24px)] tracking-wider transition-all duration-200 hover:bg-[#D60000] hover:mix-blend-color-burn pointer-events-auto overflow-hidden md:min-w-[240px] font-coolvetica-condensed"
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

  /* Mounts the blended nav labels at the START of their own entrance, not at the
     end of the pill's.

     This used to fire at (PILL_INTRO_DELAY + PILL_INTRO_DURATION) because the
     labels had no entrance at all — they could not fade (an in-between opacity
     creates a stacking context and would isolate their mix-blend-difference
     mid-flight), so the only move left was to mount them already blended, once
     the pill had landed. They now run a masked y-translate INSIDE the blend,
     which the h1 below already proves is safe, so this timer's only job is to
     put them in the DOM on the beat their reveal begins — the same beat the pill
     starts on, since the two are halves of one gesture.

     Kept as a mount gate rather than mounting immediately with a delayed
     transition: mounting early would leave four invisible but hoverable anchors
     lying over the hero through the preloader hand-off, so a parked pointer
     would fire the red roll on a label that has not been revealed yet.

     The stagger and duration live in nav-links.tsx with the transition that
     consumes them, so the mount and the animation cannot drift apart. */
  const [navLinksIn, setNavLinksIn] = useState(false);
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setNavLinksIn(true), PILL_INTRO_DELAY * 1000);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    /* bg-off-white, not bg-light-gray: this is the surface the preloader hands
       over to. The bar expands to #F5F5F0 and then unmounts, so anything other
       than the same colour here flashes for a frame before the photograph fades
       up. It is only ever visible in that gap and before the image decodes. */
    <section id='hero' className="relative w-full h-dvh overflow-hidden bg-off-white">
      <div className="absolute inset-y-0 left-0 w-full h-full">
        {/* Background with parallax */}
        <motion.div
          className="absolute inset-[-30px]"
          style={{ x: bgX, y: bgY, scale: bgScale }}
        >
          {/* Two sources, one per breakpoint. The desktop photograph is a wide
              landscape crop; object-cover on a tall phone viewport threw away
              most of its width and left the subject off-centre, so narrow
              viewports get their own portrait crop instead.

              Split with `media` on <source> rather than two next/image layers
              toggled by `hidden md:block`: CSS runs after preload scanning, so
              the toggle downloads BOTH files on every device and only hides one.
              media is evaluated by the preload scanner, so exactly one is
              fetched. That means opting out of the next/image optimizer here --
              the mobile asset is pre-compressed to webp at build-authoring time
              (853x1844, q82) to compensate, and the Cloudinary desktop URL was
              already being served unoptimized in practice.

              Animation props stay on the wrapping motion.div so both crops share
              one entrance rather than duplicating the literals. */}
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.3, opacity: 0 }}
            animate={!loading ? { scale: 1, opacity: 1 } : {}}
            /* delay 0, not 0.2: the preloader's cover completes and this
                section is revealed on the SAME frame, so any delay here is a
                blank off-white screen rather than a pause between two visible
                things. 2s -> 1.2s for the same reason -- most of a 2s fade from
                opacity 0 is spent near-invisible, which is what made the screen
                still look empty after the entrance had technically begun. */
            transition={{ duration: 1.2, delay: 0, ease: [0.22, 1, 0.36, 1] }}
          >
            <picture>
              <source
                media="(max-width: 767px)"
                srcSet="/images/mobile-hero.webp"
              />
              <img
                src="https://res.cloudinary.com/ddooeqf5m/image/upload/v1772986604/final_hero_fiaghh.png"
                alt="Hero background"
                fetchPriority="high"
                decoding="async"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            </picture>
          </motion.div>
          <motion.div
            className="absolute inset-0 bg-off-black pointer-events-none"
            style={{ opacity: darkOverlayOpacity }}
          />
        </motion.div>

        <FloatingParticles loading={loading} />

        {/* The desktop nav labels, rendered HERE rather than in navbar.tsx.

            They must be a LATER SIBLING of the photograph wrapper above, inside
            this same `absolute inset-y-0` div — that div is z-auto and carries no
            transform, so it does not isolate, and the photo's pixels are therefore
            part of the backdrop these labels blend against. It is the identical
            arrangement the wordmark below and about.tsx's h2 already rely on.

            Moving them back into the pill, or wrapping them in anything that
            transforms / filters / sets opacity<1 / takes a non-auto z-index, kills
            the blend and returns them to flat white. */}
        <NavLinks visible={navLinksIn} />

        {/* Hero Title */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 mix-blend-difference pointer-events-none w-full text-center flex justify-center items-center"
          style={{ scale: titleScale, opacity: titleOpacity }}
        >
          {/* One continuous clamp, not 22vw -> md:280px -> lg:367px.
              "ATWO STUDIOS." measures 3.178em wide in the real Heavy Compressed
              face (probed off the live CDN asset, not estimated -- the 0.5
              char-ratio video-stack.tsx uses is roughly double the truth for
              this face). At 3.178em the two fixed steps overshot the viewport
              between 768 and 1023px, clipping 61-71px off EACH side against
              this section's overflow-hidden, and then froze: 367px is 81% of
              width at 1440 but only 30% at 3840, so the wordmark shrank into
              the middle of every large monitor.

              25.5vw holds that 81% at every width and passes through exactly
              367px at 1440px, so the reference viewport is unchanged; the 76px
              floor keeps it legible on a 320px phone.

              The ceiling was 560px, which reintroduced the very bug described
              above -- just at 2196px instead of 1024px. Past that the wordmark
              stopped growing and shrank back into the middle of a 2560px
              monitor (21.9% of width, not 81%). Raised to 652.8px, which IS
              25.5vw at 2560, so the ramp is continuous to the target and the
              81% property holds all the way there. Nothing at or below 2196px
              moves. */}
          <h1 className="font-coolvetica-heavy text-[clamp(76px,25.5vw,652.8px)] leading-[0.8] text-off-white tracking-normal whitespace-nowrap select-none">
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
        <div className="absolute bottom-[clamp(20px,4dvh,30px)] left-0 w-full pointer-events-none px-gutter">
          <div className="max-w-page-max mx-auto w-full text-left relative pr-[clamp(0px,42vw,320px)] md:pr-[280px] 2xl:pr-[clamp(280px,18.23vw,420px)]">
            <motion.div className="mix-blend-difference text-off-white" style={{ opacity: lowerOpacity }}>
              <p className="text-[clamp(16px,3vw,24px)] 2xl:text-[clamp(24px,1.56vw,40px)] tracking-wider leading-tight font-coolvetica-condensed">
                <WordReveal text="PRODUCTION OVERHEAD?" baseDelay={TAGLINE_START} loading={loading} />
                <br />
                <WordReveal text="NOT OUR VIBE." baseDelay={TAGLINE_START + 0.25} loading={loading} />
              </p>
              <p className="text-[clamp(18px,3.5vw,28px)] 2xl:text-[clamp(28px,1.82vw,47px)] tracking-wider leading-tight mt-4 md:mt-6 font-coolvetica-condensed">
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
              <p className="text-[clamp(16px,3vw,24px)] 2xl:text-[clamp(24px,1.56vw,40px)] tracking-wider leading-tight opacity-0 select-none font-coolvetica-condensed">
                <WordReveal text="PRODUCTION OVERHEAD?" baseDelay={TAGLINE_START} loading={loading} />
                <br />
                <WordReveal text="NOT OUR VIBE." baseDelay={TAGLINE_START + 0.25} loading={loading} />
              </p>
              <p className="text-[clamp(18px,3.5vw,28px)] 2xl:text-[clamp(28px,1.82vw,47px)] tracking-wider leading-tight mt-4 md:mt-6 font-coolvetica-condensed">
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
          className="absolute bottom-[clamp(20px,4dvh,30px)] right-0 z-20 w-full flex justify-end overflow-hidden pb-1 px-gutter pointer-events-none"
          style={{ opacity: lowerOpacity }}
        >
          <div className="max-w-page-max mx-auto w-full flex justify-end">
            <motion.div
              initial={{ y: '110%' }}
              animate={!loading ? { y: '0%' } : {}}
              transition={{ duration: 0.8, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
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
