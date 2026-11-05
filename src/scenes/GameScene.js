// The field and the live play. Owns input, the camera, route drawing and the
// aiming arc; delegates the football itself to PlayController.

import { TUNING, PAL, yd, toYards } from '../config/constants.js';
import { Field } from '../field/Field.js';
import { CameraController } from '../camera/CameraController.js';
import { GameState } from '../systems/GameState.js';
import { PlayController } from '../systems/PlayController.js';
import { DEFAULT_PLAY } from '../plays/playbook.js';
import { bus, EV } from '../systems/events.js';
import { THROW_START_Z, CATCH_Z } from '../entities/Ball.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.field = new Field(this);
    this.gs = new GameState();
    this.routeGfx = this.add.graphics().setDepth(3);
    this.aimGfx = this.add.graphics().setDepth(3000);
    this.aim = null;
    this.play = null;
    this.deadTimer = 0;

    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,ENTER');
    this.input.keyboard.on('keydown-SPACE', () => this.onAction());
    this.input.keyboard.on('keydown-ENTER', () => this.onAction());
    this.input.on('pointerdown', (p) => this.onPointerDown(p));
    this.input.on('pointermove', (p) => this.onPointerMove(p));
    this.input.on('pointerup', (p) => this.onPointerUp(p));

    this.scene.launch('HUD');
    bus.on(EV.PLAY_END, this.onPlayEnd, this);
    bus.on(EV.THROW, () => this.routeGfx.clear(), this);
    bus.on(EV.CATCH, () => this.routeGfx.clear(), this);
    this.events.once('shutdown', () => bus.removeAllListeners());

    this.newPlay(true);
  }

  // ---------------------------------------------------------------- flow

  newPlay(first = false) {
    this.play?.destroy();
    this.aim = null;
    this.aimGfx.clear();
    this.play = new PlayController(this, this.gs, DEFAULT_PLAY);
    this.field.setLines(this.gs.ballOn, this.gs.firstDownAt);
    this.drawRoutes(1);

    const qb = this.play.qb;
    if (!this.camCtl) this.camCtl = new CameraController(this, this.play.ball);
    this.camCtl.ball = this.play.ball;
    this.camCtl.setFocus(() => this.cameraFocus());
    if (first) this.camCtl.snapTo(qb.x, qb.y);

    bus.emit(EV.STATE, this.gs);
    bus.emit(EV.PRESNAP, this.gs);
    bus.emit(EV.HINT, 'SPACE / TAP TO SNAP');
  }

  onAction() {
    if (!this.play) return;
    if (this.play.phase === 'presnap') this.snap();
    else if (this.play.phase === 'dead' && this.deadTimer > 0.6) this.newPlay();
  }

  snap() {
    this.play.snap();
    this.drawRoutes(0.45);
  }

  onPlayEnd(result) {
    this.deadTimer = 0;
    this.aim = null;
    this.aimGfx.clear();
    this.routeGfx.clear();
    const summary = this.gs.applyResult(result);
    bus.emit(EV.STATE, this.gs);
    bus.emit(EV.HINT, 'SPACE / TAP FOR NEXT PLAY');
    this.events.emit('result', summary);
    bus.emit('result', summary);
  }

  // ---------------------------------------------------------------- input

  onPointerDown(p) {
    const ph = this.play?.phase;
    if (ph === 'presnap') { this.snap(); return; }
    if (ph === 'dead') { this.onAction(); return; }
    if ((ph === 'snap' || ph === 'qb') && !this.play.qbScrambling) {
      this.aim = { sx: p.x, sy: p.y, cx: p.x, cy: p.y };
    }
  }

  onPointerMove(p) {
    if (this.aim) { this.aim.cx = p.x; this.aim.cy = p.y; }
  }

  onPointerUp() {
    if (!this.aim) return;
    const target = this.aimTarget();
    this.aim = null;
    this.aimGfx.clear();
    if (target && this.play.canThrow()) this.play.throwTo(target.x, target.y);
  }

  /** Drag vector from where the press started, scaled and capped. */
  aimTarget() {
    if (!this.aim) return null;
    const q = this.play.qb;
    let dx = (this.aim.cx - this.aim.sx) * TUNING.aimGain;
    let dy = (this.aim.cy - this.aim.sy) * TUNING.aimGain;
    const len = Math.hypot(dx, dy);
    if (toYards(len) < TUNING.minThrowYd) return null;
    const max = yd(TUNING.maxThrowYd);
    if (len > max) { dx *= max / len; dy *= max / len; }
    return { x: q.x + dx, y: q.y + dy };
  }

  readInput() {
    const k = this.keys;
    const dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    const dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    const p = this.input.activePointer;
    const steerX = p.isDown && !this.aim ? p.worldX : null;
    return { dx, dy, steerX, aiming: !!this.aim };
  }

  // ---------------------------------------------------------------- frame

  update(_t, delta) {
    const dt = Math.min(delta / 1000, 1 / 30);
    this.play.update(dt, this.readInput());
    if (this.aim && !(this.play.phase === 'snap' || this.play.phase === 'qb')) {
      this.aim = null;
    }
    this.drawAim();
    this.camCtl.update(dt);

    if (this.play.phase === 'dead') {
      this.deadTimer += dt;
      if (this.deadTimer > TUNING.resultHold + 0.6) this.newPlay();
    }
  }

  cameraFocus() {
    const play = this.play;
    const ball = play.ball;
    if (play.phase === 'presnap') return { x: play.qb.x, y: play.qb.y };
    const target = this.aim && this.aimTarget();
    if (target) {
      // lean toward the aim spot; the ball guard keeps the QB on screen
      return { x: Phaser.Math.Linear(ball.viewX, target.x, 0.45), y: Phaser.Math.Linear(ball.viewY, target.y, 0.45) };
    }
    return { x: ball.viewX, y: ball.viewY };
  }

  // ---------------------------------------------------------------- drawing

  /** Smooth routes drawn as crisp 1px pixel paths with an end marker. */
  drawRoutes(alpha) {
    const g = this.routeGfx;
    g.clear();
    for (const r of this.play.receivers) {
      const route = r.route;
      if (!route?.curve) continue;
      const n = Math.ceil(route.length * 1.5);
      const pts = route.curve.getSpacedPoints(n);
      g.fillStyle(PAL.ink, alpha * 0.6);
      for (const pt of pts) g.fillRect(Math.round(pt.x), Math.round(pt.y) + 1, 1, 1);
      g.fillStyle(PAL.sand, alpha);
      for (const pt of pts) g.fillRect(Math.round(pt.x), Math.round(pt.y), 1, 1);
      const end = pts[pts.length - 1];
      g.fillRect(Math.round(end.x) - 1, Math.round(end.y) - 1, 3, 3);
    }
  }

  /** Dotted, curved throw preview from the QB to the landing spot. */
  drawAim() {
    const g = this.aimGfx;
    g.clear();
    const target = this.aimTarget();
    if (!target || this.play.qb.state === 'throwing') return;
    const q = this.play.qb;
    const { peak } = this.play.throwParams(target.x, target.y);
    const fx = q.x;
    const fy = q.y;
    const len = Math.hypot(target.x - fx, target.y - fy);
    const spacing = 5;
    const offset = (this.time.now / 1000 * 14) % spacing; // marching dots
    const usable = this.play.canThrow() || this.play.phase === 'snap';
    const col = usable ? PAL.white : PAL.silver;

    for (let s = offset; s < len; s += spacing) {
      const t = s / len;
      const x = Math.round(Phaser.Math.Linear(fx, target.x, t));
      const z = Phaser.Math.Linear(THROW_START_Z, CATCH_Z, t) + 4 * peak * t * (1 - t);
      const y = Math.round(Phaser.Math.Linear(fy, target.y, t) - z);
      g.fillStyle(PAL.ink, 0.5).fillRect(x, y + 1, 2, 2);
      g.fillStyle(col, 1).fillRect(x, y, 2, 2);
    }
    // landing marker: pixel ellipse ring
    const tx = Math.round(target.x);
    const ty = Math.round(target.y);
    g.fillStyle(PAL.sand, 1);
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      g.fillRect(Math.round(tx + Math.cos(ang) * 5), Math.round(ty + Math.sin(ang) * 3), 1, 1);
    }
  }
}
