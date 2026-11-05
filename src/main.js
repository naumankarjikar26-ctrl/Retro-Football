import { VIEW_W, VIEW_H, PAL } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: PAL.ink,
  pixelArt: true,          // nearest-neighbour everywhere, no smoothing
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  scene: [BootScene, GameScene, HUDScene],
};

window.game = new Phaser.Game(config);
