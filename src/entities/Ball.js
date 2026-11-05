// The football. Tracks a ground position plus a fake height (z): while in the
// air it is drawn above its shadow and grows near the top of the arc.

export class Ball {
  constructor(scene) {
    this.scene = scene;
    this.gx = 0;               // ground position (world px)
    this.gy = 0;
    this.z = 0;                // height in px (visual only)
    this.state = 'dead';       // held | air | dead
    this.carrier = null;
    this.flight = null;

    this.shadow = scene.add.image(0, 0, 'ballshadow').setAlpha(0.35).setDepth(6);
    this.sprite = scene.add.image(0, 0, 'football').setDepth(1000);
  }

  /** Where the ball is drawn (what the camera must keep on screen). */
  get viewX() { return this.gx; }
  get viewY() { return this.gy - this.z; }

  holdBy(player) {
    this.state = 'held';
    this.carrier = player;
    this.flight = null;
  }

  placeAt(x, y) {
    this.state = 'dead';
    this.carrier = null;
    this.flight = null;
    this.gx = x;
    this.gy = y;
    this.z = 0;
    this.render(0);
  }

  /**
   * Throw (or snap) the ball along an arc.
   * @param {number} duration seconds in the air
   * @param {number} peak     extra height at the top of the arc (px)
   */
  launch(fromX, fromY, toX, toY, duration, peak, onLand, startZ = 6, endZ = 4) {
    this.state = 'air';
    this.carrier = null;
    this.flight = { fromX, fromY, toX, toY, duration, peak, onLand, startZ, endZ, t: 0 };
    this.gx = fromX;
    this.gy = fromY;
    this.z = startZ;
  }

  /** Normalised flight progress 0..1, or null if not in the air. */
  get progress() { return this.flight ? this.flight.t : null; }

  update(dt) {
    if (this.state === 'held' && this.carrier) {
      const p = this.carrier;
      const v = DIR_OFFSET[p.facing] || [0, 0];
      this.gx = p.x + v[0] * 4;
      this.gy = p.y + v[1] * 3 + 1;
      this.z = p.state === 'down' ? 0 : 3;
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
        cb?.();
      }
    }
    this.render(dt);
  }

  render() {
    const prevX = this.sprite.x;
    const prevY = this.sprite.y;
    const vx = Math.round(this.viewX);
    const vy = Math.round(this.viewY);
    this.sprite.setPosition(vx, vy);
    // grows near the top of the arc, shrinks coming down
    this.sprite.setScale(1 + Math.min(0.6, this.z / 45));
    if (this.state === 'air') {
      const ang = Math.atan2(vy - prevY, vx - prevX);
      if (Math.hypot(vx - prevX, vy - prevY) > 0.2) {
        const step = Math.PI / 8; // rotate in 22.5 deg steps to stay chunky
        this.sprite.rotation = Math.round(ang / step) * step;
      }
    } else if (this.state === 'held' && this.carrier) {
      this.sprite.rotation = 0;
    }
    this.sprite.setDepth(this.state === 'air' ? 1000 : 10 + this.gy / 1000 + 0.0005);
    this.sprite.setVisible(true);

    this.shadow.setPosition(Math.round(this.gx), Math.round(this.gy) + 1);
    const h = Math.min(1, this.z / 40);
    this.shadow.setScale(1 - h * 0.3).setAlpha(this.z > 1 ? 0.35 - h * 0.15 : 0);
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
