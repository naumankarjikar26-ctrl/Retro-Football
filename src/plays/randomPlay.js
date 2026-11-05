// RANDOM PLAY generator. Builds a brand-new play definition (same shape as
// the designed plays in playbook.js) from config/randomPlays.js, and re-rolls
// until it matches none of the designed plays.

import { PLAYBOOK } from './playbook.js';
import { OFFENSE_FORMATIONS } from './formations.js';
import {
  TYPE_WEIGHTS, FORMATIONS, ROUTE_TREE, RB_PASS_JOBS, RUN_TYPES, DECOY_CHANCE, DECOY_ROUTES,
} from '../config/randomPlays.js';

const LINE = { LT: 'DE1', LG: 'DT1', C: null, RG: 'DT2', RT: 'DE2' };

const weighted = (obj, key = null) => {
  const entries = Object.entries(obj).map(([k, v]) => [k, key ? v[key] ?? 0 : (typeof v === 'number' ? v : v.weight ?? 1)]);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[entries.length - 1][0];
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

/** A comparable fingerprint of what every player does on a play. */
export function signature(def) {
  const routes = Object.entries(def.routes).sort(([a], [b]) => a.localeCompare(b)).map(([s, r]) => `${s}:${r}`).join(',');
  const signs = Object.entries(def.routeSign || {}).filter(([, v]) => v !== 1).map(([s, v]) => `${s}${v}`).join(',');
  return `${def.type}|${def.formation}|${routes}|${signs}`;
}
const DESIGNED = new Set(PLAYBOOK.map(signature));

function slotsOf(formation) {
  const players = OFFENSE_FORMATIONS[formation].players;
  const receivers = [];
  const backs = [];
  for (const [slot, p] of Object.entries(players)) {
    if (p.role === 'WR' || p.role === 'TE') receivers.push(slot);
    else if (p.role === 'RB') backs.push(slot);
  }
  return { receivers, backs, underCenter: players.QB.at[1] < 3 };
}

/** Distinct routes for the receivers, with at least one short, one medium and one deep. */
function assignRoutes(receivers, weightKey) {
  const byDepth = (d) => Object.fromEntries(Object.entries(ROUTE_TREE).filter(([, v]) => v.depth === d));
  const used = new Set();
  const take = (pool) => {
    const avail = Object.fromEntries(Object.entries(pool).filter(([k]) => !used.has(k)));
    const r = weighted(avail, weightKey);
    used.add(r);
    return r;
  };
  const order = shuffle(receivers);
  const routes = {};
  ['short', 'medium', 'deep'].forEach((d, i) => { if (order[i]) routes[order[i]] = take(byDepth(d)); });
  for (const slot of order.slice(3)) routes[slot] = take(ROUTE_TREE);
  return routes;
}

function generateOnce() {
  const type = weighted(TYPE_WEIGHTS);
  const formation = pick(FORMATIONS[type]);
  const { receivers, backs, underCenter } = slotsOf(formation);
  const def = {
    id: 'random', random: true, cat: 'random', type, formation, defense: 'nickel', blocking: LINE,
    routes: {}, routeSign: {}, routeDelay: {}, audible: type === 'run' ? 'slants' : 'inside-zone',
  };

  if (type === 'run') {
    const runName = weighted(RUN_TYPES);
    const rt = RUN_TYPES[runName];
    const side = Math.random() < 0.5 ? -1 : 1;
    def.runner = 'RB';
    def.handoffYd = rt.handoffYd;
    def.routes.RB = underCenter ? rt.underCenter : rt.shotgun;
    def.routeSign.RB = side;
    if (rt.delay) def.routeDelay.RB = rt.delay;
    for (const s of backs) if (s !== 'RB') def.routes[s] = 'block'; // fullback leads
    for (const s of receivers) def.routes[s] = Math.random() < DECOY_CHANCE ? pick(DECOY_ROUTES) : 'block';
    def.name = `RANDOM: RUN`;
    def.detail = `${runName} ${side < 0 ? 'LEFT' : 'RIGHT'}`;
  } else if (type === 'pass') {
    Object.assign(def.routes, assignRoutes(receivers, 'pass'));
    // backs block or run a short route nobody else has ('block' can repeat)
    for (const s of backs) {
      const taken = new Set(Object.values(def.routes));
      const jobs = Object.fromEntries(Object.entries(RB_PASS_JOBS).filter(([j]) => j === 'block' || !taken.has(j)));
      def.routes[s] = weighted(jobs);
    }
    def.routeDelay.RB = 0.4;
    def.name = 'RANDOM: PASS';
  } else {
    Object.assign(def.routes, assignRoutes(receivers, 'pa'));
    def.fake = 'RB';
    def.routes.RB = 'runDive'; // carries out the fake
    for (const s of backs) {
      if (s === 'RB') continue;
      const flatFree = !Object.values(def.routes).includes('flat');
      def.routes[s] = flatFree && Math.random() < 0.5 ? 'flat' : 'block';
    }
    for (const s of receivers) def.routeDelay[s] = 0.3; // sell the run first
    def.name = 'RANDOM: PA';
  }
  return def;
}

/** A new random play that matches no designed play (re-rolls until it doesn't). */
export function randomPlay() {
  for (let i = 0; i < 50; i++) {
    const def = generateOnce();
    if (!DESIGNED.has(signature(def))) return def;
  }
  throw new Error('random play generator could not find a unique play');
}
