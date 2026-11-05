// Smooth (lerped) camera that follows whatever the current focus function
// returns, clamped to the world, with a hard guard that keeps the ball on screen.

import { TUNING, VIEW_W, VIEW_H, WORLD_W, WORLD_H } from '../config/constants.js';

export class CameraController {
  constructor(scene, ball) {
    this.cam = scene.cameras.main;
    this.ball = ball;
    this.cam.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cam.setRoundPixels(true);
    this.focusFn = () => ({ x: ball.viewX, y: ball.viewY });
    this.cx = WORLD_W / 2;
    this.cy = WORLD_H / 2;
  }

  /** fn() -> {x, y}: the world point the camera should centre on. */
  setFocus(fn) { this.focusFn = fn; }

  /** Jump instantly (used once at start). */
  snapTo(x, y) {
    this.cx = x;
    this.cy = y;
    this.apply();
  }

  update(dt) {
    const target = this.focusFn();
    // frame-rate independent exponential smoothing
    // mostly horizontal scrolling: the sideline-to-sideline axis eases more gently
    const kx = 1 - Math.exp(-TUNING.camLerp * dt);
    const ky = 1 - Math.exp(-TUNING.camLerp * 0.5 * dt);
    this.cx += (target.x - this.cx) * kx;
    this.cy += (target.y - this.cy) * ky;
    this.guardBall();
    this.apply();
  }

  /** Never let the ball leave the screen, however fast it moves. */
  guardBall() {
    const m = TUNING.camGuardPx;
    const bx = this.ball.viewX;
    const by = this.ball.viewY;
    const halfW = VIEW_W / 2 - m;
    const halfH = VIEW_H / 2 - m;
    if (bx < this.cx - halfW) this.cx = bx + halfW;
    if (bx > this.cx + halfW) this.cx = bx - halfW;
    if (by < this.cy - halfH) this.cy = by + halfH;
    if (by > this.cy + halfH) this.cy = by - halfH;
  }

  apply() {
    // stay inside the field / world bounds
    this.cx = Phaser.Math.Clamp(this.cx, VIEW_W / 2, WORLD_W - VIEW_W / 2);
    this.cy = Phaser.Math.Clamp(this.cy, VIEW_H / 2, WORLD_H - VIEW_H / 2);
    this.cam.centerOn(this.cx, this.cy);
  }
}
