//
// Utility math helpers
//

/**
 * PUBLIC_INTERFACE
 * Clamp a value between min and max
 */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * PUBLIC_INTERFACE
 * Linear interpolation
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * PUBLIC_INTERFACE
 * Returns a random float in [min, max)
 */
export function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * PUBLIC_INTERFACE
 * Distance between two points
 */
export function dist(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.hypot(dx, dy);
}
