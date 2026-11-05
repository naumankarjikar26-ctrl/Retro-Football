// The horizontal field, drawn procedurally so every stripe, line and number
// lines up exactly with the game's yard geometry. Offense drives left -> right.
// Also owns the line of scrimmage / first-down line overlays.

import {
  PAL, TEAMS, WORLD_W, WORLD_H, FIELD_TOP, FIELD_BOTTOM, CENTER_Y, ENDZONE_YD, HASH_OFFSET_YD,
  ydLat, yardToX,
} from '../config/constants.js';
import { drawGlyph } from '../gfx/PixelFont.js';

const hex = (c) => '#' + c.toString(16).padStart(6, '0');

const GRASS_LIGHT = 0x3f9e4a;
const GRASS_DARK = 0x358a40;
const SURROUND = 0x245c33;   // sideline / bench area outside the field

export class Field {
  constructor(scene) {
    this.scene = scene;
    if (!scene.textures.exists('field-baked')) scene.textures.addCanvas('field-baked', Field.bake());
    scene.add.image(0, 0, 'field-baked').setOrigin(0).setDepth(0);
    this.lines = scene.add.graphics().setDepth(2);
  }

  /** Line of scrimmage (blue) and first-down line (yellow), sideline to sideline. */
  setLines(losYard, firstDownYard) {
    const g = this.lines;
    const h = FIELD_BOTTOM - FIELD_TOP;
    g.clear();
    if (firstDownYard !== null && firstDownYard < 100) {
      g.fillStyle(PAL.sand, 1).fillRect(Math.round(yardToX(firstDownYard)) - 1, FIELD_TOP, 2, h);
    }
    g.fillStyle(PAL.sky, 1).fillRect(Math.round(yardToX(losYard)) - 1, FIELD_TOP, 2, h);
  }

  /** Deterministic speckle: a few lighter / darker pixels per area. */
  static addNoise(ctx, x0, y0, w, h) {
    const img = ctx.getImageData(x0, y0, w, h);
    const d = img.data;
    let seed = 1337;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < d.length; i += 4) {
      const r = rnd();
      const k = r < 0.06 ? 10 : r < 0.12 ? -9 : r < 0.14 ? 16 : 0;
      if (!k) continue;
      d[i] = Math.max(0, Math.min(255, d[i] + k));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + k));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + k));
    }
    ctx.putImageData(img, x0, y0);
  }

  static bake() {
    const canvas = document.createElement('canvas');
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;
    const ctx = canvas.getContext('2d');
    const rect = (c, x, y, w, h) => { ctx.fillStyle = hex(c); ctx.fillRect(x, y, w, h); };
    const X = (yl) => Math.round(yardToX(yl));
    const top = FIELD_TOP;
    const bottom = FIELD_BOTTOM;
    const h = bottom - top;
    const left = X(-ENDZONE_YD);
    const right = X(100 + ENDZONE_YD);

    // surround + team bench strips on both sidelines
    rect(SURROUND, 0, 0, WORLD_W, WORLD_H);

    // 5-yard stripes, exactly between yard lines
    for (let yl = 0; yl < 100; yl += 5) {
      rect((yl / 5) % 2 ? GRASS_DARK : GRASS_LIGHT, X(yl), top, X(yl + 5) - X(yl), h);
    }

    // subtle pixel noise on the grass so the stripes aren't flat
    Field.addNoise(ctx, X(0), top, X(100) - X(0), h);

    // end zones in team colours with the team abbreviation
    const endZone = (x0, team) => {
      const w = X(0) - X(-ENDZONE_YD);
      rect(TEAMS[team].jersey, x0, top, w, h);
      rect(TEAMS[team].jerseyDark, x0, top, w, 2);
      ctx.fillStyle = hex(PAL.white);
      const s = 20; // big pixel letters
      const word = TEAMS[team].abbr;
      const tw = word.length * 4 * s - s;
      [...word].forEach((ch, i) => drawGlyph(ctx, ch, x0 + Math.round((w - tw) / 2) + i * 4 * s, Math.round(CENTER_Y - 2.5 * s), s));
    };
    endZone(left, 'home');
    endZone(X(100), 'away');

    // lines: border, goal lines, every 5 yards; ticks every yard
    const white = PAL.white;
    rect(white, left - 3, top - 3, right - left + 6, 3);       // far sideline
    rect(white, left - 3, bottom, right - left + 6, 3);        // near sideline
    rect(white, left - 3, top, 3, h);                          // end lines
    rect(white, right, top, 3, h);
    const hashTop = Math.round(CENTER_Y - ydLat(HASH_OFFSET_YD));
    const hashBot = Math.round(CENTER_Y + ydLat(HASH_OFFSET_YD));
    for (let yl = 0; yl <= 100; yl++) {
      const x = X(yl);
      if (yl % 5 === 0) {
        // goal lines 3px, every 5 yards 2px
        rect(white, yl === 0 || yl === 100 ? x - 1 : x - 1, top, yl === 0 || yl === 100 ? 3 : 2, h);
      }
    }
    // tick / hash marks: two evenly spaced between each pair of 5-yard lines
    // (a wider gap than one per yard)
    for (let yl = 0; yl < 100; yl += 5) {
      for (const f of [5 / 3, 10 / 3]) {
        const x = Math.round(yardToX(yl + f));
        rect(white, x - 1, top, 2, 4);
        rect(white, x - 1, bottom - 4, 2, 4);
        rect(white, x - 1, hashTop - 2, 2, 5);
        rect(white, x - 1, hashBot - 2, 2, 5);
      }
    }

    // yard numbers, upright, slightly see-through so they don't overpower players
    ctx.fillStyle = hex(white);
    ctx.globalAlpha = 0.55;
    const s = 10;
    for (let yl = 10; yl <= 90; yl += 10) {
      const [a, b] = String(yl <= 50 ? yl : 100 - yl);
      const x = X(yl);
      for (const y of [top + 10, bottom - 10 - 5 * s]) { // near and far sides
        drawGlyph(ctx, a, x - 3 - 3 * s, y, s);
        drawGlyph(ctx, b, x + 4, y, s);
      }
    }

    ctx.globalAlpha = 1;

    // goalposts at the back of each end zone (seen from above: crossbar
    // across the end line, uprights 18'6" apart)
    for (const x of [left, right]) {
      const half = ydLat(3.08);
      rect(0xffe14d, x - 1, Math.round(CENTER_Y - half), 3, Math.round(half * 2));
      rect(0xffe14d, x - 3, Math.round(CENTER_Y - half) - 2, 7, 3);
      rect(0xffe14d, x - 3, Math.round(CENTER_Y + half) - 1, 7, 3);
    }

    // goal-line pylons
    for (const x of [left, X(0), X(100), right]) {
      rect(PAL.orange, x - 1, top - 2, 3, 3);
      rect(PAL.orange, x - 1, bottom - 1, 3, 3);
    }
    return canvas;
  }
}

