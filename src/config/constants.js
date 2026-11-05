// Global tuning values. Everything gameplay-related is measured in YARDS and
// converted to pixels with yd() so the field scale can change in one place.

export const VIEW_W = 320;
export const VIEW_H = 180;

// Field geometry is calibrated to the SpawnCampGames field image
// (assets/field/FootballFieldNoBranding.png, 1001x505), which is rotated 90
// degrees at boot so the field runs vertically. In that image 5 yards = 38.4 px.
export const PX_PER_YARD = 7.68;
export const yd = (yards) => yards * PX_PER_YARD;
export const toYards = (px) => px / PX_PER_YARD;

export const FIELD_WIDTH_YD = 160 / 3; // 53.33 yd
export const ENDZONE_YD = 10;
export const WORLD_W = 505;            // rotated image width
export const WORLD_H = 1001;           // rotated image height
export const FIELD_LEFT = 49;          // inner edge of the left sideline
export const FIELD_RIGHT = 458;        // inner edge of the right sideline
export const FIELD_W = FIELD_RIGHT - FIELD_LEFT;
export const CENTER_X = (FIELD_LEFT + FIELD_RIGHT) / 2;
export const OWN_GOAL_Y = 883.5;       // centre of the bottom goal line (yard 0)
export const HASH_OFFSET_YD = 7;       // ball is spotted between the image's hash marks

// Yard line (0 = own goal line, 100 = opponent goal line) -> world Y.
// Offense always moves UP the screen.
export const yardToY = (yardLine) => OWN_GOAL_Y - yd(yardLine);
export const yToYard = (y) => (OWN_GOAL_Y - y) / PX_PER_YARD;
// Lateral yards from the middle of the field -> world X.
export const latToX = (lat) => CENTER_X + yd(lat);
export const xToLat = (x) => toYards(x - CENTER_X);

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

// Each team's uniform: a light and dark shade for jersey, helmet and pants.
// (trim/stripe are only used by the procedural fallback sprites.)
export const TEAMS = {
  home: {
    name: 'HOME', jersey: PAL.red, jerseyDark: PAL.plum, helmet: PAL.orange, helmetDark: PAL.red,
    pants: PAL.white, pantsDark: PAL.silver, trim: PAL.white, stripe: PAL.red,
  },
  away: {
    name: 'AWAY', jersey: PAL.sky, jerseyDark: PAL.blue, helmet: PAL.navy, helmetDark: PAL.ink,
    pants: PAL.silver, pantsDark: PAL.slate, trim: PAL.white, stripe: PAL.navy,
  },
};

// Movement / feel. Speeds are yards per second.
export const TUNING = {
  accel: 28,               // yd/s^2 toward desired velocity
  idleSpeed: 0.35,
  walkSpeed: 3.2,
  snapTime: 0.22,          // seconds for the shotgun snap to reach the QB
  qbDropback: 2,           // yards the QB drifts back after the snap
  aimGain: 2.4,            // world px of throw distance per screen px dragged
  minThrowYd: 3,
  maxThrowYd: 60,
  catchRadiusYd: 1.7,
  tackleRadiusYd: 1.15,
  brokenTackleChance: 0.15,
  blockRadiusYd: 1.4,
  shedTime: [1.6, 4.2],    // seconds a defender stays engaged with a blocker
  resultHold: 1.8,         // seconds the result banner shows before resetting
  camLerp: 6,              // camera follow sharpness (higher = snappier)
  camGuardPx: 14,          // ball is always kept at least this far inside the view
};
