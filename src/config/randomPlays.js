// Everything the RANDOM PLAY generator draws from. Tune freely.

// Play type odds (equal by default).
export const TYPE_WEIGHTS = { run: 1, pass: 1, pa: 1 };

// Formations allowed for each type. PA must come from under center.
export const FORMATIONS = {
  run: ['shotgunSpread', 'iForm', 'singleback'],
  pass: ['shotgunSpread', 'trips', 'singleback', 'iForm'],
  pa: ['iForm', 'singleback'],
};

// Route tree: route name (plays/routes.js) -> depth class and weights.
// short < 7 yd, medium 8-15 yd, deep 16+ yd.
export const ROUTE_TREE = {
  slant:      { depth: 'short',  pass: 1.0, pa: 0.4 },
  flat:       { depth: 'short',  pass: 1.0, pa: 0.4 },
  drag:       { depth: 'short',  pass: 1.0, pa: 0.5 },
  hitch:      { depth: 'short',  pass: 0.8, pa: 0.3 },
  out:        { depth: 'medium', pass: 1.0, pa: 0.8 },
  dig:        { depth: 'medium', pass: 1.0, pa: 1.2 },   // "in"
  curl:       { depth: 'medium', pass: 1.0, pa: 0.8 },
  comeback:   { depth: 'medium', pass: 0.8, pa: 1.0 },
  corner:     { depth: 'medium', pass: 0.9, pa: 1.2 },
  post:       { depth: 'deep',   pass: 1.0, pa: 1.6 },
  go:         { depth: 'deep',   pass: 1.0, pa: 1.6 },
  seam:       { depth: 'deep',   pass: 0.9, pa: 1.4 },
  wheel:      { depth: 'deep',   pass: 0.6, pa: 1.0 },
  deepCross:  { depth: 'deep',   pass: 0.5, pa: 1.6 },
  deepCorner: { depth: 'deep',   pass: 0.6, pa: 1.4 },
};

// What a running back does on a random pass play.
export const RB_PASS_JOBS = { block: 1, flat: 1, wheel: 0.5, checkdown: 1 };
// ...and on play action after the fake (the fake path is run first).
export const RB_PA_JOBS = { block: 1, flat: 1 };

// Run types: run path per formation family (shotgun back is offset,
// under-center back is straight behind the QB). Each can go left or right.
export const RUN_TYPES = {
  'INSIDE ZONE':  { shotgun: 'runInside', underCenter: 'runDive',    handoffYd: 1.3, weight: 1 },
  'OUTSIDE ZONE': { shotgun: 'runToss',   underCenter: 'runStretch', handoffYd: 2.5, weight: 1 },
  POWER:          { shotgun: 'runInside', underCenter: 'runPower',   handoffYd: 1.3, weight: 1 },
  DIVE:           { shotgun: 'runInside', underCenter: 'runDive',    handoffYd: 1.3, weight: 1 },
  SWEEP:          { shotgun: 'runToss',   underCenter: 'runSweep',   handoffYd: 2.5, weight: 1 },
  DRAW:           { shotgun: 'runDraw',   underCenter: 'runDive',    handoffYd: 1.3, weight: 0.8, delay: 0.6 },
};
// On runs, each WR / TE blocks, or (this often) runs a decoy route.
export const DECOY_CHANCE = 0.3;
export const DECOY_ROUTES = ['go', 'post', 'out'];
