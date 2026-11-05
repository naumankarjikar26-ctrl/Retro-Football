// Stage 2: the play-call screen shown before every snap.
// Tabs for each category (RUN / SHORT / LONG / PLAY ACTION / KICK), up to 8
// play cards per tab (name, type tag, mini route diagram) and a QUICK PICK
// button. Keys: LEFT / RIGHT switch tabs, 1-8 pick a play, Q quick-picks.

import { VIEW_W, VIEW_H, BAR_H, HINT_H, PAL } from '../config/constants.js';
import { PixelText } from '../gfx/PixelFont.js';
import { PLAYBOOK, CATEGORIES } from '../plays/playbook.js';
import { OFFENSE_FORMATIONS } from '../plays/formations.js';
import { ROUTES } from '../plays/routes.js';
import { randomPlay } from '../plays/randomPlay.js';

const CAT_COLOR = { run: PAL.orange, short: PAL.sky, long: PAL.cyan, pa: PAL.lime, special: PAL.sand, random: PAL.lime };
const COLS = 4;
const CARD_W = 148;
const CARD_H = 112;
const GAP = 8;

export class PlayCallScene extends Phaser.Scene {
  constructor() { super('PlayCall'); }

  /** data: { onPick(playDef), tab? } */
  create(data) {
    this.onPick = data.onPick;
    this.picked = false;
    this.tab = PlayCallScene.lastTab ?? 0;
    const top = BAR_H;
    this.add.rectangle(0, top, VIEW_W, VIEW_H - BAR_H - HINT_H, PAL.ink, 0.75).setOrigin(0);

    // tab bar + quick pick
    this.tabs = CATEGORIES.map((c, i) => {
      const x = 8 + i * 86;
      const bg = this.add.rectangle(x, top + 6, 82, 22, PAL.dusk).setOrigin(0).setStrokeStyle(2, PAL.slate);
      const label = new PixelText(this, x + 41, top + 12, c.name === 'PLAY ACTION' ? 'PLAY ACT' : c.name, PAL.white, 2).setAlign(0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.showTab(i));
      return { bg, label, cat: c.id };
    });
    const qx = VIEW_W - 8 - 104;
    const qb = this.add.rectangle(qx, top + 6, 104, 22, PAL.dusk).setOrigin(0).setStrokeStyle(2, PAL.sand);
    new PixelText(this, qx + 52, top + 12, 'Q QUICK PICK', PAL.sand, 2).setAlign(0.5);
    qb.setInteractive({ useHandCursor: true }).on('pointerup', () => this.quickPick());

    this.cardLayer = this.add.container(0, 0);
    this.showTab(this.tab);

    // RANDOM PLAY: generates a brand-new play; press again to re-roll
    const rx = VIEW_W / 2 - 90;
    const ry = VIEW_H - HINT_H - 30;
    const rb = this.add.rectangle(rx, ry, 180, 24, PAL.dusk).setOrigin(0).setStrokeStyle(2, PAL.lime);
    this.randomLabel = new PixelText(this, rx + 90, ry + 7, 'R  RANDOM PLAY', PAL.lime, 2).setAlign(0.5);
    rb.setInteractive({ useHandCursor: true }).on('pointerup', () => this.rollRandom());

    this.input.keyboard.on('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.showTab((this.tab + CATEGORIES.length - 1) % CATEGORIES.length);
      if (e.key === 'ArrowRight') this.showTab((this.tab + 1) % CATEGORIES.length);
      const n = Number(e.key);
      if (!this.randomDef && n >= 1 && n <= this.plays.length) this.pick(this.plays[n - 1]);
      if (e.key === 'q' || e.key === 'Q') this.quickPick();
      if (e.key === 'r' || e.key === 'R') this.rollRandom();
      if (e.key === 'Enter' && this.randomDef) this.pick(this.randomDef);
    });
  }

  /** Generate (or re-roll) a random play and show it big, with CALL IT / RE-ROLL / BACK. */
  rollRandom() {
    this.randomDef = randomPlay();
    const def = this.randomDef;
    this.cardLayer.removeAll(true);
    const w = 420;
    const h = 236;
    const x = Math.round((VIEW_W - w) / 2);
    const y = BAR_H + 34;
    const items = [];
    items.push(this.add.rectangle(x, y, w, h, 0x24304a).setOrigin(0).setStrokeStyle(2, PAL.lime));
    items.push(new PixelText(this, x + w / 2, y + 8, def.name, PAL.lime, 3).setAlign(0.5));
    items.push(new PixelText(this, x + w / 2, y + 30, `${OFFENSE_FORMATIONS[def.formation].name}${def.detail ? '  -  ' + def.detail : ''}`, PAL.white, 2).setAlign(0.5));
    items.push(this.drawDiagram(def, x + 10, y + 46, w - 20, h - 92));
    const btn = (bx, label, color, fn) => {
      const b = this.add.rectangle(bx, y + h - 36, 124, 26, PAL.dusk).setOrigin(0).setStrokeStyle(2, color);
      b.setInteractive({ useHandCursor: true }).on('pointerup', fn);
      items.push(b, new PixelText(this, bx + 62, y + h - 28, label, color, 2).setAlign(0.5));
    };
    btn(x + 10, 'ENTER: CALL IT', PAL.lime, () => this.pick(def));
    btn(x + w / 2 - 62, 'R: RE-ROLL', PAL.sand, () => this.rollRandom());
    btn(x + w - 134, 'BACK', PAL.silver, () => { this.randomDef = null; this.showTab(0); });
    this.cardLayer.add(items);
    this.tabs.forEach((t) => {
      const on = t.cat === 'random';
      t.bg.setFillStyle(on ? PAL.ink : PAL.dusk).setStrokeStyle(2, on ? CAT_COLOR.random : PAL.slate);
      t.label.setColor(on ? CAT_COLOR.random : PAL.white);
    });
  }

  showTab(i) {
    // the RANDOM tab goes straight to the generator
    if (CATEGORIES[i].id === 'random') {
      this.tab = i;
      PlayCallScene.lastTab = i;
      this.rollRandom();
      return;
    }
    this.randomDef = null;
    this.tab = i;
    PlayCallScene.lastTab = i;
    this.tabs.forEach((t, k) => {
      t.bg.setFillStyle(k === i ? PAL.ink : PAL.dusk).setStrokeStyle(2, k === i ? CAT_COLOR[t.cat] : PAL.slate);
      t.label.setColor(k === i ? CAT_COLOR[t.cat] : PAL.white);
    });
    this.cardLayer.removeAll(true);
    this.plays = PLAYBOOK.filter((p) => p.cat === CATEGORIES[i].id);
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const x0 = Math.round((VIEW_W - gridW) / 2);
    const y0 = BAR_H + 36;
    this.plays.forEach((play, k) => {
      this.makeCard(play, x0 + (k % COLS) * (CARD_W + GAP), y0 + Math.floor(k / COLS) * (CARD_H + GAP), k);
    });
  }

  makeCard(play, x, y, i) {
    const items = [];
    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0x24304a).setOrigin(0).setStrokeStyle(2, PAL.slate);
    items.push(bg);
    items.push(new PixelText(this, x + 6, y + 6, `${i + 1} ${play.name}`, PAL.white, 2));
    const tag = { run: 'RUN', pass: 'PASS', screen: 'SCREEN', pa: 'PLAY ACTION', punt: 'PUNT', fg: 'FIELD GOAL' }[play.type];
    items.push(new PixelText(this, x + 6, y + CARD_H - 15, tag, CAT_COLOR[play.cat], 2));
    items.push(this.drawDiagram(play, x + 6, y + 22, CARD_W - 12, CARD_H - 42));
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x34446a));
    bg.on('pointerout', () => bg.setFillStyle(0x24304a));
    // pick on release so the same press can't also snap the ball
    bg.on('pointerup', () => this.pick(play));
    this.cardLayer.add(items);
  }

  /** Mini chalkboard: formation dots plus each route, downfield to the right. */
  drawDiagram(play, x, y, w, h) {
    const g = this.add.graphics();
    g.fillStyle(0x2f7a45, 1).fillRect(x, y, w, h);
    const form = OFFENSE_FORMATIONS[play.formation].players;
    const sx = Math.max(2.1, (w - 46) / 42); // px per yard downfield (fills big previews too)
    const losX = x + Math.round(Math.min(w * 0.3, 16 * sx));
    g.fillStyle(PAL.sky, 1).fillRect(losX, y, 1, h);
    const sy = h / 46;         // px per yard sideline-to-sideline (~46 yd shown)
    const px = (depth) => losX - depth * sx;
    const py = (lat) => y + h / 2 + lat * sy;
    for (const [slot, s] of Object.entries(form)) {
      const ax = px(s.at[1]);
      const ay = py(s.at[0]);
      const def = ROUTES[play.routes[slot]];
      if (def && def.points.length > 1) {
        const out = (Math.sign(s.at[0]) || 1) * (play.routeSign?.[slot] ?? 1);
        const pts = def.points.map(([o, u]) => ({ x: Math.min(x + w - 3, ax + u * sx), y: Phaser.Math.Clamp(ay + o * out * sy, y + 2, y + h - 2) }));
        const color = slot === play.runner ? PAL.orange : slot === play.fake ? PAL.sand : PAL.white;
        g.lineStyle(1, color, 1).strokePoints(pts);
        const e = pts[pts.length - 1];
        g.fillStyle(color, 1).fillRect(Math.round(e.x) - 1, Math.round(e.y) - 1, 3, 3);
      }
      g.fillStyle(s.role === 'OL' ? PAL.silver : PAL.red, 1).fillRect(Math.round(ax) - 1, Math.round(ay) - 1, 3, 3);
    }
    if (play.type === 'punt' || play.type === 'fg') {
      g.lineStyle(1, PAL.sand, 1).strokePoints([{ x: px(form.QB.at[1]), y: y + h / 2 }, { x: x + w - 4, y: y + 6 }]);
    }
    return g;
  }

  quickPick() {
    const plays = PLAYBOOK.filter((p) => p.cat !== 'special');
    this.pick(plays[Math.floor(Math.random() * plays.length)]);
  }

  pick(play) {
    if (this.picked) return;
    this.picked = true;
    this.scene.stop();
    this.onPick(play);
  }
}
