# Retro Football

A retro pixel-art American football game for the browser, built with
[Phaser 3](https://phaser.io/) and plain JavaScript. It's inspired by
Retro Bowl but has its own art style, and it's heading toward realistic snap
counts, hard counts and penalties.

The game renders at 384x216 and scales up with nearest-neighbour filtering, so
the pixels stay sharp.

## The view

You watch from high up on the sideline at a three-quarter angle, like Retro
Bowl:

- **The field is horizontal.** Your offense drives left to right, with the end
  zones at the left and right edges.
- **Yard lines run top to bottom.** Yard numbers are along the near (bottom)
  and far (top) sides, and the hash marks are in the middle.
- **About 30 yards are visible left to right** (`PX_PER_YARD = 12.8`). The
  sideline-to-sideline axis is foreshortened (`FIELD_PX_H` in
  `src/config/constants.js`). Speed, throw length and tackle and catch
  distance are all measured in real yards, so the game plays the same at any
  scale.
- **The camera follows the ball both ways.** Before the snap it sits a little
  ahead of the line of scrimmage. While you aim, it frames the QB and the
  landing spot, and the landing spot (your receiver) is never off screen. In
  flight it follows the ball toward the landing spot.
- **The field is drawn in code**, so the 5-yard stripes, yard lines, upright
  yard numbers, hash marks, white sidelines, the darker bench area and the
  team-coloured end zones (with team abbreviations) all line up exactly.
- **Score, down and distance sit in a bar above the field**, and control hints
  in a bar below it, so neither ever covers the play.
- **Players are drawn standing up**, using mostly their side and diagonal
  frames. At boot each player gets a 1px dark outline, a helmet stripe and a
  dark facemask, socks and dark cleats, plus a soft oval shadow. The grass has
  a subtle pixel-noise texture, and the yard numbers are slightly see-through.
  The football is a 10x7 sprite drawn in code, smaller than a helmet.
- **Shoulder pads and stances** come from new sheets in `assets/players/padded/`,
  built by `python3 tools/build_sprites.py`. The script adds pads to the original
  Lumenlore frames (filling only empty pixels) and creates a `Stance.png` sheet.
  The originals in `assets/players/` are untouched and kept as the backup.
  Before the snap, linemen are in a 3-point stance, the QB is in a ready
  crouch, receivers and backs are in a 2-point stance, and linebackers and
  DBs are in an athletic crouch. At the snap they break into the normal
  animations. Players lower on the screen are drawn in front of players higher up.
- **A thrown ball rises up the screen** above its shadow, which slides along
  the grass. The dotted aiming arc curves upward the same way.
- **Routes are drawn before the snap** as clean 3px white lines with a dark
  shadow. Most are straight segments with sharp cuts; flats, wheels and curls
  are smooth curves. An arrowhead means the receiver keeps running, and a
  filled circle means he stops. Linemen show a short blocking line ending in
  a "T". The receiver you're aiming at turns light blue. They stay up until the ball is thrown, and
  the camera frames the QB and the end of every route.
- **Nobody runs out of bounds on their own.** Routes bend along the sideline
  (and stop inside the end zone), and every player you don't control is kept
  inside the field. Only the player you control can step out, which ends the
  play.
- **The camera mostly scrolls sideways.** It follows the ball smoothly and
  never lets it leave the screen.

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
| Snap + throw (one motion) | Press anywhere (snaps), pull back, release (throws) | Same |
| Snap only | `Space` / `Enter` | n/a |
| Move the QB / scramble | Arrows or WASD (right = downfield) | n/a |
| Steer the ball carrier | Arrows or WASD (he runs right on his own) | Hold and drag up or down to steer |
| Next play | `Space` / click | Tap |

**Throwing works like a slingshot, in one motion.** Pressing snaps the ball. Keep holding, pull back anywhere on the
screen, not on the ball, and pull back away from where you want the ball to
go. The pull is measured from the spot you first pressed:

- **Power:** a short pull is a quick, flat 5-10 yard pass. A full pull of
  about 56 px, roughly a third of the screen height, throws 60 yards on a high,
  slow arc.
- **Aiming aids:** while you pull, you see a ring where you pressed and a line
  to your finger or cursor. A dotted arc runs from the QB to a landing marker.
- **Cancelling:** release inside the ring to cancel the throw.

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
  config/constants.js    view + field geometry, yard<->pixel and ground helpers, palette, tuning
  config/assets.js       sprite manifest, frame size, direction row order
  scenes/BootScene.js    loads/builds textures, slices sheets, makes animations
  scenes/GameScene.js    input, camera, route drawing, aiming arc, play flow
  scenes/HUDScene.js     top score bar, bottom hint bar, result banner, pull indicator
  systems/PlayController.js  one live play: snap -> throw -> catch -> tackle
  systems/GameState.js   downs, distance, ball spot, score
  systems/events.js      event bus (snap, throw, catch, tackle, play end ...)
  entities/Player.js     movement, 8-direction facing, animations
  entities/Ball.js       ball with fake height, scaling and shadow
  camera/CameraController.js  lerped (mostly sideways) follow + "ball always on screen" guard
  field/Field.js         field drawn in code, line of scrimmage, first-down line
  plays/routes.js        spline route library
  plays/formations.js    offensive and defensive formations
  plays/playbook.js      play definitions (Stage 2 adds more here)
  ai/OffenseAI.js        routes, pass protection, downfield blocking
  ai/DefenseAI.js        pass rush, man and deep coverage, pursuit
  ai/Blocking.js         blocker/defender engagements
  gfx/PixelFont.js       crisp 3x5 bitmap font
  gfx/PlaceholderArt.js  procedural sprites + palette swap
  gfx/SpriteStyle.js     outline, helmet stripe/facemask, socks/cleats, small football
assets/field/            SpawnCampGames "Football Sprites 2D" (field, football)
assets/players/          Lumenlore sheets (originals, kept as backup)
assets/players/padded/   game sheets: originals + shoulder pads, plus Stance.png
tools/build_sprites.py   regenerates assets/players/padded/
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
- `assets/field/FootballFieldAccessories.png`: football spiral and tumble
  frames. The power meter, aiming arrow and referee with flags are saved for
  later stages.

If a file is missing, the game falls back to procedural placeholder art. The
full sprite packs are kept on the `Sprites` branch.

## Credits

- Football, power meter, aiming arrow, touchdown markers, and referee with
  penalty flags: **"Football Sprites 2D" by SpawnCampGames**. The field itself
  is drawn in code.
- Player character: **"Top Down Prototype Character Template" by Lumenlore
  Pixels**
- Engine: [Phaser 3](https://phaser.io/) (MIT)
- Palette based on "Sweetie 16" by GrafxKid
