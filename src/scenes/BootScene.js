// Loads the sprite packs, rotates the field, cuts the football frames,
// palette-swaps the player sheets per team, slices them and builds animations.
// Anything missing falls back to procedural placeholder art.

import {
  DIR_ORDER, PLAYER_FRAME, PLAYER_ANIMS, PLAYER_KEY_COLORS, SHEET_COLOR_MAP,
  FIELD_ASSETS, FOOTBALL_SPIRAL, FOOTBALL_TUMBLE,
} from '../config/assets.js';
import { TEAMS, WORLD_W, WORLD_H } from '../config/constants.js';
import { buildPlaceholderPlayerSheets, buildPlaceholderMisc, paletteSwap } from '../gfx/PlaceholderArt.js';
import { registerPixelFont } from '../gfx/PixelFont.js';

const canvasFromImage = (img) => {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
};

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    for (const [anim, def] of Object.entries(PLAYER_ANIMS)) {
      if (def.path) this.load.image(`player-src-${anim}`, def.path);
    }
    for (const [key, def] of Object.entries(FIELD_ASSETS)) {
      if (def.path) this.load.image(`src-${key}`, def.path);
    }
  }

  create() {
    registerPixelFont(this);
    this.buildField();
    this.buildFootball();
    buildPlaceholderMisc(this); // fills in only what is still missing
    this.buildPlayers();
    this.scene.start('Game');
  }

  /**
   * The field image is already horizontal (offense drives left -> right).
   * Squash it vertically by LAT_SCALE for the three-quarter sideline view.
   */
  buildField() {
    if (!this.textures.exists('src-field')) return;
    const img = this.textures.get('src-field').getSourceImage();
    const c = document.createElement('canvas');
    c.width = WORLD_W;
    c.height = WORLD_H;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, WORLD_W, WORLD_H);
    this.textures.addCanvas('field-image', c);
  }

  /** Cut the spiral + tumble football frames into one strip texture. */
  buildFootball() {
    if (!this.textures.exists('src-accessories')) return;
    const img = this.textures.get('src-accessories').getSourceImage();
    const frames = [...FOOTBALL_SPIRAL, ...FOOTBALL_TUMBLE];
    const fw = 16;
    const fh = 11;
    const c = document.createElement('canvas');
    c.width = fw * frames.length;
    c.height = fh;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    frames.forEach(([x, y, w, h], i) => {
      // centre each frame in its cell
      ctx.drawImage(img, x, y, w, h, i * fw + Math.floor((fw - w) / 2), Math.floor((fh - h) / 2), w, h);
    });
    const tex = this.textures.addCanvas('football', c);
    frames.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
    this.anims.create({
      key: 'ball-spiral', frameRate: 24, repeat: -1,
      frames: FOOTBALL_SPIRAL.map((_, i) => ({ key: 'football', frame: i })),
    });
    this.anims.create({
      key: 'ball-tumble', frameRate: 18, repeat: -1,
      frames: FOOTBALL_TUMBLE.map((_, i) => ({ key: 'football', frame: FOOTBALL_SPIRAL.length + i })),
    });
  }

  buildPlayers() {
    let placeholders = null;
    for (const anim of Object.keys(PLAYER_ANIMS)) {
      const srcKey = `player-src-${anim}`;
      const real = this.textures.exists(srcKey);
      let source;
      if (real) {
        source = canvasFromImage(this.textures.get(srcKey).getSourceImage());
      } else {
        placeholders ??= buildPlaceholderPlayerSheets();
        source = placeholders[anim];
      }
      for (const team of Object.keys(TEAMS)) {
        const key = `player-${team}-${anim}`;
        this.textures.addCanvas(key, paletteSwap(source, real ? this.sheetMap(team) : this.keyMap(team)));
        this.sliceSheet(key);
        this.makeAnims(team, anim, key);
      }
    }
  }

  sheetMap(team) {
    const t = TEAMS[team];
    const map = {};
    for (const [from, slot] of Object.entries(SHEET_COLOR_MAP)) map[from] = t[slot];
    return map;
  }

  keyMap(team) {
    const t = TEAMS[team];
    return {
      [PLAYER_KEY_COLORS.jersey]: t.jersey,
      [PLAYER_KEY_COLORS.trim]: t.trim,
      [PLAYER_KEY_COLORS.helmet]: t.helmet,
      [PLAYER_KEY_COLORS.stripe]: t.stripe,
      [PLAYER_KEY_COLORS.pants]: t.pants,
    };
  }

  /** Work out the frame layout from the image size and add numbered frames. */
  sliceSheet(key) {
    const tex = this.textures.get(key);
    const img = tex.getSourceImage();
    const { width: fw, height: fh } = PLAYER_FRAME;
    const cols = Math.floor(img.width / fw);
    const rows = Math.floor(img.height / fh);
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) tex.add(i++, 0, c * fw, r * fh, fw, fh);
    }
    tex.customData.cols = cols;
    tex.customData.rows = rows;
  }

  makeAnims(team, anim, key) {
    const { cols } = this.textures.get(key).customData;
    const def = PLAYER_ANIMS[anim];
    DIR_ORDER.forEach((dir, row) => {
      const frames = [];
      for (let c = 0; c < cols; c++) frames.push({ key, frame: row * cols + c });
      this.anims.create({ key: `${team}-${anim}-${dir}`, frames, frameRate: def.frameRate, repeat: def.repeat });
    });
  }
}
