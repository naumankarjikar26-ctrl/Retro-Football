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
    this.downText = new PixelText(this, 6, 3, '', PAL.sand, 3);
    this.spotText = new PixelText(this, VIEW_W / 2, 3, '', PAL.white, 3).setAlign(0.5);
    this.scoreText = new PixelText(this, VIEW_W - 6, 3, '', PAL.white, 3).setAlign(1);

    // bottom hint bar
    this.add.rectangle(0, VIEW_H - HINT_H, VIEW_W, HINT_H, PAL.ink).setOrigin(0);
    this.add.rectangle(0, VIEW_H - HINT_H, VIEW_W, 1, PAL.dusk).setOrigin(0);
    this.hint = new PixelText(this, VIEW_W / 2, VIEW_H - HINT_H + 3, '', PAL.silver, 3).setAlign(0.5);
    this.onHint('CALL A PLAY: 1-8, ARROWS = TABS, Q = QUICK PICK');

    // result banner (shown only while the play is dead)
    this.banner = this.add.container(VIEW_W / 2, BAR_H + 34).setVisible(false);
    this.bannerBg = this.add.rectangle(0, 0, VIEW_W, 40, PAL.ink, 0.85);
    this.headline = new PixelText(this, 0, -15, '', PAL.white, 3).setAlign(0.5);
    this.detail = new PixelText(this, 0, 7, '', PAL.sand, 2).setAlign(0.5);
    this.banner.add([this.bannerBg, this.headline, this.detail]);

    // pull-back indicator
    this.pullGfx = this.add.graphics();

    // current play name (bottom-left of the field) and the audible button (bottom-right)
    this.playName = new PixelText(this, 6, VIEW_H - HINT_H - 14, '', PAL.sand, 2);
    this.audBtn = this.add.container(VIEW_W - 6, VIEW_H - HINT_H - 6);
    this.audBg = this.add.rectangle(0, 0, 150, 22, PAL.ink, 0.9).setOrigin(1, 1).setStrokeStyle(2, PAL.sand);
    this.audText = new PixelText(this, -75, -16, '', PAL.sand, 2).setAlign(0.5);
    this.audBtn.add([this.audBg, this.audText]);
    this.audBg.setInteractive({ useHandCursor: true });
    this.audBg.on('pointerup', () => this.gameScene.audible());

    // RANDOM button at the line: swaps in a new random play (press again to re-roll)
    this.rndBtn = this.add.container(VIEW_W - 162, VIEW_H - HINT_H - 6);
    this.rndBg = this.add.rectangle(0, 0, 112, 22, PAL.ink, 0.9).setOrigin(1, 1).setStrokeStyle(2, PAL.lime);
    this.rndBtn.add([this.rndBg, new PixelText(this, -56, -16, 'R: RANDOM', PAL.lime, 2).setAlign(0.5)]);
    this.rndBg.setInteractive({ useHandCursor: true });
    this.rndBg.on('pointerup', () => this.gameScene.randomAtLine());
    this.rndBtn.setVisible(false);
    this.audBtn.setVisible(false);
    // random plays: show the play type at the top of the field
    this.randomLabel = new PixelText(this, VIEW_W / 2, BAR_H + 6, '', PAL.sand, 3).setAlign(0.5).setVisible(false);
    bus.on(EV.PLAY_CALLED, (def) => {
      this.playName.setText(def.detail ? `${def.name} - ${def.detail}` : def.name);
      this.randomLabel.setText(def.random ? def.name : '').setVisible(!!def.random);
    }, this);
    bus.on(EV.SNAP, () => this.randomLabel.setVisible(false), this);

    bus.on(EV.STATE, this.onState, this);
    bus.on(EV.HINT, this.onHint, this);
    bus.on(EV.PRESNAP, () => this.banner.setVisible(false), this);
    bus.on('result', this.onResult, this);
    this.gameScene = this.scene.get('Game');
    if (this.gameScene.gs) this.onState(this.gameScene.gs);
  }

  update() {
    this.drawPull(this.gameScene.aim, this.gameScene.pullInfo?.());
    const g = this.gameScene;
    const canAudible = !!g.play && !g.calling && g.play.phase === 'presnap' && !g.audibleUsed && !!g.playDef?.audible;
    this.audBtn.setVisible(canAudible);
    if (canAudible) this.audText.setText(g.playDef.type === 'run' ? 'AUDIBLE: PASS' : 'AUDIBLE: RUN');
    this.playName.setVisible(!!g.play && !g.calling);
    this.rndBtn.setVisible(!!g.play && !g.calling && g.play.phase === 'presnap');
  }

  /** True if a screen point is over a HUD button (so it doesn't snap the ball). */
  overButton(p) {
    return (this.audBtn.visible && this.audBg.getBounds().contains(p.x, p.y))
      || (this.rndBtn.visible && this.rndBg.getBounds().contains(p.x, p.y));
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
    // blue = your pull (distinct from the white/orange landing marker on the field)
    const col = info?.cancelled ? PAL.silver : power >= 1 ? PAL.cyan : PAL.sky;

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
    // solid centre dot marks exactly where you pressed
    g.fillStyle(PAL.ink, 1).fillRect(sx - 1, sy - 1, 4, 4);
    g.fillStyle(col, 1).fillRect(sx - 1, sy - 1, 3, 3);
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
