"use client";

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useMediaQuery } from '@/src/hooks/use-media-query';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

// Each particle is a separate `mix-blend-mode: difference` layer that the
// compositor re-blends against the hero background every frame, so the count
// is a direct multiplier on per-frame cost.
const PARTICLE_COUNT = 12;

interface FloatingParticlesProps {
  /** True while the preloader is still on screen. The hero counts as in view
   *  for the whole intro -- it is merely covered by an opaque overlay -- so
   *  without this every particle keeps animating, and each one is a separate
   *  mix-blend-mode layer the compositor re-blends every frame. That is ~8
   *  seconds of full-rate blend work behind a screen nobody can see through. */
  loading?: boolean;
}

export default function FloatingParticles({ loading = false }: FloatingParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [inView, setInView] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Two gates that were missing entirely. Each particle is its own
     mix-blend-mode: difference layer, and twelve of them animated infinitely on
     every phone that loaded the page -- the loading and in-view gates below
     covered when they run, but never whether they should run at all.

     Touch: a coarse pointer means a phone or tablet, where twelve blend layers
     are the most expensive thing on the hero and the effect is close to
     invisible at that size.

     Reduced motion: a user asking for less movement should not get twelve
     objects drifting continuously. work-card.tsx already honours this. */
  const reduced = useReducedMotion();
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  const suppressed = reduced || coarsePointer;

  // Animate only when the hero is actually being looked at.
  const active = inView && !loading && !suppressed;

  useEffect(() => {
    setParticles(Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.15 + 0.05,
    })));
  }, []);

  // These animations used to run for the entire page scroll (~1000vh) even
  // though the particles only exist inside the hero. Stop them once the hero
  // leaves the viewport.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* Deliberately NOT `if (suppressed) return null`. suppressed derives from
     matchMedia, which is false on the server and for the first client render,
     so returning null on the second render removes a node React expected to
     find and throws a hydration mismatch (React #418 -- confirmed against a
     pre-change baseline, this component rendered clean before).

     The particles array is empty until its own post-mount effect fills it, so
     the wrapper renders with zero children on the server either way. Leaving
     the wrapper mounted and gating only the CHILDREN keeps the server and
     client trees identical, and an empty wrapper is one inert absolutely
     positioned div -- none of the blend layers that made this worth gating. */
  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden pointer-events-none z-[5]">
      {(suppressed ? [] : particles).map((p) => (
        <motion.div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={
            active
              ? {
                  y: [0, -80, -160, -80, 0],
                  x: [0, 30, -20, 40, 0],
                  opacity: [p.opacity, p.opacity * 2, p.opacity, p.opacity * 1.5, p.opacity],
                }
              : undefined
          }
          transition={{
            duration: p.duration,
            delay: p.delay + 2.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}
