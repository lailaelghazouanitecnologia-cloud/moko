/**
 * Immutable 2D vector class for positions, directions, and velocities.
 * All operations return new Vector2 instances.
 */
export class Vector2 {
  public readonly x: number;
  public readonly y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  // ── Factory methods ──────────────────────────────────────────────

  static readonly ZERO = new Vector2(0, 0);
  static readonly ONE = new Vector2(1, 1);
  static readonly UP = new Vector2(0, -1);
  static readonly DOWN = new Vector2(0, 1);
  static readonly LEFT = new Vector2(-1, 0);
  static readonly RIGHT = new Vector2(1, 0);

  static fromAngle(radians: number): Vector2 {
    return new Vector2(Math.cos(radians), Math.sin(radians));
  }

  // ── Arithmetic ───────────────────────────────────────────────────

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Vector2 {
    if (scalar === 0) throw new Error('Vector2: division by zero');
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  // ── Length & distance ────────────────────────────────────────────

  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  get lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  distanceTo(other: Vector2): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceSquaredTo(other: Vector2): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return dx * dx + dy * dy;
  }

  /** Manhattan distance — useful for grid-based calculations */
  manhattanDistanceTo(other: Vector2): number {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  // ── Normalization & clamping ─────────────────────────────────────

  normalize(): Vector2 {
    const len = this.length;
    if (len === 0) return Vector2.ZERO;
    return this.divide(len);
  }

  clampLength(maxLength: number): Vector2 {
    if (this.lengthSquared > maxLength * maxLength) {
      return this.normalize().multiply(maxLength);
    }
    return this;
  }

  // ── Utility ──────────────────────────────────────────────────────

  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  /** 2D cross product (returns scalar) */
  cross(other: Vector2): number {
    return this.x * other.y - this.y * other.x;
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  angleTo(other: Vector2): number {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }

  lerp(other: Vector2, t: number): Vector2 {
    const clamped = Math.max(0, Math.min(1, t));
    return new Vector2(
      this.x + (other.x - this.x) * clamped,
      this.y + (other.y - this.y) * clamped
    );
  }

  /** Round to integer coordinates (useful for grid snapping) */
  round(): Vector2 {
    return new Vector2(Math.round(this.x), Math.round(this.y));
  }

  floor(): Vector2 {
    return new Vector2(Math.floor(this.x), Math.floor(this.y));
  }

  equals(other: Vector2): boolean {
    return this.x === other.x && this.y === other.y;
  }

  /** Approximate equality with epsilon tolerance */
  approxEquals(other: Vector2, epsilon: number = 0.001): boolean {
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon
    );
  }

  toString(): string {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }

  toGrid(): { x: number; y: number } {
    return { x: Math.floor(this.x), y: Math.floor(this.y) };
  }
}
