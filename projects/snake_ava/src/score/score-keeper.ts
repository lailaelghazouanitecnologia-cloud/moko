import { HighScoreStore } from './high-score-store';

/**
 * Manages live score updates with support for multipliers and persistence.
 */
export class ScoreKeeper {
  private static readonly MIN_POINTS = 0;
  private static readonly MAX_POINTS = Number.MAX_SAFE_INTEGER;
  private static readonly MIN_MULTIPLIER = 0;
  private static readonly MAX_MULTIPLIER = 1000;

  currentScore: number = 0;
  multiplier: number = 1;

  /**
   * Increases the current score by the specified amount (multiplied by the current multiplier).
   * @param points - The raw points to add (must be a non-negative finite number).
   * @throws {TypeError} If `points` is not a finite number.
   * @throws {RangeError} If `points` is negative or would overflow the safe integer range.
   */
  addPoints(points: number): void {
    this.validatePoints(points);
    const multiplied = Math.floor(points * this.multiplier);
    const newScore = this.currentScore + multiplied;
    if (newScore > ScoreKeeper.MAX_POINTS) {
      throw new RangeError('Score would exceed safe integer limit');
    }
    this.currentScore = newScore;
  }

  /**
   * Decreases the current score by the specified amount (never below zero).
   * @param points - The raw points to subtract (must be a non-negative finite number).
   * @throws {TypeError} If `points` is not a finite number.
   * @throws {RangeError} If `points` is negative.
   */
  subtractPoints(points: number): void {
    this.validatePoints(points);
    const newScore = this.currentScore - Math.floor(points * this.multiplier);
    this.currentScore = Math.max(newScore, ScoreKeeper.MIN_POINTS);
  }

  /**
   * Resets the current score to zero.
   */
  resetScore(): void {
    this.currentScore = 0;
  }

  /**
   * Returns the current score.
   * @returns The current score.
   */
  getScore(): number {
    this.ensureIntegerScore();
    return this.currentScore;
  }

  /**
   * Updates the multiplier applied to future point changes.
   * @param value - The new multiplier (must be a finite non-negative number).
   * @throws {TypeError} If `value` is not a finite number.
   * @throws {RangeError} If `value` is negative or unreasonably large.
   */
  setMultiplier(value: number): void {
    if (!Number.isFinite(value)) {
      throw new TypeError('Multiplier must be a finite number');
    }
    if (value < ScoreKeeper.MIN_MULTIPLIER || value > ScoreKeeper.MAX_MULTIPLIER) {
      throw new RangeError(`Multiplier must be between ${ScoreKeeper.MIN_MULTIPLIER} and ${ScoreKeeper.MAX_MULTIPLIER}`);
    }
    this.multiplier = value;
  }

  /**
   * Applies the current multiplier to the existing score (score = floor(score * multiplier)).
   * @throws {RangeError} If the result would exceed the safe integer limit.
   */
  applyMultiplier(): void {
    const multiplied = Math.floor(this.currentScore * this.multiplier);
    if (multiplied > ScoreKeeper.MAX_POINTS) {
      throw new RangeError('Multiplication would exceed safe integer limit');
    }
    this.currentScore = multiplied;
  }

  /**
   * Saves the current score as a high score for the player.
   * @param store - The persistence store for high scores.
   * @throws {TypeError} If `store` is not provided or invalid.
   */
  saveHighScore(store: HighScoreStore): void {
    if (!store || typeof store.add !== 'function' || typeof store.save !== 'function') {
      throw new TypeError('Invalid HighScoreStore provided');
    }
    store.add('player', this.currentScore);
    store.save('highscores');
  }

  /* ------------------------------------------------------------------ */
  /* -------------------------- PRIVATE HELPERS ------------------------ */
  /* ------------------------------------------------------------------ */

  /**
   * Ensures the internal score is an integer (defensive).
   */
  private ensureIntegerScore(): void {
    this.currentScore = Math.floor(this.currentScore);
  }

  /**
   * Validates that `points` is a non-negative finite number.
   */
  private validatePoints(points: number): void {
    if (!Number.isFinite(points)) {
      throw new TypeError('Points must be a finite number');
    }
    if (points < 0) {
      throw new RangeError('Points cannot be negative');
    }
  }
}
