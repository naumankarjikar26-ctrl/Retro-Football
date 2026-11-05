// Procedural pixel art used until the real sprite packs are wired in.
// Player sheets match the real-sheet layout: 8 direction rows x N frames, 32x32.

import { DIR_ORDER, PLAYER_FRAME, PLAYER_ANIMS, PLAYER_KEY_COLORS as KEY } from '../config/assets.js';
import { PAL } from '../config/constants.js';

export const DIR_VEC = {
  E: [1, 0], SE: [Math.SQRT1_2, Math.SQRT1_2], S: [0, 1], SW: [-Math.SQRT1_2, Math.SQRT1_2],
  W: [-1, 0], NW: [-Math.SQRT1_2, -Math.SQRT1_2], N: [0, -1], NE: [Math.SQRT1_2, -Math.SQRT1_2],
};

const SHOE = 0x333c57;
const SKIN = 0x9a6244;
const MASK = PAL.silver;
const OUTLINE = PAL.ink;

const hex = (c) => '#' + c.toString(16).padStart(6, '0');

/** Builds one 32x32 frame as a flat colour buffer (0 = transparent). */
function buildFrame(dirName, anim, k, n) {
  const W = PLAYER_FRAME.width;
  const H = PLAYER_FRAME.height;
  const buf = new Array(W * H).fill(0);
  const [fx, fy] = DIR_VEC[dirName];
  const px = -fy; // "right hand" side vector
  const py = fx;
  const cx = W / 2;
  const cy = H / 2 + 1;

  // shape helper: fill every pixel whose (u = forward, v = right) passes test
  const fill = (color, test) => {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const u = dx * fx + dy * fy;
        const v = dx * px + dy * py;
        if (test(u, v)) buf[y * W + x] = color;
      }
    }
  };
  const disc = (color, uc, vc, r) => fill(color, (u, v) => (u - uc) ** 2 + (v - vc) ** 2 <= r * r);
  const ellipse = (color, uc, vc, ru, rv) => fill(color, (u, v) => ((u - uc) / ru) ** 2 + ((v - vc) / rv) ** 2 <= 1);

  const phase = (k / n) * Math.PI * 2;

  if (anim === 'death') {
    const t = n > 1 ? k / (n - 1) : 1;
    const legEnd = -0.5 - 6 * t;
    // legs stretch out behind as the player goes down
    fill(KEY.pants, (u, v) => u <= 0.5 && u >= legEnd && Math.abs(Math.abs(v) - 1.5) <= 1.1);
    disc(SHOE, legEnd - 0.5, -1.6, 1.2);
    disc(SHOE, legEnd - 0.5, 1.6, 1.2);
    ellipse(KEY.jersey, 1.5 * t, 0, 2.6 + 2 * t, 5.2 - 1 * t);
    disc(SKIN, 1 + 5 * t, -5.2 - t, 1.2);
    disc(SKIN, 1 + 5 * t, 5.2 + t, 1.2);
    disc(KEY.helmet, 0.4 + 5.5 * t, 0, 3.6);
    fill(KEY.stripe, (u, v) => Math.abs(v) <= 0.6 && (u - (0.4 + 5.5 * t)) ** 2 + v * v <= 11);
    return buf;
  }

  const stride = anim === 'run' ? 3 : anim === 'walk' ? 2 : 0;
  const swing = Math.sin(phase);

  // feet
  disc(SHOE, stride * swing, -2.2, 1.3);
  disc(SHOE, -stride * swing, 2.2, 1.3);
  // pants / hips
  fill(KEY.pants, (u, v) => Math.abs(u + 0.6) <= 1.8 && Math.abs(v) <= 3.4);
  // torso with shoulder pads; trim on the shoulder tips
  ellipse(KEY.jersey, 0, 0, 2.7, 5.4);
  fill(KEY.trim, (u, v) => (u / 2.7) ** 2 + (v / 5.4) ** 2 <= 1 && Math.abs(v) >= 4.3);

  // hands
  let lh = [-stride * 0.8 * swing + 0.5, -5.4];
  let rh = [stride * 0.8 * swing + 0.5, 5.4];
  if (anim === 'idle') {
    lh[0] += k % 2 ? 0.5 : 0;
    rh[0] += k % 2 ? 0.5 : 0;
  }
  if (anim === 'punch') {
    // wind back, then snap the right arm forward (ball leaves on the last frame)
    const reach = [-0.6, 0.3, 1, 1.1][Math.min(k, 3)];
    rh = [-1 + 7 * reach, 5.4 - 3.2 * Math.max(0, reach)];
    lh = [1.5, -4.8];
  }
  disc(SKIN, lh[0], lh[1], 1.25);
  disc(SKIN, rh[0], rh[1], 1.25);

  // helmet, centre stripe, face mask
  const hu = 0.6;
  disc(KEY.helmet, hu, 0, 3.6);
  fill(KEY.stripe, (u, v) => Math.abs(v) <= 0.6 && (u - hu) ** 2 + v * v <= 3.6 * 3.6 && u < hu + 2.6);
  fill(MASK, (u, v) => {
    const d = Math.hypot(u - hu, v);
    return d >= 3.4 && d <= 4.5 && u - hu > 2.2;
  });
  return buf;
}

function outline(buf, W, H) {
  const out = buf.slice();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (buf[y * W + x]) continue;
      const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && buf[yy * W + xx];
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) out[y * W + x] = OUTLINE;
    }
  }
  return out;
}

/** Draws a full sheet (8 rows x frames) with the key colours. */
function buildPlayerSheet(anim, frames) {
  const { width: W, height: H } = PLAYER_FRAME;
  const canvas = document.createElement('canvas');
  canvas.width = W * frames;
  canvas.height = H * DIR_ORDER.length;
  const ctx = canvas.getContext('2d');
  DIR_ORDER.forEach((dir, row) => {
    for (let k = 0; k < frames; k++) {
      const buf = outline(buildFrame(dir, anim, k, frames), W, H);
      for (let i = 0; i < buf.length; i++) {
        if (!buf[i]) continue;
        ctx.fillStyle = hex(buf[i]);
        ctx.fillRect(k * W + (i % W), row * H + Math.floor(i / W), 1, 1);
      }
    }
  });
  return canvas;
}

/** Copy a canvas, swapping exact key colours for team colours. */
export function paletteSwap(srcCanvas, map) {
  const canvas = document.createElement('canvas');
  canvas.width = srcCanvas.width;
  canvas.height = srcCanvas.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const lookup = new Map(Object.entries(map).map(([from, to]) => [Number(from), to]));
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    const to = lookup.get(c);
    if (to !== undefined) {
      d[i] = (to >> 16) & 255;
      d[i + 1] = (to >> 8) & 255;
      d[i + 2] = to & 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Returns { anim: canvas } with key colours, for every animation. */
export function buildPlaceholderPlayerSheets() {
  const sheets = {};
  for (const [anim, def] of Object.entries(PLAYER_ANIMS)) {
    sheets[anim] = buildPlayerSheet(anim, def.placeholderFrames);
  }
  return sheets;
}

function canvasOf(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'));
  return c;
}

export function buildPlaceholderMisc(scene) {
  // Only fill in textures the real asset packs did not provide.
  const add = (key, canvas) => { if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas); };
  // Football: 8x6, brown with white laces and a dark outline
  add('football', canvasOf(9, 7, (ctx) => {
    const rows = ['..xxxxx..', '.xbbbbbx.', 'xbbwwwbbx', 'xbbbbbbbx', '.xbbbbbx.', '..xxxxx..'];
    const col = { x: hex(PAL.ink), b: hex(PAL.ball), w: hex(PAL.white) };
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (col[ch]) { ctx.fillStyle = col[ch]; ctx.fillRect(x, y, 1, 1); }
    }));
  }));
  // Soft pixel shadows (drawn with alpha in-game)
  const ellipseTex = (key, w, h) => add(key, canvasOf(w, h, (ctx) => {
    ctx.fillStyle = '#000000';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x + 0.5 - w / 2) / (w / 2);
        const ny = (y + 0.5 - h / 2) / (h / 2);
        if (nx * nx + ny * ny <= 1) ctx.fillRect(x, y, 1, 1);
      }
    }
  }));
  ellipseTex('ballshadow', 7, 3);
  ellipseTex('playershadow', 13, 5);
  // 2x2 dot for the dotted throw arc
  add('dot', canvasOf(2, 2, (ctx) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 2, 2); }));
}
