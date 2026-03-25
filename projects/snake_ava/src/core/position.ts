/**
 * Represents a 2-D coordinate on a grid.
 * Immutable after construction.
 */
export class Position {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (!Number.isFinite(x) || !Number.isInteger(x)) {
      throw new RangeError("x must be a finite integer");
    }
    if (!Number.isFinite(y) || !Number.isInteger(y)) {
      throw new RangeError("y must a finite integer");
    }
  }

  /**
   * Determines equality with another Position.
   * @returns true when both coordinates match.
   */
  equals(other: Position): boolean {
    if (!(other instanceof Position)) {
      throw new TypeError("other must be a Position");
    }
    return this.x === other.x && this.y === other.y;
  }

  /**
   * Manhattan distance to another Position.
   */
  distanceTo(other: Position): number {
    if (!(other instanceof Position)) {
      throw new TypeError("other must be a Position");
    }
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  /**
   * Creates a new Position offset by (dx, dy).
   */
  add(dx: number, dy: number): Position {
    if (!Number.isFinite(dx) || !Number.isInteger(dx)) {
      throw new RangeError("dx must be a finite integer");
    }
    if (!Number.isFinite(dy) || !Number.isInteger(dy)) {
      throw new RangeError("dy must be a finite integer");
    }
    return new Position(this.x + dx, this.y + dy);
  }

  /**
   * Copy of this Position.
   */
  clone(): Position {
    return new Position(this.x, this.y);
  }

  /**
   * String tag for debug/logging.
   */
  toString(): string {
    return `(${this.x}, ${this.y})`;
  }

  /**
   * Creates a Position from a plain object.
   */
  static from(o: unknown): Position {
    if (
      typeof o === "object" &&
      o !== null &&
      "x" in o &&
      "y" in o &&
      typeof (o as unknown).x === "number" &&
      typeof (o as unknown).y === "number"
    ) {
      return new Position((o as unknown).x, (o as unknown).y);
    }
    throw new TypeError("o must be an object with numeric x and y");
  }
}
