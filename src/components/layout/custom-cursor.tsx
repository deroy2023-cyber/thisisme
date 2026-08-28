"use client";

import { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

export default function CustomCursor() {
  const [hasFinePointer, setHasFinePointer] = useState(false);

  // Position lives in motion values, not React state. Previously this called
  // setState on every mousemove — at pointer rate that floods the scheduler
  // and was a primary cause of the page hanging.
  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);
  const opacity = useMotionValue(0);
  const scale = useMotionValue(1);

  const x = useSpring(rawX, { damping: 28, stiffness: 520, mass: 0.4 });
  const y = useSpring(rawY, { damping: 28, stiffness: 520, mass: 0.4 });

  useEffect(() => {
    const pointerQuery = window.matchMedia('(pointer: fine)');
    const updatePointer = () => setHasFinePointer(pointerQuery.matches);
    updatePointer();
    pointerQuery.addEventListener('change', updatePointer);
    return () => pointerQuery.removeEventListener('change', updatePointer);
  }, []);

  useEffect(() => {
    // No listeners at all on touch devices.
    if (!hasFinePointer) return;

    let frame = 0;
    let cx = 0;
    let cy = 0;

    const flush = () => {
      frame = 0;
      rawX.set(cx - 16);
      rawY.set(cy - 16);
      opacity.set(1);
    };

    const handleMouseMove = (e: MouseEvent) => {
      cx = e.clientX;
      cy = e.clientY;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const handleMouseDown = () => scale.set(0.7);
    const handleMouseUp = () => scale.set(1);
    const handleMouseLeave = () => opacity.set(0);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [hasFinePointer, rawX, rawY, opacity, scale]);

  if (!hasFinePointer) return null;

  return (
    <motion.div
      className='pointer-events-none fixed left-0 top-0 z-[9999] h-8 w-8 rounded-full bg-white mix-blend-difference'
      style={{ x, y, opacity, scale }}
    />
  );
}
