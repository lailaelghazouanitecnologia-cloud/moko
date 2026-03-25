import { Position, Direction } from './types';

/**
 * Immutable 2D vector class for grid-based math.
 * All operations return new instances rather than mutating.
 */
export class Vector2D implements Position {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** Create a Vector2D from a plain Position object. */
  static from(pos: Position): Vector2D {
    return new Vector2D(pos.x, pos.y);
  }

  /** Return the unit vector for a given direction. */
  static fromDirection(direction: Direction): Vector2D {
    switch (direction) {
      case Direction.Up:
        return new Vector2D(0, -1);
      case Direction.Down:
        return new Vector2D(0, 1);
      case Direction.Left:
        return new Vector2D(-1, 0);
      case Direction.Right:
        return new Vector2D(1, 0);
    }
  }

  /** Add another vector or position to this one. */
  add(other: Position): Vector2D {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }

  /** Subtract another vector or position from this one. */
  subtract(other: Position): Vector2D {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }

  /** Scale both components by a scalar value. */
  scale(factor: number): Vector2D {
    return new Vector2D(this.x * factor, this.y * factor);
  }

  /** Check equality with another position. */
  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }

  /** Manhattan distance to another position (useful for grid games). */
  manhattanDistance(other: Position): number {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  /** Euclidean distance to another position. */
  distance(other: Position): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Wrap this vector within grid bounds (for toroidal grids, if desired). */
  wrap(width: number, height: number): Vector2D {
    return new Vector2D(
      ((this.x % width) + width) % width,
      ((this.y % height) + height) % height,
    );
  }

  /** Check if this position is within the given grid bounds (0-indexed). */
  isInBounds(width: number, height: number): boolean {
    return this.x >= 0 && this.x < width && this.y >= 0 && this.y < height;
  }

  /** Return a plain position object (useful for serialization). */
  toPosition(): Position {
    return { x: this.x, y: this.y };
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}
