"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import FullscreenMenu from '@/src/components/layout/fullscreen-menu';
import {
  MagneticLink,
  PILL_INTRO_DELAY,
  PILL_INTRO_DURATION,
} from '@/src/components/layout/nav-links';

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
        /* While the menu is open the mobile pill drops its chrome so the top bar
           reads as the reference's bare logo + close button against the dark
           overlay. Desktop is untouched — every md: variant below already
           removes the same chrome unconditionally.

           The z-index must ALSO lift to 110 while open. This nav establishes a
           stacking context at z-100, and a child cannot escape its parent's
           stacking context — so the toggle's own z-[110] is resolved *within*
           this nav and still lands under the menu overlay's z-[105]. That went
           unnoticed while the pill had an opaque background painting over the
           overlay; once the chrome above is removed, the overlay covers the
           close button entirely. */
        /* md:pointer-events-none — see the note on the row below. It must sit on
           the <nav> itself, not only on that row: this element is the one that
           actually overlaps the hero's blended labels, and with `auto` here it
           swallowed their clicks and their hover before the row was ever
           consulted. Children re-enable it individually. */
        className={`fixed md:absolute md:pointer-events-none ${isMenuOpen ? 'z-[110]' : 'z-[100]'} flex flex-col top-[30px] md:top-[50px] 2xl:top-[clamp(50px,3.255vw,83px)] left-1/2 -translate-x-1/2 w-[calc(100%-40px)] md:w-[calc(100%-122px)] max-w-page-max
          bg-off-white/70 backdrop-blur-md px-6 py-4 rounded-[24px] shadow-[0_8px_32px_rgba(26,26,26,0.1)] border border-off-black/5 md:bg-transparent md:px-0 md:py-0 md:rounded-none md:shadow-none md:border-transparent md:backdrop-blur-none ${
          isMenuOpen
            ? 'max-md:bg-transparent max-md:backdrop-blur-none max-md:border-transparent max-md:shadow-none'
            : ''
        }`}
        initial={{ y: -100, opacity: 0 }}
        animate={!loading ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: PILL_INTRO_DURATION, delay: PILL_INTRO_DELAY, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* md:pointer-events-none is load-bearing, not tidying. This nav is
            z-[100] and spans the full content width, so on desktop it lies
            directly over the blended labels that hero.tsx renders underneath at
            z-auto — and it was swallowing every click on them: the links looked
            right and did nothing. On desktop this row holds only the logo, so it
            lets pointers through and the logo takes them back below. Mobile keeps
            its normal hit area, where the row owns the pill and its toggle. */}
        <div className="flex items-center w-full justify-between transition-all duration-500 md:pointer-events-none">
          {/* md:hidden — the DESKTOP logo now renders from NavLinks (nav-links.tsx)
              as index 0 of the label row, so that it enters with the labels
              instead of dropping in on this nav's rigid y:-100 tween. Left
              mounted here it would simply draw twice on desktop.

              It cannot be deleted outright: below md, NavLinks is `hidden` and
              this pill is the only top bar, so this is still the only logo a
              phone ever sees.

              Hidden below md while the menu is open, as before: this mark is dark
              and would disappear against the overlay. The menu renders its own
              light mark at the same size and gutter, so the slot stays filled.

              The `md:hidden` sits on this WRAPPER, not on the MagneticLink. On
              the link it silently loses: MagneticLink always applies the
              `.nav-magnetic` class, whose `display: inline-block` in globals.css
              has the same specificity as Tailwind's `md:hidden` and is not in a
              layer that yields to it — so the logo kept painting on desktop and
              drew twice. Verified: two visible marks at x=61 and x=62. */}
          <div className={`md:hidden ${isMenuOpen ? 'max-md:opacity-0 max-md:pointer-events-none' : ''}`}>
            <MagneticLink href="#hero">
              <Image
                src="/images/a2-logo.png"
                alt="ATWO Studios Logo"
                width={48}
                height={32}
                className="w-auto h-[32px] 2xl:h-[clamp(32px,2.083vw,53px)] object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
            </MagneticLink>
          </div>

          {/* The four desktop labels are NOT here — they render from hero.tsx via
              NavLinks, as a sibling of the hero photograph. That is what lets
              their mix-blend-difference see the photo: this nav is `z-[100]`, an
              isolated group with a transparent desktop background, so a blend
              placed inside it composites against nothing and comes out flat
              white. See the long note in nav-links.tsx before moving them back.

              This spacer keeps the row's flex geometry, so the logo and the
              mobile toggle sit exactly where they always did. */}
          <div className="hidden md:flex flex-grow items-center justify-start">
            <div className="flex-grow" />
          </div>

          <div className="md:hidden flex items-center shrink-0">
            <button
              onClick={toggleMenu}
              /* Sits above the overlay so it can close it again. Closed, it is a
                 bare dark glyph in the light pill; open, it becomes the
                 reference's filled circular close button — the pill's chrome is
                 transparent by then, so the circle carries its own background.
                 Mirrors the desktop floating toggle's conditional treatment
                 below, using the existing accent-red token. */
              className={`relative z-[110] focus:outline-none transition-colors ${
                isMenuOpen
                  ? 'flex h-[48px] w-[48px] items-center justify-center rounded-full bg-accent-red text-off-white'
                  : 'p-1 text-off-black'
              }`}
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
