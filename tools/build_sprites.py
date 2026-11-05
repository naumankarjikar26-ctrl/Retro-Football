#!/usr/bin/env python3
"""
Builds the game's player sheets from the original Lumenlore sheets.

The originals in assets/players/ are NOT modified (they stay as the backup).
New files are written to assets/players/padded/ and assets/players/v3/:

  Idle.png, Walk.png, Run.png, Right-Hand-Punch.png, Death.png
      the originals with shoulder pads ADDED (only transparent pixels are
      filled, nothing existing is redrawn)
  Stance.png
      new pre-snap stance frames built from the Idle frame of each direction,
      4 columns x 8 direction rows of 64x64:
        0 = 3-point stance (OL / DL)   1 = 2-point stance (RB / WR / TE)
        2 = athletic crouch (LB / DB)  3 = QB ready crouch

  v3/*.png
      the padded sheets with each body part on its own key colour (skin on
      arms and face, facemask bars, jersey hem trim) - shapes unchanged

All colours stay in the template's key palette, so the in-game palette swap
(team colours), outline, helmet stripe, facemask, socks and cleats still apply
exactly as before. The pads use one extra key colour (PAD_HIGHLIGHT), which
the game maps to each team's lighter jersey shade.

Usage:  python3 tools/build_sprites.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'players'
OUT = SRC / 'padded'
F = 64
DIRS = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE']  # row order in the sheets

HELMET = {0x3CEAF0, 0x379FDB}
JERSEY_LIGHT = 0x6ABE30
JERSEY_DARK = 0x37946E
JERSEY = {JERSEY_LIGHT, JERSEY_DARK}
LIMB_LIGHT = {0xAC3232, 0x306082}
LIMB_DARK = {0x6E2025, 0x304682}
LIMBS = LIMB_LIGHT | LIMB_DARK
PAD_HIGHLIGHT = 0xA8E070  # new key colour -> team "jerseyLight"
FACE = 0x379FDB
# extra key colours for the "parts" pass (mapped per team / per skin tone in game)
SKIN_LIGHT = 0xF0C8A0
SKIN_DARK = 0xC89070
MASK = 0x303030
TRIM = 0xFF8000

# facing direction per row: +1 = right, -1 = left, 0 = toward / away from camera
FORWARD_X = {'E': 1, 'NE': 1, 'SE': 1, 'W': -1, 'NW': -1, 'SW': -1, 'N': 0, 'S': 0}


def rgb(px):
    return (px[0] << 16) | (px[1] << 8) | px[2] if px[3] else None


def to_px(c):
    return ((c >> 16) & 255, (c >> 8) & 255, c & 255, 255)


def frame_rows(img, fx, fy, colors):
    """Rows (absolute y) inside one frame that contain any of `colors`."""
    ys = []
    for y in range(fy, fy + F):
        for x in range(fx, fx + F):
            if rgb(img.getpixel((x, y))) in colors:
                ys.append(y)
                break
    return ys


def add_pads(img):
    """Shoulder pads: 1-2 px wider on each side, highlight on top. Adds only."""
    W, H = img.size
    for fy in range(0, H, F):
        for fx in range(0, W, F):
            torso = frame_rows(img, fx, fy, JERSEY)
            if not torso:
                continue
            t0 = torso[0]
            xs = [x for y in (t0, t0 + 1) for x in range(fx, fx + F) if img.getpixel((x, y))[3]]
            if not xs:
                continue
            left, right = min(xs), max(xs)
            # row above the shoulders: highlight cap; shoulder row: jersey
            for y, col, reach in ((t0 - 1, PAD_HIGHLIGHT, 1), (t0, JERSEY_LIGHT, 2), (t0 + 1, JERSEY_DARK, 1)):
                for x in range(left - reach, right + reach + 1):
                    if fx <= x < fx + F and fy <= y < fy + F and not img.getpixel((x, y))[3]:
                        # only next to the body, so the pad hugs the shoulder
                        if any(img.getpixel((x + dx, y + dy))[3] for dx in (-1, 0, 1) for dy in (0, 1)
                               if fx <= x + dx < fx + F and fy <= y + dy < fy + F):
                            img.putpixel((x, y), to_px(col))
    return img


def stance_frame(idle, row, kind, arm=(0xAC3232, 0x6E2025)):
    """Builds one 64x64 stance frame from the idle frame of a direction row."""
    src = idle.crop((0, row * F, F, row * F + F))
    out = Image.new('RGBA', (F, F), (0, 0, 0, 0))
    torso = frame_rows(src, 0, 0, JERSEY)
    opaque = [y for y in range(F) if any(src.getpixel((x, y))[3] for x in range(F))]
    if not torso or not opaque:
        return src
    torso_bottom = torso[-1]
    feet_top = opaque[-1] - 2          # keep the bottom 3 rows (feet) in place
    fwd = FORWARD_X[DIRS[row]]
    # how much to drop the upper body (legs bend) and lean it forward
    drop, lean, hand_down = {
        '3pt': (8, 4, True),
        '2pt': (4, 2, False),
        'crouch': (5, 0, False),
        'qb': (3, 1, False),
    }[kind]
    top = opaque[0]
    for y in range(F):
        for x in range(F):
            p = src.getpixel((x, y))
            if not p[3]:
                continue
            if y >= feet_top:                  # feet stay planted
                ny, nx = y, x
            elif y > torso_bottom:             # thighs: squash by dropping rows
                span = max(1, feet_top - torso_bottom - 1)
                keep = max(1, span - drop)
                t = (y - torso_bottom - 1) / span
                ny = feet_top - keep + round(t * keep)
                nx = x + round(fwd * lean * 0.3 * (1 - t))
            else:                              # head + torso + arms move down / forward
                ny = y + drop
                up = (torso_bottom - y) / max(1, torso_bottom - top)
                nx = x + round(fwd * lean * (0.4 + 0.6 * up))
            if 0 <= nx < F and 0 <= ny < F:
                out.putpixel((nx, ny), p)
    if hand_down:
        # one arm reaches down to the turf in front of the body
        xs = [x for y in range(F) for x in range(F) if rgb(out.getpixel((x, y))) in JERSEY]
        ys = [y for y in range(F) for x in range(F) if rgb(out.getpixel((x, y))) in JERSEY]
        if xs:
            if fwd > 0:
                ax = max(xs) + 1
            elif fwd < 0:
                ax = min(xs) - 1
            else:
                ax = max(xs) + 1
            y0 = min(ys) + 2
            for y in range(y0, opaque[-1] + 1):
                if 0 <= ax < F and not out.getpixel((ax, y))[3]:
                    out.putpixel((ax, y), to_px(arm[0] if y < opaque[-1] - 1 else arm[1]))
                if 0 <= ax + fwd < F and y >= opaque[-1] - 1 and not out.getpixel((ax + fwd, y))[3]:
                    out.putpixel((ax + fwd, y), to_px(arm[1]))
    return out


def color_parts(img):
    """
    Gives each body part its own key colour, keeping every pixel's shape:
      - arm pixels (limb colours level with the torso) -> skin
      - face pixels -> skin; below the eyes, alternate rows become grill bars
      - lowest jersey row -> trim (jersey hem)
    Legs keep the limb colours (-> pants in game).
    """
    W, H = img.size
    for fy in range(0, H, F):
        for fx in range(0, W, F):
            torso = frame_rows(img, fx, fy, JERSEY | {PAD_HIGHLIGHT})
            if not torso:
                continue  # hit-flash silhouettes etc.
            t_bottom = max(frame_rows(img, fx, fy, JERSEY))
            face_rows = frame_rows(img, fx, fy, {FACE})
            f_bottom = face_rows[-1] if face_rows else 0
            # the eyes (template black) mark the split: open above, grill below
            eye_rows = [y for y in range(fy, fy + F)
                        if any(rgb(img.getpixel((x, y))) == 0x000000 for x in range(fx, fx + F))]
            eye_y = eye_rows[0] if eye_rows else (face_rows[0] + f_bottom) // 2 if face_rows else 0
            for y in range(fy, fy + F):
                for x in range(fx, fx + F):
                    c = rgb(img.getpixel((x, y)))
                    if c in LIMBS and y <= t_bottom + 1:
                        img.putpixel((x, y), to_px(SKIN_DARK if c in LIMB_DARK else SKIN_LIGHT))
                    elif c == FACE:
                        # top of the face open (skin); horizontal grill bars on the
                        # lower half: grill bars (every other pixel) just under the eyes
                        grill = y > eye_y and (x % 2 == 0 or y == f_bottom + 1)
                        img.putpixel((x, y), to_px(MASK if grill else SKIN_LIGHT))
                    elif c in JERSEY and y == t_bottom:
                        img.putpixel((x, y), to_px(TRIM))
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name in ['Idle', 'Walk', 'Run', 'Right-Hand-Punch', 'Death']:
        img = Image.open(SRC / f'{name}.png').convert('RGBA')
        add_pads(img).save(OUT / f'{name}.png')
        print('wrote', OUT / f'{name}.png')

    idle = Image.open(SRC / 'Idle.png').convert('RGBA')
    kinds = ['3pt', '2pt', 'crouch', 'qb']
    sheet = Image.new('RGBA', (F * len(kinds), F * len(DIRS)), (0, 0, 0, 0))
    for row in range(len(DIRS)):
        for col, kind in enumerate(kinds):
            sheet.paste(stance_frame(idle, row, kind), (col * F, row * F))
    add_pads(sheet).save(OUT / 'Stance.png')
    print('wrote', OUT / 'Stance.png')

    # v3: separate colours for skin, facemask and jersey trim (padded/ is kept as backup)
    V3 = SRC / 'v3'
    V3.mkdir(exist_ok=True)
    for name in ['Idle', 'Walk', 'Run', 'Right-Hand-Punch', 'Death']:
        img = Image.open(OUT / f'{name}.png').convert('RGBA')
        color_parts(img).save(V3 / f'{name}.png')
        print('wrote', V3 / f'{name}.png')
    # stances are built from the part-coloured idle, so crouched legs stay "pants"
    idle3 = color_parts(Image.open(SRC / 'Idle.png').convert('RGBA'))
    sheet = Image.new('RGBA', (F * len(kinds), F * len(DIRS)), (0, 0, 0, 0))
    for row in range(len(DIRS)):
        for col, kind in enumerate(kinds):
            sheet.paste(stance_frame(idle3, row, kind, arm=(SKIN_LIGHT, SKIN_DARK)), (col * F, row * F))
    add_pads(sheet).save(V3 / 'Stance.png')
    print('wrote', V3 / 'Stance.png')


if __name__ == '__main__':
    main()
