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

  run('zone-left', 'ZONE LEFT', 'shotgunSpread', 'runInside', { routeSign: { RB: -1 } }),
  run('toss-left', 'TOSS LEFT', 'shotgunSpread', 'runToss', { handoffYd: 3, routeSign: { RB: -1 } }),
  run('iso', 'ISO', 'singleback', 'runDive'),
  run('power-left', 'POWER LEFT', 'iForm', 'runPower', { routeSign: { RB: -1 } }),
  run('trips-zone', 'TRIPS ZONE', 'trips', 'runInside'),
  run('trips-draw', 'TRIPS DRAW', 'trips', 'runDraw', {
    routes: { X: 'go', H: 'go', Z: 'go', TE: 'block', RB: 'runDraw' }, routeDelay: { RB: 0.6 },
  }),
  run('i-stretch', 'I STRETCH', 'iForm', 'runStretch', { handoffYd: 2 }),
  run('sweep-left', 'SWEEP LEFT', 'iForm', 'runSweep', { handoffYd: 2.5, routeSign: { RB: -1 } }),
  run('counter-left', 'COUNTER LEFT', 'singleback', 'runCounter', { routeSign: { RB: -1 } }),
  run('gun-power', 'GUN POWER', 'shotgunSpread', 'runPower'),
  run('stretch-left', 'STRETCH LEFT', 'singleback', 'runStretch', { handoffYd: 2, routeSign: { RB: -1 } }),
  run('i-counter', 'I COUNTER', 'iForm', 'runCounter'),

  // ---------------------------------------------------------------- short passes
  pass('short', 'slants', 'QUICK SLANTS', 'shotgunSpread', { X: 'slant', H: 'slant', Z: 'slant', TE: 'hitch', RB: 'flat' }, { audible: 'inside-zone' }),
  pass('short', 'curl-flat', 'CURL FLAT', 'shotgunSpread', { X: 'curl', H: 'flat', Z: 'curl', TE: 'dig', RB: 'wheel' }, { audible: 'outside-toss' }),
  pass('short', 'quick-outs', 'QUICK OUTS', 'shotgunSpread', { X: 'quickOut', H: 'quickOut', Z: 'quickOut', TE: 'stick', RB: 'flat' }),
  pass('short', 'stick', 'STICK', 'trips', { X: 'slant', H: 'flat', Z: 'quickOut', TE: 'stick', RB: 'drag' }),
  pass('short', 'drive', 'DRIVE', 'singleback', { X: 'drag', H: 'dig', Z: 'hitch', TE: 'flat', RB: 'flat' }),
  pass('short', 'hitches', 'HITCHES', 'shotgunSpread', { X: 'hitch', H: 'hitch', Z: 'hitch', TE: 'hitch', RB: 'flat' }),
  pass('short', 'mesh', 'MESH', 'trips', { X: 'drag', H: 'drag', Z: 'hitch', TE: 'whip', RB: 'flat' }),
  { ...pass('short', 'rb-screen', 'RB SCREEN', 'shotgunSpread', { X: 'go', H: 'go', Z: 'go', TE: 'corner', RB: 'screen' }), type: 'screen', routeDelay: { RB: 0.6 } },

  pass('short', 'trips-slants', 'TRIPS SLANTS', 'trips', { X: 'slant', H: 'slant', Z: 'slant', TE: 'flat', RB: 'drag' }),
  pass('short', 'snag', 'SNAG', 'shotgunSpread', { X: 'hitch', H: 'corner', Z: 'stick', TE: 'flat', RB: 'flat' }),
  pass('short', 'spacing', 'SPACING', 'trips', { X: 'hitch', H: 'quickOut', Z: 'hitch', TE: 'stick', RB: 'flat' }),
  pass('short', 'shallow-cross', 'SHALLOW CROSS', 'singleback', { X: 'drag', H: 'dig', Z: 'curl', TE: 'drag', RB: 'flat' }),
  pass('short', 'te-stick', 'TE STICK', 'singleback', { X: 'quickOut', H: 'hitch', Z: 'slant', TE: 'stick', RB: 'flat' }),
  pass('short', 'out-hitch', 'OUT HITCH', 'shotgunSpread', { X: 'out', H: 'hitch', Z: 'out', TE: 'hitch', RB: 'drag' }),
  pass('short', 'whip-flat', 'WHIP FLAT', 'trips', { X: 'curl', H: 'flat', Z: 'whip', TE: 'drag', RB: 'flat' }),
  pass('short', 'checkdown', 'CHECKDOWN', 'shotgunSpread', { X: 'curl', H: 'dig', Z: 'curl', TE: 'drag', RB: 'checkdown' }),
  pass('short', 'slant-flat', 'SLANT FLAT', 'singleback', { X: 'slant', H: 'flat', Z: 'slant', TE: 'drag', RB: 'flat' }),
  pass('short', 'double-drag', 'DOUBLE DRAG', 'shotgunSpread', { X: 'drag', H: 'whip', Z: 'drag', TE: 'hitch', RB: 'flat' }),
  pass('short', 'hb-swing', 'HB SWING', 'shotgunSpread', { X: 'hitch', H: 'slant', Z: 'hitch', TE: 'stick', RB: 'hbSwing' }),
  { ...pass('short', 'trips-screen', 'TRIPS SCREEN', 'trips', { X: 'go', H: 'go', Z: 'go', TE: 'corner', RB: 'screen' }), type: 'screen', routeDelay: { RB: 0.6 } },

  // ---------------------------------------------------------------- long passes
  pass('long', 'four-verts', 'FOUR VERTS', 'shotgunSpread', { X: 'go', H: 'seam', Z: 'go', TE: 'seam', RB: 'flat' }, { routeDelay: { RB: 0.5 } }),
  pass('long', 'spread-post', 'SPREAD POST', 'shotgunSpread', { X: 'post', H: 'out', Z: 'curl', TE: 'seam', RB: 'flat' }),
  pass('long', 'deep-posts', 'DEEP POSTS', 'shotgunSpread', { X: 'deepPost', H: 'go', Z: 'deepPost', TE: 'seam', RB: 'flat' }),
  pass('long', 'corners', 'CORNERS', 'shotgunSpread', { X: 'deepCorner', H: 'out', Z: 'deepCorner', TE: 'seam', RB: 'flat' }),
  pass('long', 'fades', 'FADES', 'trips', { X: 'fade', H: 'seam', Z: 'fade', TE: 'dig', RB: 'flat' }),
  pass('long', 'comebacks', 'COMEBACKS', 'shotgunSpread', { X: 'comeback', H: 'go', Z: 'comeback', TE: 'seam', RB: 'flat' }),
  pass('long', 'deep-outs', 'DEEP OUTS', 'singleback', { X: 'deepOut', H: 'post', Z: 'deepOut', TE: 'seam', RB: 'flat' }),
  pass('long', 'post-wheel', 'POST WHEEL', 'shotgunSpread', { X: 'post', H: 'seam', Z: 'go', TE: 'dig', RB: 'wheel' }),

  pass('long', 'trips-verts', 'TRIPS VERTS', 'trips', { X: 'go', H: 'seam', Z: 'go', TE: 'seam', RB: 'flat' }),
  pass('long', 'mills', 'MILLS', 'shotgunSpread', { X: 'post', H: 'dig', Z: 'post', TE: 'dig', RB: 'flat' }),
  pass('long', 'smash', 'SMASH', 'shotgunSpread', { X: 'hitch', H: 'corner', Z: 'hitch', TE: 'corner', RB: 'flat' }),
  pass('long', 'deep-cross', 'DEEP CROSS', 'singleback', { X: 'deepCross', H: 'go', Z: 'dig', TE: 'seam', RB: 'flat' }),
  pass('long', 'dagger', 'DAGGER', 'trips', { X: 'go', H: 'seam', Z: 'dig', TE: 'dig', RB: 'flat' }),
  pass('long', 'go-fade', 'GO FADE', 'shotgunSpread', { X: 'fade', H: 'go', Z: 'fade', TE: 'seam', RB: 'flat' }),
  pass('long', 'post-corner', 'POST CORNER', 'singleback', { X: 'deepPost', H: 'deepCorner', Z: 'post', TE: 'seam', RB: 'flat' }),
  pass('long', 'scissors', 'SCISSORS', 'trips', { X: 'deepPost', H: 'deepCorner', Z: 'go', TE: 'seam', RB: 'flat' }),
  pass('long', 'comeback-seam', 'COMEBACK SEAM', 'singleback', { X: 'comeback', H: 'seam', Z: 'comeback', TE: 'seam', RB: 'flat' }),
  pass('long', 'wheel-go', 'WHEEL GO', 'shotgunSpread', { X: 'go', H: 'seam', Z: 'go', TE: 'dig', RB: 'wheel' }),
  pass('long', 'trips-deep-outs', 'TRIPS DEEP OUT', 'trips', { X: 'deepOut', H: 'seam', Z: 'deepOut', TE: 'dig', RB: 'flat' }),
  pass('long', 'max-protect', 'MAX PROTECT', 'iForm', { X: 'deepPost', Z: 'go', TE: 'block', H: 'block', RB: 'block' }),

  // ---------------------------------------------------------------- play action
  pa('pa-post', 'PA POST', 'iForm', { X: 'deepPost', Z: 'dig', TE: 'flat', H: 'block' }),
  pa('pa-cross', 'PA DEEP CROSS', 'singleback', { X: 'deepCross', H: 'go', Z: 'comeback', TE: 'flat' }, 'runInside'),
  pa('pa-flood', 'PA FLOOD', 'singleback', { X: 'post', H: 'out', Z: 'deepCorner', TE: 'flat' }, 'runPower'),
  pa('pa-seam', 'PA SEAM', 'iForm', { X: 'go', Z: 'go', TE: 'seam', H: 'flat' }),
  pa('pa-go', 'PA GO', 'iForm', { X: 'go', Z: 'fade', TE: 'dig', H: 'block' }, 'runPower'),
  pa('pa-slant', 'PA SLANT', 'singleback', { X: 'slant', H: 'slant', Z: 'slant', TE: 'seam' }),
  pa('pa-corner', 'PA CORNER', 'singleback', { X: 'deepCorner', H: 'dig', Z: 'post', TE: 'flat' }, 'runStretch'),
  pa('pa-te-leak', 'PA TE LEAK', 'iForm', { X: 'deepPost', Z: 'deepOut', TE: 'drag', H: 'flat' }),

  pa('pa-boot', 'PA BOOT', 'singleback', { X: 'drag', H: 'flat', Z: 'deepCorner', TE: 'dig' }, 'runStretch'),
  pa('pa-verts', 'PA VERTS', 'singleback', { X: 'go', H: 'seam', Z: 'go', TE: 'seam' }),
  pa('pa-dig', 'PA DIG', 'iForm', { X: 'dig', Z: 'deepPost', TE: 'seam', H: 'flat' }),
  pa('pa-comeback', 'PA COMEBACK', 'iForm', { X: 'comeback', Z: 'comeback', TE: 'seam', H: 'block' }, 'runPower'),
  pa('pa-mesh', 'PA MESH', 'singleback', { X: 'drag', H: 'drag', Z: 'post', TE: 'flat' }),
  pa('pa-fade', 'PA FADE', 'iForm', { X: 'fade', Z: 'fade', TE: 'dig', H: 'flat' }),
  pa('pa-gun-post', 'PA GUN POST', 'shotgunSpread', { X: 'deepPost', H: 'dig', Z: 'post', TE: 'flat' }, 'runInside'),
  pa('pa-trips-seam', 'PA TRIPS SEAM', 'trips', { X: 'go', H: 'seam', Z: 'deepCorner', TE: 'drag' }, 'runInside'),
  pa('pa-curl', 'PA CURL', 'singleback', { X: 'curl', H: 'seam', Z: 'curl', TE: 'flat' }, 'runCounter'),
  pa('pa-deep-out', 'PA DEEP OUT', 'iForm', { X: 'deepOut', Z: 'deepOut', TE: 'seam', H: 'flat' }, 'runStretch'),
  pa('pa-cross-flat', 'PA CROSS FLAT', 'iForm', { X: 'deepCross', Z: 'go', TE: 'flat', H: 'flat' }),
  pa('pa-wheel', 'PA WHEEL', 'singleback', { X: 'post', H: 'wheel', Z: 'dig', TE: 'seam' }, 'runInside'),

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
  { id: 'trick', name: 'TRICK' },     // plays/trickPlays.js - limited per game
];

export const playById = (id) => PLAYBOOK.find((p) => p.id === id);
export const DEFAULT_PLAY = playById('slants');
