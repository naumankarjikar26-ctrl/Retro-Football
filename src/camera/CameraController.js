// Smooth (lerped) camera zoomed in like Retro Bowl (~32 yards across). It
// follows the focus point both ways, because the full sideline-to-sideline
// width no longer fits on screen. A hard guard keeps one "must see" point on
// screen: the ball normally, or the landing spot while you are aiming.

import { TUNING, WORLD_W, WORLD_H } from '../config/constants.js';

export class CameraController {
  constructor(scene, ball) {
    this.cam = scene.cameras.main;
    this.ball = ball;
    this.cam.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cam.setRoundPixels(true);
    this.focusFn = () => ({ x: ball.viewX, y: ball.viewY });
    this.guardFn = null; // () => {x, y} | null; defaults to the ball
    this.cx = WORLD_W / 2;
    this.cy = WORLD_H / 2;
    this.zoom = 1;
    this.zoomFn = () => 1; // () -> target zoom (e.g. zoomed out before the snap)
  }

  // world area the camera shows (bigger when zoomed out)
  get viewW() { return this.cam.width / this.zoom; }
  get viewH() { return this.cam.height / this.zoom; }

  /** fn() -> target zoom; the camera eases toward it. */
  setZoom(fn) { this.zoomFn = fn; }

  /** fn() -> {x, y}: the world point the camera should centre on. */
  setFocus(fn) { this.focusFn = fn; }
  /** fn() -> {x, y} | null: point that must stay on screen (null = the ball). */
  setGuard(fn) { this.guardFn = fn; }

  snapTo(x, y) {
    this.zoom = this.zoomFn();
    this.cam.setZoom(this.zoom);
    this.cx = x;
    this.cy = y;
    this.apply();
  }

  update(dt) {
    const kz = 1 - Math.exp(-TUNING.camZoomLerp * dt);
    this.zoom += (this.zoomFn() - this.zoom) * kz;
    this.cam.setZoom(this.zoom);
    const t = this.focusFn();
    const kx = 1 - Math.exp(-TUNING.camLerp * dt);
    const ky = 1 - Math.exp(-TUNING.camLerp * 0.8 * dt);
    this.cx += (t.x - this.cx) * kx;
    this.cy += (t.y - this.cy) * ky;
    const g = (this.guardFn && this.guardFn()) || { x: this.ball.viewX, y: this.ball.viewY };
    this.keepOnScreen(g.x, g.y);
    this.apply();
  }

  keepOnScreen(px, py) {
    const halfW = this.viewW / 2 - TUNING.camGuardPx;
    const halfH = this.viewH / 2 - TUNING.camGuardPx;
    if (px < this.cx - halfW) this.cx = px + halfW;
    if (px > this.cx + halfW) this.cx = px - halfW;
    if (py < this.cy - halfH) this.cy = py + halfH;
    if (py > this.cy + halfH) this.cy = py - halfH;
  }

  apply() {
    this.cx = Phaser.Math.Clamp(this.cx, this.viewW / 2, WORLD_W - this.viewW / 2);
    this.cy = Phaser.Math.Clamp(this.cy, this.viewH / 2, WORLD_H - this.viewH / 2);
    this.cam.centerOn(this.cx, this.cy);
  }
}
