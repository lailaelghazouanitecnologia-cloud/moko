export class ScoreTracker {
  private readonly scores: Map<string, number>;
  private bonusPoints: number;
  private multiplier: number;

  constructor() {
    this.scores = new Map();
    this.bonusPoints = 0;
    this.multiplier = 1;
  }

  /**
   * Add points to a player's score.
   * @param playerId - Unique identifier for the player.
   * @param points - Points to add (must be non-negative).
   * @throws {TypeError} If playerId is not a string or points is not a number.
   * @throws {RangeError} If points is negative.
   */
  addScore(playerId: string, points: number): void {
    if (typeof playerId !== 'string') {
      throw new TypeError('playerId must be a string');
    }
    if (typeof points !== 'number') {
      throw new TypeError('points must be a number');
    }
    if (points < 0) {
      throw new RangeError('points must be non-negative');
    }
    const current = this.scores.get(playerId) || 0;
    this.scores.set(playerId, current + (points * this.multiplier));
  }

  /**
   * Retrieve the current score for a player.
   * @param playerId - Unique identifier for the player.
   * @returns The player's score, or 0 if the player has no recorded score.
   * @throws {TypeError} If playerId is not a string.
   */
  getScore(playerId: string): number {
    if (typeof playerId !== 'string') {
      throw new TypeError('playerId must be a string');
    }
    return this.scores.get(playerId) || 0;
  }

  /**
   * Clear all scores and reset bonus points and multiplier to defaults.
   */
  resetScores(): void {
    this.scores.clear();
    this.bonusPoints = 0;
    this.multiplier = 1;
  }

  /**
   * Apply a multiplier factor to all scores.
   * @param factor - The multiplier to apply (must be positive).
   * @throws {TypeError} If factor is not a number.
   * @throws {RangeError} If factor is not positive.
   */
  applyMultiplier(factor: number): void {
    if (typeof factor !== 'number') {
      throw new TypeError('factor must be a number');
    }
    if (factor <= 0) {
      throw new RangeError('factor must be positive');
    }
    this.multiplier = factor;
    for (const [player, score] of this.scores.entries()) {
      this.scores.set(player, Math.floor(score * factor));
    }
  }

  /**
   * Grant bonus points to a player.
   * @param playerId - Unique identifier for the player.
   * @param bonus - Bonus points to add (must be non-negative).
   * @throws {TypeError} If playerId is not a string or bonus is not a number.
   * @throws {RangeError} If bonus is negative.
   */
  addBonus(playerId: string, bonus: number): void {
    if (typeof playerId !== 'string') {
      throw new TypeError('playerId must be a string');
    }
    if (typeof bonus !== 'number') {
      throw new TypeError('bonus must be a number');
    }
    if (bonus < 0) {
      throw new RangeError('bonus must be non-negative');
    }
    const current = this.getScore(playerId);
    this.scores.set(playerId, current + bonus);
  }

  /**
   * Get the player with the highest score.
   * @returns The player ID with the highest score, or null if no scores exist.
   */
  getLeader(): string | null {
    let max = -1;
    let leader: string | null = null;
    for (const [player, score] of this.scores.entries()) {
      if (score > max) {
        max = score;
        leader = player;
      }
    }
    return leader;
  }

  /**
   * Get a sorted list of players by score in descending order.
   * @returns An array of player-score pairs sorted by score descending.
   */
  getRankings(): ReadonlyArray<{ playerId: string; score: number }> {
    const entries = Array.from(this.scores.entries());
    entries.sort((a, b) => b[1] - a[1]);
    return entries.map(([playerId, score]) => ({ playerId, score }));
  }
}
