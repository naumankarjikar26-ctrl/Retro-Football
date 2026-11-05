// Simple defensive AI: rushers attack the QB, man defenders trail their
// receiver with a reaction lag, safeties sit deep, and everyone breaks on the
// ball when it is thrown and pursues the ball carrier after a catch.
// Field is horizontal: the offense attacks to the RIGHT (+x).

import { yd, ydLat, gdist, latToY } from '../config/constants.js';
import { CATCHING } from '../config/catching.js';

const REACT = 4.5; // how quickly a cover man's aim point catches up (1/s)

export function updateDefense(play, dt) {
  const { phase, time } = play;
  for (const d of play.defense) {
    if (d.state === 'down') continue;
    const slow = d.engaged ? 0.15 : 1;

    if (phase === 'presnap' || phase === 'dead') { d.stop(); continue; }
    if (phase === 'loose') { d.moveToward(play.ball.gx, play.ball.gy, slow); continue; } // fumble!

    if (phase === 'run') {
      pursue(d, play.carrier, slow);
      continue;
    }

    if (phase === 'air') {
      // only defenders already near the landing spot break on the ball - after a short read, and not quite at full speed
      const land = play.throwTarget;
      // (a cover man further away keeps trailing his receiver instead)
      const near = gdist(d, land) < yd(CATCHING.breakOnBallYd);
      if (time - play.throwTime > CATCHING.defenseReactSec && near && d.job.type !== 'rush') {
        d.moveToward(land.x, land.y, CATCHING.defenseBreakSpeed * slow);
        continue;
      }
    }

    // trick plays: the chosen defenders chase the fake for a moment
    if (play.bite && time < play.bite.until && play.bite.roles.includes(d.role) && phase !== 'run') {
      const t = play.bite.toward;
      d.moveToward(t.x, t.y, slow);
      continue;
    }

    // play action: linebackers bite on the fake for a moment
    if (play.def.type === 'pa' && d.role === 'LB' && play.fakeRunner && time - play.snapTime < CATCHING.paBiteSec) {
      pursue(d, play.fakeRunner, slow);
      continue;
    }

    // QB has the ball (or the snap is on its way)
    const qb = play.qb;
    switch (d.job.type) {
      case 'rush':
        if (phase === 'air') d.moveToward(play.throwTarget.x, play.throwTarget.y, 0.6 * slow);
        else pursue(d, qb, slow);
        break;
      case 'man':
        // while the ball is in the air a trailing cover man is reading the ball,
        // not running flat out, so an open receiver stays open
        coverMan(d, play.offenseBySlot[d.job.target], dt, slow * (phase === 'air' ? CATCHING.trailSpeedInAir : 1));
        break;
      case 'deep':
      default:
        playDeep(d, play, slow);
    }
  }
}

function pursue(d, target, slow) {
  if (!target) return;
  const lead = Phaser.Math.Clamp(gdist(d, target) / yd(d.maxSpeed) * 0.6, 0, 0.7);
  const p = target.predict(lead);
  d.moveToward(p.x, p.y, slow);
}

function coverMan(d, r, dt, slow) {
  if (!r) { d.stop(); return; }
  // aim slightly downfield of the receiver ("stay on top"), with reaction lag
  const p = r.predict(0.2);
  const tx = p.x + yd(1.2);
  const ty = p.y;
  if (d.ai.aimX === undefined) { d.ai.aimX = tx; d.ai.aimY = ty; }
  const k = 1 - Math.exp(-REACT * dt);
  d.ai.aimX += (tx - d.ai.aimX) * k;
  d.ai.aimY += (ty - d.ai.aimY) * k;
  d.moveToward(d.ai.aimX, d.ai.aimY, 0.97 * slow);
}

function playDeep(d, play, slow) {
  const [lat, depth] = d.job.zone;
  let tx = play.losX + yd(depth);
  let ty = latToY(play.ballLat + lat);
  // shade toward any receiver threatening deep in this half of the field
  let threat = null;
  let best = Infinity;
  for (const r of play.receivers) {
    const deep = r.x - play.losX;
    const lateral = Math.abs(r.y - ty);
    if (deep > yd(9) && lateral < ydLat(14) && lateral < best) { best = lateral; threat = r; }
  }
  if (threat) {
    ty = threat.y;
    tx = Math.max(tx, threat.x + yd(3));
  }
  d.moveToward(tx, ty, (threat ? 0.95 : 0.6) * slow);
}
