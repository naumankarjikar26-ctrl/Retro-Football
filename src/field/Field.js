// Draws the 100-yard vertical field (plus end zones) into one baked texture, and
// owns the line of scrimmage / first-down line overlays.

import {
  PAL, TEAMS, WORLD_W, WORLD_H, FIELD_LEFT, FIELD_RIGHT, FIELD_W, ENDZONE_YD,
  CENTER_X, HASH_OFFSET_YD, yd, yardToY,
} from '../config/constants.js';
import { drawGlyph } from '../gfx/PixelFont.js';

const hex = (c) => '#' + c.toString(16).padStart(6, '0');

export class Field {
  constructor(scene) {
    this.scene = scene;
    if (scene.textures.exists('field-image')) {
      // SpawnCampGames field, rotated at boot; constants.js is calibrated to it.
      scene.add.image(0, 0, 'field-image').setOrigin(0).setDepth(0);
    } else {
      // Fallback: procedural field built from the same geometry constants.
      if (!scene.textures.exists('field-baked')) scene.textures.addCanvas('field-baked', Field.bake(true));
      scene.add.image(0, 0, 'field-baked').setOrigin(0).setDepth(1);
    }

    this.lines = scene.add.graphics().setDepth(2);
  }

  /** Line of scrimmage (blue) and first-down line (yellow). Yard values 0-100. */
  setLines(losYard, firstDownYard) {
    const g = this.lines;
    g.clear();
    if (firstDownYard !== null && firstDownYard < 100) {
      g.fillStyle(PAL.sand, 1).fillRect(FIELD_LEFT, Math.round(yardToY(firstDownYard)) - 1, FIELD_W, 2);
    }
    g.fillStyle(PAL.sky, 1).fillRect(FIELD_LEFT, Math.round(yardToY(losYard)) - 1, FIELD_W, 2);
  }

  static bake(drawGrass) {
    const canvas = document.createElement('canvas');
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;
    const ctx = canvas.getContext('2d');
    const rect = (c, x, y, w, h) => { ctx.fillStyle = hex(c); ctx.fillRect(Math.round(x), Math.round(y), w, h); };

    const top = yardToY(100 + ENDZONE_YD);
    const bottom = yardToY(-ENDZONE_YD);

    if (drawGrass) {
      rect(0x237a41, 0, 0, WORLD_W, WORLD_H); // sideline / surround
      // 5-yard mowing stripes across the playing field
      for (let yl = 0; yl < 100; yl += 5) {
        rect((yl / 5) % 2 ? PAL.grassA : PAL.grassB, FIELD_LEFT, yardToY(yl + 5), FIELD_W, yd(5));
      }
    }

    // End zones: offense (home) defends the bottom one, attacks the top one.
    const ez = (yTop, team) => {
      rect(TEAMS[team].jersey, FIELD_LEFT, yTop, FIELD_W, yd(ENDZONE_YD));
      // diagonal pinstripes
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let x = -yd(ENDZONE_YD); x < FIELD_W; x += 8) {
        for (let i = 0; i < yd(ENDZONE_YD); i++) ctx.fillRect(FIELD_LEFT + x + i, yTop + i, 3, 1);
      }
      ctx.fillStyle = hex(PAL.white);
      const word = TEAMS[team].name;
      const s = 5;
      const w = word.length * 4 * s - s;
      [...word].forEach((ch, i) => drawGlyph(ctx, ch, CENTER_X - w / 2 + i * 4 * s, yTop + (yd(ENDZONE_YD) - 5 * s) / 2, s));
    };
    ez(top, 'away');
    ez(yardToY(0), 'home');

    // Border (sidelines + end lines) and goal lines
    const white = PAL.white;
    rect(white, FIELD_LEFT - 2, top - 2, FIELD_W + 4, 2);
    rect(white, FIELD_LEFT - 2, bottom, FIELD_W + 4, 2);
    rect(white, FIELD_LEFT - 2, top - 2, 2, bottom - top + 4);
    rect(white, FIELD_RIGHT, top - 2, 2, bottom - top + 4);
    rect(white, FIELD_LEFT, yardToY(100) - 1, FIELD_W, 2);
    rect(white, FIELD_LEFT, yardToY(0) - 1, FIELD_W, 2);

    // Yard lines every 5, hash marks every yard
    const hashL = CENTER_X - yd(HASH_OFFSET_YD);
    const hashR = CENTER_X + yd(HASH_OFFSET_YD);
    for (let yl = 1; yl < 100; yl++) {
      const y = Math.round(yardToY(yl));
      if (yl % 5 === 0) {
        rect(white, FIELD_LEFT, y, FIELD_W, 1);
      } else {
        rect(white, FIELD_LEFT, y, 3, 1);
        rect(white, FIELD_RIGHT - 3, y, 3, 1);
        rect(white, FIELD_LEFT + yd(1.3), y, 3, 1);
        rect(white, FIELD_RIGHT - yd(1.3) - 3, y, 3, 1);
        rect(white, hashL - 1, y, 3, 1);
        rect(white, hashR - 2, y, 3, 1);
      }
    }

    // Numbers every 10, rotated so they read from each sideline
    ctx.fillStyle = hex(white);
    const drawNumber = (text, cx, cy, angle) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const s = 2;
      const w = text.length * 4 * s - s;
      [...text].forEach((ch, i) => drawGlyph(ctx, ch, -w / 2 + i * 4 * s + (i ? 1 : -1), -2.5 * s, s));
      ctx.restore();
    };
    for (let yl = 10; yl <= 90; yl += 10) {
      const label = String(yl <= 50 ? yl : 100 - yl);
      const y = Math.round(yardToY(yl));
      drawNumber(label, Math.round(FIELD_LEFT + yd(8)), y, Math.PI / 2);
      drawNumber(label, Math.round(FIELD_RIGHT - yd(8)), y, -Math.PI / 2);
    }

    // Goal-line pylons
    for (const y of [top, yardToY(100), yardToY(0), bottom]) {
      rect(PAL.orange, FIELD_LEFT - 2, Math.round(y) - 1, 3, 3);
      rect(PAL.orange, FIELD_RIGHT - 1, Math.round(y) - 1, 3, 3);
    }
    return canvas;
  }
}
