import { Grid } from './grid';
import { Position } from './position';

/**
 * Represents the current snapshot of the game.
 * Encapsulates grid state, score, turn, and game-over status.
 */
export class GameState {
  private readonly _grid: Grid;
  private _score: number;
  private _isGameOver: boolean;
  private readonly _currentPlayer: Position;

  constructor(grid: Grid, currentPlayer: Position) {
    if (!grid) throw new TypeError('grid is required');
    if (!currentPlayer) throw new TypeError('currentPlayer is required');

    this._grid = grid;
    this._score = 0;
    this._isGameOver = false;
    this._currentPlayer = currentPlayer;
  }

  /**
   * Adds the specified points to the current score.
   * @param points - Must be a finite non-negative number.
   * @throws {TypeError} If points is not a number.
   * @throws {RangeError} If points is negative or non-finite.
   */
  updateScore(points: number): void {
    if (typeof points !== 'number') throw new TypeError('points must be a number');
    if (!Number.isFinite(points) || points < 0) {
      throw new RangeError('points must be a finite non-negative number');
    }
    this._score += points;
  }

  /**
   * Switches the turn to the other player.
   * The actual switching logic depends on the Position implementation.
   */
  togglePlayer(): void {
    // Placeholder: delegate to Position or a dedicated Player object
    this._currentPlayer.switch(); // Assuming Position exposes switch()
  }

  /**
   * Resets the game state to its initial values.
   * Clears the grid, zeroes the score, and marks the game as not over.
   */
  reset(): void {
    this._score = 0;
    this._isGameOver = false;
    this._grid.clear();
  }

  /**
   * Sets the game-over status.
   * @param status - True to end the game; false to resume.
   * @throws {TypeError} If status is not a boolean.
   */
  setGameOver(status: boolean): void {
    if (typeof status !== 'boolean') throw new TypeError('status must be a boolean');
    this._isGameOver = status;
  }

  /**
   * Returns the current score.
   */
  getScore(): number {
    return this._score;
  }

  /**
   * Indicates whether the game has ended.
   */
  isOver(): boolean {
    return this._isGameOver;
  }

  get grid(): Grid {
    return this._grid;
  }

  get currentPlayer(): Position {
    return this._currentPlayer;
  }
}
