import { yd, LAT_SCALE } from '../config/constants.js';

// Route library. Points are in yards relative to the receiver's start:
//   x = toward the OUTSIDE (sideline the receiver is lined up on), y = downfield.
// On screen, downfield is to the RIGHT and the sidelines are top/bottom.
// Routes are turned into smooth Catmull-Rom splines, so a handful of control
// points gives a natural rounded cut.

export const ROUTES = {
  go:     { points: [[0, 0], [0, 8], [0.6, 20], [1, 40]] },
  seam:   { points: [[0, 0], [-0.5, 8], [-0.5, 40]] },
  post:   { points: [[0, 0], [0, 7], [-0.6, 10], [-4, 15], [-12, 30]] },
  corner: { points: [[0, 0], [0, 7], [0.6, 10], [4, 15], [11, 24]] },
  slant:  { points: [[0, 0], [0, 1.5], [-2.5, 4], [-14, 11]] },
  out:    { points: [[0, 0], [0, 6], [1, 8], [3.5, 8.5], [12, 8.5]] },
  dig:    { points: [[0, 0], [0, 9], [-1, 11.5], [-4, 12], [-20, 12]] },
  curl:   { points: [[0, 0], [0, 9], [-0.5, 11], [-1.5, 10], [-1.8, 9]], settle: true },
  flat:   { points: [[0, 0], [1.5, 0.8], [5, 2], [14, 3]] },
  wheel:  { points: [[0, 0], [3, 0.5], [7, 2.5], [9, 7], [9.5, 30]] },
  block:  { points: [[0, 0]], settle: true },
};

/**
 * Build a receiver's route spline.
 * The curve lives in GROUND space (sideline axis un-squashed) so arc length is
 * real distance and receivers run it at a true, constant speed; `screenAt`
 * and `screenPoints` project it onto the foreshortened field for drawing.
 * @param {string} name     route key
 * @param {number} x0, y0   receiver start (screen px)
 * @param {number} outSign  +1 if his sideline is the near (bottom) one, -1 if the far (top) one
 */
export function buildRoute(name, x0, y0, outSign) {
  const def = ROUTES[name];
  const gy0 = y0 / LAT_SCALE;
  const pts = def.points.map(([ox, oy]) => new Phaser.Math.Vector2(x0 + yd(oy), gy0 + yd(ox) * outSign));
  if (pts.length < 2) return { name, curve: null, length: 0, settle: true };
  const curve = new Phaser.Curves.Spline(pts);
  const toScreen = (p) => ({ x: p.x, y: p.y * LAT_SCALE });
  return {
    name,
    curve,
    length: curve.getLength(),
    settle: !!def.settle,
    screenAt: (u) => toScreen(curve.getPointAt(u)),
    screenPoints: (n) => curve.getSpacedPoints(n).map(toScreen),
  };
}
