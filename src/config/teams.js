// Every uniform and skin-tone colour lives here. Each uniform names a colour
// for every body part of the player sprites (see SHEET_COLOR_MAP in
// assets.js for which sprite pixels each slot paints).
//
// MATCHUP picks which uniform the offense ('home') and defense ('away') wear,
// so alternate uniforms are a one-line change.

const P = {
  ink: 0x1a1c2c, black: 0x141414, white: 0xf4f4f4, silver: 0x94b0c2, slate: 0x566c86,
  red: 0xb13e53, darkRed: 0x6e2a3c, lightRed: 0xd8607a, gold: 0xffcd75, orange: 0xef7d57,
  navy: 0x29366f, blue: 0x3b5dc9, sky: 0x41a6f6, cyan: 0x73eff7,
};

export const UNIFORMS = {
  redHome: {
    name: 'RED', abbr: 'RED',
    helmet: P.red, helmetDark: P.darkRed, stripe: P.gold, mask: P.black,
    jerseyLight: P.lightRed, jersey: P.red, jerseyDark: P.darkRed, trim: P.gold,
    pants: P.white, pantsDark: P.silver, socks: P.red, cleats: P.black,
  },
  redAlt: {
    name: 'RED', abbr: 'RED',
    helmet: P.white, helmetDark: P.silver, stripe: P.red, mask: P.black,
    jerseyLight: P.white, jersey: P.white, jerseyDark: P.silver, trim: P.red,
    pants: P.red, pantsDark: P.darkRed, socks: P.white, cleats: P.black,
  },
  blueAway: {
    name: 'BLUE', abbr: 'BLU',
    helmet: P.navy, helmetDark: P.ink, stripe: P.white, mask: P.black,
    jerseyLight: P.cyan, jersey: P.sky, jerseyDark: P.blue, trim: P.white,
    pants: P.silver, pantsDark: P.slate, socks: P.white, cleats: P.black,
  },
};

/** Which uniform each side wears this game. */
export const MATCHUP = { home: 'redHome', away: 'blueAway' };

export const TEAMS = {
  home: UNIFORMS[MATCHUP.home],
  away: UNIFORMS[MATCHUP.away],
};

/** Realistic skin tones as [light, shadow]; each player gets one for the whole game. */
export const SKIN_TONES = [
  [0xf1c9a5, 0xd3a07e],
  [0xd9a77d, 0xb5835e],
  [0xa86f4c, 0x86563a],
  [0x7a4a2f, 0x5c3622],
];
