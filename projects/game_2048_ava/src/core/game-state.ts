import { GameConfig } from './game-config';
import { Position } from './position';

/**
 * Tracks the current state of a game session.
 */
export class GameState {
  private readonly config: GameConfig;
  private score: number;
  private isRunning: boolean;
  private isPaused: boolean;

  constructor(config: GameConfig) {
    if (!config) {
      throw new TypeError('config is required');
    }
    if (
      typeof config.boardWidth !== 'number' ||
      typeof config.boardHeight !== 'number' ||
      config.boardWidth <= 0 ||
      config.boardHeight <= 0
    ) {
      throw new RangeError('boardWidth and boardHeight must be positive numbers');
    }

    this.config = config;
    this.score = 0;
    this.isRunning = false;
    this.isPaused = false;
  }

  /**
   * Initialize a new game session.
   */
  start(): void {
    this.isRunning = true;
    this.isPaused = false;
    this.score = 0;
  }

  /**
   * Toggle the pause state of the game.
   */
  pause(): void {
    if (!this.isRunning) {
      return;
    }
    this.isPaused = !this.isPaused;
  }

  /**
   * Reset the game to its initial state.
   */
  reset(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
  }

  /**
   * Add points to the current score.
   * @param points - The number of points to add (can be negative).
   */
  updateScore(points: number): void {
    if (typeof points !== 'number' || !Number.isFinite(points)) {
      throw new TypeError('points must be a finite number');
    }
    this.score += points;
  }

  /**
   * Check if the game has ended.
   * @returns `true` if the game is not running; otherwise `false`.
   */
  isGameOver(): boolean {
    return !this.isRunning;
  }

  /**
   * Validate if a position is within the board boundaries.
   * @param pos - The position to validate.
   * @returns `true` if the position is within bounds; otherwise `false`.
   */
  validatePosition(pos: Position): boolean {
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      throw new TypeError('pos must be a valid Position with numeric x and y');
    }
    return (
      pos.x >= 0 &&
      pos.x < this.config.boardWidth &&
      pos.y >= 0 &&
      pos.y < this.config.boardHeight
    );
  }

  /**
   * Get the current score.
   */
  getScore(): number {
    return this.score;
  }

  /**
   * Get the running state.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the paused state.
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get the game configuration.
   */
  getConfig(): Readonly<GameConfig> {
    return this.config;
  }
}