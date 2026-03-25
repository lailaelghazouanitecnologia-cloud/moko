import { Vec2 } from './vec2';

/**
 * A 3x3 matrix class optimized for 2D transformations.
 * Stored in column-major order (OpenGL convention).
 */
export class Mat3 {
  public readonly elements: Float32Array;

  constructor() {
    this.elements = new Float32Array(9);
    this.identity();
  }

  /**
   * Sets this matrix to the identity matrix.
   * @returns This matrix for chaining.
   */
  identity(): Mat3 {
    const e = this.elements;
    e[0] = 1; e[1] = 0; e[2] = 0;
    e[3] = 0; e[4] = 1; e[5] = 0;
    e[6] = 0; e[7] = 0; e[8] = 1;
    return this;
  }

  /**
   * Sets all elements of this matrix.
   * @param m00 Element at row 0, column 0.
   * @param m01 Element at row 0, column 1.
   * @param m02 Element at row 0, column 2.
   * @param m10 Element at row 1, column 0.
   * @param m11 Element at row 1, column 1.
   * @param m12 Element at row 1, column 2.
   * @param m20 Element at row 2, column 0.
   * @param m21 Element at row 2, column 1.
   * @param m22 Element at row 2, column 2.
   * @returns This matrix for chaining.
   */
  set(
    m00: number, m01: number, m02: number,
    m10: number, m11: number, m12: number,
    m20: number, m21: number, m22: number
  ): Mat3 {
    const e = this.elements;
    e[0] = m00; e[1] = m01; e[2] = m02;
    e[3] = m10; e[4] = m11; e[5] = m12;
    e[6] = m20; e[7] = m21; e[8] = m22;
    return this;
  }

  /**
   * Copies the elements from another matrix into this one.
   * @param m Source matrix.
   * @returns This matrix for chaining.
   * @throws {TypeError} If m is not a Mat3 instance.
   */
  copy(m: Mat3): Mat3 {
    if (!(m instanceof Mat3)) {
      throw new TypeError('Expected argument to be an instance of Mat3');
    }
    this.elements.set(m.elements);
    return this;
  }

  /**
   * Creates a new matrix with the same elements as this one.
   * @returns A new Mat3 instance.
   */
  clone(): Mat3 {
    const out = new Mat3();
    out.elements.set(this.elements);
    return out;
  }

  /**
   * Multiplies this matrix by another matrix (this = this * m).
   * @param m Right-hand side matrix.
   * @returns This matrix for chaining.
   * @throws {TypeError} If m is not a Mat3 instance.
   */
  multiply(m: Mat3): Mat3 {
    if (!(m instanceof Mat3)) {
      throw new TypeError('Expected argument to be an instance of Mat3');
    }
    const a = this.elements;
    const b = m.elements;
    const out = new Float32Array(9);

    const a00 = a[0], a01 = a[1], a02 = a[2];
    const a10 = a[3], a11 = a[4], a12 = a[5];
    const a20 = a[6], a21 = a[7], a22 = a[8];

    const b00 = b[0], b01 = b[1], b02 = b[2];
    const b10 = b[3], b11 = b[4], b12 = b[5];
    const b20 = b[6], b21 = b[7], b22 = b[8];

    out[0] = a00 * b00 + a01 * b10 + a02 * b20;
    out[1] = a00 * b01 + a01 * b11 + a02 * b21;
    out[2] = a00 * b02 + a01 * b12 + a02 * b22;
    out[3] = a10 * b00 + a11 * b10 + a12 * b20;
    out[4] = a10 * b01 + a11 * b11 + a12 * b21;
    out[5] = a10 * b02 + a11 * b12 + a12 * b22;
    out[6] = a20 * b00 + a21 * b10 + a22 * b20;
    out[7] = a20 * b01 + a21 * b11 + a22 * b21;
    out[8] = a20 * b02 + a21 * b12 + a22 * b22;

    this.elements = out;
    return this;
  }

  /**
   * Applies a translation transformation to this matrix.
   * @param v Translation vector.
   * @returns This matrix for chaining.
   * @throws {TypeError} If v is not a Vec2 instance.
   */
  translate(v: Vec2): Mat3 {
    if (!(v instanceof Vec2)) {
      throw new TypeError('Expected argument to be an instance of Vec2');
    }
    const e = this.elements;
    const x = v.x, y = v.y;
    const a00 = e[0], a01 = e[1], a02 = e[2];
    const a10 = e[3], a11 = e[4], a12 = e[5];
    const a20 = e[6], a21 = e[7], a22 = e[8];

    e[0] = a00;
    e[1] = a01;
    e[2] = a02;
    e[3] = a10;
    e[4] = a11;
    e[5] = a12;
    e[6] = x * a00 + y * a10 + a20;
    e[7] = x * a01 + y * a11 + a21;
    e[8] = x * a02 + y * a12 + a22;
    return this;
  }

  /**
   * Applies a rotation transformation to this matrix.
   * @param theta Angle in radians.
   * @returns This matrix for chaining.
   * @throws {TypeError} If theta is not a finite number.
   */
  rotate(theta: number): Mat3 {
    if (!Number.isFinite(theta)) {
      throw new TypeError('Expected theta to be a finite number');
    }
    const e = this.elements;
    const s = Math.sin(theta);
    const c = Math.cos(theta);
    const a00 = e[0], a01 = e[1], a02 = e[2];
    const a10 = e[3], a11 = e[4], a12 = e[5];
    const a20 = e[6], a21 = e[7], a22 = e[8];

    e[0] = c * a00 + s * a10;
    e[1] = c * a01 + s * a11;
    e[2] = c * a02 + s * a12;
    e[3] = c * a10 - s * a00;
    e[4] = c * a11 - s * a01;
    e[5] = c * a12 - s * a02;
    e[6] = a20;
    e[7] = a21;
    e[8] = a22;
    return this;
  }

  /**
   * Applies a scaling transformation to this matrix.
   * @param v Scale vector.
   * @returns This matrix for chaining.
   * @throws {TypeError} If v is not a Vec2 instance.
   */
  scale(v: Vec2): Mat3 {
    if (!(v instanceof Vec2)) {
      throw new TypeError('Expected argument to be an instance of Vec2');
    }
    const e = this.elements;
    const x = v.x, y = v.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new TypeError('Scale components must be finite numbers');
    }
    e[0] *= x;
    e[1] *= x;
    e[2] *= x;
    e[3] *= y;
    e[4] *= y;
    e[5] *= y;
    return this;
  }

  /**
   * Computes the inverse of this matrix.
   * If the matrix is singular, it remains unchanged.
   * @returns This matrix for chaining.
   */
  invert(): Mat3 {
    const e = this.elements;
    const a00 = e[0], a01 = e[1], a02 = e[2];
    const a10 = e[3], a11 = e[4], a12 = e[5];
    const a20 = e[6], a21 = e[7], a22 = e[8];

    const b01 =  22 * a11 - 12 * a21;
    const b11 = -22 * a10 + 12 * a20;
    const b21 =  12 * a10 - 02 * a20;

    let det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) {
      return this;
    }
    det = 1.0 / det;

    e[0] = b01 * det;
    e[1] = ( -22 * a01 + 02 * a21) * det;
    e[2] = (  12 * a01 - 02 * a11) * det;
    e[3] = b11 * det;
    e[4] = (  22 * a00 - 02 * a20) * det;
    e[5] = ( -12 * a00 + 02 * a10) * det;
    e[6] = b21 * det;
    e[7] = ( -12 * a00 + 02 * a10) * det;
    e[8] = (  02 * a00 - 01 * a10) * det;
    return this;
  }

  /**
   * Transposes this matrix in place.
   * @returns This matrix for chaining.
   */
  transpose(): Mat3 {
    const e = this.elements;
    let tmp: number;
    tmp = e[1]; e[1] = e[3]; e[3] = tmp;
    tmp = e[2]; e[2] = e[6]; e[6] = tmp;
    tmp = e[5]; e[5] = e[7]; e[7] = tmp;
    return this;
  }

  /**
   * Creates a new Mat3 set to the identity matrix.
   * @returns A new identity Mat3.
   */
  static identity(): Mat3 {
    return new Mat3();
  }

  /**
   * Creates a translation matrix.
   * @param v Translation vector.
   * @returns A new Mat3 representing the translation.
   * @throws {TypeError} If v is not a Vec2 instance.
   */
  static translation(v: Vec2): Mat3 {
    if (!(v instanceof Vec2)) {
      throw new TypeError('Expected argument to be an instance of Vec2');
    }
    const m = new Mat3();
    m.elements[6] = v.x;
    m.elements[7] = v.y;
    return m;
  }

  /**
   * Creates a rotation matrix.
   * @param theta Angle in radians.
   * @returns A new Mat3 representing the rotation.
   * @throws {TypeError} If theta is not a finite number.
   */
  static rotation(theta: number): Mat3 {
    if (!Number.isFinite(theta)) {
      throw new TypeError('Expected theta to be a finite number');
    }
    const m = new Mat3();
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const e = m.elements;
    e[0] = c; e[1] = s;
    e[3] = -s; e[4] = c;
    return m;
  }

  /**
   * Creates a scaling matrix.
   * @param v Scale vector.
   * @returns A new Mat3 representing the scaling.
   * @throws {TypeError} If v is not a Vec2 instance.
   */
  static scaling(v: Vec2): Mat3 {
    if (!(v instanceof Vec2)) {
      throw new TypeError('Expected argument to be an instance of Vec2');
    }
    const m = new Mat3();
    const e = m.elements;
    e[0] = v.x;
    e[4] = v.y;
    return m;
  }

  /**
   * Multiplies two matrices (a * b) and stores the result in a new matrix.
   * @param a Left-hand side matrix.
   * @param b Right-hand side matrix.
   * @returns A new Mat3 containing the product.
   * @throws {TypeError} If a or b are not Mat3 instances.
   */
  static multiply(a: Mat3, b: Mat3): Mat3 {
    if (!(a instanceof Mat3) || !(b instanceof Mat3)) {
      throw new TypeError('Expected arguments to be instances of Mat3');
    }
    return a.clone().multiply(b);
  }

  /**
   * Checks if two matrices are approximately equal within a small tolerance.
   * @param other Matrix to compare against.
   * @param tolerance Optional tolerance (default 1e-6).
   * @returns True if matrices are approximately equal.
   * @throws {TypeError} If other is not a Mat3 instance.
   */
  equals(other: Mat3, tolerance: number = 1e-6): boolean {
    if (!(other instanceof Mat3)) {
      throw new TypeError('Expected argument to be an instance of Mat3');
    }
    for (let i = 0; i < 9; i++) {
      if (Math.abs(this.elements[i] - other.elements[i]) > tolerance) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns a string representation of this matrix.
   * @returns String in mat3(x, x, x, x, x, x, x, x, x) format.
   */
  toString(): string {
    const e = this.elements;
    return `mat3(${e[0]}, ${e[1]}, ${e[2]}, ${e[3]}, ${e[4]}, ${e[5]}, ${e[6]}, ${e[7]}, ${e[8]})`;
  }
}
