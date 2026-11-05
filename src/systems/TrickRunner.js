// Runs a trick play's steps (see plays/trickPlays.js) after the snap.
// Each step is a reusable action. A step waits for its trigger, acts, then
// the next step starts. Rules enforced here for every trick play:
//   - pitches / laterals only go sideways or backward (it waits for a legal
//     angle, and if none comes the holder keeps the ball: it becomes a run)
//   - a defender reaching the ball holder before a hand-off / pitch / lateral
//     means he keeps it: it becomes a run
//   - a dropped pitch / lateral is a live fumble (PlayController.updateLoose)

import { TUNING, yd, ydLat, gdist } from '../config/constants.js';
import { buildRoute } from '../plays/routes.js';
import { bus, EV } from './events.js';

// steps that need the ball holder to still be free when they fire
const NEEDS_CLEAN_POCKET = new Set(['handoff', 'takeFromHand', 'pitch', 'lateral', 'fakeThrow', 'dropback', 'wait']);

export class TrickRunner {
  constructor(play, def) {
    this.play = play;
    this.def = def;
    this.i = 0;
    this.stepStart = 0;
    this.busy = false;     // a toss is in the air
    this.done = false;
    this.moves = [];       // background moves (e.g. a QB dropping back while the next step runs)
  }

  get step() { return this.def.steps[this.i]; }
  slot(name) { return this.play.offenseBySlot[name]; }

  start() {
    this.stepStart = this.play.time;
    this.enter();
  }

  next() {
    this.i += 1;
    this.stepStart = this.play.time;
    if (this.i >= this.def.steps.length) { this.done = true; return; }
    this.enter();
  }

  /** Things that happen the moment a step begins. */
  enter() {
    const s = this.step;
    const p = this.play;
    if (s.bite) this.bite();
    if (s.do === 'route') {
      const who = this.slot(s.who);
      const out = (Math.sign(who.y - p.ballY) || 1);
      who.route = buildRoute(s.route, who.x, who.y, out);
      who.route.delay = 0;
      if (!p.receivers.includes(who)) p.receivers.push(who);
      this.next();
    } else if (s.do === 'throw') {
      p.trickPasser = this.slot(s.who);
      p.trickThrowReady = true;
      p.controlled = p.trickPasser;
      bus.emit(EV.HINT, 'PULL BACK + RELEASE TO THROW');
      this.next();
    } else if (s.do === 'run') {
      const who = this.slot(s.who);
      if (p.ball.carrier === who && p.phase !== 'run') p.startRun(who);
      this.next();
    } else if (s.do === 'trail') {
      // background: `who` shadows `of`, `back` yards behind and `side` yards outside him
      const who = this.slot(s.who);
      const of = this.slot(s.of);
      who.route = null;
      const side = Math.sign(of.y - p.ballY) || 1;
      this.moves.push({ who, follow: () => ({ x: of.x - yd(s.back ?? 2.5), y: of.y + ydLat(s.side ?? 2) * side }) });
      this.next();
    } else if (s.do === 'dropback' && s.async) {
      // keep dropping in the background; the next step starts right away
      const who = this.slot(s.who || 'QB');
      this.moves.push({ who, x: who.x - yd(s.yards ?? 3) });
      this.next();
    } else if (s.do === 'fakeThrow') {
      const who = this.slot(s.who || 'QB');
      who.state = 'throwing';           // arm up: freeze mid throwing motion
      who.facing = 'E';
      who.playAnim('punch', true);
      who.anims.pause(who.anims.currentAnim.frames[2]);
    }
  }

  /** Defense reacts to the fake: chosen roles chase the fake for a moment. */
  bite() {
    const b = this.def.bite;
    if (!b) return;
    const p = this.play;
    // 'line': step up toward the line of scrimmage; 'deep': drop toward a deep pass
    const toward = b.toward === 'deep' ? { x: p.losX + yd(18), y: p.ballY }
      : b.toward === 'line' ? { x: p.losX + yd(2), y: p.ballY }
        : this.slot(b.toward);
    p.bite = { roles: b.roles, toward, until: p.time + b.sec };
  }

  /** Becomes a plain run with whoever holds the ball. */
  bail() {
    const p = this.play;
    this.bailed = this.step?.do;
    this.done = true;
    const holder = p.ball.carrier;
    if (holder && holder.state === 'throwing') { holder.state = 'idle'; holder.anims.resume(); }
    if (holder && p.offense.includes(holder) && p.phase !== 'run') p.startRun(holder);
  }

  /** Run steps; several can complete in the same frame (e.g. catch -> lateral at once). */
  update() {
    for (let guard = 0; guard < 6; guard++) {
      const before = this.i;
      this.tick();
      if (this.i === before || this.done || this.busy) break;
    }
  }

  tick() {
    const p = this.play;
    if (p.phase !== 'dead') {
      this.moves = this.moves.filter((m) => {
        if (m.who.state === 'down' || m.who.state === 'tackled') return false;
        if (m.follow) { const f = m.follow(); m.who.moveToward(f.x, f.y, 1); return true; }
        if (m.who.x > m.x + 1) { m.who.moveToward(m.x, m.who.y, 0.75); return true; }
        m.who.stop();
        return false;
      });
    }
    // the man a toss is going to tracks it to the landing spot
    if (this.busy && this.toss_) {
      const { to, x, y } = this.toss_;
      if (to.state !== 'down' && to.state !== 'tackled') to.moveToward(x, y, 1);
    }
    if (this.done || this.busy || p.phase === 'dead' || p.phase === 'loose' || p.phase === 'presnap' || p.phase === 'snap') return;
    const s = this.step;
    const t = p.time - this.stepStart;
    const holder = p.ball.carrier;
    // holder is being tackled / is down: the trick is over
    if (holder && (holder.state === 'tackled' || holder.state === 'down' || p.tackling)) { this.done = true; return; }

    // a defender got there first: the holder keeps it
    // "reached" = inside tackle range, the same distance the tackle rules use
    if (NEEDS_CLEAN_POCKET.has(s.do) && holder && p.defense.some((d) => d.state !== 'down' && !d.engaged && gdist(d, holder) < yd(TUNING.tackleRadiusYd))) {
      if (s.do === 'dropback' || s.do === 'wait' || s.do === 'fakeThrow') {
        // just a pass-rush hit: let the normal tackle rules decide
      } else { this.bail(); return; }
    }

    switch (s.do) {
      case 'dropback': {
        const who = this.slot(s.who || 'QB');
        if (!s._x) s._x = who.x - yd(s.yards ?? 3);
        if (who.x > s._x + 1) who.moveToward(s._x, who.y, 0.7);
        else { who.stop(); this.next(); }
        break;
      }
      case 'wait':
        if (t >= s.sec) this.next();
        break;
      case 'fakeThrow': {
        // ends after `hold`, or as soon as a teammate arrives to take it (endWhenNear)
        const n = s.endWhenNear;
        const arrived = n && gdist(this.slot(n.who), this.slot(s.who || 'QB')) <= yd(n.yd);
        if (t >= (s.hold ?? 1) || arrived) this.next();
        break;
      }
      case 'handoff':
      case 'takeFromHand': {
        const from = this.slot(s.from);
        const to = this.slot(s.to);
        if (holder !== from) { if (t > 2.5) this.bail(); break; }
        if (gdist(from, to) <= yd(s.near ?? 1.3)) {
          if (from.state === 'throwing') { from.state = 'idle'; from.anims.resume(); }
          p.ball.holdBy(to);
          bus.emit(EV.HANDOFF, { runner: to });
          this.next();
        } else if (t > 2.5) this.bail();
        break;
      }
      case 'pitch':
      case 'lateral': {
        const from = this.slot(s.from);
        const to = this.slot(s.to);
        if (holder !== from || to.state === 'down' || to.state === 'tackled') { if (t > (s.maxWait ?? 2)) this.bail(); break; }
        const trigger = s.when
          ? (t >= (s.when.after ?? 99) || p.defense.some((d) => d.state !== 'down' && gdist(d, from) < yd(s.when.defenderYd ?? 0)))
          : t >= (s.after ?? 0);
        // the BALL may only go sideways or backward (toss() aims it that way);
        // the target can be up to 1.5 yd ahead and step back to it
        const legal = to.x <= from.x + yd(1.5);
        if (trigger && legal) this.toss(from, to);
        else if (t > (s.maxWait ?? 2)) this.bail();
        break;
      }
      case 'afterCatch':
        if (p.phase === 'run' && p.carrier === this.slot(s.by)) this.next();
        else if (p.phase === 'run' && p.carrier !== this.slot(s.by)) this.done = true; // someone else caught it
        break;
      default:
        this.next();
    }
  }

  /** A short backward / sideways toss that leads the receiver; it can be dropped. */
  toss(from, to) {
    const p = this.play;
    this.busy = true;
    const flight = Phaser.Math.Clamp(0.15 + gdist(from, to) / yd(20), 0.18, 0.5);
    const lead = to.predict(flight);
    // never forward, even after leading him
    const tx = Math.min(lead.x, from.x + yd(0.2));
    const ty = lead.y;
    // he stops running his route / being moved, and goes to the ball
    to.route = null;
    this.moves = this.moves.filter((m) => m.who !== to);
    this.toss_ = { to, x: tx, y: ty };
    if (p.controlled === from) p.controlled = null;
    if (p.phase === 'run') p.carrier = null; // nobody to tackle while it's in the air
    p.ball.launch(from.x, from.y, tx, ty, flight, 6, () => {
      this.busy = false;
      this.toss_ = null;
      this.lastToss = { missYd: +(gdist(to, { x: tx, y: ty }) / yd(1)).toFixed(2) };
      if (Math.random() < TUNING.lateralDropChance || gdist(to, { x: tx, y: ty }) > yd(2.5)) {
        p.fumble(tx, ty);
        this.done = true;
        return;
      }
      p.ball.holdBy(to);
      if (p.phase === 'run') { p.carrier = to; p.controlled = to; p.laneY = to.y; }
      bus.emit(EV.LATERAL, { from, to });
      this.next();
    }, 9, 9, 'ball-spiral');
  }
}
