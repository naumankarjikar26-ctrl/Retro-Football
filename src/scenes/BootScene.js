// Loads real assets (when paths are set in config/assets.js), otherwise builds
// placeholders, then slices sheets into frames and registers all animations.

import { DIR_ORDER, PLAYER_FRAME, PLAYER_ANIMS, PLAYER_KEY_COLORS, FIELD_ASSETS } from '../config/assets.js';
import { TEAMS } from '../config/constants.js';
import { buildPlaceholderPlayerSheets, buildPlaceholderMisc, paletteSwap } from '../gfx/PlaceholderArt.js';
import { registerPixelFont } from '../gfx/PixelFont.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    for (const [anim, def] of Object.entries(PLAYER_ANIMS)) {
      if (def.path) this.load.image(`player-src-${anim}`, def.path);
    }
    for (const [key, def] of Object.entries(FIELD_ASSETS)) {
      if (def.path) this.load.image(key, def.path);
    }
  }

  create() {
    registerPixelFont(this);
    buildPlaceholderMisc(this); // only fills in keys that are still missing below
    const placeholders = buildPlaceholderPlayerSheets();

    const teamColorMap = (team) => {
      const t = TEAMS[team];
      return {
        [PLAYER_KEY_COLORS.jersey]: t.jersey,
        [PLAYER_KEY_COLORS.trim]: t.trim,
        [PLAYER_KEY_COLORS.helmet]: t.helmet,
        [PLAYER_KEY_COLORS.stripe]: t.stripe,
        [PLAYER_KEY_COLORS.pants]: t.pants,
      };
    };

    // Real sheets with no known jersey colours fall back to a tint per team.
    let useTint = false;
    for (const anim of Object.keys(PLAYER_ANIMS)) {
      const srcKey = `player-src-${anim}`;
      let source;
      if (this.textures.exists(srcKey)) {
        const img = this.textures.get(srcKey).getSourceImage();
        source = document.createElement('canvas');
        source.width = img.width;
        source.height = img.height;
        source.getContext('2d').drawImage(img, 0, 0);
        if (!PLAYER_ANIMS[anim].recolor) useTint = true;
      } else {
        source = placeholders[anim];
      }
      for (const team of Object.keys(TEAMS)) {
        const key = `player-${team}-${anim}`;
        const canvas = useTint ? source : paletteSwap(source, teamColorMap(team));
        this.textures.addCanvas(key, canvas);
        this.sliceSheet(key);
        this.makeAnims(team, anim, key);
      }
    }
    this.registry.set('playerTint', useTint);

    this.scene.start('Game');
  }

  /** Work out frame layout from the image size and add numbered frames. */
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
