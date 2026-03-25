/**
 * 2D vector with x,y components
 */
export class Vec2 {
  public readonly x: number;
  public readonly y: number;

  /**
   * Creates a new Vec2 instance.
   * @param x - The x component (default 0)
   * @param y - The y component (default 0)
   */
  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * Creates a new Vec2 with the given components.
   * @param x - The x component
   * @param y - The y component
   * @returns A new Vec2 instance
   */
  set(x: number, y: number): Vec2 {
    if (!this.isValidNumber(x) || !this.isValidNumber(y)) {
      throw new Error('Vec2 components must be valid numbers');
    }
    return new Vec2(x, y);
  }

  /**
   * Creates a copy of this vector.
   * @returns A new Vec2 instance with the same components
   */
  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  /**
   * Adds another vector to this vector.
   * @param v - The vector to add
   * @returns A new Vec2 instance representing the sum
   */
  add(v: Vec2): Vec2 {
    this.validateVector(v, 'add');
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  /**
   * Subtracts another vector from this vector.
   * @param v - The vector to subtract
   * @returns A new Vec2 instance representing the difference
   */
  sub(v: Vec2): Vec2 {
    this.validateVector(v, 'sub');
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  /**
   * Scales this vector by a scalar value.
   * @param s - The scalar value
   * @returns A new Vec2 instance representing the scaled vector
   */
  scale(s: number): Vec2 {
    if (!this.isValidNumber(s)) {
      throw new Error('Scale factor must be a valid number');
    }
    return new Vec2(this.x * s, this.y * s);
  }

  /**
   * Computes the dot product with another vector.
   * @param v - The other vector
   * @returns The dot product value
   */
  dot(v: Vec2): number {
    this.validateVector(v, 'dot');
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Computes the magnitude (length) of this vector.
   * @returns The vector magnitude
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Normalizes this vector to unit length.
   * @returns A new Vec2 instance representing the unit vector
   */
  normalize(): Vec2 {
    const len = this.length();
    if (len === 0) {
      return new Vec2(0, 0);
    }
    return new Vec2(this.x / len, this.y / len);
  }

  /**
   * Computes the distance to another vector.
   * @param v - The other vector
   * @returns The distance between vectors
   */
  distance(v: Vec2): number {
    this.validateVector(v, 'distance');
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Checks if this vector is equal to another vector within a tolerance.
   * @param v - The other vector
   * @param tolerance - The tolerance for comparison (default 1e-10)
   * @returns True if vectors are equal within tolerance
   */
  equals(v: Vec2, tolerance: number = 1e-10): boolean {
    this.validateVector(v, 'equals');
    if (!this.isValidNumber(tolerance) || tolerance < 0) {
      throw new Error('Tolerance must be a non-negative number');
    }
    return Math.abs(this.x - v.x) <= tolerance && Math.abs(this.y - v.y) <= tolerance;
  }

  /**
   * Computes the angle of this vector in radians.
   * @returns The angle in radians
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Creates a vector from an angle and magnitude.
   * @param angle - The angle in radians
   * @param magnitude - The magnitude (default 1)
   * @returns A new Vec2 instance
   */
  static fromAngle(angle: number, magnitude: number = 1): Vec2 {
    if (!this.isValidNumber(angle) || !this.isValidNumber(magnitude)) {
      throw new Error('Angle and magnitude must be valid numbers');
    }
    if (magnitude < 0) {
      throw new Error('Magnitude must be non-negative');
    }
    return new Vec2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  /**
   * Computes the linear interpolation between two vectors.
   * @param a - The first vector
   * @param b - The second vector
   * @param t - The interpolation factor (0-1)
   * @returns A new Vec2 instance representing the interpolated vector
   */
  static lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    if (!a || !(a instanceof Vec2)) {
      throw new Error('First vector must be a valid Vec2 instance');
    }
    if (!b || !(b instanceof Vec2)) {
      throw new Error('Second vector must be a valid Vec2 instance');
    }
    if (!this.isValidNumber(t)) {
      throw new Error('Interpolation factor must be a valid number');
    }
    if (t < 0 || t > 1) {
      throw new Error('Interpolation factor must be between 0 and 1');
    }
    return new Vec2(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t
    );
  }

  /**
   * Returns a string representation of this vector.
   * @returns String in format "(x, y)"
   */
  toString(): string {
    return `(${this.x}, ${this.y})`;
  }

  /**
   * Checks if a value is a valid finite number.
   * @param value - The value to check
   * @returns True if the value is a valid finite number
   */
  private static isValidNumber(value: any): boolean {
    return typeof value === 'number' && isFinite(value);
  }

  /**
   * Validates that a vector parameter is a valid Vec2 instance.
   * @param v - The vector to validate
   * @param methodName - The name of the calling method for error messages
   */
  private validateVector(v: any, methodName: string): void {
    if (!v || !(v instanceof Vec2)) {
      throw new Error(`${methodName} requires a valid Vec2 instance`);
    }
  }
}
