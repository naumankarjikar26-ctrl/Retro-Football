// Formations as [lateral yards from the ball, depth yards from the line].
// Offense depth = yards BEHIND the line; defense depth = yards PAST the line.

export const OFFENSE_FORMATIONS = {
  shotgunSpread: {
    name: 'SHOTGUN SPREAD',
    players: {
      LT: { role: 'OL', at: [-4, 1] },
      LG: { role: 'OL', at: [-2, 1] },
      C:  { role: 'OL', at: [0, 0.8] },
      RG: { role: 'OL', at: [2, 1] },
      RT: { role: 'OL', at: [4, 1] },
      QB: { role: 'QB', at: [0, 5] },
      RB: { role: 'RB', at: [2, 5.3] },
      TE: { role: 'TE', at: [6.3, 1.2] },
      X:  { role: 'WR', at: [-20, 1.2] },
      H:  { role: 'WR', at: [-11, 1.8] },
      Z:  { role: 'WR', at: [18, 1.8] },
    },
  },
};

// Defensive alignments can reference an offensive slot ("over") so corners
// line up across from their receiver wherever the offense puts them.
export const DEFENSE_FORMATIONS = {
  nickel: {
    name: 'NICKEL',
    players: {
      DE1: { role: 'DL', at: [-5.5, 1.2], job: { type: 'rush' } },
      DT1: { role: 'DL', at: [-1.2, 1.2], job: { type: 'rush' } },
      DT2: { role: 'DL', at: [1.4, 1.2], job: { type: 'rush' } },
      DE2: { role: 'DL', at: [5.8, 1.2], job: { type: 'rush' } },
      LB1: { role: 'LB', at: [-3, 5], job: { type: 'man', target: 'RB' } },
      LB2: { role: 'LB', at: [3.5, 5], job: { type: 'man', target: 'TE' } },
      CB1: { role: 'CB', over: 'X', at: [0.8, 6.5], job: { type: 'man', target: 'X' } },
      CB2: { role: 'CB', over: 'Z', at: [-0.8, 6.5], job: { type: 'man', target: 'Z' } },
      NB:  { role: 'CB', over: 'H', at: [0.8, 4.5], job: { type: 'man', target: 'H' } },
      S1:  { role: 'S', at: [-9, 13], job: { type: 'deep', zone: [-10, 16] } },
      S2:  { role: 'S', at: [9, 13], job: { type: 'deep', zone: [10, 16] } },
    },
  },
};
