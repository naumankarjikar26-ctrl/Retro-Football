// Down, distance, ball spot and score. Pure logic, no Phaser objects, so the
// penalty system (Stage 5) can apply yardage/down changes through it too.

import { HASH_OFFSET_YD } from '../config/constants.js';

export class GameState {
  constructor() {
    this.score = { home: 0, away: 0 };
    this.quarter = 1;
    this.newDrive(25);
    // Stage 5: playClock, challengesLeft, half. Stage 4: hardCountHistory.
  }

  newDrive(yardLine) {
    this.ballOn = yardLine;   // yards from own goal line (0..100)
    this.ballLat = 0;         // lateral yards from the middle (between the hashes)
    this.down = 1;
    this.firstDownAt = Math.min(100, yardLine + 10);
  }

  get toGo() { return Math.max(0, Math.round(this.firstDownAt - this.ballOn)); }
  get goalToGo() { return this.firstDownAt >= 100; }

  downText() {
    const n = ['1ST', '2ND', '3RD', '4TH'][this.down - 1];
    return `${n} & ${this.goalToGo ? 'GOAL' : this.toGo < 1 ? 'INCHES' : this.toGo}`;
  }

  spotText() {
    const y = Math.round(this.ballOn);
    if (y === 50) return 'BALL ON 50';
    return y < 50 ? `BALL ON OWN ${y}` : `BALL ON OPP ${100 - y}`;
  }

  /**
   * Apply a finished play.
   * @param {{type:string, endYard?:number, endLat?:number}} r
   *   type: 'gain' | 'incomplete' | 'touchdown' | 'safety'
   * @returns {{headline:string, detail:string}}
   */
  applyResult(r) {
    const start = this.ballOn;
    if (r.type === 'touchdown') {
      this.score.home += 7; // PAT is automatic until kicking is added
      this.newDrive(25);
      return { headline: 'TOUCHDOWN!', detail: `+${Math.round(100 - start)} YARDS` };
    }
    if (r.type === 'safety') {
      this.score.away += 2;
      this.newDrive(25);
      return { headline: 'SAFETY', detail: 'NEW DRIVE AT OWN 25' };
    }

    let headline;
    let detail = '';
    if (r.type === 'incomplete') {
      headline = 'INCOMPLETE';
      detail = r.reason || '';
    } else {
      const gained = Math.round(r.endYard - start);
      this.ballOn = Phaser.Math.Clamp(Math.round(r.endYard), 1, 99);
      this.ballLat = Phaser.Math.Clamp(r.endLat ?? 0, -HASH_OFFSET_YD, HASH_OFFSET_YD);
      if (r.sack) headline = `SACK! ${gained} YDS`;
      else if (gained === 0) headline = 'NO GAIN';
      else headline = gained > 0 ? `GAIN OF ${gained}` : `LOSS OF ${-gained}`;
      if (r.outOfBounds) detail = 'OUT OF BOUNDS';
    }

    if (this.ballOn >= this.firstDownAt) {
      this.down = 1;
      this.firstDownAt = Math.min(100, this.ballOn + 10);
      detail = 'FIRST DOWN!';
    } else if (this.down === 4) {
      // Turnover on downs. Until defense/possession swaps exist, restart a drive.
      this.newDrive(25);
      detail = 'TURNOVER ON DOWNS';
    } else {
      this.down += 1;
    }
    return { headline, detail };
  }
}
