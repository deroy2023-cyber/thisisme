"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import BookCallModal from "@/src/components/ui/BookCallModal";

// Same declaration the section headings use (about, portfolio, services,
// why-choose-us, section-header). Manrope (800), self-hosted via
// next/font/google in layout.tsx — replaces the old "Coolvetica Regular"
// stack, which resolved via local() against a font with no webfont license
// and rendered differently per visitor (see the note in globals.css).
const REGULAR = 'var(--font-manrope), "Manrope", sans-serif';

// Tracking for every Manrope run on the page EXCEPT the wordmark. Manrope 800
// is a geometric UI sans and sets looser than the display face it replaced, so
// the type is pulled in slightly. In em, so it is identical at every viewport.
// The wordmark is deliberately excluded -- see the 32cqw note further down.
const TRACK = "-0.02em";

// Same reveal the hero headline uses (hero.tsx:134-147) so the two ends of the
// page read as one gesture — identical stagger, duration and ease.
const WORDMARK = "ATWO";
const LETTER_STAGGER = 0.04;
const EASE = [0.22, 1, 0.36, 1] as const;

/* Kerning compensation — MEASURED, not a design tweak, and not a value to
   round off or delete.

   Kerning is a property of adjacent glyphs inside a single text run. Splitting
   the wordmark into one inline-block per letter leaves the browser no pairs to
   kern, so the font's built-in pair kerns are silently dropped and the
   wordmark renders wider than the static text node did, which can push the A
   and the O past the red block's edges to be clipped by its overflow-hidden.

   These are the font's own pair values, read off a 1000px probe span in the
   browser (width("AT") - width("A") - width("T"), etc.), and re-applied as a
   margin between the masks. em, so they track the cqw-based font size. Indexed
   by the letter the gap FOLLOWS; the last letter has no trailing gap.

   MEASURED FOR MANROPE (800) 2026-08-29, replacing prior values after the
   font was switched sitewide (see the note in globals.css):

       width("ATWO") as one run   2.9600em
       width("A")+..+width("O")   3.0400em
       total kerning              -0.0800em
       per pair   AT -0.060   TW  0.000   WO -0.020

   If the font stack ever changes again, these MUST be re-measured — values
   from one face have repeatedly been mistakenly carried into another and
   produced an overlapping wordmark; do not carry old numbers across a font
   change. */
const KERN_EM = [-0.06, 0, -0.02, 0];

/* The stack the wordmark is drawn in, and the width its "ATWO" occupies per em
   when the intended face is the one drawing it.

   The gate below is a WIDTH PROBE, not a document.fonts lookup: Manrope is
   self-hosted by Next (next/font/google in layout.tsx) so document.fonts
   normally reports it correctly, but document.fonts.check() still returns
   true for a fallback face — verified, it also returned true for
   check('1em "NoSuchFaceXYZ"') — so it cannot distinguish "loaded" from
   "substituted". Measuring the rendered width is indifferent to WHICH
   mechanism supplied the face; it asks the only question that matters, which
   is whether the glyphs now on screen are the ones KERN_EM was measured
   against. */
const KERN_STACK = 'var(--font-manrope), "Manrope", sans-serif';
const KERN_WORD_EM = 2.96;
const KERN_TOLERANCE = 0.02; // ±2%, comfortably inside the gap to any fallback

export default function Footer() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  /* KERN_EM encodes one specific face's pair kerns, so it may only be applied
     while that face is the one actually drawing the wordmark. A fallback (or
     the condensed face, which this site also serves) has different glyph widths
     but would still receive the same em-relative pull-back, tightening the word
     into itself. Zero kerning on an unrecognised face is slightly loose, which
     is a much better failure than letters colliding. */
  const [kernReady, setKernReady] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    let cancelled = false;

    // Render "ATWO" off-screen in the wordmark's own stack and compare its
    // width per em against the measured target.
    const probe = () => {
      const s = document.createElement("span");
      s.textContent = WORDMARK;
      s.style.cssText =
        "position:absolute;visibility:hidden;white-space:pre;" +
        `font-size:1000px;line-height:0.8;font-family:${KERN_STACK}`;
      document.body.appendChild(s);
      const em = s.getBoundingClientRect().width / 1000;
      s.remove();
      return Math.abs(em - KERN_WORD_EM) / KERN_WORD_EM <= KERN_TOLERANCE;
    };

    const settle = () => {
      if (!cancelled && probe()) setKernReady(true);
    };

    settle();
    // Re-check once webfonts settle, for the cold-load case where the probe
    // above ran against a fallback. document.fonts may be absent (jsdom, older
    // Safari); the un-kerned wordmark is the correct behaviour there.
    if (document.fonts?.ready) {
      document.fonts.ready.then(settle).catch(() => {
        /* stay un-kerned rather than mis-kerned */
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  /* The wordmark's trigger is a sentinel near the BOTTOM of the drawer spacer,
     not the <h2> itself. At md+ the footer is sticky-pinned, so it is already
     inside the viewport while <main> (opaque, z-20) still covers it — a plain
     whileInView on the heading fires there and the whole reveal plays out of
     sight, finishing before the first letter is ever uncovered. By the time the
     sentinel crosses in, main has slid far enough up to expose the red block. */
  const revealRef = useRef<HTMLDivElement>(null);
  const revealed = useInView(revealRef, { once: true });

  return (
    <>
      {/* Drawer spacer — two things make the reveal work, and it needs both.

          Travel: a sticky element only holds while there is slack in its
          containing block (spacer height minus footer height), so 200vh around
          a 100vh footer buys a full viewport of pinning. Same 200vh/100vh ratio
          as the video-stack pin.

          Overlap: the negative margin is what actually produces the reveal.
          Without it this spacer is an ordinary sibling that begins where <main>
          ends, and siblings in normal flow never overlap — the footer would
          scroll fully into view before the pin engaged, leaving a viewport of
          dead scroll behind it. Pulling it up 100vh parks it underneath main's
          last screen, so main (opaque, z-20) covers it and then slides up to
          uncover it. Same idiom as why-choose-us.tsx:203. The margin also
          cancels the extra 100vh, so the page is no longer than before.

          Below md the drawer is off entirely: 100dvh shifts as iOS Safari's URL
          bar collapses, which would resize the pin mid-scroll and change the
          travel the effect depends on. h-auto there sizes the footer to its
          content rather than stranding the wordmark in 100vh of dead space. */}
      <div className="relative z-10 md:h-[200dvh] md:-mt-[100dvh]">
        {/* Anchor target, parked at the spacer's bottom rather than on the
            <footer> itself. navbar.tsx resolves #contact-us through
            getBoundingClientRect, and a pinned sticky element reports its
            on-screen position, not its layout position — anchoring the footer
            would compute a moving target mid-reveal. Anchoring the spacer's top
            instead would land the user where the reveal starts, with the footer
            still fully hidden behind <main>. The bottom edge resolves past the
            document's maximum scroll, so the browser clamps to the page end:
            the footer fully uncovered, which is what CONTACT US promises. */}
        <div id="contact-us" aria-hidden className="absolute bottom-0 left-0 h-px w-full" />
        {/* Reveal trigger for the wordmark — see the note in the component body.
            Parked 40vh above the spacer's bottom so it crosses into view once
            <main> has uncovered the red block, rather than while the pinned
            footer is still hidden behind it. */}
        <div ref={revealRef} aria-hidden className="absolute bottom-[40dvh] left-0 h-px w-full" />
        <footer className="relative md:sticky md:top-0 w-full h-auto md:h-dvh flex flex-col justify-between bg-white overflow-hidden">
          <div>
            {/* CTA Section */}
            <div className="px-5 md:px-10 lg:px-[138px] pt-16 lg:pt-20">
              <motion.p
                className="text-[clamp(16px,1.8vw,22px)] text-primary-red max-w-[300px]"
                style={{
                  fontFamily: REGULAR,
                  lineHeight: "normal",
                  letterSpacing: TRACK,
                }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                YOU SCROLLED THIS FAR FOR A REASON — LET&apos;S TALK.
              </motion.p>
            </div>

            {/* Links row */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 items-center px-5 md:px-10 lg:px-34.5 mt-16 lg:mt-20"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <button
                className="text-[clamp(14px,3.6vw,22px)] text-primary-red hover:opacity-70 transition-opacity whitespace-nowrap text-center md:text-left"
                style={{ fontFamily: REGULAR, letterSpacing: TRACK }}
                data-hover
                onClick={() => setIsBookingOpen(true)}
              >
                BOOK A CALL
              </button>
              <a
                href="mailto:contact@atwostudios.com"
                className="text-[clamp(14px,3.6vw,22px)] text-primary-red underline hover:opacity-70 transition-opacity md:text-left"
                style={{ fontFamily: REGULAR, letterSpacing: TRACK }}
                data-hover
              >
                contact@atwostudios.com
              </a>
              <a
                href="https://www.linkedin.com/company/atwo-studios/"
                target="_blank" rel="noopener noreferrer"
                className="text-[clamp(14px,3.6vw,22px)] text-primary-red hover:opacity-70 transition-opacity text-center"
                style={{ fontFamily: REGULAR, letterSpacing: TRACK }}
                data-hover
              >
                LINKEDIN
              </a>
              <a
                href="https://www.instagram.com/atwo.io?igsh=dWh6Z3I2am10b3U0&utm_source=qr"
                target="_blank" rel="noopener noreferrer"
                className="text-[clamp(14px,3.6vw,22px)] text-primary-red hover:opacity-70 transition-opacity text-center md:text-right"
                style={{ fontFamily: REGULAR, letterSpacing: TRACK }}
                data-hover
              >
                INSTAGRAM
              </a>
            </motion.div>
          </div>

          {/* Giant branding text.

              @container + a cqw font-size, NOT vw: the block is inset by
              mx-5 / md:mx-10 / lg:mx-[138px], so its width is the viewport
              MINUS up to 276px. A vw-based size ignores that inset and the word
              overflowed its own block between roughly 1024px and 1600px — at
              1024px a 34vw wordmark is 866px wide inside a 748px block, and the
              A and O were clipped by the overflow-hidden here. Sizing off the
              container makes the gutters self-cancelling at every width.

              The SIZE, though, is a property of the FACE and does not follow
              from the container. 32cqw is derived from KERN_WORD_EM (2.96em for
              Manrope 800): 2.96 x 32 = 94.7% of the block kerned, and 3.04 x 32
              = 97.3% un-kerned, so the word fits either side of the kern probe
              resolving. If the font stack changes this MUST be re-derived
              alongside KERN_EM — a face with different glyph widths will
              overflow or under-fill at this value. The previous font switch
              re-measured KERN_EM but carried the size across unchanged at
              Coolvetica's 38cqw (calibrated against ITS 2.487em), which put
              Manrope at 112.5% of the block and clipped the A and the O. */}
          <div className="@container relative flex-1 flex items-center justify-center overflow-hidden bg-accent-red mx-5 md:mx-10 lg:mx-[138px]">
            {/* .letter-mask / .letter-inner are the hero's own primitives
                (globals.css:145-155). They hard-code line-height 0.85, which the
                spans would apply to themselves and override the h2's leading —
                so lineHeight is restated inline to keep the wordmark exactly the
                size and position it was before. */}
            <h2
              className="text-[32cqw] leading-[0.8] tracking-normal text-off-white whitespace-nowrap select-none"
              style={{
                fontFamily: REGULAR,
              }}
            >
              {WORDMARK.split("").map((letter, i) => (
                <span
                  key={i}
                  className="letter-mask"
                  style={{
                    lineHeight: 0.8,
                    marginRight: kernReady ? `${KERN_EM[i]}em` : 0,
                  }}
                >
                  <motion.span
                    className="letter-inner"
                    style={{ lineHeight: 0.8 }}
                    initial={{ y: "120%", rotate: 8, opacity: 0 }}
                    animate={revealed ? { y: "0%", rotate: 0, opacity: 1 } : {}}
                    transition={{
                      duration: 0.7,
                      delay: i * LETTER_STAGGER,
                      ease: EASE,
                    }}
                  >
                    {letter}
                  </motion.span>
                </span>
              ))}
            </h2>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 md:px-10 lg:px-[138px] py-8 lg:py-10">
            <span
              className="text-[clamp(14px,3.6vw,22px)] text-primary-red"
              style={{ fontFamily: REGULAR, letterSpacing: TRACK }}
            >
              TERMS & CONDITIONS
            </span>
            <span
              className="text-[clamp(14px,3.6vw,22px)] text-primary-red"
              style={{ fontFamily: REGULAR, letterSpacing: TRACK }}
            >
              ©2026 ATWO
            </span>
            <span
              className="text-[clamp(14px,3.6vw,22px)] text-primary-red"
              style={{ fontFamily: REGULAR, letterSpacing: TRACK }}
            >
              PRIVACY
            </span>
          </div>
        </footer>
      </div>

      {/* Booking Modal */}
      <BookCallModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
      />
    </>
  );
}
