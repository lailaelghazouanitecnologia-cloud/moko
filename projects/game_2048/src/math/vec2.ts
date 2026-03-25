/**
  * 2D vector with Float32Array storage
  */
export class Vec2 {
  data: Float32Array;

  /**
   * Create a new Vec2 from xy
   * @param x - x component (default 0)
   * @param y - y component (default 0)
   */
  constructor(x: number = 0, y: number = 0) {
    this.data = new Float32Array([x, y]);
  }

  /**
   * Set xy components
   * @param x - new x
   * @param y - new y
   * @returns this
   */
  set(x: number, y: number): Vec2 {
    this.data[0] = x;
    this.data[1] = y;
    return this;
  }

  /**
   * Vector magnitude
   * @returns length
   */
  length(): number {
    const x = this.data[0];
    const y = this.data[1];
    return Math.sqrt(x * x + y * y);
  }

  /**
   * Magnitude squared (faster than length when comparing)
   * @returns length squared
   */
  lengthSquared(): number {
    const x = this.data[0];
    const y = this.data[1];
    return x * x + y * y;
  }

  /**
   * Make this vector unit length
   * @returns this
   */
  normalize(): Vec2 {
    const x = this.data[0];
    const y = this.data[1];
    const len = Math.sqrt(x * x + y * y);
    if (len > 0) {
      this.data[0] = x / len;
      this.data[1] = y / len;
    }
    return this;
  }

  /**
   * Dot product with another vector
   * @param v - other vector
   * @returns dot product
   */
  dot(v: Vec2): number {
    if (!(v instanceof Vec2)) {
      throw new TypeError('Vec2.dot expects a Vec2 argument');
    }
    return this.data[0] * v.data[0] + this.data[1] * v.data[1];
  }

  /**
   * Euclidean distance to another vector
   * @param v - other vector
   * @returns distance
   */
  distance(v: Vec2): number {
    if (!(v instanceof Vec2)) {
      throw new TypeError('Vec2.distance expects a Vec2 argument');
    }
    const dx = this.data[0] - v.data[0];
    const dy = this.data[1] - v.data[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Component-wise addition
   * @param v - vector to add
   * @returns this
   */
  add(v: Vec2): Vec2 {
    if (!(v instanceof Vec2)) {
      throw new TypeError('Vec2.add expects a Vec2 argument');
    }
    this.data[0] += v.data[0];
    this.data[1] += v.data[1];
    return this;
  }

  /**
   * Component-wise subtraction
   * @param v - vector to subtract
   * @returns this
   */
  sub(v: Vec2): Vec2 {
    if (!(v instanceof Vec2)) {
      throw new TypeError('Vec2.sub expects a Vec2 argument');
    }
    this.data[0] -= v.data[0];
    this.data[1] -= v.data[1];
    return this;
  }

  /**
   * Component-wise multiplication
   * @param v - vector to multiply with
   * @returns this
   */
  multiply(v: Vec2): Vec2 {
    if (!(v instanceof Vec2)) {
      throw new TypeError('Vec0.multiply expects a Vec2 argument');
    }
    this.data[0] *= v.data[0];
    this.data[1] *= v.data[1];
    return this;
  }

  /**
   * Deep copy
   * @returns new Vec2
   */
  clone(): Vec2 {
    return new Vec2(this.data[0], this.data[1]);
  }

  /**
   * Scale this vector by a scalar
   * @param s - scalar
   * @returns this
   */
  scale(s: number): Vec2 {
    if (typeof s !== 'number' || !isFinite(s)) {
      throw new TypeError('Vec2.scale expects a finite number');
    }
    this.data[0] *= s;
    this.data[1] *= s;
    return this;
  }

  /**
   * Get x component
   * @returns x
   */
  get x(): number {
    return this.data[0];
  }

  /**
   * Set x component
   * @param value - new x
   */
  set x(value: number) {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new TypeError('x must be a finite number');
    }
    this.data[0] = value;
  }

  /**
   * Get y component
   * @returns y
   */
  get y(): number {
    return this.data[1];
  }

  /**
   * Set y component
   * @param value - new y
   */
  set y(value: number) {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new TypeError('y must be a finite number');
    }
    this.data[1] = value;
  }

  /**
   * Create a zero vector
   * @returns new Vec2(0,0)
   */
  static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  /**
   * Create a unit vector pointing right
   * @returns new Vec2(1,0)
   */
  static right(): Vec2 {
    return new Vec2(1, 0);
  }

  /**
   * Create a unit vector pointing up
   * @returns new Vec2(0,1)
   */
  static up(): Vec2 {
    return new Vec2(0, 1);
  }

  /**
   * Linear interpolation between two vectors
   * @param a - start vector
   * @param b - end vector
   * @param t - interpolation factor (0..1)
   * @returns new interpolated Vec2
   */
  static lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    if (!(a instanceof Vec2) || !(b instanceof Vec2)) {
      throw new TypeError('Vec2.lerp expects two Vec2 arguments');
    }
    if (typeof t !== 'number' || !isFinite(t)) {
      throw new TypeError('Vec2.lerp expects a finite number for t');
    }
    const clamped = Math.max(0, Math.min(1, t));
    return new Vec2(
      a.data[0] + (b.data[0] - a.data[0]) * clamped,
      a.data[1] + (b.data[1] - a.data[1]) * clamped
    );
  }

  /**
   * Maximum distance between two vectors before considering them different
   */
  static readonly EPSILON = 1e-6;

  /**
   * Check approximate equality
   * @param v - other vector
   * @param eps - tolerance (default EPSILON)
   * @returns true if within tolerance
   */
  equals(v: Vec2, eps: number = Vec2.EPSILON): boolean {
    if (!(v instanceof Vec2)) {
      throw new TypeError('Vec2.equals expects a Vec2 argument');
    }
    if (typeof eps !== 'number' || eps < 0) {
      throw new TypeError('eps must be a non-negative number');
    }
    return (
      Math.abs(this.data[0] - v.data[0]) < eps &&
      Math.abs(this.data[1] - v.data[1]) < eps
    );
  }

  /**
   * Return a string representation
   * @returns "(x, y)"
   */
  toString(): string {
    return `(${this.data[0]}, ${this.data[1]})`;
  }

  /**
   * Return an array format
   * @returns [x, y]
   */
  toArray(): [number, number] {
    return [this.data[0], this.data[1]];
  }

  /**
   * Return an object format
   * @returns {x, y}
   */
  toObject(): { x: number; y: number } {
    return { x: this.data[0], y: this.data[1] };
  }
}
