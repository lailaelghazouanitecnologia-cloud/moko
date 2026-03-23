import { Vec2 } from './vec2';
import { Vec3 } from './vec3';

export class Mat3 extends Float32Array {
  constructor(values?: number[]) {
    super(9);
    if (values) {
      this.set(values);
    } else {
      this.identity();
    }
  }

  static fromValues(
    m00: number, m01: number, m02: number,
    m10: number, m11: number, m12: number,
    m20: number, m21: number, m22: number
  ): Mat3 {
    return new Mat3([
      m00, m01, m02,
      m10, m11, m12,
      m20, m21, m22
    ]);
  }

  identity(): Mat3 {
    this[0] = 1; this[1] = 0; this[2] = 0;
    this[3] = 0; this[4] = 1; this[5] = 0;
    this[6] = 0; this[7] = 0; this[8] = 1;
    return this;
  }

  multiply(b: Mat3): Mat3 {
    const a00 = this[0], a01 = this[1], a02 = this[2];
    const a10 = this[3], a11 = this[4], a12 = this[5];
    const a20 = this[6], a21 = this[7], a22 = this[8];

    const b00 = b[0], b01 = b[1], b02 = b[2];
    const b10 = b[3], b11 = b[4], b12 = b[5];
    const b20 = b[6], b21 = b[7], b22 = b[8];

    this[0] = a00 * b00 + a01 * b10 + a02 * b20;
    this[1] = a00 * b01 + a01 * b11 + a02 * b21;
    this[2] = a00 * b02 + a01 * b12 + a02 * b22;

    this[3] = a10 * b00 + a11 * b10 + a12 * b20;
    this[4] = a10 * b01 + a11 * b11 + a12 * b21;
    this[5] = a10 * b02 + a11 * b12 + a12 * b22;

    this[6] = a20 * b00 + a21 * b10 + a22 * b20;
    this[7] = a20 * b01 + a21 * b11 + a22 * b21;
    this[8] = a20 * b02 + a21 * b12 + a22 * b22;

    return this;
  }

  translate(v: Vec2): Mat3 {
    const x = v[0], y = v[1];
    this[6] += x * this[0] + y * this[3];
    this[7] += x * this[1] + y * this[4];
    this[8] += x * this[2] + y * this[5];
    return this;
  }

  rotate(rad: number): Mat3 {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = this[0], a01 = this[1], a02 = this[2];
    const a10 = this[3], a11 = this[4], a12 = this[5];

    this[0] = a00 * c + a01 * s;
    this[1] = a00 * -s + a01 * c;
    this[2] = a02;

    this[3] = a10 * c + a11 * s;
    this[4] = a10 * -s + a11 * c;
    this[5] = a12;

    this[6] = this[6] * c + this[7] * s;
    this[7] = this[6] * -s + this[7] * c;
    this[8] = this[8];

    return this;
  }

  scale(v: Vec2): Mat3 {
    const x = v[0], y = v[1];
    this[0] *= x; this[1] *= x; this[2] *= x;
    this[3] *= y; this[4] *= y; this[5] *= y;
    return this;
  }

  invert(): Mat3 | null {
    const a00 = this[0], a01 = this[1], a02 = this[2];
    const a10 = this[3], a11 = this[4], a12 = this[5];
    const a20 = this[6], a21 = this[7], a22 = this[8];

    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    let det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) return null;
    det = 1.0 / det;

    this[0] = b01 * det;
    this[1] = (-a22 * a01 + a02 * a21) * det;
    this[2] = (a12 * a01 - a02 * a11) * det;
    this[3] = b11 * det;
    this[4] = (a22 * a00 - a02 * a20) * det;
    this[5] = (-a12 * a00 + a02 * a10) * det;
    this[6] = b21 * det;
    this[7] = (-a21 * a00 + a01 * a20) * det;
    this[8] = (a11 * a00 - a01 * a10) * det;

    return this;
  }

  transpose(): Mat3 {
    const a01 = this[1], a02 = this[2], a12 = this[5];
    this[1] = this[3];
    this[2] = this[6];
    this[3] = a01;
    this[5] = this[7];
    this[6] = a02;
    this[7] = a12;
    return this;
  }

  determinant(): number {
    const a00 = this[0], a01 = this[1], a02 = this[2];
    const a10 = this[3], a11 = this[4], a12 = this[5];
    const a20 = this[6], a21 = this[7], a22 = this[8];

    return a00 * (a22 * a11 - a12 * a21) +
           a01 * (-a22 * a10 + a12 * a20) +
           a02 * (a21 * a10 - a11 * a20);
  }

  clone(): Mat3 {
    return new Mat3(Array.from(this));
  }

  copy(m: Mat3): Mat3 {
    this.set(m);
    return this;
  }

  equals(m: Mat3, epsilon: number = 1e-6): boolean {
    for (let i = 0; i < 9; i++) {
      if (Math.abs(this[i] - m[i]) > epsilon) return false;
    }
    return true;
  }

  exactEquals(m: Mat3): boolean {
    for (let i = 0; i < 9; i++) {
      if (this[i] !== m[i]) return false;
    }
    return true;
  }

  set(values: number[]): Mat3 {
    for (let i = 0; i < 9 && i < values.length; i++) {
      this[i] = values[i];
    }
    return this;
  }

  getTranslation(out: Vec2 = new Vec2()): Vec2 {
    out[0] = this[6];
    out[1] = this[7];
    return out;
  }

  getScaling(out: Vec2 = new Vec2()): Vec2 {
    const m11 = this[0];
    const m12 = this[1];
    const m21 = this[3];
    const m22 = this[4];
    out[0] = Math.sqrt(m11 * m11 + m12 * m12);
    out[1] = Math.sqrt(m21 * m21 + m22 * m22);
    return out;
  }

  getRotation(): number {
    return Math.atan2(this[1], this[0]);
  }

  frob(): number {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += this[i] * this[i];
    }
    return Math.sqrt(sum);
  }

  normalFromMat4(m: Float32Array): Mat3 | null {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) return null;
    det = 1.0 / det;

    this[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    this[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    this[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    this[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    this[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    this[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    this[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    this[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    this[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

    return this;
  }

  toString(): string {
    return `Mat3(
${this[0]}, ${this[1]}, ${this[2]},
${this[3]}, ${this[4]}, ${this[5]},
${this[6]}, ${this[7]}, ${this[8]}
)`;
  }

  toArray(array: number[] = [], offset: number = 0): number[] {
    for (let i = 0; i < 9; i++) {
      array[offset + i] = this[i];
    }
    return array;
  }

  static fromArray(array: number[], offset: number = 0): Mat3 {
    const out = new Mat3();
    for (let i = 0; i < 9; i++) {
      out[i] = array[offset + i];
    }
    return out;
  }
}
