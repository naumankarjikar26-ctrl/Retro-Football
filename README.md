# Retro Football

A retro pixel-art American football game for the browser, built with
[Phaser 3](https://phaser.io/) and plain JavaScript. It's inspired by
Retro Bowl but has its own art style, and it's heading toward realistic snap
counts, hard counts and penalties.

The game renders at 320x180 and scales up with nearest-neighbour filtering, so
the pixels stay sharp.

## Run it locally

You don't need to build anything. You only need a local web server, because the
code uses ES modules, which don't load from `file://`.

```bash
npm start            # serves on http://localhost:8080
# or
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Snap | `Space` / `Enter` / click | Tap |
| Aim and throw | Drag from anywhere, release to throw | Drag, release |
| Move the QB / scramble | Arrows or WASD | n/a |
| Steer the ball carrier | Arrows or WASD (runs upfield on his own) | Hold and steer toward your finger |
| Next play | `Space` / click | Tap |

A longer drag throws farther and higher. While you aim, a dotted arc shows the
throw's path and where it will land.

## Stages

- [x] **Stage 1: One playable play.** Formations, smooth routes, snap,
  dotted-arc throwing, catch/incompletion, run after catch, tackles, sacks, QB
  scrambles, down and distance, reset at the new spot.
- [ ] **Stage 2: Play calling.** Pick from 6-8 plays (passes, runs, a screen),
  a Quick Pick button, and one audible at the line.
- [ ] **Stage 3: Snap cadence.** Choose the snap count in the huddle. The QB
  calls a cadence in a speech bubble, and there's one live colour per game.
- [ ] **Stage 4: Hard count.** Fake the snap. Defenders can jump offside and
  your own linemen can false start. The defense learns to read predictable
  counts.
- [ ] **Stage 5: Penalties.** False start, offside, delay of game, holding,
  DPI/OPI, illegal forward pass and more. The ref throws a flag, you accept or
  decline, and you get one challenge per half.
- [ ] **Stage 6: Team management.** Roster ratings, discipline stats,
  contracts, and a $1,000,000,000 salary cap.

## Project layout

```
index.html               page + Phaser script tag
vendor/phaser.min.js     Phaser 3.80.1 (vendored, works offline)
src/
  main.js                game config (320x180, pixelArt, FIT scaling)
  config/constants.js    field geometry, yard<->pixel helpers, palette, tuning
  config/assets.js       sprite manifest, frame size, direction row order
  scenes/BootScene.js    loads/builds textures, slices sheets, makes animations
  scenes/GameScene.js    input, camera, route drawing, aiming arc, play flow
  scenes/HUDScene.js     down & distance, score, hints, result banner
  systems/PlayController.js  one live play: snap -> throw -> catch -> tackle
  systems/GameState.js   downs, distance, ball spot, score
  systems/events.js      event bus (snap, throw, catch, tackle, play end ...)
  entities/Player.js     movement, 8-direction facing, animations
  entities/Ball.js       ball with fake height, scaling and shadow
  camera/CameraController.js  lerped follow + "ball always on screen" guard
  plays/routes.js        spline route library
  plays/formations.js    offensive and defensive formations
  plays/playbook.js      play definitions (Stage 2 adds more here)
  ai/OffenseAI.js        routes, pass protection, downfield blocking
  ai/DefenseAI.js        pass rush, man and deep coverage, pursuit
  ai/Blocking.js         blocker/defender engagements
  gfx/PixelFont.js       crisp 3x5 bitmap font
  gfx/PlaceholderArt.js  procedural sprites + palette swap
assets/field/            SpawnCampGames "Football Sprites 2D" (field, football)
assets/players/          Lumenlore "Top Down Prototype Character Template" sheets
```

### Where later stages plug in

- **Stage 2:** add entries to `plays/playbook.js` (`type: 'run' | 'screen'`) and
  a play-call overlay scene. `GameScene.newPlay()` would take the chosen play
  instead of `DEFAULT_PLAY`.
- **Stages 3-4:** cadence and hard count run during the `presnap` phase of
  `PlayController`. Each player already has `ratings.discipline`.
- **Stage 5:** a penalty system subscribes to the events in `systems/events.js`
  (snap, throw, catch, tackle, play end), and applies yardage through
  `GameState`.
- **Stage 6:** a roster provides `ratings` for each `Player` in place of the
  role defaults.

## Sprites

The game uses these files from the sprite packs:

- `assets/players/`: `Idle`, `Walk`, `Run`, `Right-Hand-Punch` (the QB's
  throw) and `Death` (being tackled). Each sheet has 8 direction rows of 64x64
  frames. Each team's colours are palette-swapped in code (see
  `SHEET_COLOR_MAP` in `src/config/assets.js`).
- `assets/field/FootballFieldNoBranding.png`: the field. It's rotated to run
  vertically, and the field geometry in `src/config/constants.js` is
  calibrated to it.
- `assets/field/FootballFieldAccessories.png`: football spiral and tumble
  frames. The power meter, aiming arrow and referee with flags are saved for
  later stages.

If a file is missing, the game falls back to procedural placeholder art. The
full sprite packs are kept on the `Sprites` branch.

## Credits

- Field, football, power meter, aiming arrow, touchdown markers, and referee
  with penalty flags: **"Football Sprites 2D" by SpawnCampGames**
- Player character: **"Top Down Prototype Character Template" by Lumenlore
  Pixels**
- Engine: [Phaser 3](https://phaser.io/) (MIT)
- Palette based on "Sweetie 16" by GrafxKid
