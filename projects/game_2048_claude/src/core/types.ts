/** Cardinal directions for tile movement. */
export const enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

/** Zero-indexed row/column position on the grid. */
export interface Position {
  readonly row: number;
  readonly col: number;
}

/** A tile living on the grid. */
export interface Tile {
  readonly value: number;
  readonly position: Position;
}

/** Snapshot of the full game state (useful for undo / serialization). */
export interface GameState {
  readonly grid: ReadonlyArray<ReadonlyArray<number>>;
  readonly score: number;
  readonly won: boolean;
  readonly over: boolean;
}

/** Result of processing a single row/column merge. */
export interface MergeResult {
  readonly cells: readonly number[];
  readonly points: number;
}

/** Result of applying a move to the entire grid. */
export interface MoveResult {
  readonly grid: number[][];
  readonly points: number;
  readonly moved: boolean;
}
