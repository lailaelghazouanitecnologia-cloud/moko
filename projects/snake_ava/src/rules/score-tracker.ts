/**
 * Tracks and updates game scores with support for multipliers and high-score persistence.
 */
export class ScoreTracker {
  private score: number;
  private highScore: number;
  private multiplier: number;

  constructor() {
    this.score = 0;
    this.highScore = 0;
    this.multiplier = 1;
  }

  /**
   * Increases the current score by the specified amount, applying the active multiplier.
   * @param points - The base number of points to add; must be a non-negative finite number.
   * @throws {TypeError} If points is not a finite number.
   * @throws {RangeError} If points is negative.
   */
  addPoints(points: number): void {
    if (!Number.isFinite(points)) {
      throw new TypeError('Points must be a finite number');
    }
    if (points < 0) {
      throw new RangeError('Points cannot be negative');
    }
    this.score += points * this.multiplier;
    this.updateHighScore();
  }

  /**
   * Resets the current score to zero without affecting the high score or multiplier.
   */
  resetScore(): void {
    this.score = 0;
  }

  /**
   * Returns the current score.
   */
  getScore(): number {
    return this.score;
  }

  /**
   * Sets the score multiplier applied to future point additions.
   * @param value - The multiplier value; must be a positive finite number.
   * @throws {TypeError} If value is not a finite number.
   * @throws {RangeError} If value is not positive.
   */
  setMultiplier(value: number): void {
    if (!Number.isFinite(value)) {
      throw new TypeError('Multiplier must be a finite number');
    }
    if (value <= 0) {
      throw new RangeError('Multiplier must be positive');
    }
    this.multiplier = value;
  }

  /**
   * Updates the stored high score if the current score exceeds it.
   */
  updateHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
  }

  /**
   * Returns the highest score achieved during this session.
   */
  getHighScore(): number {
    return this.highScore;
  }
}
