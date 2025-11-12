import React, { useCallback, useEffect, useRef } from 'react';
import useInput from '../hooks/useInput';
import useGameLoop from '../hooks/useGameLoop';
import { clamp, rand, dist } from '../utils/math';

const THEME = {
  primary: '#2563EB',
  secondary: '#F59E0B',
  text: '#111827',
  bgTop: 'rgba(191,219,254,0.65)',  // sky tint
  bgBottom: 'rgba(255,255,255,0.95)'
};

/**
 * PUBLIC_INTERFACE
 * GameCanvas renders multiple canvas layers for a simple playable loop.
 * Props:
 * - running: boolean to start/stop loop
 * - onScore: function(delta) to update score
 * - onTick: function(seconds) to notify every second
 * - logger: optional logger {info,debug,warn,error}
 */
export default function GameCanvas({ running, onScore, onTick, logger }) {
  const bgRef = useRef(null);
  const midRef = useRef(null);
  const plyRef = useRef(null);
  const uiRef = useRef(null);
  const rootRef = useRef(null);

  // Device pixel ratio is captured once; canvases are sized via resize()
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const targetAspect = 16 / 9;

  // Game world state (mutable refs)
  const worldRef = useRef({
    w: 160, h: 90, // logical world units matching 16:9
    player: { x: 80, y: 72, vx: 0, vy: 0, r: 3, onGround: false },
    clouds: [],
    stars: [],
    glowPing: 0, // ui effect counter
    groundY: 84,
    wind: 0.0
  });

  const input = useInput();

  // Setup and teardown resize/DPR canvas sizes
  const resize = useCallback(() => {
    const wrapper = rootRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    // maintain 16:9 inside wrapper
    let width = rect.width;
    let height = rect.height;
    const currentAspect = width / height;
    if (currentAspect > targetAspect) {
      width = height * targetAspect;
    } else {
      height = width / targetAspect;
    }

    [bgRef, midRef, plyRef, uiRef].forEach((r) => {
      const c = r.current;
      if (!c) return;
      // CSS pixel size
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;
      // Backing store size (DPR-aware)
      c.width = Math.floor(width * dpr);
      c.height = Math.floor(height * dpr);
      // Ensure crisp scaling
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset any previous transforms
      }
    });
  }, [dpr]);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);

    // Ensure the game area can receive keyboard focus and handle key events
    const root = rootRef.current;
    let detachTouches = null;

    if (root) {
      // Make it focusable if not already
      if (!root.hasAttribute('tabindex')) {
        root.setAttribute('tabindex', '0');
      }
      // Autofocus on mount so keys work immediately
      root.focus({ preventScroll: true });

      // Attach touch zones handlers to the focused root
      detachTouches = input.attachTouchZones(root);

      // Key handlers bound to the root so focus confines events to the game
      const preventScrollKeys = (e) => {
        // Prevent scrolling with arrows/space while the game is focused
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }
      };
      root.addEventListener('keydown', preventScrollKeys, { passive: false });

      // Cleanup
      return () => {
        window.removeEventListener('resize', resize);
        detachTouches?.();
        root.removeEventListener('keydown', preventScrollKeys);
      };
    }

    // Fallback cleanup if root is missing
    return () => {
      window.removeEventListener('resize', resize);
      detachTouches?.();
    };
  }, [resize, input]);

  // Initialize entities
  useEffect(() => {
    const w = worldRef.current;
    // clouds at different heights/speeds for parallax
    w.clouds = Array.from({ length: 6 }).map((_, i) => ({
      x: rand(0, w.w),
      y: rand(10, 55),
      r: rand(6, 14),
      speed: 0.05 + i * 0.02
    }));
    // spawn initial stars
    w.stars = Array.from({ length: 10 }).map(() => ({
      x: rand(10, w.w - 10),
      y: rand(20, 70),
      r: rand(1.2, 2.2),
      vx: rand(-0.03, 0.03),
      vy: rand(-0.02, 0.02),
      alive: true
    }));
  }, []);

  // Drawing helpers
  const getCtxs = () => ({
    bg: bgRef.current?.getContext('2d'),
    mid: midRef.current?.getContext('2d'),
    ply: plyRef.current?.getContext('2d'),
    ui: uiRef.current?.getContext('2d'),
  });

  const clear = (ctx) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  // PUBLIC_INTERFACE
  const toPx = useCallback(() => {
    /**
     * Convert logical world units (w,h) to canvas pixels based on the player canvas backing size.
     * Returns { sx, sy } scaling factors.
     */
    const w = worldRef.current;
    const cx = plyRef.current?.width || 0;
    const cy = plyRef.current?.height || 0;
    const sx = cx / w.w;
    const sy = cy / w.h;
    return { sx, sy };
  }, []);

  // Physics and update logic
  const update = useCallback((dtMs) => {
    const w = worldRef.current;
    const dt = Math.min(32, dtMs) / 16.6667; // normalize roughly to 60fps steps
    const g = 0.45; // gravity
    const ax = 0.35; // acceleration
    const maxVx = 2.4;
    const jumpVy = -6.0;
    const friction = 0.86;

    // Input horizontal
    if (input.left && !input.right) w.player.vx -= ax * dt;
    else if (input.right && !input.left) w.player.vx += ax * dt;
    else w.player.vx *= friction;

    w.player.vx = clamp(w.player.vx, -maxVx, maxVx);

    // Jump (edge-triggered)
    if (input.consumeJump && input.consumeJump()) {
      if (w.player.onGround) {
        w.player.vy = jumpVy;
        w.player.onGround = false;
      }
    }

    // Apply gravity
    w.player.vy += g * dt;

    // Wind slowly changes
    w.wind += (Math.random() - 0.5) * 0.002;
    w.wind = clamp(w.wind, -0.25, 0.25);

    // Integrate
    w.player.x += (w.player.vx + w.wind * 0.4) * dt;
    w.player.y += w.player.vy * dt;

    // Ground collision
    const ground = w.groundY;
    if (w.player.y + w.player.r >= ground) {
      w.player.y = ground - w.player.r;
      w.player.vy = 0;
      w.player.onGround = true;
    } else {
      w.player.onGround = false;
    }

    // World bounds
    if (w.player.x - w.player.r < 0) { w.player.x = w.player.r; w.player.vx = 0; }
    if (w.player.x + w.player.r > w.w) { w.player.x = w.w - w.player.r; w.player.vx = 0; }

    // Clouds move with parallax
    for (const c of w.clouds) {
      c.x += (c.speed + w.wind * 0.2) * dt;
      if (c.x - c.r > w.w) {
        c.x = -c.r;
        c.y = rand(8, 60);
        c.r = rand(6, 14);
      }
    }

    // Stars drift
    for (const s of w.stars) {
      if (!s.alive) continue;
      s.x += (s.vx + w.wind * 0.2) * dt;
      s.y += (s.vy) * dt;
      if (s.x < 2) s.x = w.w - 2;
      if (s.x > w.w - 2) s.x = 2;
      if (s.y < 10) s.y = 10;
      if (s.y > 70) s.y = 70;
    }

    // Collect stars
    for (const s of w.stars) {
      if (!s.alive) continue;
      const d = dist(s.x, s.y, w.player.x, w.player.y);
      if (d < s.r + w.player.r + 1.2) {
        s.alive = false;
        w.glowPing = 1.0; // trigger UI flash
        onScore?.(1);
        // respawn after a delay
        setTimeout(() => {
          s.x = rand(10, w.w - 10);
          s.y = rand(20, 70);
          s.r = rand(1.2, 2.2);
          s.vx = rand(-0.03, 0.03);
          s.vy = rand(-0.02, 0.02);
          s.alive = true;
        }, 1000);
      }
    }

    // Decay glow ping
    if (w.glowPing > 0) w.glowPing = Math.max(0, w.glowPing - 0.07 * dt);

    // Draw everything
    draw();
  }, [input, onScore]);

  const draw = useCallback(() => {
    const w = worldRef.current;
    const { bg, mid, ply, ui } = getCtxs();
    const { sx, sy } = toPx();

    // Background sky + clouds
    if (bg) {
      const cw = bg.canvas.width, ch = bg.canvas.height;
      const grd = bg.createLinearGradient(0, 0, 0, ch);
      grd.addColorStop(0, THEME.bgTop);
      grd.addColorStop(1, THEME.bgBottom);
      bg.fillStyle = grd;
      bg.fillRect(0, 0, cw, ch);

      // clouds
      bg.save();
      bg.fillStyle = 'rgba(255,255,255,0.9)';
      for (const c of w.clouds) {
        bg.beginPath();
        bg.arc(c.x * sx, c.y * sy, c.r * sx, 0, Math.PI * 2);
        bg.fill();
        bg.globalAlpha = 0.65;
        bg.beginPath();
        bg.arc((c.x + c.r * 0.6) * sx, (c.y + 1) * sy, (c.r * 0.8) * sx, 0, Math.PI * 2);
        bg.fill();
        bg.globalAlpha = 1;
      }
      bg.restore();
    }

    // Mid layer (stars)
    if (mid) {
      clear(mid);
      mid.save();
      for (const s of w.stars) {
        if (!s.alive) continue;
        const glow = mid.createRadialGradient(s.x * sx, s.y * sy, 0, s.x * sx, s.y * sy, 8);
        glow.addColorStop(0, 'rgba(245,158,11,0.9)');
        glow.addColorStop(1, 'rgba(245,158,11,0.0)');
        mid.fillStyle = glow;
        mid.beginPath();
        mid.arc(s.x * sx, s.y * sy, 8, 0, Math.PI * 2);
        mid.fill();

        mid.fillStyle = THEME.secondary;
        mid.beginPath();
        mid.arc(s.x * sx, s.y * sy, s.r * sx, 0, Math.PI * 2);
        mid.fill();
      }
      mid.restore();
    }

    // Player layer and ground
    if (ply) {
      clear(ply);
      // ground line
      ply.strokeStyle = 'rgba(17,24,39,0.12)';
      ply.lineWidth = 2;
      ply.beginPath();
      ply.moveTo(0, w.groundY * sy);
      ply.lineTo(ply.canvas.width, w.groundY * sy);
      ply.stroke();

      // player
      const p = w.player;
      const core = ply.createRadialGradient(p.x * sx, p.y * sy, 0, p.x * sx, p.y * sy, 18);
      core.addColorStop(0, 'rgba(37,99,235,0.95)');
      core.addColorStop(1, 'rgba(37,99,235,0.0)');
      ply.fillStyle = core;
      ply.beginPath();
      ply.arc(p.x * sx, p.y * sy, 18, 0, Math.PI * 2);
      ply.fill();

      ply.fillStyle = THEME.primary;
      ply.beginPath();
      ply.arc(p.x * sx, p.y * sy, p.r * sx, 0, Math.PI * 2);
      ply.fill();

      // simple eyes to suggest sprite
      ply.fillStyle = 'white';
      ply.beginPath();
      ply.arc((p.x - 0.9) * sx, (p.y - 0.6) * sy, 0.6 * sx, 0, Math.PI * 2);
      ply.arc((p.x + 0.9) * sx, (p.y - 0.6) * sy, 0.6 * sx, 0, Math.PI * 2);
      ply.fill();

      ply.fillStyle = '#0b1a42';
      ply.beginPath();
      ply.arc((p.x - 0.9) * sx, (p.y - 0.6) * sy, 0.25 * sx, 0, Math.PI * 2);
      ply.arc((p.x + 0.9) * sx, (p.y - 0.6) * sy, 0.25 * sx, 0, Math.PI * 2);
      ply.fill();
    }

    // UI overlay effects
    if (ui) {
      clear(ui);
      if (w.glowPing > 0) {
        ui.save();
        ui.globalAlpha = w.glowPing * 0.9;
        ui.fillStyle = 'rgba(245,158,11,0.4)';
        ui.fillRect(0, 0, ui.canvas.width, ui.canvas.height);
        ui.restore();

        // "Great!" popup
        ui.save();
        ui.globalAlpha = Math.min(1, w.glowPing + 0.1);
        ui.fillStyle = THEME.secondary;
        ui.font = `${Math.floor(22 * dpr)}px ui-sans-serif, system-ui`;
        ui.textAlign = 'center';
        ui.fillText('Great!', ui.canvas.width / 2, ui.canvas.height / 3);
        ui.restore();
      }
    }
  }, [toPx, dpr]);

  // Start game loop
  useGameLoop(running, update, onTick, logger);

  // Render layered canvases and touch zones
  return (
    <div
      ref={rootRef}
      className="canvas-root"
      style={{ position: 'relative', width: '100%', height: '100%' }}
      aria-label="Game canvas"
      role="region"
      tabIndex={0}
    >
      <canvas ref={bgRef} className="canvas-layer" aria-hidden="true" />
      <canvas ref={midRef} className="canvas-layer" aria-hidden="true" />
      <canvas ref={plyRef} className="canvas-layer" aria-hidden="true" />
      <canvas ref={uiRef} className="canvas-layer" aria-hidden="true" />
      <div className="touch-zones" aria-hidden="true">
        <div className="touch-left" />
        <div className="touch-right" />
        <div className="touch-jump" />
      </div>
    </div>
  );
}
