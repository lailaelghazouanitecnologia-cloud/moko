import { Vec3 } from './vec3';

export class Vec3 {
  private data: Float32Array;

  constructor(x = 0, y = 0, z = 0) {
    this.data = new Float32Array(3);
    this.data[0] = x;
    this.data[1] = y;
    this.data[2] = z;
  }

  get x(): number {
    return this.data[0];
  }

  set x(value: number) {
    this.data[0] = value;
  }

  get y(): number {
    return this.data[1];
  }

  set y(value: number) {
    this.data[1] = value;
  }

  get z(): number {
    return this.data[2];
  }

  set z(value: number) {
    this.data[2] = value;
  }

  add(v: Vec3): Vec3 {
    this.data[0] += v.data[0];
    this.data[1] += v.data[1];
    this.data[2] += v.data[2];
    return this;
  }

  sub(v: Vec3): Vec3 {
    this.data[0] -= v.data[0];
    this.data[1] -= v.data[1];
    this.data[2] -= v.data[2];
    return this;
  }

  mul(v: Vec3): Vec3 {
    this.data[0] *= v.data[0];
    this.data[1] *= v.data[1];
    this.data[2] *= v.data[2];
    return this;
  }

  mulScalar(s: number): Vec3 {
    this.data[0] *= s;
    this.data[1] *= s;
    this.data[2] *= s;
    return this;
  }

  div(v: Vec3): Vec3 {
    this.data[0] /= v.data[0];
    this.data[1] /= v.data[1];
    this.data[2] /= v.data[2];
    return this;
  }

  dot(v: Vec3): number {
    return this.data[0] * v.data[0] + this.data[1] * v.data[1] + this.data[2] * v.data[2];
  }

  cross(v: Vec3): Vec3 {
    const x = this.data[1] * v.data[2] - this.data[2] * v.data[1];
    const y = this.data[2] * v.data[0] - this.data[0] * v.data[2];
    const z = this.data[0] * v.data[1] - this.data[1] * v.data[0];
    this.data[0] = x;
    this.data[1] = y;
    this.data[2] = z;
    return this;
  }

  normalize(): Vec3 {
    const len = this.length();
    if (len > 0) {
      const invLen = 1 / len;
      this.data[0] *= invLen;
      this.data[1] *= invLen;
      this.data[2] *= invLen;
    }
    return this;
  }

  length(): number {
    const x = this.data[0];
    const y = this.data[1];
    const z = this.data[2];
    return Math.sqrt(x * x + y * y + z * z);
  }

  lengthSq(): number {
    const x = this.data[0];
    const y = this.data[1];
    const z = this.data[2];
    return x * x + y * y + z * z;
  }

  lerp(v: Vec3, t: number): Vec3 {
    const x = this.data[0];
    const y = this.data[1];
    const z = this.data[2];
    this.data[0] = x + (v.data[0] - x) * t;
    this.data[1] = y + (v.data[1] - y) * t;
    this.data[2] = z + (v.data[2] - z) * t;
    return this;
  }

  distance(v: Vec3): number {
    const dx = this.data[0] - v.data[0];
    const dy = this.data[1] - v.data[1];
    const dz = this.data[2] - v.data[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  min(v: Vec3): Vec3 {
    this.data[0] = Math.min(this.data[0], v.data[0]);
    this.data[1] = Math.min(this.data[1], v.data[1]);
    this.data[2] = Math.min(this.data[2], v.data[2]);
    return this;
  }

  max(v: Vec3): Vec3 {
    this.data[0] = Math.max(this.data[0], v.data[0]);
    this.data[1] = Math.max(this.data[1], v.data[1]);
    this.data[2] = Math.max(this.data[2], v.data[2]);
    return this;
  }

  floor(): Vec3 {
    this.data[0] = Math.floor(this.data[0]);
    this.data[1] = Math.floor(this.data[1]);
    this.data[2] = Math.floor(this.data[2]);
    return this;
  }

  ceil(): Vec3 {
    this.data[0] = Math.ceil(this.data[0]);
    this.data[1] = Math.ceil(this.data[1]);
    this.data[2] = Math.ceil(this.data[2]);
    return this;
  }

  round(): Vec3 {
    this.data[0] = Math.round(this.data[0]);
    this.data[1] = Math.round(this.data[1]);
    this.data[2] = Math.round(this.data[2]);
    return this;
  }

  equals(v: Vec3): boolean {
    return this.data[0] === v.data[0] && this.data[1] === v.data[1] && this.data[2] === v.data[2];
  }

  clone(): Vec3 {
    return new Vec3(this.data[0], this.data[1], this.data[2]);
  }

  copy(v: Vec3): Vec3 {
    this.data[0] = v.data[0];
    this.data[1] = v.data[1];
    this.data[2] = v.data[2];
    return this;
  }

  set(x: number, y: number, z: number): Vec3 {
    this.data[0] = x;
    this.data[1] = y;
    this.data[2] = z;
    return this;
  }

  toString(): string {
    return `(${this.data[0]}, ${this.data[1]}, ${this.data[2]})`;
  }

  static ZERO = new Vec3(0, 0, 0);
  static ONE = new Vec3(1, 1, 1);
  static UP = new Vec3(0, 1, 0);
  static DOWN = new Vec3(0, -1, 0);
  static LEFT = new Vec3(-1, 0, 0);
  static RIGHT = new Vec3(1, 0, 0);
  static FORWARD = new Vec3(0, 0, 1);
  static BACK = new Vec3(0, 0, -1);
}
