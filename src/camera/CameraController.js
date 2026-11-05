// Smooth (lerped) camera. It scrolls sideways to follow whatever the focus
// function returns, and normally rests vertically so the WHOLE field width is
// visible (far sideline players included). A hard guard keeps the ball on
// screen no matter what; the camera only leaves its resting height for that.

import { TUNING, WORLD_W, WORLD_H, CAM_REST_Y } from '../config/constants.js';

export class CameraController {
  constructor(scene, ball) {
    this.cam = scene.cameras.main;
    this.ball = ball;
    this.cam.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cam.setRoundPixels(true);
    this.focusFn = () => ({ x: ball.viewX });
    this.cx = WORLD_W / 2;
    this.cy = this.restCY;
  }

  get viewW() { return this.cam.width; }
  get viewH() { return this.cam.height; }
  /** Centre Y that shows the full field from sideline to sideline. */
  get restCY() { return CAM_REST_Y + this.cam.height / 2; }

  /** fn() -> {x}: the world X the camera should centre on. */
  setFocus(fn) { this.focusFn = fn; }

  /** Jump instantly (used once at start). */
  snapTo(x) {
    this.cx = x;
    this.cy = this.restCY;
    this.apply();
  }

  update(dt) {
    const target = this.focusFn();
    // frame-rate independent exponential smoothing
    const kx = 1 - Math.exp(-TUNING.camLerp * dt);
    const ky = 1 - Math.exp(-TUNING.camLerp * 0.7 * dt);
    this.cx += (target.x - this.cx) * kx;
    this.cy += (this.restCY - this.cy) * ky;
    this.guardBall();
    this.apply();
  }

  /** Never let the ball leave the screen, however fast it moves. */
  guardBall() {
    const m = TUNING.camGuardPx;
    const bx = this.ball.viewX;
    const by = this.ball.viewY;
    const halfW = this.viewW / 2 - m;
    const halfH = this.viewH / 2 - 6;
    if (bx < this.cx - halfW) this.cx = bx + halfW;
    if (bx > this.cx + halfW) this.cx = bx - halfW;
    if (by < this.cy - halfH) this.cy = by + halfH;
    if (by > this.cy + halfH) this.cy = by - halfH;
  }

  apply() {
    this.cx = Phaser.Math.Clamp(this.cx, this.viewW / 2, WORLD_W - this.viewW / 2);
    this.cy = Phaser.Math.Clamp(this.cy, this.viewH / 2, WORLD_H - this.viewH / 2);
    this.cam.centerOn(this.cx, this.cy);
  }
}
