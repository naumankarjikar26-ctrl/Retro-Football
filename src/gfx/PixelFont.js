// Tiny 3x5 pixel font. Baked into a texture at boot and registered as a Phaser
// RetroFont so all text (HUD and field numbers) stays perfectly crisp.

export const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  ' ': '000000000000000', '.': '000000000000010', ',': '000000000010100', '!': '010010010000010',
  '?': '110001010000010', '-': '000000111000000', '+': '000010111010000', ':': '000010000010000',
  '/': '001001010100100', "'": '010010000000000', '%': '101001010100101', '&': '010101010101011',
  '(': '001010010010001', ')': '100010010010100', '#': '101111101111101', '>': '100010001010100',
  '<': '001010100010001',
};

export const FONT_KEY = 'pixelfont';
const CELL_W = 4;
const CELL_H = 6;
const CHARS = Object.keys(GLYPHS).join('');
const PER_ROW = 16;

/** Draw one glyph into a 2D canvas context with integer scaling. */
export function drawGlyph(ctx, ch, x, y, scale = 1) {
  const g = GLYPHS[ch] || GLYPHS['?'];
  for (let i = 0; i < 15; i++) {
    if (g[i] === '1') ctx.fillRect(x + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
  }
}

export function registerPixelFont(scene) {
  const rows = Math.ceil(CHARS.length / PER_ROW);
  const canvas = document.createElement('canvas');
  canvas.width = PER_ROW * CELL_W;
  canvas.height = rows * CELL_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  [...CHARS].forEach((ch, i) => drawGlyph(ctx, ch, (i % PER_ROW) * CELL_W, Math.floor(i / PER_ROW) * CELL_H));
  scene.textures.addCanvas(FONT_KEY, canvas);

  const data = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: FONT_KEY,
    width: CELL_W,
    height: CELL_H,
    chars: CHARS,
    charsPerRow: PER_ROW,
    spacing: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    lineSpacing: 1,
  });
  scene.cache.bitmapFont.add(FONT_KEY, data);
}

/** Text with a 1px drop shadow, which reads well over the busy field. */
export class PixelText extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text, color = 0xf4f4f4, scale = 1, shadow = 0x1a1c2c) {
    super(scene, x, y);
    this.shadowText = scene.add.bitmapText(scale, scale, FONT_KEY, text).setScale(scale).setTint(shadow);
    this.mainText = scene.add.bitmapText(0, 0, FONT_KEY, text).setScale(scale).setTint(color);
    this.add([this.shadowText, this.mainText]);
    this.align = 0;
    scene.add.existing(this);
  }

  setText(text) {
    this.shadowText.setText(text);
    this.mainText.setText(text);
    this._realign();
    return this;
  }

  setColor(color) { this.mainText.setTint(color); return this; }

  /** 0 = left, 0.5 = centre, 1 = right (relative to the container x). */
  setAlign(a) { this.align = a; this._realign(); return this; }

  get textWidth() { return this.mainText.width; }

  _realign() {
    const w = Math.round(this.mainText.width * this.align);
    const s = this.mainText.scaleX;
    this.mainText.x = -w;
    this.shadowText.x = -w + s;
  }
}
