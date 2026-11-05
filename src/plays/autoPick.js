// Picks the next play automatically from the designed playbook, weighted by
// the down, distance and field position. Never the same play twice in a row.
// Kicks are only ever called from the playbook.

import { PLAYBOOK } from './playbook.js';

/** Category weights for a situation (run / short / long / pa). */
export function situationWeights(gs) {
  const toGo = gs.toGo;
  if (gs.ballOn >= 90) return { run: 3, short: 3, long: 0, pa: 3, tag: 'RED ZONE' };       // inside the opp 10
  if (gs.down >= 3 && toGo >= 7) return { run: 0.5, short: 4, long: 4, pa: 1, tag: '3RD/4TH & LONG' };
  if (toGo <= 2) return { run: 6, short: 1.5, long: 0.25, pa: 1, tag: 'SHORT YARDAGE' };
  return { run: 1, short: 1, long: 1, pa: 1, tag: 'NORMAL' };
}

export function autoPick(gs, lastId = null) {
  const w = situationWeights(gs);
  const pool = PLAYBOOK.filter((p) => w[p.cat] > 0 && p.id !== lastId);
  // weight per play = its category weight / plays in that category
  const counts = {};
  for (const p of pool) counts[p.cat] = (counts[p.cat] || 0) + 1;
  const total = pool.reduce((a, p) => a + w[p.cat] / counts[p.cat], 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= w[p.cat] / counts[p.cat];
    if (r <= 0) return p;
  }
  return pool[pool.length - 1];
}

export const CAT_LABEL = { run: 'RUN', short: 'SHORT PASS', long: 'LONG PASS', pa: 'PLAY ACTION', special: 'KICK' };
