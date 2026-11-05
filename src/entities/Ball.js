// The football. Tracks a ground position plus a fake height (z): while in the
// air it is drawn above its shadow and grows near the top of the arc.

import { HAND_HEIGHT } from '../config/assets.js';

export const THROW_START_Z = HAND_HEIGHT + 4; // released above the shoulder
export const CATCH_Z = HAND_HEIGHT;

export class Ball {
  constructor(scene) {
    this.scene = scene;
    this.gx = 0;               // ground position (world px)
    this.gy = 0;
    this.z = 0;                // height in px (visual only)
    this.state = 'dead';       // held | air | dead
    this.carrier = null;
    this.flight = null;
    this.hasAnims = scene.anims.exists('ball-spiral');

    this.shadow = scene.add.image(0, 0, 'ballshadow').setAlpha(0.35).setDepth(6);
    this.sprite = scene.add.sprite(0, 0, 'football', this.hasAnims ? 0 : undefined).setDepth(1000);
  }

  /** Where the ball is drawn (what the camera must keep on screen). */
  get viewX() { return this.gx; }
  get viewY() { return this.gy - this.z; }

  holdBy(player) {
    this.state = 'held';
    this.carrier = player;
    this.flight = null;
    this.stopSpin();
  }

  placeAt(x, y) {
    this.state = 'dead';
    this.carrier = null;
    this.flight = null;
    this.gx = x;
    this.gy = y;
    this.z = 0;
    this.stopSpin();
    this.render();
  }

  /**
   * Throw (or snap) the ball along an arc.
   * @param {number} duration seconds in the air
   * @param {number} peak     extra height at the top of the arc (px)
   */
  launch(fromX, fromY, toX, toY, duration, peak, onLand, startZ = THROW_START_Z, endZ = CATCH_Z, spin = 'ball-spiral') {
    this.state = 'air';
    this.carrier = null;
    this.flight = { fromX, fromY, toX, toY, duration, peak, onLand, startZ, endZ, t: 0 };
    this.gx = fromX;
    this.gy = fromY;
    this.z = startZ;
    // the spiral sprite is drawn horizontally: turn it 90deg for up/down throws
    this.sprite.rotation = Math.abs(toY - fromY) > Math.abs(toX - fromX) ? Math.PI / 2 : 0;
    if (this.hasAnims) this.sprite.play(spin);
  }

  stopSpin() {
    if (!this.hasAnims) return;
    this.sprite.stop();
    this.sprite.setFrame(0);
  }

  update(dt) {
    if (this.state === 'held' && this.carrier) {
      const p = this.carrier;
      const v = DIR_OFFSET[p.facing] || [0, 0];
      this.gx = p.x + v[0] * 5;
      this.gy = p.y + v[1] * 2 + 1;
      this.z = p.state === 'down' ? 2 : HAND_HEIGHT;
      this.sprite.rotation = v[1] !== 0 && v[0] === 0 ? Math.PI / 2 : 0;
    } else if (this.state === 'air' && this.flight) {
      const f = this.flight;
      f.t = Math.min(1, f.t + dt / f.duration);
      const t = f.t;
      this.gx = Phaser.Math.Linear(f.fromX, f.toX, t);
      this.gy = Phaser.Math.Linear(f.fromY, f.toY, t);
      this.z = Phaser.Math.Linear(f.startZ, f.endZ, t) + 4 * f.peak * t * (1 - t);
      if (t >= 1) {
        const cb = f.onLand;
        this.flight = null;
        this.state = 'dead';
        this.stopSpin();
        cb?.();
      }
    }
    this.render();
  }

  render() {
    this.sprite.setPosition(Math.round(this.viewX), Math.round(this.viewY));
    // grows near the top of the arc, shrinks coming down
    const lift = Math.max(0, this.z - CATCH_Z);
    this.sprite.setScale(this.state === 'air' ? 1 + Math.min(0.6, lift / 50) : 1);

    if (this.state === 'air') this.sprite.setDepth(1000);
    else if (this.carrier) {
      // in front of the carrier when he faces the camera, behind when he faces away
      const away = ['N', 'NE', 'NW'].includes(this.carrier.facing);
      this.sprite.setDepth(this.carrier.depth + (away ? -0.0001 : 0.0001));
    } else this.sprite.setDepth(10 + this.gy / 1000);

    this.shadow.setPosition(Math.round(this.gx), Math.round(this.gy));
    const h = Math.min(1, lift / 50);
    this.shadow.setScale(1 - h * 0.3).setAlpha(this.state === 'air' ? 0.4 - h * 0.15 : this.carrier ? 0 : 0.3);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}

const D = Math.SQRT1_2;
const DIR_OFFSET = {
  E: [1, 0], SE: [D, D], S: [0, 1], SW: [-D, D], W: [-1, 0], NW: [-D, -D], N: [0, -1], NE: [D, -D],
};
