// Blocker <-> defender engagements. A blocker parks itself between its man and
// the thing he is chasing; the defender is slowed until he sheds the block.
// Stage 5 hooks in here: a shed that happens while the blocker is badly out of
// position (low discipline) becomes a holding call.

import { TUNING, yd } from '../config/constants.js';

const GAP = yd(1.05);

export function tryEngage(blocker, defender, time) {
  if (blocker.engaged || defender.engaged || defender.state === 'down' || blocker.state === 'down') return false;
  if (time < (defender.ai.immuneUntil || 0)) return false; // just shed a block: free to run
  if (Phaser.Math.Distance.Between(blocker.x, blocker.y, defender.x, defender.y) > yd(TUNING.blockRadiusYd)) return false;
  blocker.engaged = defender;
  defender.engaged = blocker;
  const [lo, hi] = TUNING.shedTime;
  const strength = (blocker.ratings.block ?? 0.7) / (defender.ratings.rush ?? 0.85);
  // every re-engagement is weaker: the pocket collapses if the QB holds the ball
  const fatigue = Math.pow(0.6, defender.ai.engagements || 0);
  defender.ai.engagements = (defender.ai.engagements || 0) + 1;
  defender.ai.shedAt = time + Phaser.Math.FloatBetween(lo, hi) * strength * fatigue;
  return true;
}

export function release(blocker, time) {
  const d = blocker.engaged;
  if (!d) return;
  d.engaged = null;
  d.ai.immuneUntil = time + 1.5;
  blocker.engaged = null;
}

/**
 * Move a blocker toward the point that cuts his man off from `protect`.
 * Engaged blockers mirror the defender; unengaged ones try to engage.
 */
export function driveBlocker(blocker, defender, protect, time) {
  if (!defender || defender.state === 'down') { blocker.stop(); return; }
  const dx = protect.x - defender.x;
  const dy = protect.y - defender.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = defender.x + (dx / len) * GAP;
  const py = defender.y + (dy / len) * GAP;

  if (blocker.engaged === defender) {
    if (time >= defender.ai.shedAt) { release(blocker, time); return; }
    blocker.moveToward(px, py, 1);
    // keep the pair physically together (no sliding through each other)
    const d = Phaser.Math.Distance.Between(blocker.x, blocker.y, defender.x, defender.y);
    if (d < GAP * 0.85) {
      const ux = (blocker.x - defender.x) / (d || 1);
      const uy = (blocker.y - defender.y) / (d || 1);
      const push = (GAP * 0.85 - d) * 0.5;
      blocker.x += ux * push; blocker.y += uy * push;
      defender.x -= ux * push; defender.y -= uy * push;
    }
  } else {
    blocker.moveToward(px, py, 1);
    tryEngage(blocker, defender, time);
  }
}
