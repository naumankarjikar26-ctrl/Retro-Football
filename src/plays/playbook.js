// Play definitions (Stage 2: play calling).
//
//   type      'pass' | 'screen' | 'run'
//   routes    slot -> route name (plays/routes.js). 'block' = stays in / blocks.
//   runner    (runs) who takes the handoff; his route is the run path
//   handoffYd (runs) how close the runner must get to the QB for the handoff
//   audible   play id to switch to at the line (pass -> run, run -> quick pass)

const LINE = { LT: 'DE1', LG: 'DT1', C: null, RG: 'DT2', RT: 'DE2' }; // null = help / free rusher

export const PLAYBOOK = [
  {
    id: 'spread-post', name: 'SPREAD POST', type: 'pass', audible: 'inside-zone',
    formation: 'shotgunSpread', defense: 'nickel',
    routes: { X: 'post', H: 'out', Z: 'curl', TE: 'seam', RB: 'flat' },
    routeDelay: { RB: 0.35 }, blocking: LINE,
  },
  {
    id: 'four-verts', name: 'FOUR VERTS', type: 'pass', audible: 'inside-zone',
    formation: 'shotgunSpread', defense: 'nickel',
    routes: { X: 'go', H: 'seam', Z: 'go', TE: 'seam', RB: 'flat' },
    routeDelay: { RB: 0.5 }, blocking: LINE,
  },
  {
    id: 'slants', name: 'QUICK SLANTS', type: 'pass', audible: 'inside-zone',
    formation: 'shotgunSpread', defense: 'nickel',
    routes: { X: 'slant', H: 'slant', Z: 'slant', TE: 'hitch', RB: 'flat' },
    routeDelay: { RB: 0.3 }, blocking: LINE,
  },
  {
    id: 'curl-flat', name: 'CURL FLAT', type: 'pass', audible: 'outside-toss',
    formation: 'shotgunSpread', defense: 'nickel',
    routes: { X: 'curl', H: 'flat', Z: 'curl', TE: 'dig', RB: 'wheel' },
    routeDelay: { RB: 0.4 }, blocking: LINE,
  },
  {
    id: 'rb-screen', name: 'RB SCREEN', type: 'screen', audible: 'inside-zone',
    formation: 'shotgunSpread', defense: 'nickel',
    routes: { X: 'go', H: 'go', Z: 'go', TE: 'corner', RB: 'screen' },
    routeDelay: { RB: 0.6 }, blocking: LINE,
  },
  {
    id: 'inside-zone', name: 'INSIDE ZONE', type: 'run', audible: 'slants',
    formation: 'shotgunSpread', defense: 'nickel',
    routes: { X: 'block', H: 'block', Z: 'block', TE: 'block', RB: 'runInside' },
    runner: 'RB', handoffYd: 1.3, blocking: LINE,
  },
  {
    id: 'outside-toss', name: 'OUTSIDE TOSS', type: 'run', audible: 'slants',
    formation: 'shotgunSpread', defense: 'nickel',
    routes: { X: 'block', H: 'block', Z: 'block', TE: 'block', RB: 'runToss' },
    runner: 'RB', handoffYd: 3, blocking: LINE,
  },
];

export const playById = (id) => PLAYBOOK.find((p) => p.id === id);
export const DEFAULT_PLAY = PLAYBOOK[0];
