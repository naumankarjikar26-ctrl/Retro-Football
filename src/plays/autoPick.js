// Picks the next play automatically. A category (run / short / long / pa) is
// chosen by down and distance, then a play is drawn from that category's
// shuffle bag, so every play in it gets called before any repeats.
// Never the same play twice in a row. Kicks are only called from the playbook.

import { PLAYBOOK } from './playbook.js';

/** Category weights for down, distance and field position. */
export function situationWeights(gs) {
  const { down, toGo } = gs;
  const late = down >= 3;
  let w;
  if (toGo <= 2) w = late ? { run: 8, short: 2, long: 0, pa: 0.5 } : { run: 5, short: 2, long: 0.5, pa: 1.5 };
  else if (toGo <= 6) w = late ? { run: 1.5, short: 6, long: 1, pa: 1 } : { run: 3, short: 3, long: 1, pa: 2 };
  else if (toGo <= 12) w = late ? { run: 0.3, short: 3, long: 5, pa: 1 } : { run: 3, short: 3, long: 2, pa: 2 };
  else w = late ? { run: 0, short: 1, long: 8, pa: 1 } : { run: 1, short: 2, long: 4, pa: 2 };
  if (gs.ballOn >= 90) w.long = 0; // no room for deep shots inside the opp 10
  return w;
}

const bags = {}; // cat -> play ids not yet called this cycle

function drawFrom(cat, lastId) {
  const all = PLAYBOOK.filter((p) => p.cat === cat);
  if (!bags[cat] || bags[cat].length === 0) bags[cat] = all.map((p) => p.id);
  let options = bags[cat].filter((id) => id !== lastId);
  if (!options.length) { bags[cat] = all.map((p) => p.id); options = bags[cat].filter((id) => id !== lastId); }
  const id = options[Math.floor(Math.random() * options.length)];
  bags[cat] = bags[cat].filter((x) => x !== id);
  return all.find((p) => p.id === id);
}

export function autoPick(gs, lastId = null) {
  const w = situationWeights(gs);
  const cats = Object.keys(w).filter((c) => w[c] > 0);
  const total = cats.reduce((a, c) => a + w[c], 0);
  let r = Math.random() * total;
  const cat = cats.find((c) => (r -= w[c]) <= 0) ?? cats[cats.length - 1];
  return drawFrom(cat, lastId);
}

export const CAT_LABEL = { run: 'RUN', short: 'SHORT PASS', long: 'LONG PASS', pa: 'PLAY ACTION', special: 'KICK' };
