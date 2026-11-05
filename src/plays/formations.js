// Formations as [lateral yards from the ball, depth yards from the line].
// Offense depth = yards BEHIND the line; defense depth = yards PAST the line.

export const OFFENSE_FORMATIONS = {
  shotgunSpread: {
    name: 'SHOTGUN SPREAD',
    players: {
      // linemen: one straight line right at the line of scrimmage, evenly spaced, center over the ball
      LT: { role: 'OL', at: [-2.6, 0.6] },
      LG: { role: 'OL', at: [-1.3, 0.6] },
      C:  { role: 'OL', at: [0, 0.6] },
      RG: { role: 'OL', at: [1.3, 0.6] },
      RT: { role: 'OL', at: [2.6, 0.6] },
      QB: { role: 'QB', at: [0, 5] },
      RB: { role: 'RB', at: [1.8, 5.3] },
      TE: { role: 'TE', at: [4.2, 1.2] },
      X:  { role: 'WR', at: [-20, 1.2] },
      H:  { role: 'WR', at: [-11, 1.8] },
      Z:  { role: 'WR', at: [18, 1.8] },
    },
  },
  // QB under center, fullback (H) and tailback stacked behind him
  iForm: {
    name: 'I-FORM',
    players: {
      LT: { role: 'OL', at: [-2.6, 0.6] },
      LG: { role: 'OL', at: [-1.3, 0.6] },
      C:  { role: 'OL', at: [0, 0.6] },
      RG: { role: 'OL', at: [1.3, 0.6] },
      RT: { role: 'OL', at: [2.6, 0.6] },
      QB: { role: 'QB', at: [0, 1.3] },
      H:  { role: 'RB', at: [0, 4.2] },
      RB: { role: 'RB', at: [0, 6.8] },
      TE: { role: 'TE', at: [4.2, 1.2] },
      X:  { role: 'WR', at: [-18, 1.2] },
      Z:  { role: 'WR', at: [16, 1.8] },
    },
  },
  // QB under center, one back, slot receiver
  singleback: {
    name: 'SINGLEBACK',
    players: {
      LT: { role: 'OL', at: [-2.6, 0.6] },
      LG: { role: 'OL', at: [-1.3, 0.6] },
      C:  { role: 'OL', at: [0, 0.6] },
      RG: { role: 'OL', at: [1.3, 0.6] },
      RT: { role: 'OL', at: [2.6, 0.6] },
      QB: { role: 'QB', at: [0, 1.3] },
      RB: { role: 'RB', at: [0, 6.3] },
      TE: { role: 'TE', at: [4.2, 1.2] },
      X:  { role: 'WR', at: [-19, 1.2] },
      H:  { role: 'WR', at: [-10, 1.8] },
      Z:  { role: 'WR', at: [17, 1.8] },
    },
  },
  // shotgun, three receivers to the near side
  trips: {
    name: 'SHOTGUN TRIPS',
    players: {
      LT: { role: 'OL', at: [-2.6, 0.6] },
      LG: { role: 'OL', at: [-1.3, 0.6] },
      C:  { role: 'OL', at: [0, 0.6] },
      RG: { role: 'OL', at: [1.3, 0.6] },
      RT: { role: 'OL', at: [2.6, 0.6] },
      QB: { role: 'QB', at: [0, 5] },
      RB: { role: 'RB', at: [-1.8, 5.3] },
      TE: { role: 'TE', at: [-4.2, 1.2] },
      X:  { role: 'WR', at: [-19, 1.2] },
      H:  { role: 'WR', at: [9, 1.8] },
      Z:  { role: 'WR', at: [18, 1.2] },
    },
  },
  // punter (QB slot) deep, two personal protectors, gunners split wide
  punt: {
    name: 'PUNT',
    players: {
      LT: { role: 'OL', at: [-2.6, 0.6] },
      LG: { role: 'OL', at: [-1.3, 0.6] },
      C:  { role: 'OL', at: [0, 0.6] },
      RG: { role: 'OL', at: [1.3, 0.6] },
      RT: { role: 'OL', at: [2.6, 0.6] },
      QB: { role: 'QB', at: [0, 13] },
      RB: { role: 'RB', at: [-1.5, 6] },
      H:  { role: 'RB', at: [1.5, 6] },
      TE: { role: 'TE', at: [4.2, 0.9] },
      X:  { role: 'WR', at: [-20, 1.2] },
      Z:  { role: 'WR', at: [20, 1.2] },
    },
  },
  // kicker (QB slot) 7 yards back, tight wings
  fieldGoal: {
    name: 'FIELD GOAL',
    players: {
      LT: { role: 'OL', at: [-2.6, 0.6] },
      LG: { role: 'OL', at: [-1.3, 0.6] },
      C:  { role: 'OL', at: [0, 0.6] },
      RG: { role: 'OL', at: [1.3, 0.6] },
      RT: { role: 'OL', at: [2.6, 0.6] },
      QB: { role: 'QB', at: [0, 7] },
      RB: { role: 'RB', at: [-0.8, 6.2] },
      H:  { role: 'TE', at: [-4.2, 1.2] },
      TE: { role: 'TE', at: [4.2, 1.2] },
      X:  { role: 'WR', at: [-5.4, 1.8] },
      Z:  { role: 'WR', at: [5.4, 1.8] },
    },
  },
};

// Defensive alignments can reference an offensive slot ("over") so corners
// line up across from their receiver wherever the offense puts them.
export const DEFENSE_FORMATIONS = {
  nickel: {
    name: 'NICKEL',
    players: {
      DE1: { role: 'DL', at: [-3.6, 1.2], job: { type: 'rush' } },
      DT1: { role: 'DL', at: [-0.7, 1.2], job: { type: 'rush' } },
      DT2: { role: 'DL', at: [0.7, 1.2], job: { type: 'rush' } },
      DE2: { role: 'DL', at: [3.6, 1.2], job: { type: 'rush' } },
      LB1: { role: 'LB', at: [-3.5, 5], job: { type: 'man', target: 'RB' } },
      LB2: { role: 'LB', at: [3.5, 5], job: { type: 'man', target: 'TE' } },
      CB1: { role: 'CB', over: 'X', at: [0.8, 6.5], job: { type: 'man', target: 'X' } },
      CB2: { role: 'CB', over: 'Z', at: [-0.8, 6.5], job: { type: 'man', target: 'Z' } },
      NB:  { role: 'CB', over: 'H', at: [0.8, 4.5], job: { type: 'man', target: 'H' } },
      S1:  { role: 'S', at: [-9, 13], job: { type: 'deep', zone: [-10, 16] } },
      S2:  { role: 'S', at: [9, 13], job: { type: 'deep', zone: [10, 16] } },
    },
  },
};
