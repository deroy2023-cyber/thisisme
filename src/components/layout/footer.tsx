"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import BookCallModal from "@/src/components/ui/BookCallModal";

// Same declaration the section headings use (about, portfolio, services,
// why-choose-us, section-header) so the footer sits in the regular face
// rather than the condensed one.
const REGULAR = '"Coolvetica Regular", Coolvetica, sans-serif';

// Same reveal the hero headline uses (hero.tsx:134-147) so the two ends of the
// page read as one gesture — identical stagger, duration and ease.
const WORDMARK = "ATWO";
const LETTER_STAGGER = 0.04;
const EASE = [0.22, 1, 0.36, 1] as const;

/* Kerning compensation — MEASURED, not a design tweak, and not a value to
   round off or delete.

   Kerning is a property of adjacent glyphs inside a single text run. Splitting
   the wordmark into one inline-block per letter leaves the browser no pairs to
   kern, so Coolvetica's built-in pair kerns are silently dropped and the
   wordmark renders 0.236em wider than the static text node did — at 34vw that
   is ~154px, which pushed the A and the O past the red block's edges and got
   them clipped by its overflow-hidden.

   These are that font's own pair values, read off a 1000px probe span in the
   browser (width("AT") - width("A") - width("T"), etc.), and re-applied as a
   margin between the masks. em, so they track the vw-based font size. Indexed
   by the letter the gap FOLLOWS; the last letter has no trailing gap.

   A margin and NOT letter-spacing: letter-spacing adds its value after every
   atomic inline including the final one, leaving a trailing gap that throws the
   flex centering off by half a step. And NOT a transform — motion owns the
   transform on the inner span. */
const KERN_EM = [-0.169, 0, -0.067, 0];

export default function Footer() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

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
      <div className="relative z-10 md:h-[200vh] md:-mt-[100vh]">
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
        <div ref={revealRef} aria-hidden className="absolute bottom-[40vh] left-0 h-px w-full" />
        <footer className="relative md:sticky md:top-0 w-full h-auto md:h-screen flex flex-col justify-between bg-white overflow-hidden">
          <div>
            {/* CTA Section */}
            <div className="px-5 md:px-10 lg:px-[138px] pt-16 lg:pt-20">
              <motion.p
                className="text-[clamp(16px,1.8vw,22px)] text-primary-red max-w-[300px]"
                style={{
                  fontFamily: REGULAR,
                  lineHeight: "normal",
                  letterSpacing: "0",
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
              className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 items-center pr-10 md:px-10 lg:px-34.5 mt-16 lg:mt-20"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <button
                className="text-[22px] text-primary-red hover:opacity-70 transition-opacity whitespace-nowrap text-center md:text-left"
                style={{ fontFamily: REGULAR }}
                data-hover
                onClick={() => setIsBookingOpen(true)}
              >
                BOOK A CALL
              </button>
              <a
                href="mailto:contact@atwostudios.com"
                className="text-[22px] text-primary-red underline hover:opacity-70 transition-opacity md:text-left"
                style={{ fontFamily: REGULAR }}
                data-hover
              >
                contact@atwostudios.com
              </a>
              <a
                href="https://www.linkedin.com/company/atwo-studios/"
                target="blank"
                className="text-[22px] text-primary-red hover:opacity-70 transition-opacity text-center"
                style={{ fontFamily: REGULAR }}
                data-hover
              >
                LINKEDIN
              </a>
              <a
                href="https://www.instagram.com/atwo.io?igsh=dWh6Z3I2am10b3U0&utm_source=qr"
                target="blank"
                className="text-[22px] text-primary-red hover:opacity-70 transition-opacity text-center md:text-right"
                style={{ fontFamily: REGULAR }}
                data-hover
              >
                INSTAGRAM
              </a>
            </motion.div>
          </div>

          {/* Giant branding text */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-accent-red mx-5 md:mx-10 lg:mx-[138px]">
            {/* .letter-mask / .letter-inner are the hero's own primitives
                (globals.css:145-155). They hard-code line-height 0.85, which the
                spans would apply to themselves and override the h2's leading —
                so lineHeight is restated inline to keep the wordmark exactly the
                size and position it was before. */}
            <h2
              className="text-[34vw] leading-[0.8] tracking-normal text-off-white whitespace-nowrap select-none"
              style={{
                fontFamily: REGULAR,
              }}
            >
              {WORDMARK.split("").map((letter, i) => (
                <span
                  key={i}
                  className="letter-mask"
                  style={{ lineHeight: 0.8, marginRight: `${KERN_EM[i]}em` }}
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
              className="text-[22px] text-primary-red"
              style={{ fontFamily: REGULAR }}
            >
              TERMS & CONDITIONS
            </span>
            <span
              className="text-[22px] text-primary-red"
              style={{ fontFamily: REGULAR }}
            >
              ©2026 ATWO
            </span>
            <span
              className="text-[22px] text-primary-red"
              style={{ fontFamily: REGULAR }}
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
