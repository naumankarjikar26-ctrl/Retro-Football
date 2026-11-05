// Asset manifest.
//
// Player sheets: Lumenlore "Top Down Prototype Character Template".
// Each sheet is 8 direction rows x N frames of 64x64. The frame count per row
// is worked out at boot from the image width.
// Field + football: SpawnCampGames "Football Sprites 2D".
//
// Any entry with `path: null` falls back to procedural art (src/gfx/PlaceholderArt.js).

// Order of the 8 direction ROWS in the Lumenlore sheets, top row first.
export const DIR_ORDER = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];

export const PLAYER_FRAME = { width: 64, height: 64 };
// The character's feet sit at y=47 inside the 64x64 frame.
export const PLAYER_ORIGIN = { x: 0.5, y: 47 / 64 };
// Height of the hands above the feet (px) — where a carried ball is drawn.
export const HAND_HEIGHT = 11;

export const PLAYER_ANIMS = {
  idle:  { path: 'assets/players/Idle.png',             frameRate: 6,  repeat: -1, placeholderFrames: 2 },
  walk:  { path: 'assets/players/Walk.png',             frameRate: 10, repeat: -1, placeholderFrames: 4 },
  run:   { path: 'assets/players/Run.png',              frameRate: 13, repeat: -1, placeholderFrames: 6 },
  punch: { path: 'assets/players/Right-Hand-Punch.png', frameRate: 20, repeat: 0,  placeholderFrames: 4 }, // QB throw
  death: { path: 'assets/players/Death.png',            frameRate: 16, repeat: 0,  placeholderFrames: 5 }, // tackled
};

// Palette swap for the Lumenlore sheets: source colour -> team colour slot.
// (Arms and legs share colours in the template, so both become "pants".)
export const SHEET_COLOR_MAP = {
  0x3ceaf0: 'helmet',     // head
  0x379fdb: 'helmetDark', // head shading / face
  0x6abe30: 'jersey',     // torso light
  0x37946e: 'jerseyDark', // torso dark
  0xac3232: 'pants',      // right limbs light
  0x6e2025: 'pantsDark',  // right limbs dark
  0x306082: 'pants',      // left limbs light
  0x304682: 'pantsDark',  // left limbs dark
};

// Key colours used by the procedural fallback sprites.
export const PLAYER_KEY_COLORS = {
  jersey: 0xff00ff,
  trim: 0xff80ff,
  helmet: 0x00ffff,
  stripe: 0x00a0a0,
  pants: 0xffff00,
};

export const FIELD_ASSETS = {
  field: { path: 'assets/field/FootballFieldNoBranding.png' }, // horizontal; rotated at boot
  accessories: { path: 'assets/field/FootballFieldAccessories.png' },
};

// Football frames inside FootballFieldAccessories.png ([x, y, w, h]).
// Right column = spiral spin, left column = end-over-end tumble.
export const FOOTBALL_SPIRAL = [
  [684, 278, 15, 10], [684, 290, 15, 10], [684, 302, 15, 10], [684, 315, 15, 10],
  [684, 327, 15, 10], [684, 339, 15, 10], [684, 351, 15, 10], [684, 363, 15, 10],
];
export const FOOTBALL_TUMBLE = [
  [664, 278, 15, 10], [664, 290, 15, 10], [664, 302, 15, 10], [664, 315, 15, 10],
  [664, 327, 15, 10], [664, 339, 15, 10], [664, 351, 15, 10], [664, 363, 15, 10],
];
