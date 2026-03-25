export class Vector2D {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
  }

  add(other: Vector2D): Vector2D {
      return new Vector2D(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector2D): Vector2D {
      return new Vector2D(this.x - other.x, this.y - other.y);
  }

  mul(scalar: number): Vector2D {
      return new Vector2D(this.x * scalar, this.y * scalar);
  }

  div(scalar: number): Vector2D {
      return new Vector2D(this.x / scalar, this.y / scalar);
  }

  mag(): number {
      return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  equals(other: Vector2D): boolean {
      return this.x === other.x && this.y === other.y;
  }

  clone(): Vector2D {
      return new Vector2D(this.x, this.y);
  }
}
