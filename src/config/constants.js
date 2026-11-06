// Global tuning values. Everything gameplay-related is measured in YARDS and
// converted to pixels with yd() so the field scale can change in one place.

export const VIEW_W = 640;   // wide internal view: players small against a big field (still pixel-perfect)
export const VIEW_H = 360;

// ---------------------------------------------------------------------------
// View: a HORIZONTAL field seen from a high sideline at a three-quarter angle.
// Offense drives left -> right. Downfield distance runs along screen X at full
// scale; side-to-side distance runs along screen Y, foreshortened by
// LAT_SCALE so the WHOLE field width (sideline to sideline) always fits on
// screen. Players are drawn upright and sorted by Y (lower = in front).
//
// Screen layout (internal 640x360):
//   [ top bar: score / down & distance ]  BAR_H
//   [ field camera                     ]  FIELD_VIEW_H
//   [ bottom bar: control hints        ]  HINT_H
// ---------------------------------------------------------------------------
export const BAR_H = 20;
export const HINT_H = 19;
export const FIELD_VIEW_H = VIEW_H - BAR_H - HINT_H; // 161

export const PX_PER_YARD = 26;              // ~25 yards visible across the 640px view
export const FIELD_WIDTH_YD = 60;                    // wider than a real field (53.3 yd) to give out routes room
export const FIELD_PX_H = 468;   // sideline to sideline on screen: a sideways yard is ~0.3 of a downfield yard, like Retro Bowl
export const LAT_SCALE = FIELD_PX_H / (FIELD_WIDTH_YD * PX_PER_YARD); // 0.3
export const yd = (yards) => yards * PX_PER_YARD;                // downfield yards -> px (x)
export const ydLat = (yards) => yards * PX_PER_YARD * LAT_SCALE; // lateral yards -> px (y)
export const toYards = (px) => px / PX_PER_YARD;

export const ENDZONE_YD = 10;
export const END_PAD = 24;                     // bench / sideline area past each end line (px)
export const OWN_GOAL_X = END_PAD + yd(ENDZONE_YD);   // left goal line (yard 0)
export const WORLD_W = END_PAD * 2 + yd(100 + ENDZONE_YD * 2);
export const FIELD_TOP = 140;                  // far sideline (room above for players' bodies + high throws)
export const FIELD_BOTTOM = FIELD_TOP + FIELD_PX_H; // near sideline
export const WORLD_H = FIELD_BOTTOM + 20;
export const CENTER_Y = (FIELD_TOP + FIELD_BOTTOM) / 2;
export const HASH_OFFSET_YD = 4.5;             // hashes ~9 yards apart; the ball is spotted between them
export const SIDELINE_MARGIN_YD = 2;           // AI players and routes stay this far inside

// Yard line (0 = own goal line, 100 = opponent goal line) <-> world X.
export const yardToX = (yardLine) => OWN_GOAL_X + yd(yardLine);
export const xToYard = (x) => (x - OWN_GOAL_X) / PX_PER_YARD;
// Lateral yards from the middle of the field (+ = near side) <-> world Y.
export const latToY = (lat) => CENTER_Y + ydLat(lat);
export const yToLat = (y) => (y - CENTER_Y) / (PX_PER_YARD * LAT_SCALE);

// Ground-plane helpers. Screen Y is foreshortened, so real distances must
// un-squash it before measuring (tackle/catch/block radii, throw length...).
export const groundLen = (dx, dy) => Math.hypot(dx, dy / LAT_SCALE);
export const gdist = (a, b) => groundLen(b.x - a.x, b.y - a.y);

// Limited retro palette ("Sweetie 16" + two grass shades).
export const PAL = {
  ink: 0x1a1c2c,
  plum: 0x5d275d,
  red: 0xb13e53,
  orange: 0xef7d57,
  sand: 0xffcd75,
  lime: 0xa7f070,
  green: 0x38b764,
  teal: 0x257179,
  navy: 0x29366f,
  blue: 0x3b5dc9,
  sky: 0x41a6f6,
  cyan: 0x73eff7,
  white: 0xf4f4f4,
  silver: 0x94b0c2,
  slate: 0x566c86,
  dusk: 0x333c57,
  grassA: 0x2f9a52,
  grassB: 0x2a8a49,
  ball: 0x7a3b1e,
};

// Uniforms and skin tones live in teams.js.
export { TEAMS } from './teams.js';

// Movement / feel. Speeds are yards per second.
export const TUNING = {
  accel: 28,               // yd/s^2 toward desired velocity
  idleSpeed: 0.35,
  walkSpeed: 3.2,
  snapTime: 0.22,          // seconds for the shotgun snap to reach the QB
  qbDropback: 2,           // yards the QB drifts back after the snap
  // Pull-back throwing (screen px at the 320x180 internal resolution)
  pullCancelPx: 12,         // release with less pull than this = no throw
  releaseIgnoreMs: 110,    // pointer movement this close to release is lift-off jitter
  pullMaxPx: 200,           // full power
  minThrowYd: 5,           // throw length at the smallest pull
  maxThrowYd: 60,          // throw length at full pull
  catchRadiusYd: 1.7,
  tackleRadiusYd: 1.15,
  // Ball carrier jukes (one up/down press = one juke)
  jukeYards: 2.5,          // sidestep distance
  jukeTime: 0.16,          // seconds the sidestep takes
  jukeEvadeWindow: 0.25,   // extra seconds after it when tacklers tend to whiff
  jukeEvadeChance: 0.8,    // chance a tackle attempt in that window misses
  playerSpeedScale: 0.72,  // everyone runs at this fraction of their rating
  rushSpeedScale: 0.85,    // pass rushers slowed a bit more, for time to throw
  playClockSec: 25,        // play clock: seconds to snap before a delay of game
  trickPlaysPerGame: 4,    // TRICK PLAY uses per game
  lateralDropChance: 0.07, // chance a pitch / lateral is dropped (fumble)
  paFakeTime: 0.45,        // play action: QB holds the fake this long before dropping
  jukeCooldown: 0.3,       // seconds before the next juke
  jukeSlowdown: 0.75,      // speed while recovering from a juke (fraction of top speed)
  jukeSlowTime: 0.4,       // seconds that slowdown lasts
  // Chance a ball carrier escapes a tackle attempt (3 in 8). Later: from ratings.
  brokenTackleChance: 3 / 8,
  tackleRetryDelay: 1.0,     // seconds before a whiffed defender may try again
  blockRadiusYd: 1.4,
  shedTime: [2.6, 5.2],    // seconds a defender stays engaged with a blocker
  resultHold: 1.8,         // seconds the result banner shows before resetting
  camLerp: 6,              // camera follow sharpness (higher = snappier)
  camZoomLerp: 4,          // how quickly the camera zooms in at the snap
  camGuardPx: 10,          // ball is always kept at least this far inside the view
};
