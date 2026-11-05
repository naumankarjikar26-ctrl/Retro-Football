// Every number that decides catches, drops, break-ups and interceptions.
// Distances are in yards (on the ground), chances are 0..1.

export const CATCHING = {
  // When the ball is thrown, the receiver nearest the landing spot (within
  // this range) leaves his route and runs to the spot to make the catch.
  trackRadiusYd: 8,

  // Catch chance by the closest receiver's distance to the landing spot.
  tiers: [
    { maxYd: 1.5, chance: 0.90, dive: false },
    { maxYd: 3.0, chance: 0.65, dive: true },
    { maxYd: 4.0, chance: 0.30, dive: true },
  ],                       // beyond the last tier: incomplete

  // Contested: a defender this close to the receiver.
  contestedYd: 1.5,
  contestedPenalty: 0.25,   // catch chance drops by this much
  contestedKnockAway: 0.35, // chance the defender breaks it up first

  // A defender closer to the landing spot than any receiver.
  defenderReachYd: 1.5,     // he must be this close to the spot to make a play
  interceptChance: 0.30,    // otherwise it's broken up / incomplete

  // How the defense reacts once the ball is in the air.
  defenseReactSec: 0.4,     // reaction time before breaking on the ball
  breakOnBallYd: 5,         // defenders only break on the ball if this close to the spot
  defenseBreakSpeed: 0.85,  // fraction of top speed when breaking on the ball
  trailSpeedInAir: 0.75,    // a cover man trailing his receiver while the ball is in the air

  // Deep balls are a little harder to haul in.
  deepThrowYd: 40,
  deepPenalty: 0.08,
};
