"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

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

  // Animate only when the hero is actually being looked at.
  const active = inView && !loading;

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

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden pointer-events-none z-[5]">
      {particles.map((p) => (
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
