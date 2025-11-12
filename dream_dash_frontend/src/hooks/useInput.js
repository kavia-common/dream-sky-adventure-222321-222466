import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * useInput captures keyboard and touch interactions.
 * - Keyboard: ArrowLeft/ArrowRight for movement, Space for jump
 * - Touch: Left/right half for movement, bottom band for jump
 * Debounces jump to avoid continuous repeats.
 */
export default function useInput({ jumpCooldownMs = 220 } = {}) {
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [jumpRequested, setJumpRequested] = useState(false);
  const jumpReadyRef = useRef(true);
  const touchStateRef = useRef({ left: false, right: false });

  // Keyboard
  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft') setLeft(true);
      if (e.key === 'ArrowRight') setRight(true);
      if (e.code === 'Space') {
        if (jumpReadyRef.current) {
          setJumpRequested(true);
          jumpReadyRef.current = false;
          setTimeout(() => (jumpReadyRef.current = true), jumpCooldownMs);
        }
        e.preventDefault();
      }
    };
    const up = (e) => {
      if (e.key === 'ArrowLeft') setLeft(false);
      if (e.key === 'ArrowRight') setRight(false);
    };
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [jumpCooldownMs]);

  // Touch handlers (imperative API to attach to zones)
  const attachTouchZones = useCallback((rootEl) => {
    if (!rootEl) return () => {};
    const leftEl = rootEl.querySelector('.touch-left');
    const rightEl = rootEl.querySelector('.touch-right');
    const jumpEl = rootEl.querySelector('.touch-jump');

    const onLeftStart = (e) => { touchStateRef.current.left = true; setLeft(true); e.preventDefault(); };
    const onLeftEnd = () => { touchStateRef.current.left = false; setLeft(false); };
    const onRightStart = (e) => { touchStateRef.current.right = true; setRight(true); e.preventDefault(); };
    const onRightEnd = () => { touchStateRef.current.right = false; setRight(false); };
    const onJump = (e) => {
      if (jumpReadyRef.current) {
        setJumpRequested(true);
        jumpReadyRef.current = false;
        setTimeout(() => (jumpReadyRef.current = true), jumpCooldownMs);
      }
      e.preventDefault();
    };

    const opts = { passive: false };
    leftEl?.addEventListener('touchstart', onLeftStart, opts);
    leftEl?.addEventListener('touchend', onLeftEnd);
    leftEl?.addEventListener('touchcancel', onLeftEnd);

    rightEl?.addEventListener('touchstart', onRightStart, opts);
    rightEl?.addEventListener('touchend', onRightEnd);
    rightEl?.addEventListener('touchcancel', onRightEnd);

    jumpEl?.addEventListener('touchstart', onJump, opts);

    return () => {
      leftEl?.removeEventListener('touchstart', onLeftStart);
      leftEl?.removeEventListener('touchend', onLeftEnd);
      leftEl?.removeEventListener('touchcancel', onLeftEnd);

      rightEl?.removeEventListener('touchstart', onRightStart);
      rightEl?.removeEventListener('touchend', onRightEnd);
      rightEl?.removeEventListener('touchcancel', onRightEnd);

      jumpEl?.removeEventListener('touchstart', onJump);
    };
  }, [jumpCooldownMs]);

  // PUBLIC_INTERFACE
  const consumeJump = useCallback(() => {
    if (jumpRequested) {
      setJumpRequested(false);
      return true;
    }
    return false;
  }, [jumpRequested]);

  return { left, right, consumeJump, attachTouchZones };
}
