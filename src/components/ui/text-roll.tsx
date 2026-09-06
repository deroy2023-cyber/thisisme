import {
    motion,
    VariantLabels,
    Target,
    TargetAndTransition,
    Transition,
} from 'motion/react';

export type TextRollProps = {
    children: string;
    duration?: number;
    getEnterDelay?: (index: number) => number;
    getExitDelay?: (index: number) => number;
    className?: string;
    /** Classes for the RESTING layer (the one visible before hover). Exists so a
     *  consumer can hide one of the two layers: nav-links.tsx renders TextRoll
     *  twice per label — once blended for the resting text, once unblended for
     *  the red hover text — and each copy hides the layer it does not own. */
    enterClassName?: string;
    exitClassName?: string;
    /** Drives the roll. Both layers have a defined resting position in BOTH
     *  states, so this component stays mounted and animates in either direction
     *  rather than being conditionally rendered.
     *
     *  That is load-bearing, not stylistic. The exit layer rests at rotateX: 0 —
     *  fully face-on and visible — wearing `exitClassName`, which in the navbar
     *  is red. Unmounting mid-roll therefore strands letters showing red with no
     *  pointer on them, which is exactly what a fast swipe across the nav used
     *  to produce. Keeping the component mounted lets Motion interrupt from
     *  whatever value a letter had reached and animate it back. */
    isHovered?: boolean;
    transition?: Transition;
    variants?: {
        enter: {
            initial: Target | VariantLabels | boolean;
            animate: TargetAndTransition | VariantLabels;
        };
        exit: {
            initial: Target | VariantLabels | boolean;
            animate: TargetAndTransition | VariantLabels;
        };
    };
    onAnimationComplete?: () => void;
};

export function TextRoll({
    children,
    duration = 0.125,
    getEnterDelay = (i) => i * 0.025,
    getExitDelay = (i) => i * 0.025 + 0.05,
    className,
    enterClassName = '',
    exitClassName = 'text-[#D60000] mix-blend-color-burn',
    isHovered = false,
    transition = { ease: 'easeIn' },
    variants,
    onAnimationComplete,
}: TextRollProps) {
    /* Targets are derived from isHovered rather than being fixed, so each layer
       knows where to sit in both directions. Un-hovering rotates the coloured
       layer back to 90 (edge-on, invisible) instead of leaving it at rest in the
       visible state. */
    const defaultVariants = {
        enter: {
            initial: { rotateX: 0 },
            animate: { rotateX: isHovered ? 90 : 0 },
        },
        exit: {
            initial: { rotateX: 90 },
            animate: { rotateX: isHovered ? 0 : 90 },
        },
    } as const;

    const letters = children.split('');

    return (
        <span className={className}>
            {letters.map((letter, i) => (
                <span
                    key={i}
                    className='relative inline-block [perspective:10000px] [transform-style:preserve-3d] [width:auto]'
                    aria-hidden='true'
                >
                    {/* The two faces pivot on DIFFERENT lines on purpose — 50% 25%
                        on the plain face, 50% 100% on the coloured one. The
                        outgoing letter tips away around a line near its top while
                        the incoming one swings up from its baseline, and that
                        offset is the character of the effect.

                        Do not "correct" these to match. They look like a mistake
                        and are not: matching them to 50% 50% yields a flat
                        symmetric flip and the animation all but disappears.
                        (Tried, reverted.) The same goes for the very long
                        perspective above. */}
                    <motion.span
                        className={`absolute inline-block [backface-visibility:hidden] [transform-origin:50%_25%] ${enterClassName}`}
                        initial={variants?.enter?.initial ?? defaultVariants.enter.initial}
                        animate={variants?.enter?.animate ?? defaultVariants.enter.animate}
                        /* Stagger only on the way IN. The per-letter delay is
                           what makes the roll read as a wave, but on the way out
                           it is what leaves a tail of letters still rolling after
                           the pointer has gone — the last letter of a long label
                           starts ~250ms after the first. Un-hovering returns
                           every letter at once. */
                        transition={{ ...transition, duration, delay: isHovered ? getEnterDelay(i) : 0 }}
                    >
                        {letter === ' ' ? '\u00A0' : letter}
                    </motion.span>
                    <motion.span
                        className={`absolute inline-block [backface-visibility:hidden] [transform-origin:50%_100%] ${exitClassName}`}
                        initial={variants?.exit?.initial ?? defaultVariants.exit.initial}
                        animate={variants?.exit?.animate ?? defaultVariants.exit.animate}
                        transition={{ ...transition, duration, delay: isHovered ? getExitDelay(i) : 0 }}
                        onAnimationComplete={letters.length === i + 1 ? onAnimationComplete : undefined}
                    >
                        {letter === ' ' ? '\u00A0' : letter}
                    </motion.span>
                    <span className='invisible'>
                        {letter === ' ' ? '\u00A0' : letter}
                    </span>
                </span>
            ))}
            <span className='sr-only'>{children}</span>
        </span>
    );
}
