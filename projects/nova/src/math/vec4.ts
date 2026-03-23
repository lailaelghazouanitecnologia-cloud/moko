import { Vec2 } from './vec2';
import { Vec3 } from './vec3';

export class Vec4 {
  private _x: number;
  private _y: number;
  private _z: number;
  private _w: number;

  constructor(x = 0, y = 0, z = 0, w = 0) {
    this._x = x;
    this._y = y;
    this._z = z;
    this._w = w;
  }

  get x(): number {
    return this._x;
  }

  set x(value: number) {
    this._x = value;
  }

  get y(): number {
    return this._y;
  }

  set y(value: number) {
    this._y = value;
  }

  get z(): number {
    return this._z;
  }

  set z(value: number) {
    this._z = value;
  }

  get w(): number {
    return this._w;
  }

  set w(value: number) {
    this._w = value;
  }

  set(x: number, y: number, z: number, w: number): Vec4 {
    this._x = x;
    this._y = y;
    this._z = z;
    this._w = w;
    return this;
  }

  clone(): Vec4 {
    return new Vec4(this._x, this._y, this._z, this._w);
  }

  copy(v: Vec4): Vec4 {
    this._x = v.x;
    this._y = v.y;
    this._z = v.z;
    this._w = v.w;
    return this;
  }

  equals(v: Vec4): boolean {
    return this._x === v.x && this._y === v.y && this._z === v.z && this._w === v.w;
  }

  add(v: Vec4): Vec4 {
    this._x += v.x;
    this._y += v.y;
    this._z += v.z;
    this._w += v.w;
    return this;
  }

  sub(v: Vec4): Vec4 {
    this._x -= v.x;
    this._y -= v.y;
    this._z -= v.z;
    this._w -= v.w;
    return this;
  }

  multiply(v: Vec4): Vec4 {
    this._x *= v.x;
    this._y *= v.y;
    this._z *= v.z;
    this._w *= v.w;
    return this;
  }

  divide(v: Vec4): Vec4 {
    this._x /= v.x;
    this._y /= v.y;
    this._z /= v.z;
    this._w /= v.w;
    return this;
  }

  scale(s: number): Vec4 {
    this._x *= s;
    this._y *= s;
    this._z *= s;
    this._w *= s;
    return this;
  }

  dot(v: Vec4): number {
    return this._x * v.x + this._y * v.y + this._z * v.z + this._w * v.w;
  }

  length(): number {
    return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
  }

  lengthSq(): number {
    return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
  }

  normalize(): Vec4 {
    const len = this.length();
    if (len > 0) {
      this.scale(1 / len);
    }
    return this;
  }

  distance(v: Vec4): number {
    const dx = this._x - v.x;
    const dy = this._y - v.y;
    const dz = this._z - v.z;
    const dw = this._w - v.w;
    return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
  }

  distanceSq(v: Vec4): number {
    const dx = this._x - v.x;
    const dy = this._y - v.y;
    const dz = this._z - v.z;
    const dw = this._w - v.w;
    return dx * dx + dy * dy + dz * dz + dw * dw;
  }

  negate(): Vec4 {
    this._x = -this._x;
    this._y = -this._y;
    this._z = -this._z;
    this._w = -this._w;
    return this;
  }

  lerp(v: Vec4, t: number): Vec4 {
    this._x += (v.x - this._x) * t;
    this._y += (v.y - this._y) * t;
    this._z += (v.z - this._z) * t;
    this._w += (v.w - this._w) * t;
    return this;
  }

  static add(a: Vec4, b: Vec4): Vec4 {
    return new Vec4(a.x + b.x, a.y + b.y, a.z + b.z, a.w + b.w);
  }

  static sub(a: Vec4, b: Vec4): Vec4 {
    return new Vec4(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w);
  }

  static multiply(a: Vec4, b: Vec4): Vec4 {
    return new Vec4(a.x * b.x, a.y * b.y, a.z * b.z, a.w * b.w);
  }

  static divide(a: Vec4, b: Vec4): Vec4 {
    return new Vec4(a.x / b.x, a.y / b.y, a.z / b.z, a.w / b.w);
  }

  static scale(v: Vec4, s: number): Vec4 {
    return new Vec4(v.x * s, v.y * s, v.z * s, v.w * s);
  }

  static dot(a: Vec4, b: Vec4): number {
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  }

  static distance(a: Vec4, b: Vec4): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    const dw = a.w - b.w;
    return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
  }

  static distanceSq(a: Vec4, b: Vec4): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    const dw = a.w - b.w;
    return dx * dx + dy * dy + dz * dz + dw * dw;
  }

  static lerp(a: Vec4, b: Vec4, t: number): Vec4 {
    return new Vec4(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t,
      a.w + (b.w - a.w) * t
    );
  }

  static min(a: Vec4, b: Vec4): Vec4 {
    return new Vec4(
      Math.min(a.x, b.x),
      Math.min(a.y, b.y),
      Math.min(a.z, b.z),
      Math.min(a.w, b.w)
    );
  }

  static max(a: Vec4, b: Vec4): Vec4 {
    return new Vec4(
      Math.max(a.x, b.x),
      Math.max(a.y, b.y),
      Math.max(a.z, b.z),
      Math.max(a.w, b.w)
    );
  }

  static clamp(v: Vec4, min: Vec4, max: Vec4): Vec4 {
    return new Vec4(
      Math.max(min.x, Math.min(max.x, v.x)),
      Math.max(min.y, Math.min(max.y, v.y)),
      Math.max(min.z, Math.min(max.z, v.z)),
      Math.max(min.w, Math.min(max.w, v.w))
    );
  }

  static fromVec2(v: Vec2, z = 0, w = 0): Vec4 {
    return new Vec4(v.x, v.y, z, w);
  }

  static fromVec3(v: Vec3, w = 0): Vec4 {
    return new Vec4(v.x, v.y, v.z, w);
  }

  toArray(): number[] {
    return [this._x, this._y, this._z, this._w];
  }

  fromArray(array: number[], offset = 0): Vec4 {
    this._x = array[offset];
    this._y = array[offset + 1];
    this._z = array[offset + 2];
    this._w = array[offset + 3];
    return this;
  }

  toString(): string {
    return `Vec4(${this._x}, ${this._y}, ${this._z}, ${this._w})`;
  }
}
