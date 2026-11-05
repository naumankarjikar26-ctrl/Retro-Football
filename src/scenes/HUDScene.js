// Screen-space overlay: down & distance, ball spot, score, control hint, and
// the big result banner. Later stages add the play-call menu (Stage 2),
// cadence speech bubble (Stage 3), hard-count button (Stage 4) and the
// accept/decline penalty panel (Stage 5) as separate overlay scenes/panels.

import { VIEW_W, VIEW_H, PAL } from '../config/constants.js';
import { PixelText } from '../gfx/PixelFont.js';
import { bus, EV } from '../systems/events.js';

export class HUDScene extends Phaser.Scene {
  constructor() { super('HUD'); }

  create() {
    this.add.rectangle(0, 0, VIEW_W, 9, PAL.ink, 0.85).setOrigin(0);
    this.downText = new PixelText(this, 3, 2, '', PAL.sand);
    this.spotText = new PixelText(this, VIEW_W / 2, 2, '', PAL.white).setAlign(0.5);
    this.scoreText = new PixelText(this, VIEW_W - 3, 2, '', PAL.white).setAlign(1);

    this.hintBg = this.add.rectangle(VIEW_W / 2, VIEW_H - 10, 10, 9, PAL.ink, 0.7).setOrigin(0);
    this.hint = new PixelText(this, VIEW_W / 2, VIEW_H - 8, '', PAL.white).setAlign(0.5);
    this.onHint('SPACE / TAP TO SNAP');

    this.banner = this.add.container(VIEW_W / 2, 36).setVisible(false);
    this.bannerBg = this.add.rectangle(0, 0, VIEW_W, 28, PAL.ink, 0.8);
    this.headline = new PixelText(this, 0, -10, '', PAL.white, 2).setAlign(0.5);
    this.detail = new PixelText(this, 0, 5, '', PAL.sand).setAlign(0.5);
    this.banner.add([this.bannerBg, this.headline, this.detail]);

    bus.on(EV.STATE, this.onState, this);
    bus.on(EV.HINT, this.onHint, this);
    bus.on(EV.PRESNAP, () => this.banner.setVisible(false), this);
    bus.on('result', this.onResult, this);
    const gs = this.scene.get('Game').gs;
    if (gs) this.onState(gs);
  }

  onState(gs) {
    this.downText.setText(gs.downText());
    this.spotText.setText(gs.spotText());
    this.scoreText.setText(`HOME ${gs.score.home}  AWAY ${gs.score.away}`);
  }

  onHint(text) {
    this.hint.setText(text);
    const w = this.hint.textWidth + 6;
    this.hintBg.setSize(w, 9).setPosition(Math.round(VIEW_W / 2 - w / 2), VIEW_H - 10);
    this.hintBg.setVisible(!!text);
  }

  onResult({ headline, detail }) {
    this.headline.setText(headline);
    this.detail.setText(detail || '');
    const color = headline.startsWith('TOUCHDOWN') ? PAL.sand
      : headline.startsWith('INCOMPLETE') || headline.startsWith('SACK') || headline.startsWith('LOSS') ? PAL.orange
        : PAL.white;
    this.headline.setColor(color);
    this.banner.setVisible(true).setScale(1, 0.2);
    this.tweens.add({ targets: this.banner, scaleY: 1, duration: 140, ease: 'Back.Out' });
  }
}
