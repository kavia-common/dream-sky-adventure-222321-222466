import { useEffect, useRef } from 'react';

/**
 * PUBLIC_INTERFACE
 * useGameLoop runs requestAnimationFrame and calls update(deltaMs) and onSecondTick(1) every ~1000ms.
 * Respects prefers-reduced-motion by lowering FPS to ~30.
 */
export default function useGameLoop(running, update, onSecondTick, logger) {
  const rafRef = useRef(0);
  const lastRef = useRef(performance.now());
  const secondAccRef = useRef(0);
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frameInterval = reduceMotion ? 1000 / 30 : 1000 / 60;

  useEffect(() => {
    if (!running) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastRef.current = performance.now();
    secondAccRef.current = 0;

    const loop = (t) => {
      const dt = t - lastRef.current;
      if (dt >= frameInterval) {
        lastRef.current = t;
        secondAccRef.current += dt;
        try {
          update(dt);
        } catch (e) {
          logger?.error?.('Update loop error', e);
        }
        if (secondAccRef.current >= 1000) {
          // may fire slightly late; pass normalized 1 second
          onSecondTick?.(1);
          secondAccRef.current = secondAccRef.current % 1000;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, frameInterval]);
}
