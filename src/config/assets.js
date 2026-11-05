// Asset manifest.
//
// Every entry with `path: null` is drawn procedurally at boot (see
// src/gfx/PlaceholderArt.js). To use the real sprite packs, drop the files in
// assets/field and assets/players and fill in the paths below. Frame counts
// are worked out from the image size at boot (image width / frameWidth), so
// only the frame size and direction row order need to be right.

// Order of the 8 direction ROWS in a player sheet, top row first.
// (Lumenlore-style sheets usually go S, SE, E, NE, N, NW, W, SW — adjust if not.)
export const DIR_ORDER = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];

export const PLAYER_FRAME = { width: 32, height: 32 };

// One sheet per animation, 8 rows (directions) x N columns (frames).
export const PLAYER_ANIMS = {
  idle:  { path: null, frameRate: 4,  repeat: -1, placeholderFrames: 2 },
  walk:  { path: null, frameRate: 8,  repeat: -1, placeholderFrames: 4 },
  run:   { path: null, frameRate: 12, repeat: -1, placeholderFrames: 6 },
  punch: { path: null, frameRate: 18, repeat: 0,  placeholderFrames: 4 }, // QB throw
  death: { path: null, frameRate: 12, repeat: 0,  placeholderFrames: 5 }, // tackled
};

// Jersey recolor. For the placeholder sprites these key colors are swapped per
// team (true palette swap). For a real sheet, list its jersey/helmet colors
// here; if a real sheet is loaded and the list is empty, sprites are tinted.
export const PLAYER_KEY_COLORS = {
  jersey: 0xff00ff,
  trim: 0xff80ff,
  helmet: 0x00ffff,
  stripe: 0x00a0a0,
  pants: 0xffff00,
};

export const FIELD_ASSETS = {
  grass: { path: null },      // optional tile drawn under the procedural lines
  football: { path: null },
  shadow: { path: null },
  // Later stages: power meter, aiming arrow, touchdown markers, referee + flags.
  referee: { path: null },
  flag: { path: null },
};
