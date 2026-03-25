import {
  Direction,
  GameConfig,
  GameStatus,
  Position,
  CollisionResult,
} from '../core/types';
import { Vector2D } from '../core/vector';
import {
  DEFAULT_CONFIG,
  POINTS_PER_FOOD,
  MIN_TICK_RATE,
  TICK_RATE_DECREASE,
} from '../core/constants';
import { Snake } from './snake';
import { FoodSpawner } from './food';
import { CollisionDetector } from './collision';

/**
 * Central game state. Owns the snake, food, score, and status.
 * Call {@link update} once per game tick to advance the simulation.
 */
export class GameState {
  private readonly config: Readonly<GameConfig>;
  private readonly _snake: Snake;
  private readonly foodSpawner: FoodSpawner;
  private readonly collisionDetector: CollisionDetector;

  private _food: Vector2D | null;
  private _score: number;
  private _highScore: number;
  private _status: GameStatus;
  private _tickRate: number;
  private _tickCount: number;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    const startPos = this.config.startPosition ?? {
      x: Math.floor(this.config.gridWidth / 2),
      y: Math.floor(this.config.gridHeight / 2),
    };
    const startDir = this.config.startDirection ?? Direction.Right;

    this._snake = new Snake(startPos, this.config.initialLength, startDir);
    this.foodSpawner = new FoodSpawner(this.config.gridWidth, this.config.gridHeight);
    this.collisionDetector = new CollisionDetector(this.config.gridWidth, this.config.gridHeight);

    this._food = null;
    this._score = 0;
    this._highScore = 0;
    this._status = GameStatus.Ready;
    this._tickRate = this.config.tickRate;
    this._tickCount = 0;

    this.spawnFood();
  }

  // ── Public accessors ──────────────────────────────────────────────

  get snake(): Snake {
    return this._snake;
  }

  get food(): Readonly<Position> | null {
    return this._food;
  }

  get score(): number {
    return this._score;
  }

  get highScore(): number {
    return this._highScore;
  }

  get status(): GameStatus {
    return this._status;
  }

  get tickRate(): number {
    return this._tickRate;
  }

  get tickCount(): number {
    return this._tickCount;
  }

  get gridWidth(): number {
    return this.config.gridWidth;
  }

  get gridHeight(): number {
    return this.config.gridHeight;
  }

  // ── Status transitions ────────────────────────────────────────────

  /** Set the high score (e.g., loaded from disk). */
  setHighScore(value: number): void {
    this._highScore = value;
  }

  /** Transition the game to Running. */
  start(): void {
    if (this._status === GameStatus.Ready || this._status === GameStatus.GameOver) {
      this.reset();
      this._status = GameStatus.Running;
    }
  }

  /** Pause the game. */
  pause(): void {
    if (this._status === GameStatus.Running) {
      this._status = GameStatus.Paused;
    }
  }

  /** Resume from pause. */
  resume(): void {
    if (this._status === GameStatus.Paused) {
      this._status = GameStatus.Running;
    }
  }

  /** Toggle between pause and running. */
  togglePause(): void {
    if (this._status === GameStatus.Running) {
      this.pause();
    } else if (this._status === GameStatus.Paused) {
      this.resume();
    }
  }

  // ── Core game tick ────────────────────────────────────────────────

  /**
   * Advance the game by one tick.
   * Moves the snake, checks collisions, updates score, and spawns food.
   * @returns The collision result for this tick.
   */
  update(): CollisionResult {
    if (this._status !== GameStatus.Running) {
      return { type: 'none' };
    }

    this._tickCount++;

    // Move the snake one step.
    this._snake.move();

    // Check collisions.
    const collision = this.collisionDetector.check(this._snake, this._food);

    switch (collision.type) {
      case 'wall':
      case 'self':
        this._status = GameStatus.GameOver;
        if (this._score > this._highScore) {
          this._highScore = this._score;
        }
        break;

      case 'food':
        this._snake.grow();
        this._score += POINTS_PER_FOOD;
        if (this._score > this._highScore) {
          this._highScore = this._score;
        }
        this.speedUp();
        this.spawnFood();
        break;

      case 'none':
        break;
    }

    return collision;
  }

  /**
   * Change the snake's direction (called by the input handler).
   * @param direction - The new direction.
   */
  changeDirection(direction: Direction): void {
    this._snake.setDirection(direction);
  }

  // ── Private helpers ───────────────────────────────────────────────

  /** Spawn food on an empty cell. */
  private spawnFood(): void {
    this._food = this.foodSpawner.spawn(this._snake.body);
  }

  /** Increase the game speed slightly. */
  private speedUp(): void {
    if (this._tickRate > MIN_TICK_RATE) {
      this._tickRate = Math.max(MIN_TICK_RATE, this._tickRate - TICK_RATE_DECREASE);
    }
  }

  /** Reset all mutable state for a new game. */
  private reset(): void {
    const startPos = this.config.startPosition ?? {
      x: Math.floor(this.config.gridWidth / 2),
      y: Math.floor(this.config.gridHeight / 2),
    };
    const startDir = this.config.startDirection ?? Direction.Right;

    this._snake.reset(startPos, this.config.initialLength, startDir);
    this._score = 0;
    this._tickRate = this.config.tickRate;
    this._tickCount = 0;
    this._food = null;
    this.spawnFood();
  }
}
