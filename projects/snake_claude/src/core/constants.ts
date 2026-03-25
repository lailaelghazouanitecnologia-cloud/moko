import { GameConfig, Direction } from './types';

/** Default grid width in cells. */
export const GRID_WIDTH = 20;

/** Default grid height in cells. */
export const GRID_HEIGHT = 15;

/** Default milliseconds between game ticks. */
export const TICK_RATE = 150;

/** Default number of body segments the snake starts with. */
export const INITIAL_LENGTH = 3;

/** Points awarded for eating a piece of food. */
export const POINTS_PER_FOOD = 10;

/** Minimum tick rate (fastest speed) in milliseconds. */
export const MIN_TICK_RATE = 50;

/** Amount the tick rate decreases for every food eaten (speeds up). */
export const TICK_RATE_DECREASE = 2;

/** File path for persisting the high score (Node.js environments). */
export const HIGH_SCORE_FILE = '.snake_highscore';

/** Direction pairs that are opposites (used to prevent 180-degree turns). */
export const OPPOSITE_DIRECTIONS: ReadonlyMap<Direction, Direction> = new Map([
  [Direction.Up, Direction.Down],
  [Direction.Down, Direction.Up],
  [Direction.Left, Direction.Right],
  [Direction.Right, Direction.Left],
]);

/** Default game configuration. */
export const DEFAULT_CONFIG: Readonly<GameConfig> = {
  gridWidth: GRID_WIDTH,
  gridHeight: GRID_HEIGHT,
  tickRate: TICK_RATE,
  initialLength: INITIAL_LENGTH,
  startDirection: Direction.Right,
} as const;
