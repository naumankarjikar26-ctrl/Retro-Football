// Runs ONE live play: lines both teams up, handles the snap, the throw, the
// catch, the run after catch and the tackle, then reports a result.
//
// Phases:  presnap -> snap -> qb -> (air -> run | air -> dead) | run -> dead
// Stage 3 (cadence) and Stage 4 (hard count) live inside `presnap`; Stage 5
// penalties listen to the bus events this class emits.

import {
  TUNING, FIELD_LEFT, FIELD_RIGHT, WORLD_W, WORLD_H, yd, toYards, yardToY, yToYard, latToX, xToLat,
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
    this.ballX = latToX(gameState.ballLat);
    this.losY = yardToY(gameState.ballOn);
    this.ball = new Ball(scene);
    this.lineUp();
  }

  lineUp() {
    const clampX = (x) => Phaser.Math.Clamp(x, FIELD_LEFT + yd(1.5), FIELD_RIGHT - yd(1.5));
    const off = OFFENSE_FORMATIONS[this.def.formation].players;
    for (const [slot, s] of Object.entries(off)) {
      const p = new Player(this.scene, clampX(this.ballX + yd(s.at[0])), this.losY + yd(s.at[1]), 'home', s.role, slot);
      p.ai.homeX = p.x;
      p.ai.homeY = p.y;
      this.offense.push(p);
      this.offenseBySlot[slot] = p;
    }
    const dfn = DEFENSE_FORMATIONS[this.def.defense].players;
    for (const [slot, s] of Object.entries(dfn)) {
      const baseX = s.over ? this.offenseBySlot[s.over].x : this.ballX;
      const d = new Player(this.scene, clampX(baseX + yd(s.at[0])), this.losY - yd(s.at[1]), 'away', s.role, slot);
      d.job = s.job;
      this.defense.push(d);
      this.defenseBySlot[slot] = d;
    }

    this.qb = this.offenseBySlot.QB;
    this.controlled = this.qb;
    this.receivers = [];
    for (const [slot, routeName] of Object.entries(this.def.routes)) {
      const p = this.offenseBySlot[slot];
      const outSign = Math.sign(p.x - this.ballX) || 1;
      p.route = buildRoute(routeName, p.x, p.y, outSign, yd);
      p.route.delay = this.def.routeDelay?.[slot] || 0;
      this.receivers.push(p);
    }
    for (const [slot, target] of Object.entries(this.def.blocking)) {
      this.offenseBySlot[slot].blockTarget = target ? this.defenseBySlot[target] : null;
    }

    const c = this.offenseBySlot.C;
    this.ball.placeAt(this.ballX, this.losY);
    c.facing = 'N';
  }

  // ---------------------------------------------------------------- actions

  snap() {
    if (this.phase !== 'presnap') return;
    this.phase = 'snap';
    this.snapTime = this.time;
    const qb = this.qb;
    this.ball.launch(this.ballX, this.losY, qb.x, qb.y, TUNING.snapTime, 3, () => {
      this.ball.holdBy(qb);
      if (this.phase === 'snap') this.phase = 'qb';
    }, 2, CATCH_Z);
    this.dropbackY = qb.y + yd(TUNING.qbDropback);
    bus.emit(EV.SNAP);
    bus.emit(EV.HINT, 'DRAG TO THROW  -  ARROWS/WASD TO MOVE');
  }

  canThrow() {
    return this.phase === 'qb' && this.ball.carrier === this.qb && this.qb.state !== 'throwing'
      && this.qb.state !== 'down' && this.qb.y >= this.losY - yd(0.3);
  }

  /** Throw parameters for a target (also used to draw the aiming arc). */
  throwParams(tx, ty) {
    const q = this.qb;
    const dist = toYards(Phaser.Math.Distance.Between(q.x, q.y, tx, ty));
    return { dist, duration: 0.3 + dist / 24, peak: 6 + dist * 0.55 };
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
      this.intended = nearest({ x: tx, y: ty }, this.receivers.filter((r) => r.state !== 'down'), yd(14));
      this.controlled = null;
      this.throwFrom = { x: q.x, y: q.y };
      this.ball.launch(q.x, q.y, tx, ty, duration, peak, () => this.resolveCatch());
      bus.emit(EV.THROW, { from: { x: q.x, y: q.y }, to: { x: tx, y: ty }, beyondLOS: q.y < this.losY });
    });
    return true;
  }

  // ---------------------------------------------------------------- update

  /**
   * @param {{dx:number, dy:number, steerX:number|null}} input
   *   dx/dy: keyboard direction (-1..1). steerX: world x the pointer is steering toward.
   */
  update(dt, input) {
    this.time += dt;

    this.updateControlled(input);
    updateOffense(this, dt);
    updateDefense(this, dt);

    for (const p of this.offense) p.update(dt);
    for (const p of this.defense) p.update(dt);
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
      else if (p.y < this.dropbackY - 1) p.moveToward(p.x, this.dropbackY, 0.55);
      else p.stop();
      // the QB tucks it and runs once he crosses the line
      if (this.phase === 'qb' && p.y < this.losY - yd(0.4)) {
        this.qbScrambling = true;
        this.startRun(p);
      }
      return;
    }

    // Ball carrier: runs upfield by default, keys or pointer steer.
    let dx = input.dx;
    let dy = input.dy;
    if (!hasKeys) {
      dy = -1;
      dx = input.steerX !== null ? Phaser.Math.Clamp((input.steerX - p.x) / yd(3), -1, 1) : 0;
    }
    p.moveDir(dx, dy, 1);
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
    const inBounds = t.x >= FIELD_LEFT && t.x <= FIELD_RIGHT && t.y >= yardToY(110) && t.y <= yardToY(-10);
    if (!inBounds) return this.incomplete('OUT OF BOUNDS');

    const radius = yd(TUNING.catchRadiusYd);
    const dist = (p) => Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y);
    const r = nearest(t, this.receivers.filter((p) => p.state !== 'down'), radius);
    const dd = nearest(t, this.defense.filter((p) => p.state !== 'down'), radius * 0.8);

    if (dd && (!r || dist(dd) < dist(r) * 0.8)) {
      // Stage 5+: interceptions. For now a defender in front knocks it away.
      if (!r || Math.random() < 0.7) return this.incomplete('BROKEN UP');
    }
    if (!r) return this.incomplete('NO RECEIVER THERE');

    const contested = dd && Phaser.Math.Distance.Between(dd.x, dd.y, r.x, r.y) < yd(1.3);
    const hands = r.ratings.hands ?? 0.85;
    const chance = contested ? hands * 0.7 : Math.min(0.98, hands + 0.06);
    if (Math.random() > chance) return this.incomplete('DROPPED');

    this.ball.holdBy(r);
    bus.emit(EV.CATCH, { player: r });
    this.startRun(r);
    if (r.y <= yardToY(100)) this.end({ type: 'touchdown' });
    return true;
  }

  incomplete(reason) {
    // the ball skips along the turf, tumbling end over end
    const b = this.ball;
    const from = this.throwFrom || { x: b.gx, y: b.gy + 1 };
    const dx = b.gx - from.x;
    const dy = b.gy - from.y;
    const len = Math.hypot(dx, dy) || 1;
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
    const c = this.phase === 'qb' ? this.qb : this.carrier;
    if (!c || c.state === 'down') return;

    if (this.phase === 'run' && c.y <= yardToY(100)) {
      c.stop();
      return this.end({ type: 'touchdown' });
    }
    if (c.x < FIELD_LEFT || c.x > FIELD_RIGHT) {
      return this.end(this.spotResult(c, { outOfBounds: true }));
    }

    const radius = yd(TUNING.tackleRadiusYd);
    for (const d of this.defense) {
      if (d.state === 'down' || d.engaged || this.time < (d.ai.noTackleUntil || 0)) continue;
      if (Phaser.Math.Distance.Between(d.x, d.y, c.x, c.y) > radius) continue;

      if (this.phase === 'run' && Math.random() < TUNING.brokenTackleChance) {
        d.ai.noTackleUntil = this.time + 0.8;
        d.speedScale = 0.35;
        this.scene.time.delayedCall(600, () => { d.speedScale = 1; });
        continue;
      }
      // Tackle! Carrier is driven back a little in the tackler's direction.
      const push = d.vel.clone().scale(0.35).add(c.vel.clone().scale(0.25));
      c.goDown(push.x, push.y);
      d.goDown(d.vel.x * 0.5, d.vel.y * 0.5);
      if (this.ball.carrier === c) this.ball.holdBy(c);
      bus.emit(EV.TACKLE, { carrier: c, tackler: d });
      const sack = this.phase === 'qb';
      return this.end(this.spotResult(c, { sack }));
    }
  }

  spotResult(c, extra) {
    const endYard = yToYard(c.y);
    if (endYard <= 0) return { type: 'safety' };
    return { type: 'gain', endYard, endLat: xToLat(c.x), ...extra };
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
