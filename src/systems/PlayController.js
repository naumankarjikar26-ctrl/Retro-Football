// Runs ONE live play: lines both teams up, handles the snap, the throw, the
// catch, the run after catch and the tackle, then reports a result.
//
// The field is horizontal: the offense drives to the RIGHT (+x); the
// sidelines are the top (far) and bottom (near) edges.
//
// Phases:  presnap -> snap -> qb -> (air -> run | air -> dead) | run -> dead
// Stage 3 (cadence) and Stage 4 (hard count) live inside `presnap`; Stage 5
// penalties listen to the bus events this class emits.

import {
  TUNING, PX_PER_YARD, FIELD_TOP, FIELD_BOTTOM, WORLD_W, WORLD_H, SIDELINE_MARGIN_YD, yd, ydLat, toYards, yardToX, xToYard,
  latToY, yToLat,
  gdist, groundLen, LAT_SCALE,
} from '../config/constants.js';
import { OFFENSE_FORMATIONS, DEFENSE_FORMATIONS } from '../plays/formations.js';
import { buildRoute } from '../plays/routes.js';
import { Player } from '../entities/Player.js';
import { Ball, CATCH_Z } from '../entities/Ball.js';
import { updateOffense, nearest } from '../ai/OffenseAI.js';
import { updateDefense } from '../ai/DefenseAI.js';
import { bus, EV } from './events.js';

export class PlayController {
  constructor(scene, gameState, playDef) {
    this.scene = scene;
    this.gs = gameState;
    this.def = playDef;
    this.phase = 'presnap';
    this.time = 0;
    this.offense = [];
    this.defense = [];
    this.offenseBySlot = {};
    this.defenseBySlot = {};
    this.carrier = null;
    this.controlled = null;
    this.intended = null;
    this.result = null;
    this.qbScrambling = false;

    this.ballLat = gameState.ballLat;
    this.ballY = latToY(gameState.ballLat); // ball's spot between the hashes
    this.losX = yardToX(gameState.ballOn);  // line of scrimmage
    this.ball = new Ball(scene);
    this.lineUp();
  }

  lineUp() {
    // everyone lines up at least 3 yards inside the sidelines
    const clampY = (y) => Phaser.Math.Clamp(y, FIELD_TOP + ydLat(3), FIELD_BOTTOM - ydLat(3));
    const off = OFFENSE_FORMATIONS[this.def.formation].players;
    for (const [slot, s] of Object.entries(off)) {
      const p = new Player(this.scene, this.losX - yd(s.at[1]), clampY(this.ballY + ydLat(s.at[0])), 'home', s.role, slot, this.gs.skinToneFor('home', slot));
      p.ai.homeX = p.x;
      p.ai.homeY = p.y;
      this.offense.push(p);
      this.offenseBySlot[slot] = p;
    }
    const dfn = DEFENSE_FORMATIONS[this.def.defense].players;
    for (const [slot, s] of Object.entries(dfn)) {
      const baseY = s.over ? this.offenseBySlot[s.over].y : this.ballY;
      const d = new Player(this.scene, this.losX + yd(s.at[1]), clampY(baseY + ydLat(s.at[0])), 'away', s.role, slot, this.gs.skinToneFor('away', slot));
      d.job = s.job;
      this.defense.push(d);
      this.defenseBySlot[slot] = d;
    }

    this.qb = this.offenseBySlot.QB;
    this.controlled = this.qb;
    this.receivers = [];
    for (const [slot, routeName] of Object.entries(this.def.routes)) {
      const p = this.offenseBySlot[slot];
      const outSign = Math.sign(p.y - this.ballY) || 1;
      p.route = buildRoute(routeName, p.x, p.y, outSign);
      p.route.delay = this.def.routeDelay?.[slot] || 0;
      this.receivers.push(p);
    }
    for (const [slot, target] of Object.entries(this.def.blocking)) {
      this.offenseBySlot[slot].blockTarget = target ? this.defenseBySlot[target] : null;
    }

    const c = this.offenseBySlot.C;
    this.ball.placeAt(this.losX, this.ballY);
    c.facing = 'E';
  }

  // ---------------------------------------------------------------- actions

  snap() {
    if (this.phase !== 'presnap') return;
    this.phase = 'snap';
    this.snapTime = this.time;
    // everyone comes out of their stance; the first frames of the run/block
    // animations take over from the crouch
    for (const p of [...this.offense, ...this.defense]) p.stance = null;
    const qb = this.qb;
    this.ball.launch(this.losX, this.ballY, qb.x, qb.y, TUNING.snapTime, 3, () => {
      this.ball.holdBy(qb);
      if (this.phase === 'snap') this.phase = 'qb';
    }, 2, CATCH_Z);
    this.dropbackX = qb.x - yd(TUNING.qbDropback);
    bus.emit(EV.SNAP);
    bus.emit(EV.HINT, 'PULL BACK + RELEASE TO THROW');
  }

  canThrow() {
    return this.phase === 'qb' && this.ball.carrier === this.qb && this.qb.state !== 'throwing'
      && this.qb.state !== 'down' && this.qb.x <= this.losX + yd(0.3);
  }

  /**
   * Throw parameters for a target (also used to draw the aiming arc).
   * Short throws are quick and flat; deep throws hang higher and longer
   * (60 yards: ~2.4 s in the air, ~44 px high).
   */
  throwParams(tx, ty) {
    const q = this.qb;
    const dist = toYards(gdist(q, { x: tx, y: ty }));
    return { dist, duration: 0.35 + dist * 0.034, peak: (2 + dist * 0.7) * (PX_PER_YARD / 7) };
  }

  throwTo(tx, ty) {
    if (!this.canThrow()) return false;
    const q = this.qb;
    tx = Phaser.Math.Clamp(tx, 4, WORLD_W - 4);
    ty = Phaser.Math.Clamp(ty, 4, WORLD_H - 4);
    const { dist, duration, peak } = this.throwParams(tx, ty);
    if (dist < TUNING.minThrowYd) return false;

    q.throwMotion(tx - q.x, ty - q.y, () => {
      if (this.phase !== 'qb') return;
      this.phase = 'air';
      this.throwTime = this.time;
      this.throwTarget = { x: tx, y: ty };
      // the receiver closest to the landing spot goes up for it
      this.intended = nearest({ x: tx, y: ty }, this.receivers.filter((r) => r.state !== 'down'), yd(25));
      this.controlled = null;
      this.throwFrom = { x: q.x, y: q.y };
      this.ball.launch(q.x, q.y, tx, ty, duration, peak, () => this.resolveCatch());
      bus.emit(EV.THROW, { from: { x: q.x, y: q.y }, to: { x: tx, y: ty }, beyondLOS: q.x > this.losX });
    });
    return true;
  }

  // ---------------------------------------------------------------- update

  /**
   * @param {{dx:number, dy:number, steerY:number|null, aiming:boolean}} input
   *   dx/dy: keyboard direction (-1..1, right = downfield). steerY: world y the pointer steers toward.
   */
  update(dt, input) {
    if (this.hitStop > 0) { this.hitStop -= dt; return; } // impact freeze frames
    this.time += dt;

    this.updateControlled(input);
    updateOffense(this, dt);
    updateDefense(this, dt);

    for (const p of this.offense) p.update(dt);
    for (const p of this.defense) p.update(dt);
    this.keepAIInBounds();
    this.ball.update(dt);

    if (this.phase === 'qb' || this.phase === 'run') this.checkCarrier();
  }

  updateControlled(input) {
    const p = this.controlled;
    if (!p || p.state === 'down' || this.phase === 'presnap' || this.phase === 'dead') {
      if (p && this.phase !== 'dead') p.stop();
      return;
    }
    const hasKeys = input.dx !== 0 || input.dy !== 0;

    if (p === this.qb && this.phase !== 'run') {
      if (p.state === 'throwing') return;
      if (hasKeys) p.moveDir(input.dx, input.dy, input.aiming ? 0.55 : 1);
      else if (p.x > this.dropbackX + 1) p.moveToward(this.dropbackX, p.y, 0.55);
      else p.stop();
      // the QB tucks it and runs once he crosses the line
      if (this.phase === 'qb' && p.x > this.losX + yd(0.4)) {
        this.qbScrambling = true;
        this.startRun(p);
      }
      return;
    }

    // Ball carrier: runs downfield (right) by default, keys or pointer steer.
    let dx = input.dx;
    let dy = input.dy;
    if (!hasKeys) {
      dx = 1;
      dy = input.steerY !== null ? Phaser.Math.Clamp((input.steerY - p.y) / ydLat(3), -1, 1) : 0;
    }
    p.moveDir(dx, dy, 1);
  }

  /** Only the player the user controls may ever step out of bounds. */
  keepAIInBounds() {
    const top = FIELD_TOP + ydLat(SIDELINE_MARGIN_YD * 0.5);
    const bottom = FIELD_BOTTOM - ydLat(SIDELINE_MARGIN_YD * 0.5);
    const left = yardToX(-9.5);
    const right = yardToX(109.5);
    for (const p of [...this.offense, ...this.defense]) {
      if (p === this.controlled || p.state === 'down') continue;
      if (p.y < top) { p.y = top; if (p.vel.y < 0) p.vel.y = 0; }
      if (p.y > bottom) { p.y = bottom; if (p.vel.y > 0) p.vel.y = 0; }
      p.x = Phaser.Math.Clamp(p.x, left, right);
    }
  }

  startRun(carrier) {
    this.phase = 'run';
    this.carrier = carrier;
    this.controlled = carrier;
    carrier.route = null;
    bus.emit(EV.HINT, 'ARROWS/WASD OR HOLD TO STEER');
  }

  resolveCatch() {
    const t = this.throwTarget;
    const inBounds = t.y >= FIELD_TOP && t.y <= FIELD_BOTTOM && t.x >= yardToX(-10) && t.x <= yardToX(110);
    if (!inBounds) return this.incomplete('OUT OF BOUNDS');

    const radius = yd(TUNING.catchRadiusYd);
    const dist = (p) => gdist(p, t);
    const r = nearest(t, this.receivers.filter((p) => p.state !== 'down'), radius);
    const dd = nearest(t, this.defense.filter((p) => p.state !== 'down'), radius * 0.8);

    if (dd && (!r || dist(dd) < dist(r) * 0.8)) {
      // Stage 5+: interceptions. For now a defender in front knocks it away.
      if (!r || Math.random() < 0.7) return this.incomplete('BROKEN UP');
    }
    if (!r) return this.incomplete('NO RECEIVER THERE');

    const contested = dd && gdist(dd, r) < yd(1.3);
    const hands = r.ratings.hands ?? 0.85;
    const chance = contested ? hands * 0.7 : Math.min(0.98, hands + 0.06);
    if (Math.random() > chance) return this.incomplete('DROPPED');

    this.ball.holdBy(r);
    bus.emit(EV.CATCH, { player: r });
    this.startRun(r);
    if (r.x >= yardToX(100)) this.end({ type: 'touchdown' });
    return true;
  }

  incomplete(reason) {
    // the ball skips along the turf, tumbling end over end
    const b = this.ball;
    const from = this.throwFrom || { x: b.gx, y: b.gy + 1 };
    const dx = b.gx - from.x;
    const dy = b.gy - from.y;
    const len = groundLen(dx, dy) || 1;
    const hop = yd(2);
    const sx = b.gx;
    const sy = b.gy;
    b.launch(sx, sy, sx + (dx / len) * hop, sy + (dy / len) * hop, 0.45, 5, () => b.placeAt(b.gx, b.gy), CATCH_Z, 0, 'ball-tumble');
    bus.emit(EV.INCOMPLETE, { reason });
    this.end({ type: 'incomplete', reason });
    return false;
  }

  /** Tackles, sacks, sidelines, goal lines. */
  checkCarrier() {
    if (this.tackling) return;
    const c = this.phase === 'qb' ? this.qb : this.carrier;
    if (!c || c.state === 'down' || c.state === 'tackled') return;

    if (this.phase === 'run' && c.x >= yardToX(100)) {
      c.stop();
      return this.end({ type: 'touchdown' });
    }
    if (c === this.controlled && (c.y < FIELD_TOP || c.y > FIELD_BOTTOM)) {
      return this.end(this.spotResult(c, { outOfBounds: true }));
    }

    const radius = yd(TUNING.tackleRadiusYd);
    for (const d of this.defense) {
      if (d.state === 'down' || d.engaged || this.time < (d.ai.noTackleUntil || 0)) continue;
      if (gdist(d, c) > radius) continue;

      if (this.phase === 'run' && Math.random() < TUNING.brokenTackleChance) {
        this.brokenTackle(c, d);
        continue;
      }
      return this.tackle(c, d);
    }
  }

  /** Whiff: the carrier stumbles and keeps going, the defender dives past and goes down. */
  brokenTackle(c, d) {
    d.ai.noTackleUntil = this.time + TUNING.tackleRetryDelay;
    c.stumble(0.3);
    // dive past in the direction he was moving
    const len = Math.hypot(d.vel.x, d.vel.y) || 1;
    const ux = d.vel.x / len;
    const uy = d.vel.y / len;
    this.scene.tweens.add({ targets: d, x: d.x + ux * yd(1.6), y: d.y + uy * yd(1.6) * LAT_SCALE, duration: 180, ease: 'Quad.Out' });
    d.state = 'tackled';
    this.scene.time.delayedCall(60, () => d.tipOver(ux, 200));
    this.scene.time.delayedCall(1000, () => { if (d.active && d.state === 'down') d.getUp(); });
    bus.emit(EV.BROKEN_TACKLE, { carrier: c, tackler: d });
  }

  /**
   * Tackle sequence: lunge -> hit-pause + flash + shake -> knockback with the
   * defender wrapped on -> both tip over together -> stay down -> play over.
   */
  tackle(c, d) {
    const sack = this.phase === 'qb';
    const result = this.spotResult(c, { sack });   // forward progress at contact
    this.tackling = true;
    this.controlled = null;
    // direction of the hit (defender's motion, or from defender to carrier)
    let hx = d.vel.x;
    let hy = d.vel.y;
    if (Math.hypot(hx, hy) < 1) { hx = c.x - d.x; hy = (c.y - d.y) / LAT_SCALE; }
    const hl = Math.hypot(hx, hy) || 1;
    hx /= hl; hy /= hl;
    c.state = 'tackled';
    d.state = 'tackled';
    if (this.ball.carrier === c) this.ball.holdBy(c);
    bus.emit(EV.TACKLE, { carrier: c, tackler: d });

    const tw = this.scene.tweens;
    // 1. lunge into the carrier
    tw.add({ targets: d, x: c.x - hx * 5, y: c.y - hy * 5 * LAT_SCALE, duration: 70, ease: 'Quad.In', onComplete: () => {
      // 2. impact: hit-pause, flash, shake
      this.hitStop = 0.05;
      this.scene.impactFlash?.((c.x + d.x) / 2, (c.y + d.y) / 2 - 12);
      this.scene.cameras.main.shake(110, 0.004);
      // 3. knockback a few pixels, defender wrapped on
      const kx = hx * 7;
      const ky = hy * 7 * LAT_SCALE;
      tw.add({ targets: [c, d], x: `+=${kx}`, y: `+=${ky}`, duration: 160, delay: 50, ease: 'Quad.Out', onComplete: () => {
        // 4. both go down together toward the hit
        c.tipOver(hx, 280);
        d.tipOver(hx, 300);
        this.scene.time.delayedCall(700, () => this.end(result));
      } });
    } });
  }

  spotResult(c, extra) {
    const endYard = xToYard(c.x);
    if (endYard <= 0) return { type: 'safety' };
    return { type: 'gain', endYard, endLat: yToLat(c.y), ...extra };
  }

  end(result) {
    if (this.phase === 'dead') return;
    this.phase = 'dead';
    this.result = result;
    this.controlled = null;
    for (const p of [...this.offense, ...this.defense]) p.engaged = null;
    bus.emit(EV.PLAY_END, result);
  }

  destroy() {
    for (const p of [...this.offense, ...this.defense]) p.destroy();
    this.ball.destroy();
  }
}
