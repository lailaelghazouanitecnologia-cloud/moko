import { Vec2 } from './vec2';
import { Vec3 } from './vec3';

export class Mat3 {
  elements: Float32Array;

  constructor(
    m00 = 1, m01 = 0, m02 = 0,
    m10 = 0, m11 = 1, m12 = 0,
    m20 = 0, m21 = 0, m22 = 1
  ) {
    this.elements = new Float32Array([
      m00, m01, m02,
      m10, m11, m12,
      m20, m21, m22
    ]);
  }

  static identity(): Mat3 {
    return new Mat3();
  }

  static fromArray(array: number[]): Mat3 {
    const m = new Mat3();
    m.elements.set(array);
    return m;
  }

  static fromRotation(angle: number): Mat3 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Mat3(
      c, -s, 0,
      s,  c, 0,
      0,  0, 1
    );
  }

  static fromScale(x: number, y: number): Mat3 {
    return new Mat3(
      x, 0, 0,
      0, y, 0,
      0, 0, 1
    );
  }

  static fromTranslation(x: number, y: number): Mat3 {
    return new Mat3(
      1, 0, x,
      0, 1, y,
      0, 0, 1
    );
  }

  clone(): Mat3 {
    const m = new Mat3();
    m.elements.set(this.elements);
    return m;
  }

  copy(m: Mat3): this {
    this.elements.set(m.elements);
    return this;
  }

  set(
    m00: number, m01: number, m02: number,
    m10: number, m11: number, m12: number,
    m20: number, m21: number, m22: number
  ): this {
    const e = this.elements;
    e[0] = m00; e[1] = m01; e[2] = m02;
    e[3] = m10; e[4] = m11; e[5] = m12;
    e[6] = m20; e[7] = m21; e[8] = m22;
    return this;
  }

  identity(): this {
    const e = this.elements;
    e[0] = 1; e[1] = 0; e[2] = 0;
    e[3] = 0; e[4] = 1; e[5] = 0;
    e[6] = 0; e[7] = 0; e[8] = 1;
    return this;
  }

  determinant(): number {
    const e = this.elements;
    const a00 = e[0], a01 = e[1], a02 = e[2];
    const a10 = e[3], a11 = e[4], a12 = e[5];
    const a20 = e[6], a21 = e[7], a22 = e[8];
    return a00 * (a11 * a22 - a12 * a21) -
           a01 * (a10 * a22 - a12 * a20) +
           a02 * (a10 * a21 - a11 * a20);
  }

  invert(): this {
    const e = this.elements;
    const a00 = e[0], a01 = e[1], a02 = e[2];
    const a10 = e[3], a11 = e[4], a12 = e[5];
    const a20 = e[6], a21 = e[7], a22 = e[8];

    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) return this;
    det = 1.0 / det;

    e[0] = b01 * det;
    e[1] = (-a22 * a01 + a02 * a21) * det;
    e[2] = (a12 * a01 - a02 * a11) * det;
    e[3] = b11 * det;
    e[4] = (a22 * a00 - a02 * a20) * det;
    e[5] = (-a12 * a00 + a02 * a10) * det;
    e[6] = b21 * det;
    e[7] = (-a21 * a00 + a01 * a20) * det;
    e[8] = (a11 * a00 - a01 * a10) * det;

    return this;
  }

  multiply(m: Mat3): this {
    const ae = this.elements;
    const be = m.elements;
    const te = new Float32Array(9);

    const a00 = ae[0], a01 = ae[1], a02 = ae[2];
    const a10 = ae[3], a11 = ae[4], a12 = ae[5];
    const a20 = ae[6], a21 = ae[7], a22 = ae[8];

    const b00 = be[0], b01 = be[1], b02 = be[2];
    const b10 = be[3], b11 = be[4], b12 = be[5];
    const b20 = be[6], b21 = be[7], b22 = be[8];

    te[0] = a00 * b00 + a01 * b10 + a02 * b20;
    te[1] = a00 * b01 + a01 * b11 + a02 * b21;
    te[2] = a00 * b02 + a01 * b12 + a02 * b22;

    te[3] = a10 * b00 + a11 * b10 + a12 * b20;
    te[4] = a10 * b01 + a11 * b11 + a12 * b21;
    te[5] = a10 * b02 + a11 * b12 + a12 * b22;

    te[6] = a20 * b00 + a21 * b10 + a22 * b20;
    te[7] = a20 * b01 + a21 * b11 + a22 * b21;
    te[8] = a20 * b02 + a21 * b12 + a22 * b22;

    this.elements.set(te);
    return this;
  }

  multiplyScalar(s: number): this {
    const e = this.elements;
    for (let i = 0; i < 9; i++) {
      e[i] *= s;
    }
    return this;
  }

  transpose(): this {
    const e = this.elements;
    let tmp;
    tmp = e[1]; e[1] = e[3]; e[3] = tmp;
    tmp = e[2]; e[2] = e[6]; e[6] = tmp;
    tmp = e[5]; e[5] = e[7]; e[7] = tmp;
    return this;
  }

  translate(x: number, y: number): this {
    const e = this.elements;
    e[2] += x;
    e[5] += y;
    return this;
  }

  rotate(angle: number): this {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const e = this.elements;

    const m00 = e[0], m01 = e[1], m02 = e[2];
    const m10 = e[3], m11 = e[4], m12 = e[5];

    e[0] = c * m00 + s * m01;
    e[1] = c * m01 - s * m00;
    e[2] = c * m02 + s * m12;

    e[3] = c * m10 + s * m11;
    e[4] = c * m11 - s * m10;
    e[5] = c * m12 + s * m02;

    return this;
  }

  scale(x: number, y: number): this {
    const e = this.elements;
    e[0] *= x; e[1] *= x; e[2] *= x;
    e[3] *= y; e[4] *= y; e[5] *= y;
    return this;
  }

  transformVector2(v: Vec2): Vec2 {
    const e = this.elements;
    const x = v.x, y = v.y;
    return new Vec2(
      e[0] * x + e[1] * y + e[2],
      e[3] * x + e[4] * y + e[5]
    );
  }

  transformVector3(v: Vec3): Vec3 {
    const e = this.elements;
    const x = v.x, y = v.y, z = v.z;
    return new Vec3(
      e[0] * x + e[1] * y + e[2] * z,
      e[3] * x + e[4] * y + e[5] * z,
      e[6] * x + e[7] * y + e[8] * z
    );
  }

  equals(m: Mat3): boolean {
    const ae = this.elements;
    const be = m.elements;
    for (let i = 0; i < 9; i++) {
      if (Math.abs(ae[i] - be[i]) > Number.EPSILON) return false;
    }
    return true;
  }

  toArray(): number[] {
    return Array.from(this.elements);
  }

  toString(): string {
    const e = this.elements;
    return `Mat3(
      ${e[0]}, ${e[1]}, ${e[2]},
      ${e[3]}, ${e[4]}, ${e[5]},
      ${e[6]}, ${e[7]}, ${e[8]}
    )`;
  }
}
