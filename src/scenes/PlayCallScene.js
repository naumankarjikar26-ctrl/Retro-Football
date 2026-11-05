// Stage 2: the play-call screen shown before every snap.
// A card per play (name, PASS / RUN / SCREEN tag, mini diagram of the routes)
// plus a QUICK PICK card that calls a random play. Keys 1-7 pick a play, Q
// quick-picks. The field stays visible (dimmed) behind the menu.

import { VIEW_W, VIEW_H, BAR_H, HINT_H, PAL } from '../config/constants.js';
import { PixelText } from '../gfx/PixelFont.js';
import { PLAYBOOK } from '../plays/playbook.js';
import { OFFENSE_FORMATIONS } from '../plays/formations.js';
import { ROUTES } from '../plays/routes.js';

const TYPE_COLOR = { pass: PAL.sky, run: PAL.orange, screen: PAL.lime };
const COLS = 4;
const CARD_W = 146;
const CARD_H = 112;
const GAP = 8;

export class PlayCallScene extends Phaser.Scene {
  constructor() { super('PlayCall'); }

  /** data: { onPick(playDef) } */
  create(data) {
    this.onPick = data.onPick;
    this.picked = false;
    const top = BAR_H;
    const h = VIEW_H - BAR_H - HINT_H;
    this.add.rectangle(0, top, VIEW_W, h, PAL.ink, 0.72).setOrigin(0);
    new PixelText(this, VIEW_W / 2, top + 8, 'CALL A PLAY', PAL.sand, 3).setAlign(0.5);

    const cards = [...PLAYBOOK, { id: 'quick', name: 'QUICK PICK', type: 'quick' }];
    const rows = Math.ceil(cards.length / COLS);
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const x0 = Math.round((VIEW_W - gridW) / 2);
    const y0 = top + 30;
    cards.forEach((play, i) => {
      const cx = x0 + (i % COLS) * (CARD_W + GAP);
      const cy = y0 + Math.floor(i / COLS) * (CARD_H + GAP);
      this.makeCard(play, cx, cy, i);
    });
    void rows;

    this.input.keyboard.on('keydown', (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= PLAYBOOK.length) this.pick(PLAYBOOK[n - 1]);
      if (e.key === 'q' || e.key === 'Q') this.quickPick();
    });
  }

  makeCard(play, x, y, i) {
    const isQuick = play.type === 'quick';
    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, isQuick ? PAL.dusk : 0x24304a).setOrigin(0)
      .setStrokeStyle(2, isQuick ? PAL.sand : PAL.slate);
    const label = isQuick ? 'Q' : String(i + 1);
    new PixelText(this, x + 6, y + 6, `${label} ${play.name}`, PAL.white, 2);
    if (!isQuick) {
      new PixelText(this, x + 6, y + CARD_H - 15, play.type.toUpperCase(), TYPE_COLOR[play.type], 2);
      this.drawDiagram(play, x + 6, y + 22, CARD_W - 12, CARD_H - 42);
    } else {
      new PixelText(this, x + CARD_W / 2, y + 48, 'RANDOM', PAL.sand, 3).setAlign(0.5);
      new PixelText(this, x + CARD_W / 2, y + 74, 'PLAY', PAL.sand, 3).setAlign(0.5);
    }
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(isQuick ? 0x46506e : 0x34446a));
    bg.on('pointerout', () => bg.setFillStyle(isQuick ? PAL.dusk : 0x24304a));
    // pick on release so the same press can't also snap the ball
    bg.on('pointerup', () => (isQuick ? this.quickPick() : this.pick(play)));
  }

  /** Mini chalkboard: formation dots plus each route, downfield to the right. */
  drawDiagram(play, x, y, w, h) {
    const g = this.add.graphics();
    g.fillStyle(0x2f7a45, 1).fillRect(x, y, w, h);
    const form = OFFENSE_FORMATIONS[play.formation].players;
    const losX = x + 34;
    g.fillStyle(PAL.sky, 1).fillRect(losX, y, 1, h);
    const sx = 2.4;            // px per yard downfield
    const sy = h / 46;         // px per yard sideline-to-sideline (~46 yd shown)
    const px = (depth) => losX - depth * sx;
    const py = (lat) => y + h / 2 + lat * sy;
    for (const [slot, s] of Object.entries(form)) {
      const ax = px(s.at[1]);
      const ay = py(s.at[0]);
      const name = play.routes[slot];
      const def = name && ROUTES[name];
      if (def && def.points.length > 1) {
        const out = Math.sign(s.at[0]) || 1;
        const pts = def.points.map(([o, u]) => ({ x: Math.min(x + w - 3, ax + u * sx), y: Phaser.Math.Clamp(ay + o * out * sy, y + 2, y + h - 2) }));
        const color = slot === play.runner ? PAL.orange : PAL.white;
        g.lineStyle(1, color, 1).strokePoints(pts);
        const e = pts[pts.length - 1];
        g.fillStyle(color, 1).fillRect(Math.round(e.x) - 1, Math.round(e.y) - 1, 3, 3);
      }
      g.fillStyle(s.role === 'OL' ? PAL.silver : PAL.red, 1).fillRect(Math.round(ax) - 1, Math.round(ay) - 1, 3, 3);
    }
  }

  quickPick() {
    this.pick(PLAYBOOK[Math.floor(Math.random() * PLAYBOOK.length)]);
  }

  pick(play) {
    if (this.picked) return;
    this.picked = true;
    this.scene.stop();
    this.onPick(play);
  }
}
