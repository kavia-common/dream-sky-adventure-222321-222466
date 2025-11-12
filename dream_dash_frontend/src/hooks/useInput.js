import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * useInput captures keyboard and touch interactions.
 * - Keyboard: ArrowLeft/ArrowRight/ArrowUp and WASD; Space or ArrowUp to jump
 * - Touch: Left/right half for movement, bottom band for jump
 * Debounces jump to avoid continuous repeats.
 */
export default function useInput({ jumpCooldownMs = 220 } = {}) {
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [up, setUp] = useState(false); // exposed if needed
  const [jumpRequested, setJumpRequested] = useState(false);
  const jumpReadyRef = useRef(true);
  const touchStateRef = useRef({ left: false, right: false });

  // Normalize key -> intent
  const isLeft = (e) => e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A';
  const isRight = (e) => e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D';
  const isUp = (e) => e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W';
  const isJumpKey = (e) => e.code === 'Space' || isUp(e);

  // Keyboard
  useEffect(() => {
    const down = (e) => {
      // prevent scrolling with arrow keys and space
      if (isLeft(e) || isRight(e) || isUp(e) || e.code === 'Space') {
        e.preventDefault();
      }
      if (e.repeat) {
        // Prevent auto-repeat for jump; movement can still repeat but state is boolean
        if (isJumpKey(e)) return;
      }

      if (isLeft(e)) setLeft(true);
      if (isRight(e)) setRight(true);
      if (isUp(e)) setUp(true);

      if (isJumpKey(e)) {
        if (jumpReadyRef.current) {
          setJumpRequested(true);
          jumpReadyRef.current = false;
          setTimeout(() => (jumpReadyRef.current = true), jumpCooldownMs);
        }
      }
    };

    const upHandler = (e) => {
      if (isLeft(e)) setLeft(false);
      if (isRight(e)) setRight(false);
      if (isUp(e)) setUp(false);
      // Do not need to handle Space on keyup for booleans; jump is edge-triggered
    };

    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', upHandler, { passive: true });

    // Also prevent the browser from scrolling the page with space/arrow keys when focused on body
    const preventScroll = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', preventScroll, { passive: false });

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', upHandler);
      window.removeEventListener('keydown', preventScroll);
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

  return { left, right, up, consumeJump, attachTouchZones };
}
