// The field and the live play. Owns input, the camera, route drawing and the
// throw-aim arc; delegates the football itself to PlayController.
//
// Throwing is a slingshot: after the snap, press ANYWHERE and pull back. The
// ball goes the opposite way of the pull; a longer pull throws farther and
// higher. A tiny pull cancels.

import {
  TUNING, PAL, VIEW_W, BAR_H, FIELD_VIEW_H, FIELD_TOP, FIELD_BOTTOM, yd, ydLat, groundLen, gdist, toYards, yardToX, latToY,
} from '../config/constants.js';
import { Field } from '../field/Field.js';
import { CameraController } from '../camera/CameraController.js';
import { GameState } from '../systems/GameState.js';
import { PlayController } from '../systems/PlayController.js';
import { playById } from '../plays/playbook.js';
import { autoPick } from '../plays/autoPick.js';
import { bus, EV } from '../systems/events.js';
import { THROW_START_Z, CATCH_Z } from '../entities/Ball.js';
import { nearest } from '../ai/OffenseAI.js';
import { CATCHING } from '../config/catching.js';
import { CARRIER } from '../config/speeds.js';
import { PixelText } from '../gfx/PixelFont.js';

const ROUTE_COLOR = 0xf4f4f4; // white routes
const ROUTE_AIMED = 0x73eff7; // light blue: the receiver you're aiming at

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    // the field camera sits between the top score bar and the bottom hint bar
    this.cameras.main.setViewport(0, BAR_H, VIEW_W, FIELD_VIEW_H);

    this.field = new Field(this);
    this.gs = new GameState();
    this.routeGfx = this.add.graphics().setDepth(3);   // above the field, below players (10+)
    this.aimGfx = this.add.graphics().setDepth(3000);
    this.starGfx = this.add.graphics().setDepth(2900); // star over the ball carrier
    this.aim = null;          // { sx, sy, cx, cy } in screen px while pulling
    this.play = null;
    this.deadTimer = 0;
    this.routesVisible = false;

    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,ENTER');
    this.input.keyboard.on('keydown-SPACE', () => this.onAction());
    this.input.keyboard.on('keydown-ENTER', () => this.onAction());
    this.input.keyboard.on('keydown-P', () => this.openPlaybook());
    // ball carrier cuts: one press = one juke (no holding); Space dives
    for (const k of ['UP', 'W']) this.input.keyboard.on(`keydown-${k}`, () => this.play?.juke(-1));
    for (const k of ['DOWN', 'S']) this.input.keyboard.on(`keydown-${k}`, () => this.play?.juke(1));
    for (const k of ['RIGHT', 'D']) this.input.keyboard.on(`keydown-${k}`, (e) => { if (!e.repeat) this.play?.dive(); }); // not from a held key (QB scramble)
    this.input.on('pointerdown', (p) => this.onPointerDown(p));
    this.input.on('pointermove', (p) => this.onPointerMove(p));
    this.input.on('pointerup', (p) => this.onPointerUp(p));
    this.input.on('pointerupoutside', (p) => this.onPointerUp(p));

    this.scene.launch('HUD');
    bus.on(EV.PLAY_END, this.onPlayEnd, this);
    // a trick play is used up when it's snapped (even if the defense stops it)
    bus.on(EV.SNAP, () => { if (this.playDef?.type === 'trick') this.gs.trickPlaysLeft -= 1; }, this);
    bus.on(EV.POPUP, this.popup, this);
    this.events.once('shutdown', () => bus.removeAllListeners());

    this.newPlay(true);
  }

  /** Short text that floats up over the play: CATCH!, DROPPED, ... */
  popup({ text, x, y, color }) {
    const col = color === 'good' ? PAL.lime : color === 'bad' ? PAL.orange : PAL.white;
    const t = new PixelText(this, Math.round(x), Math.round(y) - 46, text, col, 2).setAlign(0.5).setDepth(2600);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, delay: 600, duration: 500, onComplete: () => t.destroy() });
  }

  /** A yellow star floating over whoever has the ball. */
  drawBallStar() {
    const g = this.starGfx;
    g.clear();
    const h = this.play?.ball.carrier;
    if (!h || h.state === 'down' || !this.play.offense.includes(h)) return;
    const cx = Math.round(h.x);
    const cy = Math.round(h.y - h.displayHeight * 0.62 - 9 + Math.sin(this.time.now / 160) * 1.5);
    const pts = (r1, r2) => {
      const out = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? r2 : r1;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      return out;
    };
    const z = 1 / this.cameras.main.zoom;
    g.fillStyle(PAL.ink, 1).fillPoints(pts(8.5 * z, 4 * z), true);
    g.fillStyle(0xffe14d, 1).fillPoints(pts(6.5 * z, 2.8 * z), true);
  }

  /** Small white impact flash at a tackle (a quick expanding pixel burst). */
  impactFlash(x, y) {
    const g = this.add.graphics().setDepth(2500);
    g.fillStyle(PAL.white, 1);
    for (const [dx, dy] of [[0, -6], [0, 6], [-6, 0], [6, 0], [-4, -4], [4, -4], [-4, 4], [4, 4]]) g.fillRect(dx - 1, dy - 1, 3, 3);
    g.fillCircle(0, 0, 4);
    g.setPosition(Math.round(x), Math.round(y));
    this.tweens.add({ targets: g, scale: 1.8, alpha: 0, duration: 160, ease: 'Quad.Out', onComplete: () => g.destroy() });
  }

  // ---------------------------------------------------------------- flow

  /**
   * Between plays: the next play is picked automatically from the playbook
   * (weighted by down, distance and field position) and lined up right away.
   * The PLAYBOOK button lets you swap it before the snap.
   */
  newPlay(first = false) {
    this.calling = false;
    this.aim = null;
    this.pendingThrow = null;
    this.aimGfx.clear();
    this.gs.playClock = TUNING.playClockSec;
    const def = autoPick(this.gs, this.lastPlayId);
    this.startPlay(def, { first });
  }

  /** PLAYBOOK button: open the playbook over the field (any number of times before the snap). */
  openPlaybook() {
    if (this.calling || !this.play || this.play.phase !== 'presnap') return;
    this.calling = true;
    this.scene.launch('PlayCall', {
      currentId: this.playDef?.id,
      tricksLeft: this.gs.trickPlaysLeft,
      onPick: (def) => { this.calling = false; this.startPlay(def); },
      onClose: () => { this.calling = false; },
    });
    this.scene.bringToTop('PlayCall');
  }

  /** The play clock ran out before the snap: 5-yard delay of game, replay the down. */
  delayOfGame() {
    if (this.calling) { this.scene.stop('PlayCall'); this.calling = false; }
    this.gs.ballOn = Math.max(1, this.gs.ballOn - 5);
    this.play.phase = 'dead';
    this.deadTimer = 0;
    bus.emit(EV.STATE, this.gs);
    bus.emit('result', { headline: 'DELAY OF GAME', detail: '5 YARD PENALTY - REPLAY THE DOWN' });
    bus.emit(EV.HINT, 'SPACE / TAP FOR NEXT PLAY');
  }

  /** Line up the called play. `audibled` keeps the one audible per play used up. */
  startPlay(def, { first = false, audibled = false } = {}) {
    this.calling = false;
    this.playDef = def;
    this.lastPlayId = def.id;
    this.audibleUsed = audibled;
    this.play?.destroy();
    this.aim = null;
    this.swipe = null;
    this.aimGfx.clear();
    this.play = new PlayController(this, this.gs, def);
    this.field.setLines(this.gs.ballOn, this.gs.firstDownAt);
    this.drawRoutes();

    if (!this.camCtl) this.camCtl = new CameraController(this, this.play.ball);
    this.camCtl.ball = this.play.ball;
    this.camCtl.setFocus(() => this.cameraFocus());
    this.camCtl.setGuard(() => this.cameraGuard());
    this.camCtl.setZoom(() => this.cameraZoom());
    if (first) { const f = this.presnapFocus(); this.camCtl.snapTo(f.x, f.y); }

    bus.emit(EV.STATE, this.gs);
    bus.emit(EV.PRESNAP, this.gs);
    bus.emit(EV.PLAY_CALLED, def);
    const hints = {
      run: 'SPACE: SNAP  -  P: PLAYBOOK',
      trick: 'PRESS / SPACE TO SNAP THE TRICK PLAY',
      punt: 'PRESS / SPACE TO SNAP AND PUNT',
      fg: 'PRESS / SPACE TO SNAP AND KICK',
    };
    bus.emit(EV.HINT, hints[def.type] || 'PULL BACK: THROW  -  TAP RB: RUN  -  P: PLAYBOOK');
  }



  onAction() {
    if (this.calling || !this.play) return;
    if (this.play.carrierUnderControl) { this.play.dive(); return; }
    if (this.play.phase === 'presnap') this.play.snap();
    else if (this.play.phase === 'dead' && this.deadTimer > 0.6) this.newPlay();
  }

  onPlayEnd(result) {
    this.deadTimer = 0;
    this.aim = null;
    this.aimGfx.clear();
    const summary = this.gs.applyResult(result);
    bus.emit(EV.STATE, this.gs);
    bus.emit(EV.HINT, 'SPACE / TAP FOR NEXT PLAY');
    bus.emit('result', summary);
  }

  // ---------------------------------------------------------------- input

  onPointerDown(p) {
    if (this.calling || !this.play) return;
    if (this.scene.get('HUD').overButton?.(p)) return; // e.g. the PLAYBOOK button
    const ph = this.play?.phase;
    if (ph === 'dead') { this.onAction(); return; }
    // click / tap the running back: he gets the ball and runs it
    if ((ph === 'presnap' || ph === 'snap' || ph === 'qb') && this.hitRB(p)) {
      this.aim = null;
      this.play.giveToRB();
      return;
    }
    // ball carrier: hold above / below him to steer (see readInput); a quick
    // flick up / down jukes, a flick forward dives (decided on release)
    if (ph === 'run' && this.play.carrier === this.play.controlled) {
      this.swipe = { x: p.x, y: p.y, t: this.time.now, id: p.id };
      return;
    }
    // one motion: pressing snaps the ball AND starts the pull-back
    if (ph === 'presnap') this.play.snap();
    // anywhere on screen starts the pull; it is measured from this press point
    if (!this.play.qbScrambling && (this.play.isPassPlay || this.play.def.type === 'trick')) {
      this.aim = { sx: p.x, sy: p.y, cx: p.x, cy: p.y, id: p.id };
    }
  }

  onPointerMove(p) {
    if (this.aim && p.id === this.aim.id) {
      this.aim.cx = p.x;
      this.aim.cy = p.y;
      // keep a short history: lifting a finger off a trackpad nudges the
      // pointer back, which must not shorten the throw
      const h = (this.aim.hist ||= []);
      h.push({ t: this.time.now, cx: p.x, cy: p.y });
      while (h.length > 30) h.shift();
    }
  }

  onPointerUp(p) {
    const sw = this.swipe;
    if (sw && sw.id === p.id) {
      this.swipe = null;
      const dx = p.x - sw.x;
      const dy = p.y - sw.y;
      const quick = this.time.now - sw.t <= CARRIER.swipeMaxMs;
      if (quick && Math.hypot(dx, dy) >= CARRIER.swipeMinPx) {
        if (Math.abs(dy) > Math.abs(dx)) this.play.juke(Math.sign(dy));
        else if (dx > 0) this.play.dive();
      }
      return;
    }
    if (!this.aim || p.id !== this.aim.id) return;
    // use where the pull was just before release, ignoring the last ~0.1 s of
    // lift-off jitter (only if that pull was the longer one)
    const pullLen = (a) => Math.hypot(a.cx - this.aim.sx, a.cy - this.aim.sy);
    const before = (this.aim.hist || []).filter((e) => e.t <= this.time.now - TUNING.releaseIgnoreMs).pop();
    if (before && pullLen(before) > pullLen(this.aim)) { this.aim.cx = before.cx; this.aim.cy = before.cy; }
    const target = this.aimTarget();
    this.aim = null;
    this.aimGfx.clear();
    if (!target) return;
    // released before the snap reached the QB: throw the moment he has it
    if (this.play.phase === 'snap') this.pendingThrow = target;
    else if (this.play.canThrow()) this.play.throwTo(target.x, target.y);
  }

  /** Is the pointer on (or right next to) the running back? */
  hitRB(p) {
    const rb = this.play?.offenseBySlot.RB;
    if (!rb || rb.state === 'down' || this.play.handingOff) return false;
    const b = rb.getBounds();
    // the sprite frame is mostly empty: test a box around his body
    const bodyW = 18;
    const bodyH = 34;
    return Math.abs(p.worldX - rb.x) <= bodyW / 2 + 4 && p.worldY <= rb.y + 6 && p.worldY >= rb.y - bodyH && !!b;
  }

  /** Pull vector -> power (0..1) and on-screen throw direction (opposite the pull). */
  pullInfo() {
    if (!this.aim) return null;
    const px = this.aim.cx - this.aim.sx;
    const py = this.aim.cy - this.aim.sy;
    const pull = Math.hypot(px, py);
    if (pull < TUNING.pullCancelPx) return { pull, power: 0, cancelled: true };
    // full power needs pullMaxPx, or less when the screen edge is closer than
    // that (pressing near the QB on the left must still allow a deep ball)
    const room = this.roomToEdge(this.aim.sx, this.aim.sy, px / pull, py / pull);
    const maxPx = Phaser.Math.Clamp(room - 6, TUNING.pullCancelPx + 60, TUNING.pullMaxPx);
    const power = Phaser.Math.Clamp((pull - TUNING.pullCancelPx) / (maxPx - TUNING.pullCancelPx), 0, 1);
    return { pull, power, cancelled: false, ux: -px / pull, uy: -py / pull };
  }

  /** Screen px from (x, y) to the edge of the game view along direction (dx, dy). */
  roomToEdge(x, y, dx, dy) {
    const w = this.scale.width;
    const h = this.scale.height;
    const tx = dx < 0 ? x / -dx : dx > 0 ? (w - x) / dx : Infinity;
    const ty = dy < 0 ? y / -dy : dy > 0 ? (h - y) / dy : Infinity;
    return Math.min(tx, ty);
  }

  /** Landing spot for the current pull, or null if the pull would cancel. */
  aimTarget() {
    const info = this.pullInfo();
    if (!info || info.cancelled) return null;
    const q = this.play.passer;
    // slight curve: small pulls stay short (5-10 yd), a full pull reaches maxThrowYd
    const yards = Phaser.Math.Linear(TUNING.minThrowYd, TUNING.maxThrowYd, Math.pow(info.power, 1.3));
    // go `yards` along the ground in the pulled-away screen direction
    const screenLen = yd(yards) / groundLen(info.ux, info.uy);
    const raw = { x: q.x + info.ux * screenLen, y: q.y + info.uy * screenLen, yards };
    return raw; // always exactly where you aim: no snapping to receivers
  }

  readInput() {
    const k = this.keys;
    const dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    const dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    const p = this.input.activePointer;
    // steering: only once a press has been held a moment (a quick flick is a juke / dive)
    const held = this.swipe && this.time.now - this.swipe.t > 90;
    const steerY = p.isDown && !this.aim && held ? p.worldY : null;
    return { dx, dy, steerY, aiming: !!this.aim };
  }

  // ---------------------------------------------------------------- frame

  update(_t, delta) {
    const dt = Math.min(delta / 1000, 1 / 30);
    if (!this.play) return;
    // play clock runs before the snap, including while the playbook is open
    if (this.play.phase === 'presnap') {
      this.gs.playClock -= dt;
      if (this.gs.playClock <= 0) this.delayOfGame();
    }
    this.play.update(dt, this.readInput());
    if (this.calling) { this.camCtl.update(dt); return; } // playbook open over the field
    if (this.pendingThrow && this.play.canThrow()) {
      this.play.throwTo(this.pendingThrow.x, this.pendingThrow.y);
      this.pendingThrow = null;
    }
    const ph = this.play.phase;
    if (ph === 'dead' || ph === 'presnap') this.pendingThrow = null;
    if (this.aim && !(ph === 'snap' || ph === 'qb')) this.aim = null;
    // routes stay up from the line-up until the ball is thrown (or the QB runs)
    const wantRoutes = ph === 'presnap' || ph === 'snap' || (ph === 'qb' && this.play.passer.state !== 'throwing');
    if (wantRoutes) this.drawRoutes(); // redrawn each frame so the aimed receiver can light up
    else if (this.routesVisible) { this.routeGfx.clear(); this.routesVisible = false; }
    this.drawAim();
    this.drawBallStar();
    this.camCtl.update(dt);

    if (ph === 'dead') {
      this.deadTimer += dt;
      if (this.deadTimer > TUNING.resultHold + 0.6) this.newPlay();
    }
  }

  /**
   * Before the snap the camera zooms out to show the whole field from sideline
   * to sideline (like Retro Bowl's pre-snap view); at the snap it eases back
   * in to the normal 1:1 play zoom.
   */
  cameraZoom() {
    const ph = this.play?.phase;
    if (this.calling || ph === 'presnap') {
      return Math.min(1, this.cameras.main.height / (FIELD_BOTTOM - FIELD_TOP + 70));
    }
    return 1;
  }

  /** Before the snap: the whole field width, a little ahead of the line. */
  presnapFocus() {
    const p = this.play;
    return { x: p.losX + yd(9), y: (FIELD_TOP + FIELD_BOTTOM) / 2 - 12 };
  }

  cameraFocus() {
    const play = this.play;
    const ball = play.ball;
    const ph = play.phase;
    const target = this.aim && this.aimTarget();
    const mid = (t, k) => ({ x: Phaser.Math.Linear(ball.viewX, t.x, k), y: Phaser.Math.Linear(ball.viewY, t.y, k) });
    if (target) return mid(target, 0.5);                       // aiming: between QB and landing spot
    if (ph === 'presnap' || ph === 'snap') return this.presnapFocus();
    if (ph === 'qb') return { x: Math.max(ball.viewX + yd(8), play.losX + yd(4)), y: ball.viewY };
    if (ph === 'air' && play.throwTarget) return mid(play.throwTarget, 0.5); // ball + landing spot
    return { x: ball.viewX + yd(3), y: ball.viewY };
  }

  /** While aiming, the landing spot (where your receiver is) must stay on screen. */
  cameraGuard() {
    const target = this.aim && this.aimTarget();
    if (target) return target;
    return null;
  }

  // ---------------------------------------------------------------- drawing

  /**
   * Routes + blocking assignments, drawn with real line rendering:
   * 3px white lines over a dark 1px-wider shadow, rounded joins, an arrowhead
   * if the route keeps going or a filled circle if the receiver stops. The
   * receiver you are aiming at gets a light-blue route. Linemen get a short
   * line to their man ending in a flat "T" bar.
   */
  drawRoutes() {
    const g = this.routeGfx;
    g.clear();
    const play = this.play;
    const target = this.aimTarget() || this.pendingThrow;
    const aimed = target ? nearest(target, play.receivers, yd(8)) : null;

    const stroke = (pts, color, width, alpha) => {
      g.lineStyle(width, color, alpha);
      g.strokePoints(pts);
      g.fillStyle(color, alpha);
      for (const p of pts) g.fillCircle(p.x, p.y, width / 2); // smooth joins
    };
    const zz = 1 / this.cameras.main.zoom; // keep ends the same on-screen size at any zoom
    const draw = (pts, color, end) => {
      const sh = pts.map((p) => ({ x: p.x, y: p.y + 1 }));
      // thin route lines, same on-screen thickness at any camera zoom
      const z = 1 / this.cameras.main.zoom;
      stroke(sh, PAL.ink, 5 * z, 0.55);
      stroke(pts, color, 3 * z, 1);
      const e = pts[pts.length - 1];
      const b = pts[pts.length - 2];
      const len = Math.hypot(e.x - b.x, e.y - b.y) || 1;
      const ux = (e.x - b.x) / len;
      const uy = (e.y - b.y) / len;
      if (end === 'arrow') {
        const tri = (c, o, s) => {
          g.fillStyle(c, 1).fillTriangle(
            e.x + ux * s + o.x, e.y + uy * s + o.y,
            e.x - ux * s * 0.6 - uy * s + o.x, e.y - uy * s * 0.6 + ux * s + o.y,
            e.x - ux * s * 0.6 + uy * s + o.x, e.y - uy * s * 0.6 - ux * s + o.y);
        };
        tri(PAL.ink, { x: 0, y: 1 }, 6 * zz);
        tri(color, { x: 0, y: 0 }, 5 * zz);
      } else if (end === 'dot') {
        g.fillStyle(PAL.ink, 1).fillCircle(e.x, e.y + 1, 4.5 * zz);
        g.fillStyle(color, 1).fillCircle(e.x, e.y, 3.5 * zz);
      } else if (end === 'tee') {
        g.lineStyle(5 * zz, PAL.ink, 0.55).lineBetween(e.x - uy * 6 * zz, e.y + ux * 6 * zz + 1, e.x + uy * 6 * zz, e.y - ux * 6 * zz + 1);
        g.lineStyle(3 * zz, color, 1).lineBetween(e.x - uy * 5 * zz, e.y + ux * 5 * zz, e.x + uy * 5 * zz, e.y - ux * 5 * zz);
      }
    };

    // blocking assignments: short line toward the man, T bar at the end
    for (const p of play.offense) {
      if (p.role !== 'OL') continue;
      const man = p.blockTarget;
      const tx = man ? man.x : p.x + yd(2);
      const ty = man ? man.y : p.y;
      const dx = tx - p.x;
      const dy = ty - p.y;
      const l = Math.hypot(dx, dy) || 1;
      const reach = Math.min(l * 0.6, yd(1.6));
      draw([{ x: p.x + 3, y: p.y }, { x: p.x + 3 + (dx / l) * reach, y: p.y + (dy / l) * reach }], PAL.white, 'tee');
    }
    // receivers
    for (const r of play.receivers) {
      const route = r.route;
      if (!route?.curve) continue;
      const pts = route.drawPoints();
      draw(pts, r === aimed ? ROUTE_AIMED : ROUTE_COLOR, route.settle ? 'dot' : 'arrow');
    }
    this.routesVisible = true;
  }

  /** Dotted curved arc from the QB up and over to the landing spot, plus a marker. */
  drawAim() {
    const g = this.aimGfx;
    g.clear();
    if (this.play.phase === 'air' && this.play.throwTarget) {
      if (!this.play.isKick) this.drawLanding(g, this.play.throwTarget, true);
      return;
    }
    const target = this.aimTarget() || this.pendingThrow;
    if (!target || this.play.passer.state === 'throwing') return;
    const q = this.play.passer;
    const { peak } = this.play.throwParams(target.x, target.y);
    const len = Math.hypot(target.x - q.x, target.y - q.y) + peak * 2;
    const n = Math.max(4, Math.round(len / 5));
    const shift = (this.time.now / 1000 * 2.5) % 1; // marching dots
    const usable = this.play.canThrow() || this.play.phase === 'snap';
    const col = usable ? PAL.white : PAL.silver;

    for (let i = 0; i < n; i++) {
      const t = (i + shift) / n;
      const x = Math.round(Phaser.Math.Linear(q.x, target.x, t));
      const z = Phaser.Math.Linear(THROW_START_Z, CATCH_Z, t) + 4 * peak * t * (1 - t);
      const y = Math.round(Phaser.Math.Linear(q.y, target.y, t) - z);
      g.fillStyle(PAL.ink, 0.6).fillRect(x - 1, y, 2, 2);
      g.fillStyle(col, 1).fillRect(x - 1, y - 1, 2, 2);
    }
    this.drawLanding(g, target, false);
  }

  /** Landing marker on the ground; pulses while the ball is in the air. */
  drawLanding(g, target, pulse) {
    const tx = Math.round(target.x);
    const ty = Math.round(target.y);
    if (pulse) {
      // faint catch circle: the sure-catch range, so you can see if he'll get there
      const rx = yd(CATCHING.tiers[0].maxYd);
      const ry = ydLat(CATCHING.tiers[0].maxYd);
      g.fillStyle(PAL.white, 0.12).fillEllipse(tx, ty, rx * 2, ry * 2);
      g.lineStyle(1, PAL.white, 0.45).strokeEllipse(tx, ty, rx * 2, ry * 2);
    }
    const k = pulse ? 1 + 0.25 * Math.sin(this.time.now / 90) : 1;
    for (const [c, o, rad] of [[PAL.ink, 1, 7], [PAL.white, 0, 7], [PAL.orange, 0, 3]]) {
      g.fillStyle(c, 1);
      const r = rad * k;
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * Math.PI * 2;
        g.fillRect(Math.round(tx + Math.cos(ang) * r) + o, Math.round(ty + Math.sin(ang) * r * 0.5) + o, 1, 1);
      }
    }
    g.fillStyle(PAL.orange, 1).fillRect(tx - 1, ty - 1, 2, 2);
  }
}
