// Post-processing for the (already team-recoloured) Lumenlore sheets, giving
// the game its own look without changing the sprite pack itself:
//   - helmet stripe down the crown, dark facemask
//   - white socks and dark cleats on the lowest leg pixels
//   - 1px dark outline so players pop off the grass
// Also draws the small procedural football used in play.

import { PAL } from '../config/constants.js';

const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

/**
 * @param {HTMLCanvasElement} canvas  recoloured sheet (modified in place)
 * @param {{w:number,h:number}} frame frame size
 * @param {object} team               TEAMS entry (helmet, helmetDark, stripe, pants, pantsDark)
 */
export function stylizeSheet(canvas, frame, team) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const W = canvas.width;
  const H = canvas.height;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const idx = (x, y) => (y * W + x) * 4;
  const colorAt = (x, y) => { const i = idx(x, y); return d[i + 3] ? (d[i] << 16) | (d[i + 1] << 8) | d[i + 2] : -1; };
  const put = (x, y, c, a = 255) => { const i = idx(x, y); const [r, g, b] = rgb(c); d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; };

  const helmet = new Set([team.helmet, team.helmetDark]);
  const legs = new Set([team.pants, team.pantsDark]);

  for (let fy = 0; fy < H; fy += frame.h) {
    for (let fx = 0; fx < W; fx += frame.w) {
      // --- helmet: find the head's bounding box, paint a stripe on the crown
      let minX = Infinity; let maxX = -1; let minY = Infinity;
      for (let y = fy; y < fy + frame.h; y++) {
        for (let x = fx; x < fx + frame.w; x++) {
          if (helmet.has(colorAt(x, y))) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); }
        }
      }
      if (maxX >= 0) {
        const cx = Math.round((minX + maxX) / 2);
        for (let y = minY; y < minY + 4; y++) if (helmet.has(colorAt(cx, y))) put(cx, y, team.stripe);
      }
      // --- socks + cleats: lowest leg pixel in each column becomes a cleat,
      //     the one above it a sock
      for (let x = fx; x < fx + frame.w; x++) {
        for (let y = fy + frame.h - 1; y >= fy; y--) {
          const c = colorAt(x, y);
          if (c === -1) continue;
          if (legs.has(c)) {
            put(x, y, PAL.ink);
            if (y - 1 >= fy && legs.has(colorAt(x, y - 1))) put(x, y - 1, team.socks ?? PAL.white);
          }
          break;
        }
      }
    }
  }

  // --- 1px dark outline (computed from the alpha before outlining)
  const alpha = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) alpha[i] = d[i * 4 + 3] ? 1 : 0;
  const [or, og, ob] = rgb(PAL.ink);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha[y * W + x]) continue;
      const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && alpha[yy * W + xx];
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) {
        const i = idx(x, y);
        d[i] = or; d[i + 1] = og; d[i + 2] = ob; d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Small football (7x5) - smaller than a helmet - as a 4-frame strip:
 * frames 0-1 spiral (laces flicker), frames 2-3 tumble (end over end).
 */
export function buildSmallFootball(scene) {
  const frames = [
    ['.xxxxx.', 'xbbwbbx', 'xbwwwbx', 'xbbbbbx', '.xxxxx.'],
    ['.xxxxx.', 'xbbbbbx', 'xbwwwbx', 'xbbwbbx', '.xxxxx.'],
    ['.xxxxx.', 'xbbwbbx', 'xbbwbbx', 'xbbbbbx', '.xxxxx.'],
    ['..xxx..', '.xbbbx.', 'xbbwbbx', '.xbbbx.', '..xxx..'],
  ];
  const fw = 7;
  const fh = 5;
  const c = document.createElement('canvas');
  c.width = fw * frames.length;
  c.height = fh;
  const ctx = c.getContext('2d');
  const col = { x: PAL.ink, b: 0x8a4a24, w: PAL.white };
  frames.forEach((rows, f) => rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (!col[ch]) return;
    ctx.fillStyle = '#' + col[ch].toString(16).padStart(6, '0');
    ctx.fillRect(f * fw + x, y, 1, 1);
  })));
  if (scene.textures.exists('football')) scene.textures.remove('football');
  const tex = scene.textures.addCanvas('football', c);
  frames.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
  scene.anims.create({ key: 'ball-spiral', frameRate: 14, repeat: -1, frames: [{ key: 'football', frame: 0 }, { key: 'football', frame: 1 }] });
  scene.anims.create({ key: 'ball-tumble', frameRate: 12, repeat: -1, frames: [{ key: 'football', frame: 2 }, { key: 'football', frame: 3 }] });
}
