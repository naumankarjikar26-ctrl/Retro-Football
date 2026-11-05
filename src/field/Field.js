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

    // end zones in team colours with the team abbreviation
    const endZone = (x0, team) => {
      const w = X(0) - X(-ENDZONE_YD);
      rect(TEAMS[team].jersey, x0, top, w, h);
      rect(TEAMS[team].jerseyDark, x0, top, w, 2);
      ctx.fillStyle = hex(PAL.white);
      const s = 3;
      const word = TEAMS[team].abbr;
      const tw = word.length * 4 * s - s;
      [...word].forEach((ch, i) => drawGlyph(ctx, ch, x0 + Math.round((w - tw) / 2) + i * 4 * s, Math.round(CENTER_Y - 2.5 * s), s));
    };
    endZone(left, 'home');
    endZone(X(100), 'away');

    // lines: border, goal lines, every 5 yards; ticks every yard
    const white = PAL.white;
    rect(white, left - 2, top - 2, right - left + 4, 2);       // far sideline
    rect(white, left - 2, bottom, right - left + 4, 2);        // near sideline
    rect(white, left - 2, top, 2, h);                          // end lines
    rect(white, right, top, 2, h);
    const hashTop = Math.round(CENTER_Y - ydLat(HASH_OFFSET_YD));
    const hashBot = Math.round(CENTER_Y + ydLat(HASH_OFFSET_YD));
    for (let yl = 0; yl <= 100; yl++) {
      const x = X(yl);
      if (yl % 5 === 0) {
        rect(white, yl === 0 || yl === 100 ? x - 1 : x, top, yl === 0 || yl === 100 ? 2 : 1, h);
      } else {
        rect(white, x, top, 1, 2);
        rect(white, x, bottom - 2, 1, 2);
        rect(white, x, hashTop - 1, 1, 3);
        rect(white, x, hashBot - 1, 1, 3);
      }
    }

    // yard numbers, upright, with the line between the two digits
    ctx.fillStyle = hex(white);
    const s = 2;
    for (let yl = 10; yl <= 90; yl += 10) {
      const [a, b] = String(yl <= 50 ? yl : 100 - yl);
      const x = X(yl);
      for (const y of [top + 10, bottom - 10 - 5 * s]) { // near and far sides
        drawGlyph(ctx, a, x - 2 - 3 * s, y, s);
        drawGlyph(ctx, b, x + 3, y, s);
      }
    }

    // goal-line pylons
    for (const x of [left, X(0), X(100), right]) {
      rect(PAL.orange, x - 1, top - 2, 3, 3);
      rect(PAL.orange, x - 1, bottom - 1, 3, 3);
    }
    return canvas;
  }
}

