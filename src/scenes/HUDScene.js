// Screen-space overlay (one crisp pixel font everywhere):
//   - top bar: down & distance, ball spot, score. The field camera starts
//     below it, so it never covers the field or players.
//   - bottom bar: the control hint.
//   - result banner after each play.
//   - the pull-back throw indicator: a circle where you pressed and a line to
//     your finger / cursor.
// Later stages add the play-call menu (Stage 2), cadence bubble (Stage 3),
// hard-count button (Stage 4) and penalty accept/decline panel (Stage 5).

import { VIEW_W, VIEW_H, BAR_H, HINT_H, PAL, TEAMS, TUNING } from '../config/constants.js';
import { PixelText } from '../gfx/PixelFont.js';
import { bus, EV } from '../systems/events.js';

export class HUDScene extends Phaser.Scene {
  constructor() { super('HUD'); }

  create() {
    this.game.canvas.style.touchAction = 'none';

    // top score bar
    this.add.rectangle(0, 0, VIEW_W, BAR_H, PAL.ink).setOrigin(0);
    this.add.rectangle(0, BAR_H - 1, VIEW_W, 1, PAL.dusk).setOrigin(0);
    this.downText = new PixelText(this, 3, 2, '', PAL.sand);
    this.spotText = new PixelText(this, VIEW_W / 2, 2, '', PAL.white).setAlign(0.5);
    this.scoreText = new PixelText(this, VIEW_W - 3, 2, '', PAL.white).setAlign(1);

    // bottom hint bar
    this.add.rectangle(0, VIEW_H - HINT_H, VIEW_W, HINT_H, PAL.ink).setOrigin(0);
    this.add.rectangle(0, VIEW_H - HINT_H, VIEW_W, 1, PAL.dusk).setOrigin(0);
    this.hint = new PixelText(this, VIEW_W / 2, VIEW_H - HINT_H + 2, '', PAL.silver).setAlign(0.5);
    this.onHint('SPACE / TAP TO SNAP');

    // result banner (shown only while the play is dead)
    this.banner = this.add.container(VIEW_W / 2, BAR_H + 26).setVisible(false);
    this.bannerBg = this.add.rectangle(0, 0, VIEW_W, 26, PAL.ink, 0.85);
    this.headline = new PixelText(this, 0, -10, '', PAL.white, 2).setAlign(0.5);
    this.detail = new PixelText(this, 0, 4, '', PAL.sand).setAlign(0.5);
    this.banner.add([this.bannerBg, this.headline, this.detail]);

    // pull-back indicator
    this.pullGfx = this.add.graphics();

    bus.on(EV.STATE, this.onState, this);
    bus.on(EV.HINT, this.onHint, this);
    bus.on(EV.PRESNAP, () => this.banner.setVisible(false), this);
    bus.on('result', this.onResult, this);
    this.gameScene = this.scene.get('Game');
    if (this.gameScene.gs) this.onState(this.gameScene.gs);
  }

  update() {
    this.drawPull(this.gameScene.aim, this.gameScene.pullInfo?.());
  }

  /** Circle at the press point and a line to the current pointer. */
  drawPull(aim, info) {
    const g = this.pullGfx;
    g.clear();
    if (!aim) return;
    const sx = Math.round(aim.sx);
    const sy = Math.round(aim.sy);
    const cx = Math.round(aim.cx);
    const cy = Math.round(aim.cy);
    const power = info?.power ?? 0;
    const col = info?.cancelled ? PAL.silver : power >= 1 ? PAL.orange : PAL.white;

    // line from the press point to the finger
    const steps = Math.max(1, Math.round(Math.hypot(cx - sx, cy - sy)));
    for (const [c, o] of [[PAL.ink, 1], [col, 0]]) {
      g.fillStyle(c, 1);
      for (let i = 0; i <= steps; i += 2) {
        const t = i / steps;
        g.fillRect(Math.round(sx + (cx - sx) * t) + o, Math.round(sy + (cy - sy) * t) + o, 1, 1);
      }
    }
    // ring where the press started (shows the cancel zone)
    const r = TUNING.pullCancelPx;
    for (const [c, o] of [[PAL.ink, 1], [col, 0]]) {
      g.fillStyle(c, 1);
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * Math.PI * 2;
        g.fillRect(Math.round(sx + Math.cos(ang) * r) + o, Math.round(sy + Math.sin(ang) * r) + o, 1, 1);
      }
    }
    // finger dot
    g.fillStyle(PAL.ink, 1).fillRect(cx - 1, cy - 1, 4, 4);
    g.fillStyle(col, 1).fillRect(cx - 1, cy - 1, 3, 3);
  }

  onState(gs) {
    this.downText.setText(gs.downText());
    this.spotText.setText(gs.spotText());
    this.scoreText.setText(`${TEAMS.home.abbr} ${gs.score.home}  ${TEAMS.away.abbr} ${gs.score.away}`);
  }

  onHint(text) {
    this.hint.setText(text);
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
