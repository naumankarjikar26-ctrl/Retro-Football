// Play definitions. Stage 1 runs PLAYBOOK[0] every snap.
// Stage 2 (play calling) adds 6-8 entries here — including `type: 'run'` and
// `type: 'screen'` plays — plus a Quick Pick and an at-the-line audible list.

export const PLAYBOOK = [
  {
    id: 'spread-post',
    name: 'SPREAD POST',
    type: 'pass',                  // 'pass' | 'run' | 'screen'  (run/screen arrive in Stage 2)
    formation: 'shotgunSpread',
    defense: 'nickel',
    routes: { X: 'post', H: 'out', Z: 'curl', TE: 'seam', RB: 'flat' },
    routeDelay: { RB: 0.35 },      // seconds before a receiver releases
    blocking: { LT: 'DE1', LG: 'DT1', C: null, RG: 'DT2', RT: 'DE2' }, // null = help/free rusher
  },
];

export const DEFAULT_PLAY = PLAYBOOK[0];
