// Trick plays, as data. Each one is run by systems/TrickRunner.js, step by
// step, after the snap. To add a trick play, add an entry here using the
// step actions below - no code changes needed.
//
//   formation   key in plays/formations.js
//   routes      slot -> route (plays/routes.js); 'block' = blocks
//   routeDelay  slot -> seconds before he releases
//   bite        how the defense reacts at a step that has `bite: true`:
//                 { roles: ['LB', 'S', 'CB'], toward: 'line' | 'deep' | <slot>, sec }
//   steps       run in order. Every step waits for its trigger, then acts:
//     { do: 'dropback', who, yards, async }     player backpedals (default QB); async: the
//                                               next step starts while he keeps dropping
//     { do: 'wait', sec }                       pause
//     { do: 'handoff', from, to, near }         ball changes hands when `to` is within `near` yards
//     { do: 'takeFromHand', from, to, near }    `to` takes it out of `from`'s raised hand
//     { do: 'pitch' | 'lateral', from, to, after, maxWait }
//                                               toss that must go sideways / backward; waits up to
//                                               maxWait for a legal angle, else `from` keeps it (run)
//     { do: 'fakeThrow', who, hold, endWhenNear }
//                                               arm up, ball held high for `hold` seconds, or until
//                                               endWhenNear: { who, yd } arrives to take it
//     { do: 'route', who, route }               give a player a route now
//     { do: 'throw', who }                      you aim and throw with `who` (pull back as normal)
//     { do: 'afterCatch', by }                  wait until `by` has caught your pass
//     { do: 'trail', who, of, back, side }      background: `who` shadows `of` (yards behind / outside)
//     { do: 'run', who }                        `who` keeps it: you control him (runs straight, juke)
//   A step can add `bite: true` (defense reacts) and `when: { defenderYd, after }`
//   (for laterals: go when a defender is this close OR this many seconds pass).

export const TRICK_PLAYS = [
  {
    id: 'flea-flicker', name: 'FLEA FLICKER', formation: 'singleback',
    routes: { X: 'go', Z: 'deepPost', H: 'deepCross', TE: 'block', RB: 'fleaRun' },
    routeDelay: { X: 0.5, Z: 0.5, H: 0.6 },
    bite: { roles: ['LB', 'S'], toward: 'line', sec: 0.8 },
    steps: [
      { do: 'handoff', from: 'QB', to: 'RB', near: 1.3, bite: true },
      { do: 'dropback', who: 'QB', yards: 5, async: true },   // QB backs away as the RB heads for the line
      { do: 'pitch', from: 'RB', to: 'QB', after: 0.2, maxWait: 1.5 },
      { do: 'throw', who: 'QB' },
    ],
  },
  {
    id: 'statue', name: 'STATUE OF LIBERTY', formation: 'shotgunSpread',
    routes: { X: 'go', Z: 'go', H: 'out', TE: 'seam', RB: 'statueRB' },
    routeDelay: { RB: 1.3 },    // lets the fake sell before he comes around
    bite: { roles: ['LB', 'S', 'CB'], toward: 'deep', sec: 0.9 },
    steps: [
      { do: 'dropback', who: 'QB', yards: 2 },
      { do: 'fakeThrow', who: 'QB', hold: 2, bite: true, endWhenNear: { who: 'RB', yd: 1.6 } },
      { do: 'takeFromHand', from: 'QB', to: 'RB', near: 1.8 },
      { do: 'run', who: 'RB' },
    ],
  },
  {
    id: 'qb-draw', name: 'QB DRAW', formation: 'shotgunSpread',
    routes: { X: 'go', Z: 'go', H: 'deepPost', TE: 'seam', RB: 'block' },
    bite: { roles: ['LB', 'S', 'CB'], toward: 'deep', sec: 1.0 },
    steps: [
      { do: 'dropback', who: 'QB', yards: 2, bite: true },
      { do: 'wait', sec: 0.7 },
      { do: 'run', who: 'QB' },
    ],
  },
  {
    id: 'wr-pass', name: 'WR PASS', formation: 'shotgunSpread',
    routes: { X: 'go', Z: 'go', H: 'wrBack', TE: 'seam', RB: 'block' },
    routeDelay: { X: 0.3, Z: 0.3 },
    bite: { roles: ['LB', 'S'], toward: 'line', sec: 0.9 },
    steps: [
      { do: 'lateral', from: 'QB', to: 'H', after: 0.55, maxWait: 1.5, bite: true },
      { do: 'route', who: 'QB', route: 'flat' },   // QB slips out as a check-down
      { do: 'throw', who: 'H' },
    ],
  },
  {
    id: 'hook-lateral', name: 'HOOK AND LATERAL', formation: 'trips',
    routes: { Z: 'curl', H: 'hookTrail', X: 'go', TE: 'flat', RB: 'block' },
    // coverage plays soft / deep at the snap, then closes on the hook
    bite: { roles: ['CB', 'S'], toward: 'deep', sec: 0.85 },
    steps: [
      { do: 'wait', sec: 0, bite: true },
      { do: 'throw', who: 'QB' },
      { do: 'trail', who: 'H', of: 'Z', back: 2.5, side: 2 },   // H shadows the hook, ready for the pitch
      { do: 'afterCatch', by: 'Z' },
      { do: 'lateral', from: 'Z', to: 'H', when: { defenderYd: 5, after: 0.35 }, maxWait: 1.6 },
      { do: 'run', who: 'H' },
    ],
  },
];

export const trickById = (id) => TRICK_PLAYS.find((t) => t.id === id);
