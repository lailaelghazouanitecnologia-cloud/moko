/**
 * A 4-dimensional vector with immutable components.
 */
export class Vec4 {
  public readonly x: number;
  public readonly y: number;
  public readonly z: number;
  public readonly w: number;

  /**
   * Creates a new Vec4 instance.
   * @param x - The x component (default 0).
   * @param y - The y component (default 0).
   * @param z - The z component (default 0).
   * @param w - The w component (default 0).
   */
  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 0) {
    Vec4.validateNumber(x, 'x');
    Vec4.validateNumber(y, 'y');
    Vec4.validateNumber(z, 'z');
    Vec4.validateNumber(w, 'w');
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  /**
   * Creates a new Vec4 with the given components.
   * @param x - The x component.
   * @param y - The y component.
   * @param z - The z component.
   * @param w - The w component.
   * @returns A new Vec4 instance.
   */
  set(x: number, y: number, z: number, w: number): Vec4 {
    Vec4.validateNumber(x, 'x');
    Vec4.validateNumber(y, 'y');
    Vec4.validateNumber(z, 'z');
    Vec4.validateNumber(w, 'w');
    return new Vec4(x, y, z, w);
  }

  /**
   * Creates a deep copy of this vector.
   * @returns A new Vec4 instance with the same components.
   */
  clone(): Vec4 {
    return new Vec4(this.x, this.y, this.z, this.w);
  }

  /**
   * Creates a copy of the provided vector.
   * @param v - The vector to copy.
   * @returns A new Vec4 instance with the same components as `v`.
   * @throws {TypeError} If `v` is not a Vec4 instance.
   */
  copy(v: Vec4): Vec4 {
    if (!(v instanceof Vec4)) {
      throw new TypeError('Expected v to be an instance of Vec4');
    }
    return new Vec4(v.x, v.y, v.z, v.w);
  }

  /**
   * Checks equality with another vector.
   * @param v - The vector to compare.
   * @returns True if all components are strictly equal.
   * @throws {TypeError} If `v` is not a Vec4 instance.
   */
  equals(v: Vec4): boolean {
    if (!(v instanceof Vec4)) {
      throw new TypeError('Expected v to be an instance of Vec4');
    }
    return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
  }

  /**
   * Adds another vector to this vector.
   * @param v - The vector to add.
   * @returns A new Vec4 representing the component-wise sum.
   * @throws {TypeError} If `v` is not a Vec4 instance.
   */
  add(v: Vec4): Vec4 {
    if (!(v instanceof Vec4)) {
      throw new TypeError('Expected v to be an instance of Vec4');
    }
    return new Vec4(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
  }

  /**
   * Subtracts another vector from this vector.
   * @param v - The vector to subtract.
   * @returns A new Vec4 representing the component-wise difference.
   * @throws {TypeError} If `v` is not a Vec4 instance.
   */
  sub(v: Vec4): Vec4 {
    if (!(v instanceof Vec4)) {
      throw new TypeError('Expected v to be an instance of Vec4');
    }
    return new Vec4(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
  }

  /**
   * Scales this vector by a scalar.
   * @param s - The scalar multiplier.
   * @returns A new Vec4 with each component multiplied by `s`.
   * @throws {TypeError} If `s` is not a finite number.
   */
  scale(s: number): Vec4 {
    Vec4.validateNumber(s, 's');
    return new Vec4(this.x * s, this.y * s, this.z * s, this.w * s);
  }

  /**
   * Computes the dot product with another vector.
   * @param v - The other vector.
   * @returns The dot product.
   * @throws {TypeError} If `v` is not a Vec4 instance.
   */
  dot(v: Vec4): number {
    if (!(v instanceof Vec4)) {
      throw new TypeError('Expected v to be an instance of Vec4');
    }
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
  }

  /**
   * Computes the Euclidean length (magnitude) of this vector.
   * @returns The length.
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }

  /**
   * Computes the squared length without taking a square root.
   * @returns The squared length.
   */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }

  /**
   * Returns a normalized copy of this vector.
   * @returns A new Vec4 with length 1, or the zero vector if this vector is zero-length.
   */
  normalize(): Vec4 {
    const len = this.length();
    if (len === 0) return new Vec4(0, 0, 0, 0);
    return this.scale(1 / len);
  }

  /**
   * Computes the Euclidean distance to another vector.
   * @param v - The other vector.
   * @returns The distance.
   * @throws {TypeError} If `v` is not a Vec4 instance.
   */
  distance(v: Vec4): number {
    if (!(v instanceof Vec4)) {
      throw new TypeError('Expected v to be an instance of Vec4');
    }
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    const dw = this.w - v.w;
    return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
  }

  /**
   * Computes the squared distance to another vector without taking a square root.
   * @param v - The other vector.
   * @returns The squared distance.
   * @throws {TypeError} If `v` is not a Vec4 instance.
   */
  distanceSquared(v: Vec4): number {
    if (!(v instanceof Vec4)) {
      throw new TypeError('Expected v to be an instance of Vec4');
    }
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    const dw = this.w - v.w;
    return dx * dx + dy * dy + dz * dz + dw * dw;
  }

  /**
   * Performs linear interpolation between this vector and another.
   * @param v - The target vector.
   * @param t - The interpolation factor (0 returns this, 1 returns `v`).
   * @returns A new interpolated Vec4.
   * @throws {TypeError} If `v` is not a Vec4 instance.
   * @throws {RangeError} If `t` is not a finite number.
   */
  lerp(v: Vec4, t: number): Vec4 {
    if (!(v instanceof Vec4)) {
      throw new TypeError('Expected v to be an instance of Vec4');
    }
    Vec4.validateNumber(t, 't');
    return new Vec4(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t,
      this.w + (v.w - this.w) * t
    );
  }

  /**
   * Returns the component-wise absolute value of this vector.
   * @returns A new Vec4 with all components positive.
   */
  abs(): Vec4 {
    return new Vec4(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z), Math.abs(this.w));
  }

  /**
   * Returns the component-wise minimum of this and another vector.
   * @param v - The other vector.
   * @returns A new Vec4 with each component the smaller of the two inputs.
   * @throws {TypeError} If `v` is not a Vec4 instance.
   */
  min(v: Vec4): Vec4 {
    if (!(v instanceof Vec4)) {
      throw new TypeError('Expected v to be an instance of Vec4');
    }
    return new Vec4(
      Math.min(this.x, v.x),
      Math.min(this.y, v.y),
      Math.min(this.z, v.z),
      Math.min(this.w, v.w)
    );
  }

  /**
   * Returns the component-wise maximum of this and another vector.
   * @param v - The other vector.
   * @returns A new Vec4 with each component the larger of the two inputs.
   * @throws {TypeError} If `v` is not a Vec4 instance.
   */
  max(v: Vec4): Vec4 {
    if (!(v instanceof Vec4)) {
      throw new TypeError('Expected v to be an instance of Vec4');
    }
    return new Vec4(
      Math.max(this.x, v.x),
      Math.max(this.y, v.y),
      Math.max(this.z, v.z),
      Math.max(this.w, v.w)
    );
  }

  /**
   * Clamps each component to the range [min, max].
   * @param min - The lower bound vector.
   * @param max - The upper bound vector.
   * @returns A new Vec4 with components clamped.
   * @throws {TypeError} If either argument is not a Vec4 instance.
   */
  clamp(min: Vec4, max: Vec4): Vec4 {
    if (!(min instanceof Vec4) || !(max instanceof Vec4)) {
      throw new TypeError('Expected min and max to be instances of Vec4');
    }
    return this.max(min).min(max);
  }

  /**
   * Negates this vector.
   * @returns A new Vec4 with all components negated.
   */
  negate(): Vec4 {
    return new Vec4(-this.x, -this.y, -this.z, -this.w);
  }

  /**
   * Creates a Vec4 from a Vec3 and an optional w component.
   * @param v - The 3D vector.
   * @param w - The w component (default 0).
   * @returns A new Vec4.
   * @throws {TypeError} If `v` is not a Vec3 instance.
   */
  static fromVec3(v: Vec3, w: number = 0): Vec4 {
    if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
      throw new TypeError('Expected v to be a Vec3-like object');
    }
    Vec4.validateNumber(w, 'w');
    return new Vec4(v.x, v.y, v.z, w);
  }

  /**
   * Creates a Vec4 from a Vec2 and optional z and w components.
   * @param v - The 2D vector.
   * @param z - The z component (default 0).
   * @param w - The w component (default 0).
   * @returns A new Vec4.
   * @throws {TypeError} If `v` is not a Vec2 instance.
   */
  static fromVec2(v: Vec2, z: number = 0, w: number = 0): Vec4 {
    if (!v || typeof v.x !== 'number' || typeof v.y !== 'number') {
      throw new TypeError('Expected v to be a Vec2-like object');
    }
    Vec4.validateNumber(z, 'z');
    Vec4.validateNumber(w, 'w');
    return new Vec4(v.x, v.y, z, w);
  }

  /**
   * Performs linear interpolation between two vectors.
   * @param a - The start vector.
   * @param b - The end vector.
   * @param t - The interpolation factor.
   * @returns A new interpolated Vec4.
   * @throws {TypeError} If `a` or `b` are not Vec4 instances.
   * @throws {RangeError} If `t` is not a finite number.
   */
  static lerp(a: Vec4, b: Vec4, t: number): Vec4 {
    if (!(a instanceof Vec4) || !(b instanceof Vec4)) {
      throw new TypeError('Expected a and b to be instances of Vec4');
    }
    return a.lerp(b, t);
  }

  /**
   * Returns a vector with all components set to 0.
   * @returns The zero vector.
   */
  static zero(): Vec4 {
    return new Vec4(0, 0, 0, 0);
  }

  /**
   * Returns a vector with all components set to 1.
   * @returns The one vector.
   */
  static one(): Vec4 {
    return new Vec4(1, 1, 1, 1);
  }

  /**
   * Returns the unit vector along the X axis.
   * @returns (1, 0, 0, 0)
   */
  static unitX(): Vec4 {
    return new Vec4(1, 0, 0, 0);
  }

  /**
   * Returns the unit vector along the Y axis.
   * @returns (0, 1, 0, 0)
   */
  static unitY(): Vec4 {
    return new Vec4(0, 1, 0, 0);
  }

  /**
   * Returns the unit vector along the Z axis.
   * @returns (0, 0, 1, 0)
   */
  static unitZ(): Vec4 {
    return new Vec4(0, 0, 1, 0);
  }

  /**
   * Returns the unit vector along the W axis.
   * @returns (0, 0, 0, 1)
   */
  static unitW(): Vec4 {
    return new Vec4(0, 0, 0, 1);
  }

  /**
   * Validates that a value is a finite number.
   * @param value - The value to check.
   * @param name - The parameter name for error messages.
   * @throws {RangeError} If `value` is not a finite number.
   */
  private static validateNumber(value: number, name: string): void {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new RangeError(`${name} must be a finite number`);
    }
  }
}

// Minimal type declarations for Vec2 and Vec3 to avoid external dependencies
type Vec2 = { x: number; y: number };
type Vec3 = { x: number; y: number; z: number };
