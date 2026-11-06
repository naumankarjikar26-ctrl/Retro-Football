// Movement feel: top speed by position and how players speed up, turn and
// animate. Speeds are yards per second BEFORE TUNING.playerSpeedScale.

export const POSITION_SPEED = {
  WR: 10.0, CB: 10.0,          // fastest
  RB: 9.4, S: 9.3,             // fast
  LB: 8.4, TE: 8.4,            // medium
  QB: 8.0,                     // medium
  OL: 6.4, DL: 5.8,            // slowest (DL also gets TUNING.rushSpeedScale)
};

export const MOVE = {
  accelTime: 0.3,       // seconds from standing to full speed
  cutAngleDeg: 60,      // turning harder than this at speed is a "hard cut"
  cutMinSpeed: 0.55,    // ...only above this fraction of top speed
  cutSlow: 0.7,         // speed fraction right after a hard cut
  cutSlowSec: 0.18,     // how long that slowdown lasts
  cutCooldown: 0.35,    // seconds between hard-cut slowdowns
};

export const ANIM = {
  runCycleYd: 2.0,      // ground covered by one full 6-frame run cycle (bigger = slower legs)
  walkCycleYd: 0.8,     // same for the walk cycle
  leanDeg: 6,           // forward lean at full speed
  bobFrames: [0, 1, 1, 0, 1, 1], // 1px up on the push-off frames of the run cycle
  breathSec: 1.6,       // idle breathing period (1px up / down)
  dustSec: 0.25,        // min seconds between dust puffs per player
};

// Ball carrier controls.
export const CARRIER = {
  steerSlope: 0.75,     // sideways per forward when steering up / down
  steerDeadPx: 6,       // press this close to his height = no steer
  swipeMaxMs: 280,      // a swipe is a quick flick...
  swipeMinPx: 22,       // ...at least this long
  jukeCooldown: 1.0,    // (unused: jukes use TUNING.jukeCooldown)
  jukeBurst: 1.15,      // speed fraction during the burst after a juke
  jukeBurstSec: 0.35,
  jukeNearYd: 3.5,      // defenders this close when you juke are "juked"
  jukedSec: 0.7,        // ...for this long: their tackle chance is lowered
  diveYd: 2.2,          // extra ground gained by a dive
  diveMs: 260,
};
