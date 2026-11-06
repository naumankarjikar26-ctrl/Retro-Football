import { yd, LAT_SCALE, FIELD_TOP, FIELD_BOTTOM, SIDELINE_MARGIN_YD, ENDZONE_YD, yardToX } from '../config/constants.js';

// Route library. Points are in yards relative to the receiver's start:
//   x = toward the OUTSIDE (sideline the receiver is lined up on), y = downfield.
// On screen, downfield is to the RIGHT and the sidelines are top/bottom.
// Most routes are straight segments with sharp cuts (slant, out, post...);
// `curve: true` routes (flat, wheel, curl) use a smooth Catmull-Rom spline.
// `settle: true` routes stop at the end (drawn with a dot, not an arrow).

export const ROUTES = {
  go:     { points: [[0, 0], [0, 40]] },
  seam:   { points: [[0, 0], [0, 40]] },
  post:   { points: [[0, 0], [0, 10], [-12, 28]] },
  corner: { points: [[0, 0], [0, 10], [9, 22]] },
  slant:  { points: [[0, 0], [0, 2], [-12, 11]] },
  out:    { points: [[0, 0], [0, 8], [12, 8]] },
  dig:    { points: [[0, 0], [0, 12], [-18, 12]] },
  hitch:  { points: [[0, 0], [0, 6]], settle: true },
  curl:   { points: [[0, 0], [0, 9], [-0.5, 11], [-1.5, 10], [-1.8, 9]], settle: true, curve: true },
  flat:   { points: [[0, 0], [1.5, 0.8], [5, 2], [14, 3]], curve: true },
  wheel:  { points: [[0, 0], [3, 0.5], [7, 2.5], [9, 7], [9.5, 30]], curve: true },
  screen: { points: [[0, 0], [2, -1.5], [6, -1.5]], settle: true, curve: true },  // behind the line
  // run paths (for the ball carrier on run plays): toward the QB for the
  // handoff, then through the line / around the edge
  runInside: { points: [[0, 0], [-1.6, 0.3], [-2.2, 3], [-2.2, 14]], curve: true },
  runToss:   { points: [[0, 0], [2, 0.2], [6, 3], [7, 14]], curve: true },
  // short game
  quickOut:  { points: [[0, 0], [0, 4], [9, 4]] },
  stick:     { points: [[0, 0], [0, 5], [-0.5, 6]], settle: true },
  drag:      { points: [[0, 0], [0, 2], [-24, 4]] },
  whip:      { points: [[0, 0], [0, 4], [-2, 5], [6, 5]] },
  // deep game
  fade:      { points: [[0, 0], [1, 10], [3, 34]], curve: true },
  deepPost:  { points: [[0, 0], [0, 14], [-10, 34]] },
  deepCorner:{ points: [[0, 0], [0, 14], [9, 28]] },
  deepOut:   { points: [[0, 0], [0, 15], [12, 15]] },
  comeback:  { points: [[0, 0], [0, 15], [2, 12]], settle: true },
  deepCross: { points: [[0, 0], [0, 10], [-26, 20]] },
  checkdown: { points: [[0, 0], [1, 2], [1.5, 4]], settle: true },
  // trick-play paths
  fleaRun:   { points: [[0, 0], [0, 3.6]], settle: true },                          // tailback toward the line, stops short
  statueRB:  { points: [[0, 0], [-1.6, -1.8], [-5, -1], [-8, 4], [-9, 18]], curve: true }, // behind the QB, then the other side
  wrBack:    { points: [[0, 0], [1, -2.5], [2, -5]], settle: true },                 // slot drops behind the line
  hbSwing:   { points: [[0, 0], [2.5, -0.8], [5, -1]], settle: true, curve: true },  // halfback swings out for the toss
  qbLeak:    { points: [[0, 0], [-1, 5], [-2, 24]], curve: true },                 // QB runs up the field after tossing
  hookTrail: { points: [[0, 0], [0, 5], [5, 9], [9, 11], [12, 26]], curve: true },   // sprints past the curl
  // more run paths (I-form / singleback tailback starts straight behind the QB)
  runDive:    { points: [[0, 0], [0.3, 5], [0.6, 16]], curve: true },
  runPower:   { points: [[0, 0], [0.6, 5], [1.6, 7], [1.8, 18]], curve: true },
  runCounter: { points: [[0, 0], [1.2, 1.5], [0, 5], [-2.4, 8], [-2.8, 18]], curve: true },
  runStretch: { points: [[0, 0], [2.5, 4], [6, 7], [7, 18]], curve: true },
  runSweep:   { points: [[0, 0], [-3, 3], [-8, 6], [-9, 18]], curve: true },
  runDraw:    { points: [[0, 0], [-1.6, 0.3], [-1.6, 14]], curve: true },
  block:  { points: [[0, 0]], settle: true },
};

/**
 * Build a receiver's route.
 * The geometry lives in GROUND space (sideline axis un-squashed) so length is
 * real distance and receivers run it at a true, constant speed; `screenAt`
 * projects onto the foreshortened field. `drawPoints` is what to stroke:
 * the corner points for straight routes (sharp cuts), samples for curves.
 * @param {string} name     route key
 * @param {number} x0, y0   receiver start (screen px)
 * @param {number} outSign  +1 if his sideline is the near (bottom) one, -1 if the far (top) one
 */
// sideways ground counts this much when pacing a route (1 = true ground speed)
export const ROUTE_LAT_WEIGHT = 0.55;

export function buildRoute(name, x0, y0, outSign) {
  const def = ROUTES[name];
  const gy0 = y0 / LAT_SCALE;
  // Routes never leave the field: anything past the sideline margin is bent
  // to run along the sideline instead, and they stop inside the end zone.
  const minGY = FIELD_TOP / LAT_SCALE + yd(SIDELINE_MARGIN_YD);
  const maxGY = FIELD_BOTTOM / LAT_SCALE - yd(SIDELINE_MARGIN_YD);
  const clampGY = (gy) => Phaser.Math.Clamp(gy, minGY, maxGY);
  const maxX = yardToX(100 + ENDZONE_YD - SIDELINE_MARGIN_YD);
  const clampX = (x) => Math.min(x, maxX);
  // Routes are paced in a space where sideways ground counts for only
  // ROUTE_LAT_WEIGHT, so diagonal and crossing routes don't look slow next to
  // straight go routes on the foreshortened field.
  const W = ROUTE_LAT_WEIGHT;
  const pts = def.points.map(([ox, oy]) => new Phaser.Math.Vector2(clampX(x0 + yd(oy)), clampGY(gy0 + yd(ox) * outSign) * W));
  if (pts.length < 2) return { name, curve: null, length: 0, settle: true };

  let path;
  if (def.curve) {
    path = new Phaser.Curves.Path(pts[0].x, pts[0].y);
    path.splineTo(pts.slice(1));
  } else {
    path = new Phaser.Curves.Path(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) path.lineTo(p.x, p.y);
  }
  const toScreen = (p) => ({ x: clampX(p.x), y: clampGY(p.y / W) * LAT_SCALE });
  const length = path.getLength();
  const end = path.getPoint(1);
  const before = path.getPoint(Math.max(0, 1 - 2 / Math.max(1, length)));
  const tdy = (end.y - before.y) / W; // back to ground space
  const tlen = Math.hypot(end.x - before.x, tdy) || 1;
  return {
    name,
    curve: path,
    length,
    settle: !!def.settle,
    screenAt: (u) => toScreen(path.getPoint(u)),
    // ground-space unit tangent at the end (for running on after the route)
    endTangent: { x: (end.x - before.x) / tlen, y: tdy / tlen },
    drawPoints: () => (def.curve ? path.getSpacedPoints(Math.max(8, Math.ceil(length / 6))) : pts)
      .map(toScreen).map((p) => ({ x: Math.round(p.x) + 0.5, y: Math.round(p.y) + 0.5 })),
  };
}
