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

  static fromArray(array: number[], offset = 0): Mat3 {
    return new Mat3(
      array[offset], array[offset + 1], array[offset + 2],
      array[offset + 3], array[offset + 4], array[offset + 5],
      array[offset + 6], array[offset + 7], array[offset + 8]
    );
  }

  static rotation(angle: number): Mat3 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Mat3(
      c, -s, 0,
      s, c, 0,
      0, 0, 1
    );
  }

  static scaling(x: number, y: number): Mat3 {
    return new Mat3(
      x, 0, 0,
      0, y, 0,
      0, 0, 1
    );
  }

  static translation(x: number, y: number): Mat3 {
    return new Mat3(
      1, 0, x,
      0, 1, y,
      0, 0, 1
    );
  }

  clone(): Mat3 {
    const e = this.elements;
    return new Mat3(
      e[0], e[1], e[2],
      e[3], e[4], e[5],
      e[6], e[7], e[8]
    );
  }

  copy(m: Mat3): Mat3 {
    this.elements.set(m.elements);
    return this;
  }

  equals(m: Mat3, epsilon = 1e-6): boolean {
    const a = this.elements;
    const b = m.elements;
    return (
      Math.abs(a[0] - b[0]) < epsilon &&
      Math.abs(a[1] - b[1]) < epsilon &&
      Math.abs(a[2] - b[2]) < epsilon &&
      Math.abs(a[3] - b[3]) < epsilon &&
      Math.abs(a[4] - b[4]) < epsilon &&
      Math.abs(a[5] - b[5]) < epsilon &&
      Math.abs(a[6] - b[6]) < epsilon &&
      Math.abs(a[7] - b[7]) < epsilon &&
      Math.abs(a[8] - b[8]) < epsilon
    );
  }

  determinant(): number {
    const e = this.elements;
    return (
      e[0] * (e[4] * e[8] - e[5] * e[7]) -
      e[1] * (e[3] * e[8] - e[5] * e[6]) +
      e[2] * (e[3] * e[7] - e[4] * e[6])
    );
  }

  invert(): Mat3 {
    const e = this.elements;
    const det = this.determinant();
    if (Math.abs(det) < 1e-12) {
      return this;
    }
    const invDet = 1 / det;

    const m00 = e[4] * e[8] - e[5] * e[7];
    const m01 = e[2] * e[7] - e[1] * e[8];
    const m02 = e[1] * e[5] - e[2] * e[4];

    const m10 = e[5] * e[6] - e[3] * e[8];
    const m11 = e[0] * e[8] - e[2] * e[6];
    const m12 = e[2] * e[3] - e[0] * e[5];

    const m20 = e[3] * e[7] - e[4] * e[6];
    const m21 = e[1] * e[6] - e[0] * e[7];
    const m22 = e[0] * e[4] - e[1] * e[3];

    e[0] = m00 * invDet;
    e[1] = m01 * invDet;
    e[2] = m02 * invDet;
    e[3] = m10 * invDet;
    e[4] = m11 * invDet;
    e[5] = m12 * invDet;
    e[6] = m20 * invDet;
    e[7] = m21 * invDet;
    e[8] = m22 * invDet;

    return this;
  }

  multiply(m: Mat3): Mat3 {
    const a = this.elements;
    const b = m.elements;
    const a00 = a[0], a01 = a[1], a02 = a[2];
    const a10 = a[3], a11 = a[4], a12 = a[5];
    const a20 = a[6], a21 = a[7], a22 = a[8];

    const b00 = b[0], b01 = b[1], b02 = b[2];
    const b10 = b[3], b11 = b[4], b12 = b[5];
    const b20 = b[6], b21 = b[7], b22 = b[8];

    a[0] = a00 * b00 + a01 * b10 + a02 * b20;
    a[1] = a00 * b01 + a01 * b11 + a02 * b21;
    a[2] = a00 * b02 + a01 * b12 + a02 * b22;

    a[3] = a10 * b00 + a11 * b10 + a12 * b20;
    a[4] = a10 * b01 + a11 * b11 + a12 * b21;
    a[5] = a10 * b02 + a11 * b12 + a12 * b22;

    a[6] = a20 * b00 + a21 * b10 + a22 * b20;
    a[7] = a20 * b01 + a21 * b11 + a22 * b21;
    a[8] = a20 * b02 + a21 * b12 + a22 * b22;

    return this;
  }

  multiplyScalar(s: number): Mat3 {
    const e = this.elements;
    e[0] *= s; e[1] *= s; e[2] *= s;
    e[3] *= s; e[4] *= s; e[5] *= s;
    e[6] *= s; e[7] *= s; e[8] *= s;
    return this;
  }

  rotate(angle: number): Mat3 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const e = this.elements;

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

  scale(x: number, y: number): Mat3 {
    const e = this.elements;
    e[0] *= x; e[1] *= x; e[2] *= x;
    e[3] *= y; e[4] *= y; e[5] *= y;
    return this;
  }

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

  setIdentity(): Mat3 {
    const e = this.elements;
    e[0] = 1; e[1] = 0; e[2] = 0;
    e[3] = 0; e[4] = 1; e[5] = 0;
    e[6] = 0; e[7] = 0; e[8] = 1;
    return this;
  }

  toArray(array: number[] = [], offset = 0): number[] {
    const e = this.elements;
    array[offset] = e[0];
    array[offset + 1] = e[1];
    array[offset + 2] = e[2];
    array[offset + 3] = e[3];
    array[offset + 4] = e[4];
    array[offset + 5] = e[5];
    array[offset + 6] = e[6];
    array[offset + 7] = e[7];
    array[offset + 8] = e[8];
    return array;
  }

  translate(x: number, y: number): Mat3 {
    const e = this.elements;
    e[2] += x * e[0] + y * e[1];
    e[5] += x * e[3] + y * e[4];
    e[8] += x * e[6] + y * e[7];
    return this;
  }

  transpose(): Mat3 {
    const e = this.elements;
    let tmp = e[1];
    e[1] = e[3];
    e[3] = tmp;

    tmp = e[2];
    e[2] = e[6];
    e[6] = tmp;

    tmp = e[5];
    e[5] = e[7];
    e[7] = tmp;

    return this;
  }

  transformVector2(v: Vec2): Vec2 {
    const e = this.elements;
    const x = v.x, y = v.y;
    const w = 1 / (e[6] * x + e[7] * y + e[8]);
    return new Vec2(
      (e[0] * x + e[1] * y + e[2]) * w,
      (e[3] * x + e[4] * y + e[5]) * w
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
}
