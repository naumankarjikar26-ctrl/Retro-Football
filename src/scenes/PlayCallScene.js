// Stage 2: the play-call screen shown before every snap.
// Tabs for each category (RUN / SHORT / LONG / PLAY ACTION / KICK), up to 8
// play cards per tab (name, type tag, mini route diagram). Opened from the
// PLAYBOOK button on the field; the current play is highlighted. CLOSE (or
// Esc) keeps the play that's already called. Keys: LEFT / RIGHT tabs, 1-8 pick.

import { VIEW_W, VIEW_H, BAR_H, HINT_H, PAL } from '../config/constants.js';
import { PixelText } from '../gfx/PixelFont.js';
import { PLAYBOOK, CATEGORIES } from '../plays/playbook.js';
import { OFFENSE_FORMATIONS } from '../plays/formations.js';
import { ROUTES } from '../plays/routes.js';
import { TRICK_DEFS } from '../plays/trickPlays.js';

const CAT_COLOR = { run: PAL.orange, short: PAL.sky, long: PAL.cyan, pa: PAL.lime, special: PAL.sand, trick: PAL.red };
const COLS = 4;
const CARD_W = 148;
const CARD_H = 112;
const GAP = 8;
const LIST_TOP = BAR_H + 36;          // visible window of the scrolling list
const LIST_BOTTOM = VIEW_H - HINT_H - 4;

export class PlayCallScene extends Phaser.Scene {
  constructor() { super('PlayCall'); }

  /** data: { onPick(playDef), onClose(), currentId } */
  create(data) {
    this.onPick = data.onPick;
    this.onClose = data.onClose;
    this.currentId = data.currentId;
    this.tricksLeft = data.tricksLeft ?? 0;
    this.picked = false;
    const cur = [...PLAYBOOK, ...TRICK_DEFS].find((p) => p.id === this.currentId);
    const curTab = cur ? CATEGORIES.findIndex((c) => c.id === cur.cat) : -1;
    this.tab = curTab >= 0 ? curTab : (PlayCallScene.lastTab ?? 0);
    const top = BAR_H;
    this.add.rectangle(0, top, VIEW_W, VIEW_H - BAR_H - HINT_H, PAL.ink, 0.75).setOrigin(0);

    // tab bar + close
    this.tabs = CATEGORIES.map((c, i) => {
      const x = 12 + i * 84;
      const bg = this.add.rectangle(x, top + 6, 80, 22, PAL.dusk).setOrigin(0).setStrokeStyle(2, PAL.slate);
      const name = c.id === 'trick' ? `TRICK ${this.tricksLeft}` : c.name === 'PLAY ACTION' ? 'PLAY ACT' : c.name;
      const label = new PixelText(this, x + 40, top + 12, name, PAL.white, 2).setAlign(0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.showTab(i));
      return { bg, label, cat: c.id };
    });
    const qx = VIEW_W - 12 - 104;
    const qb = this.add.rectangle(qx, top + 6, 104, 22, PAL.dusk).setOrigin(0).setStrokeStyle(2, PAL.silver);
    new PixelText(this, qx + 52, top + 12, 'ESC CLOSE', PAL.silver, 2).setAlign(0.5);
    qb.setInteractive({ useHandCursor: true }).on('pointerup', () => this.close());

    this.cardLayer = this.add.container(0, 0);
    this.list = this.add.container(0, 0);               // scrolling card list
    const maskG = this.make.graphics().fillRect(0, LIST_TOP, VIEW_W, LIST_BOTTOM - LIST_TOP);
    this.list.setMask(maskG.createGeometryMask());
    this.scrollBar = this.add.rectangle(VIEW_W - 6, LIST_TOP, 3, 10, PAL.silver).setOrigin(0.5, 0);
    this.scrollY = 0;

    // scroll: mouse wheel, UP / DOWN keys, or drag the list
    this.input.on('wheel', (_p, _o, _dx, dy) => this.scrollTo(this.scrollY + dy * 0.5));
    this.input.on('pointerdown', (p) => { this.dragFrom = p.y; this.dragStart = this.scrollY; this.dragged = false; });
    this.input.on('pointermove', (p) => {
      if (!p.isDown || this.dragFrom == null) return;
      const d = p.y - this.dragFrom;
      if (Math.abs(d) > 6) this.dragged = true;
      if (this.dragged) this.scrollTo(this.dragStart - d);
    });
    this.input.on('pointerup', () => { this.dragFrom = null; });

    const curList = cur ? (cur.cat === 'trick' ? TRICK_DEFS : PLAYBOOK.filter((p) => p.cat === cur.cat)) : [];
    const curIdx = curList.findIndex((p) => p.id === this.currentId);
    this.showTab(this.tab);
    if (curIdx >= 0) this.scrollTo(Math.floor(curIdx / COLS) * (CARD_H + GAP)); // show the called play
    this.input.keyboard.on('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.showTab((this.tab + CATEGORIES.length - 1) % CATEGORIES.length);
      if (e.key === 'ArrowRight') this.showTab((this.tab + 1) % CATEGORIES.length);
      if (e.key === 'ArrowDown') this.scrollTo(this.scrollY + CARD_H + GAP);
      if (e.key === 'ArrowUp') this.scrollTo(this.scrollY - CARD_H - GAP);
      const n = Number(e.key);
      if (n >= 1 && n <= Math.min(9, this.plays.length)) {
        const pl = this.plays[n - 1];
        if (!(pl.cat === 'trick' && this.tricksLeft <= 0)) this.pick(pl);
      }
      if (e.key === 'Escape') this.close();
    });
  }

  showTab(i) {
    this.tab = i;
    PlayCallScene.lastTab = i;
    this.tabs.forEach((t, k) => {
      t.bg.setFillStyle(k === i ? PAL.ink : PAL.dusk).setStrokeStyle(2, k === i ? CAT_COLOR[t.cat] : PAL.slate);
      t.label.setColor(k === i ? CAT_COLOR[t.cat] : PAL.white);
    });
    this.cardLayer.removeAll(true);
    this.list.removeAll(true);
    this.plays = CATEGORIES[i].id === 'trick' ? TRICK_DEFS : PLAYBOOK.filter((p) => p.cat === CATEGORIES[i].id);
    if (CATEGORIES[i].id === 'trick') {
      const msg = this.tricksLeft > 0 ? `${this.tricksLeft} OF 4 TRICK PLAYS LEFT THIS GAME` : 'NO TRICK PLAYS LEFT THIS GAME';
      this.cardLayer.add(new PixelText(this, VIEW_W / 2, VIEW_H - HINT_H - 26, msg, this.tricksLeft > 0 ? PAL.sand : PAL.slate, 2).setAlign(0.5));
    }
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const x0 = Math.round((VIEW_W - gridW) / 2);
    this.plays.forEach((play, k) => {
      this.makeCard(play, x0 + (k % COLS) * (CARD_W + GAP), LIST_TOP + Math.floor(k / COLS) * (CARD_H + GAP), k);
    });
    const rows = Math.ceil(this.plays.length / COLS);
    this.maxScroll = Math.max(0, rows * (CARD_H + GAP) - GAP - (LIST_BOTTOM - LIST_TOP));
    this.scrollTo(0);
  }

  scrollTo(y) {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
    this.list.y = -this.scrollY;
    const viewH = LIST_BOTTOM - LIST_TOP;
    const total = viewH + this.maxScroll;
    this.scrollBar.setVisible(this.maxScroll > 0);
    this.scrollBar.height = Math.max(16, viewH * viewH / total);
    this.scrollBar.y = LIST_TOP + (viewH - this.scrollBar.height) * (this.maxScroll ? this.scrollY / this.maxScroll : 0);
  }

  makeCard(play, x, y, i) {
    const items = [];
    const current = play.id === this.currentId; // the play that's called right now
    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0x24304a).setOrigin(0).setStrokeStyle(current ? 3 : 2, current ? PAL.lime : PAL.slate);
    items.push(bg);
    items.push(new PixelText(this, x + 6, y + 6, i < 9 ? `${i + 1} ${play.name}` : play.name, PAL.white, 2));
    const tag = { run: 'RUN', pass: 'PASS', screen: 'SCREEN', pa: 'PLAY ACTION', punt: 'PUNT', fg: 'FIELD GOAL', trick: 'TRICK PLAY' }[play.type];
    const locked = play.cat === 'trick' && this.tricksLeft <= 0; // all trick plays used
    items.push(new PixelText(this, x + 6, y + CARD_H - 15, tag, CAT_COLOR[play.cat], 2));
    items.push(this.drawDiagram(play, x + 6, y + 22, CARD_W - 12, CARD_H - 42));
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x34446a));
    bg.on('pointerout', () => bg.setFillStyle(0x24304a));
    // pick on release so the same press can't also snap the ball
    if (locked) { bg.setFillStyle(0x1a2030).setAlpha(0.6); bg.disableInteractive(); }
    else bg.on('pointerup', (p) => {
      // ignore drags and taps on the part of a card scrolled out of view
      if (!this.dragged && p.y >= LIST_TOP && p.y <= LIST_BOTTOM) this.pick(play);
    });
    this.list.add(items);
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

  /** Close without changing the play. */
  close() {
    if (this.picked) return;
    this.picked = true;
    this.scene.stop();
    this.onClose?.();
  }

  pick(play) {
    if (this.picked) return;
    this.picked = true;
    this.scene.stop();
    this.onPick(play);
  }
}
