// The horizontal field (offense drives left -> right) plus the line of
// scrimmage / first-down line overlays. Uses the SpawnCampGames field image,
// squashed vertically at boot for the three-quarter sideline view; falls back
// to a procedural field drawn with the same geometry.

import {
  PAL, TEAMS, WORLD_W, WORLD_H, FIELD_TOP, FIELD_BOTTOM, CENTER_Y, ENDZONE_YD, HASH_OFFSET_YD,
  yd, ydLat, yardToX,
} from '../config/constants.js';
import { drawGlyph } from '../gfx/PixelFont.js';

const hex = (c) => '#' + c.toString(16).padStart(6, '0');

export class Field {
  constructor(scene) {
    this.scene = scene;
    if (scene.textures.exists('field-image')) {
      scene.add.image(0, 0, 'field-image').setOrigin(0).setDepth(0);
    } else {
      if (!scene.textures.exists('field-baked')) scene.textures.addCanvas('field-baked', Field.bake());
      scene.add.image(0, 0, 'field-baked').setOrigin(0).setDepth(0);
    }
    this.lines = scene.add.graphics().setDepth(2);
  }

  /** Line of scrimmage (blue) and first-down line (yellow), drawn sideline to sideline. */
  setLines(losYard, firstDownYard) {
    const g = this.lines;
    const top = Math.round(FIELD_TOP);
    const h = Math.round(FIELD_BOTTOM) - top;
    g.clear();
    if (firstDownYard !== null && firstDownYard < 100) {
      g.fillStyle(PAL.sand, 1).fillRect(Math.round(yardToX(firstDownYard)) - 1, top, 2, h);
    }
    g.fillStyle(PAL.sky, 1).fillRect(Math.round(yardToX(losYard)) - 1, top, 2, h);
  }

  /** Procedural fallback field (only used if the field image is missing). */
  static bake() {
    const canvas = document.createElement('canvas');
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;
    const ctx = canvas.getContext('2d');
    const rect = (c, x, y, w, h) => { ctx.fillStyle = hex(c); ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    const top = Math.round(FIELD_TOP);
    const bottom = Math.round(FIELD_BOTTOM);
    const h = bottom - top;
    const left = Math.round(yardToX(-ENDZONE_YD));
    const right = Math.round(yardToX(100 + ENDZONE_YD));

    rect(0x237a41, 0, 0, WORLD_W, WORLD_H);
    for (let yl = 0; yl < 100; yl += 5) {
      rect((yl / 5) % 2 ? PAL.grassA : PAL.grassB, yardToX(yl), top, Math.ceil(yd(5)), h);
    }
    rect(TEAMS.home.jersey, left, top, Math.round(yd(ENDZONE_YD)), h);
    rect(TEAMS.away.jersey, yardToX(100), top, Math.round(yd(ENDZONE_YD)), h);

    const white = PAL.white;
    rect(white, left - 2, top - 2, right - left + 4, 2);
    rect(white, left - 2, bottom, right - left + 4, 2);
    rect(white, left - 2, top, 2, h);
    rect(white, right, top, 2, h);
    for (let yl = 0; yl <= 100; yl++) {
      const x = Math.round(yardToX(yl));
      if (yl % 5 === 0) rect(white, x, top, yl === 0 || yl === 100 ? 2 : 1, h);
      else {
        rect(white, x, top, 1, 2);
        rect(white, x, bottom - 2, 1, 2);
        rect(white, x, Math.round(CENTER_Y - ydLat(HASH_OFFSET_YD)) - 2, 1, 3);
        rect(white, x, Math.round(CENTER_Y + ydLat(HASH_OFFSET_YD)), 1, 3);
      }
    }
    // numbers along the near and far sides
    ctx.fillStyle = hex(white);
    for (let yl = 10; yl <= 90; yl += 10) {
      const label = String(yl <= 50 ? yl : 100 - yl);
      const x = Math.round(yardToX(yl)) - 7;
      [...label].forEach((ch, i) => {
        drawGlyph(ctx, ch, x + i * 8 + (i ? 1 : 0), bottom - 18, 2);
        drawGlyph(ctx, ch, x + i * 8 + (i ? 1 : 0), top + 8, 2);
      });
    }
    return canvas;
  }
}
