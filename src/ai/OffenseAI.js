// Offensive AI for everyone the player is not controlling: receivers run their
// spline routes, linemen pass-protect, and after a catch everybody blocks.
// Field is horizontal: the offense attacks to the RIGHT (+x).

import { yd, ydLat, gdist } from '../config/constants.js';
import { driveBlocker } from './Blocking.js';
import { MOVE } from '../config/speeds.js';

export function updateOffense(play, dt) {
  const { phase, time } = play;
  for (const p of play.offense) {
    if (p.state === 'down' || p === play.controlled) continue;
    if (phase === 'presnap' || phase === 'dead') { p.stop(); continue; }
    if (phase === 'loose') { p.moveToward(play.ball.gx, play.ball.gy, 1); continue; } // fumble!

    if (phase === 'run') { blockDownfield(p, play, time); continue; }

    if (p.role === 'OL') { passProtect(p, play, time); continue; }
    if (p.runBlocker) { blockDownfield(p, play, time); continue; } // run play: receivers block

    if (p.route) {
      if (p === play.intended && play.trackTarget) attackBall(p, play);
      else runRoute(p, play, dt);
    }
  }
}

/** Follow the route spline smoothly by distance travelled (constant real speed along the curve). */
function runRoute(p, play, dt) {
  const r = p.route;
  const elapsed = play.time - play.snapTime;
  if (elapsed < (r.delay || 0) || !r.curve) { p.stop(); return; }

  if (r.done) {
    if (r.settle) { p.stop(); return; }
    p.moveDir(r.exitX, r.exitY, 0.9); // keep running along the last tangent
    return;
  }
  // accelerate off the line, then run at full speed along the curve
  r.speed = Math.min(yd(p.maxSpeed), (r.speed || 0) + yd(p.maxSpeed / MOVE.accelTime) * dt);
  r.dist = (r.dist || 0) + r.speed * dt;
  const u = Math.min(1, r.dist / r.length);
  const pt = r.screenAt(u);
  p.driveTo(pt.x, pt.y, dt);
  if (u >= 1) {
    r.done = true;
    r.exitX = r.endTangent.x; // ground-space tangent
    r.exitY = r.endTangent.y;
  }
}

/** Intended receiver adjusts to arrive at the landing spot as the ball does. */
function attackBall(p, play) {
  const t = play.trackTarget;
  const timeLeft = Math.max(0.05, t.arriveAt - play.time);
  const needed = gdist(p, t) / timeLeft / yd(p.maxSpeed);
  p.moveToward(t.x, t.y, Phaser.Math.Clamp(needed, 0.55, 1));
}

function passProtect(p, play, time) {
  let man = p.blockTarget;
  // free blockers (and anyone whose man is gone) pick up the nearest loose rusher
  if (!man || man.state === 'down' || (man.engaged && man.engaged !== p)) {
    man = nearest(p, play.defense.filter((d) => d.job.type === 'rush' && !d.engaged && d.state !== 'down'), yd(8));
  }
  if (man) {
    driveBlocker(p, man, play.runner || play.controlled || play.qb, time);
  } else {
    // nobody to block: hold the pocket
    p.moveToward(p.ai.homeX - yd(1.5), p.ai.homeY, 0.6);
  }
}

function blockDownfield(p, play, time) {
  const carrier = play.carrier || play.runner; // before the handoff, block for the runner
  if (!carrier) { p.stop(); return; }
  if (p.engaged) { driveBlocker(p, p.engaged, carrier, time); return; }
  // pick up the closest free defender near the ball carrier
  const candidates = play.defense.filter((d) => !d.engaged && d.state !== 'down' && gdist(d, carrier) < yd(12));
  const man = nearest(p, candidates, yd(9));
  if (man) driveBlocker(p, man, carrier, time);
  else p.moveToward(carrier.x + yd(4), carrier.y + (p.y < carrier.y ? -ydLat(3) : ydLat(3)), 0.8);
}

export function nearest(from, list, maxDist = Infinity) {
  let best = null;
  let bestD = maxDist;
  for (const o of list) {
    const d = gdist(from, o);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

