// Play definitions (Stage 2: play calling).
//
//   cat       'run' | 'short' | 'long' | 'pa' | 'special'   (play-call tab)
//   type      'run' | 'pass' | 'screen' | 'pa' | 'punt' | 'fg'
//   formation key in plays/formations.js
//   routes    slot -> route name (plays/routes.js). 'block' = stays in / blocks.
//   runner    (runs) who takes the handoff; his route is the run path
//   fake      (play action) who fakes the run; his route is the fake path
//   handoffYd (runs) how close the runner must get to the QB for the handoff
//   audible   play id to switch to at the line (pass -> run, run -> quick pass)

const LINE = { LT: 'DE1', LG: 'DT1', C: null, RG: 'DT2', RT: 'DE2' }; // null = help / free rusher
const base = { defense: 'nickel', blocking: LINE };

const run = (id, name, formation, path, extra = {}) => ({
  ...base, id, name, cat: 'run', type: 'run', formation, audible: 'slants', runner: 'RB', handoffYd: 1.3,
  routes: { X: 'block', H: 'block', Z: 'block', TE: 'block', RB: path }, ...extra,
});
const pass = (cat, id, name, formation, routes, extra = {}) => ({
  ...base, id, name, cat, type: 'pass', formation, audible: 'inside-zone', routes, routeDelay: { RB: 0.4 }, ...extra,
});
const pa = (id, name, formation, routes, fakePath = 'runDive') => ({
  ...base, id, name, cat: 'pa', type: 'pa', formation, audible: 'power', fake: 'RB',
  routes: { ...routes, RB: fakePath }, routeDelay: { X: 0.25, Z: 0.25, H: 0.3, TE: 0.35 },
});

export const PLAYBOOK = [
  // ---------------------------------------------------------------- runs
  run('inside-zone', 'INSIDE ZONE', 'shotgunSpread', 'runInside'),
  run('outside-toss', 'OUTSIDE TOSS', 'shotgunSpread', 'runToss', { handoffYd: 3 }),
  run('power', 'POWER', 'iForm', 'runPower'),
  run('dive', 'HB DIVE', 'iForm', 'runDive'),
  run('counter', 'COUNTER', 'singleback', 'runCounter'),
  run('stretch', 'STRETCH', 'singleback', 'runStretch', { handoffYd: 2 }),
  run('sweep', 'SWEEP', 'iForm', 'runSweep', { handoffYd: 2.5 }),
  run('draw', 'HB DRAW', 'shotgunSpread', 'runDraw', {
    routes: { X: 'go', H: 'go', Z: 'go', TE: 'block', RB: 'runDraw' }, routeDelay: { RB: 0.6 },
  }),

  // ---------------------------------------------------------------- short passes
  pass('short', 'slants', 'QUICK SLANTS', 'shotgunSpread', { X: 'slant', H: 'slant', Z: 'slant', TE: 'hitch', RB: 'flat' }, { audible: 'inside-zone' }),
  pass('short', 'curl-flat', 'CURL FLAT', 'shotgunSpread', { X: 'curl', H: 'flat', Z: 'curl', TE: 'dig', RB: 'wheel' }, { audible: 'outside-toss' }),
  pass('short', 'quick-outs', 'QUICK OUTS', 'shotgunSpread', { X: 'quickOut', H: 'quickOut', Z: 'quickOut', TE: 'stick', RB: 'flat' }),
  pass('short', 'stick', 'STICK', 'trips', { X: 'slant', H: 'flat', Z: 'quickOut', TE: 'stick', RB: 'drag' }),
  pass('short', 'drive', 'DRIVE', 'singleback', { X: 'drag', H: 'dig', Z: 'hitch', TE: 'flat', RB: 'flat' }),
  pass('short', 'hitches', 'HITCHES', 'shotgunSpread', { X: 'hitch', H: 'hitch', Z: 'hitch', TE: 'hitch', RB: 'flat' }),
  pass('short', 'mesh', 'MESH', 'trips', { X: 'drag', H: 'drag', Z: 'hitch', TE: 'whip', RB: 'flat' }),
  { ...pass('short', 'rb-screen', 'RB SCREEN', 'shotgunSpread', { X: 'go', H: 'go', Z: 'go', TE: 'corner', RB: 'screen' }), type: 'screen', routeDelay: { RB: 0.6 } },

  // ---------------------------------------------------------------- long passes
  pass('long', 'four-verts', 'FOUR VERTS', 'shotgunSpread', { X: 'go', H: 'seam', Z: 'go', TE: 'seam', RB: 'flat' }, { routeDelay: { RB: 0.5 } }),
  pass('long', 'spread-post', 'SPREAD POST', 'shotgunSpread', { X: 'post', H: 'out', Z: 'curl', TE: 'seam', RB: 'flat' }),
  pass('long', 'deep-posts', 'DEEP POSTS', 'shotgunSpread', { X: 'deepPost', H: 'go', Z: 'deepPost', TE: 'seam', RB: 'flat' }),
  pass('long', 'corners', 'CORNERS', 'shotgunSpread', { X: 'deepCorner', H: 'out', Z: 'deepCorner', TE: 'seam', RB: 'flat' }),
  pass('long', 'fades', 'FADES', 'trips', { X: 'fade', H: 'seam', Z: 'fade', TE: 'dig', RB: 'flat' }),
  pass('long', 'comebacks', 'COMEBACKS', 'shotgunSpread', { X: 'comeback', H: 'go', Z: 'comeback', TE: 'seam', RB: 'flat' }),
  pass('long', 'deep-outs', 'DEEP OUTS', 'singleback', { X: 'deepOut', H: 'post', Z: 'deepOut', TE: 'seam', RB: 'flat' }),
  pass('long', 'post-wheel', 'POST WHEEL', 'shotgunSpread', { X: 'post', H: 'seam', Z: 'go', TE: 'dig', RB: 'wheel' }),

  // ---------------------------------------------------------------- play action
  pa('pa-post', 'PA POST', 'iForm', { X: 'deepPost', Z: 'dig', TE: 'flat', H: 'block' }),
  pa('pa-cross', 'PA DEEP CROSS', 'singleback', { X: 'deepCross', H: 'go', Z: 'comeback', TE: 'flat' }, 'runInside'),
  pa('pa-flood', 'PA FLOOD', 'singleback', { X: 'post', H: 'out', Z: 'deepCorner', TE: 'flat' }, 'runPower'),
  pa('pa-seam', 'PA SEAM', 'iForm', { X: 'go', Z: 'go', TE: 'seam', H: 'flat' }),
  pa('pa-go', 'PA GO', 'iForm', { X: 'go', Z: 'fade', TE: 'dig', H: 'block' }, 'runPower'),
  pa('pa-slant', 'PA SLANT', 'singleback', { X: 'slant', H: 'slant', Z: 'slant', TE: 'seam' }),
  pa('pa-corner', 'PA CORNER', 'singleback', { X: 'deepCorner', H: 'dig', Z: 'post', TE: 'flat' }, 'runStretch'),
  pa('pa-te-leak', 'PA TE LEAK', 'iForm', { X: 'deepPost', Z: 'deepOut', TE: 'drag', H: 'flat' }),

  // ---------------------------------------------------------------- special teams
  { ...base, id: 'punt', name: 'PUNT', cat: 'special', type: 'punt', formation: 'punt',
    routes: { X: 'go', Z: 'go', TE: 'block', H: 'block', RB: 'block' } },
  { ...base, id: 'field-goal', name: 'FIELD GOAL', cat: 'special', type: 'fg', formation: 'fieldGoal',
    routes: { X: 'block', Z: 'block', TE: 'block', H: 'block', RB: 'block' } },
];

export const CATEGORIES = [
  { id: 'run', name: 'RUN' },
  { id: 'short', name: 'SHORT' },
  { id: 'long', name: 'LONG' },
  { id: 'pa', name: 'PLAY ACTION' },
  { id: 'special', name: 'KICK' },
];

export const playById = (id) => PLAYBOOK.find((p) => p.id === id);
export const DEFAULT_PLAY = playById('slants');
