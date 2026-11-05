// Offensive AI for everyone the player is not controlling: receivers run their
// spline routes, linemen pass-protect, and after a catch everybody blocks.

import { yd } from '../config/constants.js';
import { driveBlocker } from './Blocking.js';

export function updateOffense(play, dt) {
  const { phase, time } = play;
  for (const p of play.offense) {
    if (p.state === 'down' || p === play.controlled) continue;
    if (phase === 'presnap' || phase === 'dead') { p.stop(); continue; }

    if (phase === 'run') { blockDownfield(p, play, time); continue; }

    if (p.role === 'OL') { passProtect(p, play, time); continue; }

    if (p.route) {
      if (phase === 'air' && p === play.intended) attackBall(p, play);
      else runRoute(p, play, dt);
    }
  }
}

/** Follow the route spline smoothly by distance travelled (constant speed along the curve). */
function runRoute(p, play, dt) {
  const r = p.route;
  const elapsed = play.time - play.snapTime;
  if (elapsed < (r.delay || 0) || !r.curve) { p.stop(); return; }

  if (r.done) {
    if (r.settle) { p.stop(); return; }
    // keep running along the last tangent
    p.moveDir(r.exitX, r.exitY, 0.9);
    return;
  }
  // accelerate off the line, then run at full speed along the curve
  r.speed = Math.min(yd(p.maxSpeed), (r.speed || 0) + yd(14) * dt);
  r.dist = (r.dist || 0) + r.speed * dt;
  const u = Math.min(1, r.dist / r.length);
  const pt = r.curve.getPointAt(u);
  p.driveTo(pt.x, pt.y, dt);
  if (u >= 1) {
    r.done = true;
    const t = r.curve.getTangentAt(1);
    r.exitX = t.x;
    r.exitY = t.y;
  }
}

/** Intended receiver adjusts to arrive at the landing spot as the ball does. */
function attackBall(p, play) {
  const t = play.throwTarget;
  const timeLeft = Math.max(0.05, play.ball.flight ? (1 - play.ball.flight.t) * play.ball.flight.duration : 0.05);
  const dist = Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y);
  const needed = dist / timeLeft / yd(p.maxSpeed);
  p.moveToward(t.x, t.y, Phaser.Math.Clamp(needed, 0.55, 1));
}

function passProtect(p, play, time) {
  let man = p.blockTarget;
  // free blockers (and anyone whose man is gone) pick up the nearest loose rusher
  if (!man || man.state === 'down' || (man.engaged && man.engaged !== p)) {
    man = nearest(p, play.defense.filter((d) => d.job.type === 'rush' && !d.engaged && d.state !== 'down'), yd(8));
  }
  if (man) {
    driveBlocker(p, man, play.controlled || play.qb, time);
  } else {
    // nobody to block: hold the pocket
    p.moveToward(p.ai.homeX, p.ai.homeY + yd(1.5), 0.6);
  }
}

function blockDownfield(p, play, time) {
  const carrier = play.carrier;
  if (!carrier) { p.stop(); return; }
  if (p.engaged) { driveBlocker(p, p.engaged, carrier, time); return; }
  // pick the closest free defender between me and... the carrier's path
  const candidates = play.defense.filter((d) => !d.engaged && d.state !== 'down'
    && Phaser.Math.Distance.Between(d.x, d.y, carrier.x, carrier.y) < yd(12));
  const man = nearest(p, candidates, yd(9));
  if (man) driveBlocker(p, man, carrier, time);
  else p.moveToward(carrier.x + (p.x < carrier.x ? -yd(3) : yd(3)), carrier.y - yd(4), 0.8);
}

export function nearest(from, list, maxDist = Infinity) {
  let best = null;
  let bestD = maxDist;
  for (const o of list) {
    const d = Phaser.Math.Distance.Between(from.x, from.y, o.x, o.y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}
