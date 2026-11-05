// Shared event bus. GameScene emits play events; the HUD (and later the
// penalty, cadence and stats systems) listen without touching game logic.

export const bus = new Phaser.Events.EventEmitter();

export const EV = {
  PRESNAP: 'presnap',           // (gameState)       formation set, waiting for snap
  SNAP: 'snap',                 // ()
  THROW: 'throw',               // ({ from, to, beyondLOS })
  CATCH: 'catch',               // ({ player })
  INCOMPLETE: 'incomplete',     // ({ reason })
  TACKLE: 'tackle',             // ({ carrier, tackler })
  BROKEN_TACKLE: 'brokenTackle', // ({ carrier, tackler })
  POPUP: 'popup',               // ({ text, x, y, color }) short text over the play
  HANDOFF: 'handoff',           // ({ runner })
  PLAY_CALLED: 'playCalled',    // (playDef)
  AUDIBLE: 'audible',           // (newPlayDef)
  PLAY_END: 'playEnd',          // (result)
  STATE: 'state',               // (gameState) down/distance/score changed
  HINT: 'hint',                 // (text) contextual control hint

  // Reserved for later stages:
  // CADENCE_WORD (Stage 3), HARD_COUNT / FALSE_START / OFFSIDE (Stage 4),
  // PENALTY_FLAG / PENALTY_DECISION / CHALLENGE (Stage 5)
};
