// Every number that decides catches, drops, break-ups and interceptions.
// Distances are in yards (on the ground), chances are 0..1.

export const CATCHING = {
  // When the ball is thrown, the receiver who can get closest to the landing
  // spot leaves his route and tracks the ball (also coming back on an
  // underthrow). He's picked if, running flat out until the ball lands, he
  // can end up within this many yards of the spot - so deep balls work too.
  trackRadiusYd: 10,
  trackAccelScale: 2.2,     // how much sharper a tracking receiver can stop / turn

  // Catch chance by the closest receiver's distance to the landing spot.
  tiers: [
    { maxYd: 1.5, chance: 0.90, dive: false },
    { maxYd: 3.0, chance: 0.65, dive: true },
    { maxYd: 4.0, chance: 0.30, dive: true },
  ],                       // beyond the last tier: incomplete

  // Contested: a defender this close to the receiver when it arrives lowers
  // the catch chance (he can't just knock it away - see below).
  contestedYd: 1.0,
  contestedPenalty: 0.25,   // catch chance drops by this much

  // A pass is only broken up (or picked) if a defender physically gets to the
  // ball first: within defenderReachYd of the spot AND at least beatByYd
  // closer to it than every receiver. Never by random chance.
  defenderReachYd: 1.0,
  beatByYd: 0.5,
  interceptChance: 0.30,    // when he does get there first: pick, otherwise broken up

  // How the defense reacts once the ball is in the air.
  defenseReactSec: 0.4,     // reaction time before breaking on the ball
  breakOnBallYd: 5,         // defenders only break on the ball if this close to the spot
  defenseBreakSpeed: 0.85,  // fraction of top speed when breaking on the ball
  trailSpeedInAir: 0.75,    // a cover man trailing his receiver while the ball is in the air

  // Deep balls are a little harder to haul in.
  deepThrowYd: 40,
  deepPenalty: 0.08,
};
