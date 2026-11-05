# Retro Football

A retro pixel-art American football game for the browser, built with
[Phaser 3](https://phaser.io/) and plain JavaScript. It's inspired by
Retro Bowl but has its own art style, and it's heading toward realistic snap
counts, hard counts and penalties.

The game renders at 640x360 and scales up with nearest-neighbour filtering, so
the pixels stay sharp.

## The view

You watch from high up on the sideline at a three-quarter angle, like Retro
Bowl:

- **The field is horizontal.** Your offense drives left to right, with the end
  zones at the left and right edges.
- **Yard lines run top to bottom.** Yard numbers are along the near (bottom)
  and far (top) sides, and the hash marks are in the middle.
- **Zoomed in on a big field:** about 25 yards are visible left to right (`PX_PER_YARD = 26`). Before the snap the camera zooms out to show the whole field from sideline to sideline (all 22 players and every route), then eases back in at the snap. The
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
- **Uniform colours and skin tones** all come from `src/config/teams.js` (home, away and alternate uniforms plus four skin tones; switch uniforms via `MATCHUP`). Each player keeps one skin tone all game.
- **Shoulder pads, stances and part colours** come from new sheets in `assets/players/v3/` (with `padded/` kept as a backup),
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
| Open the playbook (optional) | `P` or the PLAYBOOK button | Tap PLAYBOOK |
| Pick a play | `1`-`8` or click a card, LEFT/RIGHT = tabs, `Esc` = close | Tap a tab, then a card |
| Snap + throw (one motion) | Press anywhere (snaps), pull back, release (throws) | Same |
| Snap only / run plays | `Space` / `Enter` | Tap |
| Give it to the running back (any play) | Click the RB, before or after the snap | Tap the RB |
| Move the QB / scramble | Arrows or WASD (right = downfield) | n/a |
| Ball carrier juke | Press up / down (one press = one juke) | Tap above / below him |
| Next play | `Space` / click | Tap |

**Throwing works like a slingshot, in one motion.** Pressing snaps the ball.
Keep holding, then pull back anywhere on the screen, away from where you want
the ball to go. The pull is measured from the spot you first pressed:

- **Power:** a short pull is a quick, flat 5-10 yard pass. A full pull throws
  60 yards on a high, slow arc.
- **Aiming aids:** while you pull, a blue ring shows where you pressed, with a
  line to your finger or cursor. A dotted arc runs from the QB to a landing
  marker.
- **Cancelling:** release inside the ring to cancel the throw.

**Running with the ball:** after a catch or handoff, the ball carrier runs
straight downfield on his own. Each press of up or down (or a tap above or
below him) is a **juke**: a quick 2.5-yard sidestep with a lean. For a moment
afterwards, a defender who reaches him usually whiffs. Time it just before
contact. The juke values are in `src/config/constants.js` (`jukeYards`,
`jukeEvadeChance` and friends).

## Catching

As soon as you release a throw, the receiver who can get closest to the
landing spot in time leaves his route and tracks the ball, deep balls
included. If the
pass is underthrown, he stops and comes back for it. While the ball is in the air, a
faint circle on the ground shows the sure-catch range. When the ball comes
down, the closest receiver's distance to the spot sets the catch chance:

- **Within 1.5 yards:** 90%.
- **1.5 to 3 yards:** 65%, with a diving catch.
- **3 to 4 yards:** 30%, with a diving catch.
- **Beyond 4 yards:** incomplete.

A pass is only broken up (or intercepted) when a defender physically gets to
the ball before every receiver, never by random chance. A defender right on
the receiver only lowers the catch chance. Contested catches, interceptions,
deep-throw penalties and how the defense reacts are all tunable in
`src/config/catching.js`. A short pop-up shows the
result: CATCH!, DROPPED, INCOMPLETE, BROKEN UP or INTERCEPTED.

## Play calling (Stage 2)

Every play is called automatically. The down and distance pick the kind of
play, then a play is drawn from a shuffle bag, so every play of that kind is
called before any repeats (and never the same play twice in a row):

| Situation | Mostly |
| --- | --- |
| 1-2 to go | runs (3rd/4th: almost always a run) |
| 3-6 to go | balanced; 3rd/4th leans to short passes |
| 7-12 to go | balanced; 3rd/4th leans to long passes |
| 13+ to go | long passes (3rd/4th: almost always deep) |
| Inside the opponent's 10 | no long passes |

The called play shows small at the top (e.g. "POWER - RUN"). The **PLAYBOOK**
button (`P`) opens the playbook with that play highlighted: pick a card to
change it, or close (`Esc`) to keep it. The 25-second play clock keeps running
while it's open; if it hits 0 it's a 5-yard **delay of game** and the down is
replayed.

| Tab | Plays |
| --- | --- |
| Run (8) | Inside Zone, Outside Toss, Power, HB Dive, Counter, Stretch, Sweep, HB Draw |
| Short (8) | Quick Slants, Curl Flat, Quick Outs, Stick, Drive, Hitches, Mesh, RB Screen |
| Long (8) | Four Verts, Spread Post, Deep Posts, Corners, Fades, Comebacks, Deep Outs, Post Wheel |
| Play action (8) | PA Post, PA Deep Cross, PA Flood, PA Seam, PA Go, PA Slant, PA Corner, PA TE Leak |
| Kick | Punt, Field Goal |

- **Formations:** shotgun spread, shotgun trips, I-form, singleback, punt
  and field goal.
- **Under center:** in the I-form and singleback, the QB takes a 5-step drop.
- **Runs:** the QB hands off or pitches automatically, receivers block, and
  you control the runner after the handoff.
- **Play action:** the QB fakes the handoff, and the linebackers bite on the
  fake for a moment (`paBiteSec` in `src/config/catching.js`), opening
  space behind them.
- **Punts:** go 36-50 yards downfield.
- **Field goals:** the kick distance is the line of scrimmage plus 17 yards,
  and longer kicks are less likely to be good.
- **No possession change yet:** punts and field goals both lead to a new
  drive at your own 25.

**TRICK** is a playbook tab. You choose which trick play to run, 4 per game.
One is used when it's snapped; when they're gone the cards are locked. Trick
plays are never auto-called.

- **Display:** "TRICK PLAY: NAME" shows at the top of the field, and routes and
  paths are drawn as normal.
- **Stopped tricks:** a trick that gets stopped still counts as used.

| Trick play | What happens |
| --- | --- |
| Flea Flicker | Handoff to the RB, who stops short and pitches it back to the QB; you throw deep (go, post, deep cross). LBs and safeties bite toward the line. |
| Statue of Liberty | The QB drops back and holds the ball up as if to throw; the RB comes around behind him, takes it from his hand and runs the other way. The defense drops for the fake throw. |
| QB Draw | It looks like a pass: receivers go deep and the line pass-blocks, then the QB takes off up the middle (you control him). |
| Halfback Pass | Snap to the QB, who tosses it back to the halfback swinging out. The QB then runs up the field as a receiver while you throw with the halfback. |
| Hook and Lateral | Throw to the curl; the trailing receiver shadows him and gets the lateral at full speed (you control him). |

**Rules for every trick play:**

- **Pitches and laterals** only go sideways or backward. If there's no legal
  angle in time, the holder keeps the ball and it becomes a run.
- **Fumbles:** a dropped pitch or lateral is a live ball, and either team can
  recover it (`lateralDropChance` in `src/config/constants.js`). A defender
  recovering it ends the drive, because possession changes don't exist yet.
- **Early defenders:** if a defender reaches the ball holder before a handoff,
  pitch or lateral, the holder keeps it and it becomes a run.

**Adding a trick play:** trick plays are data in `src/plays/trickPlays.js`. Each
has a formation, routes, a defensive "bite", and a list of steps: `handoff`,
`takeFromHand`, `pitch`, `lateral`, `fakeThrow`, `dropback`, `trail`, `route`,
`throw` (by any player), `afterCatch` and `run`. `src/systems/TrickRunner.js`
runs them, so a new trick play is just a new entry in that file.

(The earlier random-play generator, `src/plays/randomPlay.js` with
`src/config/randomPlays.js`, is still in the code but no longer has a button.)

Plays live in `src/plays/playbook.js`, formations in `src/plays/formations.js`
and routes in `src/plays/routes.js`.

## Stages

- [x] **Stage 1: One playable play.** Formations, smooth routes, snap,
  dotted-arc throwing, catch/incompletion, run after catch, tackles, sacks, QB
  scrambles, down and distance, reset at the new spot.
- [x] **Stage 2: Play calling.** Pick from 6-8 plays (passes, runs, a screen),
  an optional playbook, and one audible at the line.
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
  scenes/PlayCallScene.js  play-call screen (cards, mini diagrams, trick tab)
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
assets/players/padded/   originals + shoulder pads, plus Stance.png (backup)
assets/players/v3/       game sheets: padded + separate skin, facemask and trim colours
src/config/teams.js      uniforms (home / away / alternate), MATCHUP, skin tones
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

## Uniform colours

Every sprite colour comes from `src/config/teams.js`:

- **Uniforms:** helmet with a secondary-colour stripe, black facemask,
  jersey and shoulder pads with secondary-colour trim, pants, socks and black
  cleats.
- **Skin tones:** arms, hands and the face behind the facemask use one of
  several realistic tones, picked once per player and kept all game.
- **Switching uniforms:** change `MATCHUP` to put a team in its alternate
  uniform.

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
