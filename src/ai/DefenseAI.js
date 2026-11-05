// Simple defensive AI: rushers attack the QB, man defenders trail their
// receiver with a reaction lag, safeties sit deep, and everyone breaks on the
// ball when it is thrown and pursues the ball carrier after a catch.

import { yd, latToX } from '../config/constants.js';

const REACT = 4.5; // how quickly a cover man's aim point catches up (1/s)

export function updateDefense(play, dt) {
  const { phase, time } = play;
  for (const d of play.defense) {
    if (d.state === 'down') continue;
    const slow = d.engaged ? 0.15 : 1;

    if (phase === 'presnap' || phase === 'dead') { d.stop(); continue; }

    if (phase === 'run') {
      pursue(d, play.carrier, slow);
      continue;
    }

    if (phase === 'air') {
      const land = play.throwTarget;
      const dist = Phaser.Math.Distance.Between(d.x, d.y, land.x, land.y);
      if (time - play.throwTime > 0.25 && dist < yd(16) && d.job.type !== 'rush') {
        d.moveToward(land.x, land.y, slow);
        continue;
      }
    }

    // QB has the ball (or the snap is on its way)
    const qb = play.qb;
    const qbRunning = play.qbScrambling;
    switch (d.job.type) {
      case 'rush':
        if (phase === 'air') d.moveToward(play.throwTarget.x, play.throwTarget.y, 0.6 * slow);
        else pursue(d, qb, slow);
        break;
      case 'man': {
        if (qbRunning) { pursue(d, qb, slow); break; }
        const r = play.offenseBySlot[d.job.target];
        coverMan(d, r, dt, slow);
        break;
      }
      case 'deep':
      default:
        if (qbRunning) { pursue(d, qb, slow * 0.9); break; }
        playDeep(d, play, slow);
    }
  }
}

function pursue(d, target, slow) {
  if (!target) return;
  const dist = Phaser.Math.Distance.Between(d.x, d.y, target.x, target.y);
  const lead = Phaser.Math.Clamp(dist / yd(d.maxSpeed) * 0.6, 0, 0.7);
  d.moveToward(target.x + target.vel.x * lead, target.y + target.vel.y * lead, slow);
}

function coverMan(d, r, dt, slow) {
  if (!r) { d.stop(); return; }
  // aim slightly upfield of the receiver ("stay on top"), with reaction lag
  const tx = r.x + r.vel.x * 0.2;
  const ty = r.y - yd(1.2) + r.vel.y * 0.2;
  if (d.ai.aimX === undefined) { d.ai.aimX = tx; d.ai.aimY = ty; }
  const k = 1 - Math.exp(-REACT * dt);
  d.ai.aimX += (tx - d.ai.aimX) * k;
  d.ai.aimY += (ty - d.ai.aimY) * k;
  d.moveToward(d.ai.aimX, d.ai.aimY, 0.97 * slow);
}

function playDeep(d, play, slow) {
  const [lat, depth] = d.job.zone;
  let tx = latToX(play.ballLat + lat);
  let ty = play.losY - yd(depth);
  // shade toward any receiver threatening deep in this half of the field
  let threat = null;
  let best = Infinity;
  for (const r of play.receivers) {
    const deep = play.losY - r.y;
    const lateral = Math.abs(r.x - tx);
    if (deep > yd(9) && lateral < yd(14) && lateral < best) { best = lateral; threat = r; }
  }
  if (threat) {
    tx = threat.x;
    ty = Math.min(ty, threat.y - yd(3));
  }
  d.moveToward(tx, ty, (threat ? 0.95 : 0.6) * slow);
}
