// A single football player: smooth acceleration-based movement, 8-direction
// facing, and idle/walk/run/punch(throw)/death(tackled) animations.
//
// x/y are the player's feet in SCREEN space. Velocities (vel, desired) are in
// GROUND space (px/s with the sideline-to-sideline axis un-squashed), so a
// player runs at the same real speed in every direction even though the
// field's Y axis is foreshortened by LAT_SCALE.

import { TUNING, LAT_SCALE, yd, toYards } from '../config/constants.js';
import { PLAYER_ORIGIN } from '../config/assets.js';
import { SKIN_TONES } from '../config/teams.js';

const DIRS_BY_OCTANT = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

export function dirFromVector(x, y) {
  const oct = Math.round(Math.atan2(y, x) / (Math.PI / 4));
  return DIRS_BY_OCTANT[(oct + 8) % 8];
}

// Default ratings. Stage 6 replaces these with roster data; Stage 4/5 use discipline.
const ROLE_RATINGS = {
  QB: { speed: 7.8, arm: 1.0 },
  RB: { speed: 9.6 },
  WR: { speed: 10, hands: 0.92 },
  TE: { speed: 8.6, hands: 0.86 },
  OL: { speed: 6.4, block: 1.0 },
  DL: { speed: 5.6, rush: 0.8 },   // slower pass rush gives the QB time
  LB: { speed: 8.4 },
  CB: { speed: 9.5 },
  S: { speed: 9.2 },
};

export class Player extends Phaser.GameObjects.Sprite {
  /**
   * @param {string} team   'home' | 'away'
   * @param {string} role   QB, RB, WR, TE, OL, DL, LB, CB, S
   * @param {string} slot   unique position id within the formation (e.g. 'X', 'LT', 'CB1')
   */
  constructor(scene, x, y, team, role, slot, skinTone) {
    // each player keeps one skin tone all game (passed in, or picked at random)
    const tone = skinTone ?? Math.floor(Math.random() * SKIN_TONES.length);
    super(scene, x, y, `player-${team}-s${tone}-idle`, 0);
    this.skin = `${team}-s${tone}`;
    this.team = team;
    this.role = role;
    this.slot = slot;
    this.isOffense = team === 'home';
    this.ratings = { discipline: 0.8, ...ROLE_RATINGS[role] };

    this.vel = new Phaser.Math.Vector2();
    this.desired = new Phaser.Math.Vector2();
    this.maxSpeed = this.ratings.speed;      // yards / second
    this.facing = this.isOffense ? 'E' : 'W';
    this.state = 'idle';                      // idle | moving | throwing | down
    this.speedScale = 1;
    this.engaged = null;                      // blocker <-> defender link
    this.ai = {};                             // per-play AI scratch data
    // pre-snap stance (cleared at the snap)
    this.stance = { OL: 'stance3', DL: 'stance3', QB: 'stanceQB', RB: 'stance2', WR: 'stance2', TE: 'stance2' }[role] || 'crouch';

    // (x, y) is the player's feet; lower on screen = closer to the camera = drawn in front
    this.setOrigin(PLAYER_ORIGIN.x, PLAYER_ORIGIN.y);
    this.shadow = scene.add.image(x, y, 'playershadow').setAlpha(0.32).setDepth(5);
    scene.add.existing(this);
    this.playAnim('idle');
  }

  /** Steer toward a world point at a fraction of top speed. */
  moveToward(tx, ty, speedFrac = 1) {
    const dx = tx - this.x;
    const dy = (ty - this.y) / LAT_SCALE; // to ground space
    const dist = Math.hypot(dx, dy);
    const max = yd(this.maxSpeed * speedFrac * this.speedScale);
    // ease in on arrival so players settle instead of jittering
    const speed = Math.min(max, dist * 6);
    if (dist < 0.5) this.desired.set(0, 0);
    else this.desired.set((dx / dist) * speed, (dy / dist) * speed);
  }

  /** Steer in a GROUND-space direction (x = downfield, y = toward the near sideline). */
  moveDir(dx, dy, speedFrac = 1) {
    const len = Math.hypot(dx, dy);
    if (len < 0.001) { this.desired.set(0, 0); return; }
    const s = yd(this.maxSpeed * speedFrac * this.speedScale);
    this.desired.set((dx / len) * s, (dy / len) * s);
  }

  stop() { this.desired.set(0, 0); }

  /** Place the player directly (used by route-following, which is already smooth). */
  driveTo(x, y, dt) {
    if (dt > 0) this.vel.set((x - this.x) / dt, (y - this.y) / LAT_SCALE / dt);
    this.setPosition(x, y);
    this.desired.copy(this.vel);
    this._routeDriven = true;
  }

  update(dt) {
    if (this.state === 'tackled') {
      // locked in a tackle: tweens drive the position
      this.vel.set(0, 0);
    } else if (this.state === 'down') {
      this.vel.scale(Math.max(0, 1 - dt * 8));
      this.x += this.vel.x * dt;
      this.y += this.vel.y * LAT_SCALE * dt;
    } else if (!this._routeDriven) {
      // accelerate toward the desired velocity
      const maxDv = yd(TUNING.accel) * dt;
      const dvx = this.desired.x - this.vel.x;
      const dvy = this.desired.y - this.vel.y;
      const dv = Math.hypot(dvx, dvy);
      if (dv <= maxDv) this.vel.copy(this.desired);
      else this.vel.add({ x: (dvx / dv) * maxDv, y: (dvy / dv) * maxDv });
      this.x += this.vel.x * dt;
      this.y += this.vel.y * LAT_SCALE * dt;
    }
    this._routeDriven = false;

    this.shadow.setPosition(Math.round(this.x + (this.shadowDX || 0)), Math.round(this.y));
    this.setDepth(10 + this.y / 1000);
    this.refreshAnim();
  }

  get speedYds() { return toYards(this.vel.length()); }

  /** Screen position this player will reach in `t` seconds at current velocity. */
  predict(t) {
    return { x: this.x + this.vel.x * t, y: this.y + this.vel.y * LAT_SCALE * t };
  }

  refreshAnim() {
    if (this.state === 'down' || this.state === 'throwing') return;
    if (this.stance) { this.playAnim(this.stance); return; } // pre-snap stance
    const s = this.speedYds;
    // facing uses the on-screen direction, so mostly-sideways running picks
    // the side (E/W) and diagonal frames
    if (s > TUNING.idleSpeed) this.facing = dirFromVector(this.vel.x, this.vel.y * LAT_SCALE);
    const anim = s <= TUNING.idleSpeed ? 'idle' : s <= TUNING.walkSpeed ? 'walk' : 'run';
    this.playAnim(anim);
    // scale run cadence with speed so feet don't slide
    if (anim === 'run') this.anims.timeScale = Phaser.Math.Clamp(s / 7, 0.7, 1.3);
    else this.anims.timeScale = 1;
  }

  playAnim(anim, force = false) {
    const key = `${this.skin}-${anim}-${this.facing}`;
    if (!force && this.anims.currentAnim && this.anims.currentAnim.key === key && this.anims.isPlaying) return;
    // keep the stride going when only the direction changes
    const keepFrame = !force && this.currentAnimName === anim && this.anims.currentFrame;
    const progress = keepFrame ? this.anims.getProgress() : 0;
    this.play(key);
    if (keepFrame && this.anims.currentAnim) this.anims.setProgress(progress);
    this.currentAnimName = anim;
  }

  /** QB throw. `onRelease` fires on the last frame of the punch animation. */
  throwMotion(dirX, dirY, onRelease) {
    this.state = 'throwing';
    this.facing = dirFromVector(dirX, dirY);
    this.stop();
    this.vel.scale(0.3);
    this.playAnim('punch', true);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (this.state !== 'throwing') return; // sacked mid-throw
      this.state = 'idle';
      onRelease();
    });
  }

  /**
   * Tip over like a plank: the full standing sprite rotates 90 degrees about
   * the feet toward the hit direction, so the body stays straight. The
   * shadow stretches out and slides under the body as he goes down.
   * @param {number} dirX  >= 0 falls to the right, < 0 to the left
   */
  tipOver(dirX, duration = 260) {
    this.state = 'down';
    this.engaged = null;
    this.stop();
    this.vel.set(0, 0);
    const side = dirX >= 0 ? 1 : -1;
    // freeze on the first standing frame of the current facing
    this.playAnim('idle', true);
    this.anims.pause(this.anims.currentAnim.frames[0]);
    const body = this.height * 0.55; // distance from feet to the middle of the body
    this.scene.tweens.add({ targets: this, angle: 90 * side, duration, ease: 'Quad.In' });
    this.scene.tweens.add({
      targets: this, shadowDX: side * body, duration, ease: 'Quad.In',
    });
    this.scene.tweens.add({ targets: this.shadow, scaleX: 1.7, scaleY: 0.8, alpha: 0.24, duration, ease: 'Quad.In' });
  }

  /** Stand back up after a whiff. */
  getUp(duration = 220) {
    this.scene.tweens.add({ targets: this, angle: 0, shadowDX: 0, duration, ease: 'Quad.Out' });
    this.scene.tweens.add({
      targets: this.shadow, scaleX: 1, scaleY: 1, alpha: 0.32, duration,
      onComplete: () => { if (this.state === 'down') { this.state = 'idle'; this.anims.resume(); } },
    });
  }

  /** Broken tackle: a short wobble and slowdown, then keep running. */
  stumble(seconds = 0.3) {
    this.speedScale = 0.55;
    this.scene.tweens.add({ targets: this, angle: { from: -10, to: 10 }, duration: (seconds * 1000) / 4, yoyo: true, repeat: 1,
      onComplete: () => { this.angle = 0; } });
    this.scene.time.delayedCall(seconds * 1000, () => { this.speedScale = 1; });
  }

  /** (old) Tackled: play the death animation and stay down. */
  goDown(pushX = 0, pushY = 0) {
    if (this.state === 'down') return;
    this.state = 'down';
    this.engaged = null;
    if (Math.hypot(pushX, pushY) > 0.1) this.facing = dirFromVector(pushX, pushY);
    this.vel.set(pushX, pushY);
    this.anims.timeScale = 1;
    this.playAnim('death', true);
  }

  destroy(fromScene) {
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
