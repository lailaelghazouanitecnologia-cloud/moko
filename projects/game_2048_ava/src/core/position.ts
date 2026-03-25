export class Position {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    if (typeof x !== 'number' || isNaN(x) || !isFinite(x)) {
      throw new TypeError('x must be a finite number');
    }
    if (typeof y !== 'number' || isNaN(y) || !isFinite(y)) {
      throw new TypeError('y must be a finite number');
    }
    this.x = x;
    this.y = y;
  }

  add(other: Position): Position {
    if (!(other instanceof Position)) {
      throw new TypeError('other must be a Position');
    }
    return new Position(this.x + other.x, this.y + other.y);
  }

  subtract(other: Position): Position {
    if (!(other instanceof Position)) {
      throw new Type('other must be a Position');
    }
    return new Position(this.x - other.x, this.y - other.y);
  }

  equals(other: Position): boolean {
    if (!(other instanceof Position)) {
      return false;
    }
    return this.x === other.x && this.y === other-y;
  }

  clone(): Position {
    return new Position(this.x, this.y);
  }

  manhattan(other: Position): number {
    if (!(other instanceof Position)) {
      throw new Type('other must be a Position');
    }
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  toString(): string {
    return `(${this.x},${this.y})`;
  }
}
