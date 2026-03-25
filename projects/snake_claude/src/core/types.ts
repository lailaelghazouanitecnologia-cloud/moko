/**
 * Core type definitions for the Snake game.
 * Uses discriminated unions and readonly types for safety.
 */

/** Cardinal directions the snake can travel. */
export enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

/** A discrete position on the game grid. */
export interface Position {
  readonly x: number;
  readonly y: number;
}

/** Current status of the game, used as a discriminated union tag. */
export enum GameStatus {
  Ready = 'READY',
  Running = 'RUNNING',
  Paused = 'PAUSED',
  GameOver = 'GAME_OVER',
}

/** Configuration for a game session. */
export interface GameConfig {
  /** Width of the grid in cells. */
  readonly gridWidth: number;
  /** Height of the grid in cells. */
  readonly gridHeight: number;
  /** Milliseconds between game ticks. */
  readonly tickRate: number;
  /** Number of body segments the snake starts with (including the head). */
  readonly initialLength: number;
  /** Starting position of the snake head. Defaults to center of grid. */
  readonly startPosition?: Position;
  /** Starting direction. Defaults to Right. */
  readonly startDirection?: Direction;
}

/** Types of cells that can appear on the rendered grid. */
export enum CellType {
  Empty = 'EMPTY',
  SnakeHead = 'SNAKE_HEAD',
  SnakeBody = 'SNAKE_BODY',
  Food = 'FOOD',
  Wall = 'WALL',
}

/** Typed event names emitted by the event bus. */
export enum GameEvent {
  Tick = 'tick',
  Render = 'render',
  GameOver = 'gameOver',
  ScoreChange = 'scoreChange',
  FoodEaten = 'foodEaten',
  DirectionChange = 'directionChange',
  StatusChange = 'statusChange',
}

/** Map of event names to their payload types. */
export interface GameEventMap {
  [GameEvent.Tick]: { readonly tick: number };
  [GameEvent.Render]: void;
  [GameEvent.GameOver]: { readonly score: number; readonly highScore: number };
  [GameEvent.ScoreChange]: { readonly score: number; readonly highScore: number };
  [GameEvent.FoodEaten]: { readonly position: Position };
  [GameEvent.DirectionChange]: { readonly direction: Direction };
  [GameEvent.StatusChange]: { readonly status: GameStatus };
}

/** Result of a collision check. */
export type CollisionResult =
  | { readonly type: 'none' }
  | { readonly type: 'wall' }
  | { readonly type: 'self' }
  | { readonly type: 'food'; readonly position: Position };
