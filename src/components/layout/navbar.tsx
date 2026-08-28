"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { useLenis } from 'lenis/react';
import { TextRoll } from '@/src/components/ui/text-roll';
import { useHoverState } from '@/src/components/ui/use-hover-state';
import FullscreenMenu from '@/src/components/layout/fullscreen-menu';

const NAV_LINKS = ['ABOUT US', 'WORK', 'SERVICES', 'CONTACT US'];

/** The pill's entrance timing, hoisted so the intro gate below and the
 *  motion.nav transition can never drift apart. */
const PILL_INTRO_DELAY = 1.2;
const PILL_INTRO_DURATION = 0.8;

/** The fullscreen menu renders these in sentence case, matching the reference.
 *  The pill nav keeps NAV_LINKS' caps, so the two are listed separately rather
 *  than derived — a `toLowerCase` dance would still get "Us" wrong. */
const MENU_LINKS = [
  { label: 'About Us', href: '#about-us' },
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
  { label: 'Contact Us', href: '#contact-us' },
];

/** The two-bar hamburger from the reference menu, built in CSS rather than an
 *  icon swap so it morphs into the X instead of cutting between two glyphs. */
function MenuToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <span className={`menu-toggle ${isOpen ? 'open' : 'closed'}`}>
      <span className="menu-toggle-icon block">
        <span className="menu-toggle-bar" data-position="top" />
        <span className="menu-toggle-bar" data-position="bottom" />
      </span>
    </span>
  );
}

function MagneticLink({ children, className, href, postNav }: { children: string | React.ReactNode; className?: string; href?: string, postNav?: () => void }) {
  const { isHovered, hoverProps } = useHoverState<HTMLAnchorElement>();

  /* Mirrored into a ref for the same reason as in fullscreen-menu.tsx:
     useLenis() returns undefined on the first render and the instance on the
     second, and handleClick must read whatever is current at click time rather
     than closing over the undefined pass. */
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href || !href.startsWith('#')) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();

    /* `postNav` is passed ONLY by the fullscreen menu's links, so it doubles as
       "this click came from inside the open overlay" — and that distinction
       decides how we scroll.

       While the menu is open it holds Lenis stopped, which puts
       `overflow: hidden` on <html> (`.lenis.lenis-stopped` in globals.css).
       A native scrollIntoView cannot move a document whose root is
       overflow:hidden, so it silently does nothing. Lenis' own scrollTo can —
       but it early-returns while stopped unless `force: true` is passed.

       So: menu links scroll through Lenis with force, pill-nav links keep the
       plain native path, where Lenis is running and nothing is clipped. */
    if (!postNav) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    /* onComplete fires when the scroll has actually landed, which is exactly
       the cue the old IntersectionObserver was approximating — and it fires
       reliably for short sections and for #contact-us at the page bottom, both
       of which could never reach the observer's 0.9 threshold and would strand
       the menu open. The timeout is a backstop for the case where Lenis is
       somehow unavailable; `done` keeps postNav to a single call. */
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(fallback);
      postNav();
    };
    const fallback = setTimeout(finish, 1200);

    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(target as HTMLElement, { force: true, onComplete: finish });
    else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <a
      href={href || '#'}
      className={`nav-magnetic ${className || ''}`}
      onClick={handleClick}
      {...hoverProps}
    >
      {/* TextRoll stays MOUNTED and is driven by isHovered — it is deliberately
          not conditionally rendered and carries no remount key. Its coloured
          exit layer rests in the visible state, so unmounting it mid-roll strands
          letters showing red after the pointer has left; a fast swipe across the
          nav did exactly that. See the isHovered note in text-roll.tsx. */}
      {postNav ? (
        typeof children === 'string' ? <span>{children}</span> : children
      ) : typeof children === 'string' ? (
        <TextRoll isHovered={isHovered}>{children}</TextRoll>
      ) : (
        children
      )}
    </a>
  );
}

interface NavbarProps {
  loading: boolean;
}

export default function Navbar({ loading }: NavbarProps) {
  /** One menu for every viewport now — the old mobile accordion and desktop
   *  overlay were separate states. */
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPillVisible, setIsPillVisible] = useState(true);
  /** Gates the pill observer below. The pill enters from y:-100, i.e. fully
   *  above the viewport, so an observer attached on mount would immediately
   *  report it as offscreen and flash the floating toggle through the intro. */
  const [introDone, setIntroDone] = useState(false);
  const pillRef = useRef<HTMLElement>(null);
  /** Blocks a second toggle while the open/close timeline is mid-flight. A ref,
   *  not state: it must be readable synchronously inside the click handler and
   *  must not cause a render. */
  const isAnimating = useRef(false);

  const toggleMenu = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setIsMenuOpen((open) => !open);
    // Matches the longest branch of the menu timeline (1s open / 0.8s close).
    setTimeout(() => {
      isAnimating.current = false;
    }, 1000);
  };

  /* A timer rather than the nav's onAnimationComplete: `animate` collapses to
     `{}` while loading, and motion resolves an empty target instantly — the
     callback would fire during the loading screen, which is the case this gate
     exists to prevent. */
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(
      () => setIntroDone(true),
      (PILL_INTRO_DELAY + PILL_INTRO_DURATION) * 1000
    );
    return () => clearTimeout(timer);
  }, [loading]);

  /* Held off until the entrance lands: observing the pill mid-flight would
     report it offscreen and render the floating toggle for a state that isn't
     true yet. */
  useEffect(() => {
    if (!introDone) return;
    const pill = pillRef.current;
    if (!pill) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsPillVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(pill);
    return () => observer.disconnect();
  }, [introDone]);

  /* Scrolling back up to reveal the pill force-closes the menu — the desktop
     toggle unmounts with the pill, so leaving it open would strand the user. On
     mobile the pill toggle is always mounted, so this must not fire there. */
  useEffect(() => {
    if (!isPillVisible) return;
    if (window.matchMedia('(min-width: 768px)').matches) setIsMenuOpen(false);
  }, [isPillVisible]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      <motion.nav
        ref={pillRef}
        className="fixed md:absolute z-[100] flex flex-col top-[30px] md:top-[50px] left-1/2 -translate-x-1/2 w-[calc(100%-40px)] md:w-[calc(100%-122px)] max-w-[1318px]
          bg-off-white/70 backdrop-blur-md px-6 py-4 rounded-[24px] shadow-[0_8px_32px_rgba(26,26,26,0.1)] border border-off-black/5 md:bg-transparent md:px-0 md:py-0 md:rounded-none md:shadow-none md:border-transparent md:backdrop-blur-none"
        initial={{ y: -100, opacity: 0 }}
        animate={!loading ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: PILL_INTRO_DURATION, delay: PILL_INTRO_DELAY, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center w-full justify-between transition-all duration-500">
          <MagneticLink href="#hero">
          <Image
            src="/images/a2-logo.png"
            alt="ATWO Studios Logo"
            width={48}
            height={32}
            className="w-auto h-[32px] object-contain shrink-0"
            referrerPolicy="no-referrer"
            />
          </MagneticLink>

          <div className="hidden md:flex flex-grow items-center justify-start">
            <div className="hidden md:block text-off-black text-[24px] tracking-wide ml-6 md:ml-12">
              <MagneticLink href="#about-us">ABOUT US</MagneticLink>
            </div>
            <div className="hidden md:block text-off-black text-[24px] tracking-wide ml-8">
              <MagneticLink href="#work">WORK</MagneticLink>
            </div>
            <div className="flex-grow" />
            <div className="hidden md:block text-off-black text-[24px] tracking-wide">
              <MagneticLink href="#services">SERVICES</MagneticLink>
            </div>
          </div>

          <div className="hidden md:flex items-center shrink-0 text-off-black text-[24px] tracking-wide ml-8">
            <MagneticLink href="#contact-us">CONTACT US</MagneticLink>
          </div>

          <div className="md:hidden flex items-center shrink-0">
            <button
              onClick={toggleMenu}
              /* Sits above the overlay so it can close it again. */
              className={`relative z-[110] p-1 focus:outline-none transition-colors ${isMenuOpen ? 'text-off-white' : 'text-off-black'}`}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <MenuToggleIcon isOpen={isMenuOpen} />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {!isPillVisible && (
          <motion.div
            key="desktop-menu-toggle"
            /* Mirrors the fullscreen menu's logo: same top/right gutter token
               the logo uses for its top/left inset (see fullscreen-menu.tsx),
               instead of this row's own hardcoded top-[50px]/122px pill width. */
            className="hidden md:block fixed top-menu-gutter right-menu-gutter z-[110] pointer-events-none"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              onClick={toggleMenu}
              className={`pointer-events-auto flex items-center justify-center w-[48px] h-[48px] rounded-full border shadow-[0_8px_32px_rgba(26,26,26,0.1)] focus:outline-none transition-colors duration-300 ${
                isMenuOpen
                  ? 'bg-off-white border-off-black/10 text-off-black'
                  : 'bg-off-black border-off-white/10 text-off-white'
              }`}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <MenuToggleIcon isOpen={isMenuOpen} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <FullscreenMenu isOpen={isMenuOpen}>
        {MENU_LINKS.map(({ label, href }) => (
          /* overflow-hidden turns the link's y-translate into a mask reveal
             rather than a slide across the background. */
          <div key={href} className="overflow-hidden">
            {/* Hidden state is seeded by gsap.set() in fullscreen-menu.tsx, not
                by Tailwind — see the comment there. */}
            <div className="menu-reveal transition-colors hover:text-accent-red">
              <MagneticLink href={href} postNav={() => setIsMenuOpen(false)}>
                {label}
              </MagneticLink>
            </div>
          </div>
        ))}
      </FullscreenMenu>
    </>
  );
}
