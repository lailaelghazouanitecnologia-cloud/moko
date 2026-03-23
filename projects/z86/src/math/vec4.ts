import { Vec3 } from './vec3';
import { Mat4 } from './mat4';
import { Quat } from './quat';
import { Color } from './color';

export class Vec4 {
  public x: number;
  public y: number;
  public z: number;
  public w: number;

  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  public get components(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w];
  }

  public set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  public copy(v: Vec4): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    this.w = v.w;
    return this;
  }

  public clone(): Vec4 {
    return new Vec4(this.x, this.y, this.z, this.w);
  }

  public add(v: Vec4): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    this.w += v.w;
    return this;
  }

  public static add(a: Vec4, b: Vec4): Vec4 {
    return new Vec4(a.x + b.x, a.y + b.y, a.z + b.z, a.w + b.w);
  }

  public sub(v: Vec4): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    this.w -= v.w;
    return this;
  }

  public static sub(a: Vec4, b: Vec4): Vec4 {
    return new Vec4(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w);
  }

  public scale(s: number): this {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    this.w *= s;
    return this;
  }

  public static scale(v: Vec4, s: number): Vec4 {
    return new Vec4(v.x * s, v.y * s, v.z * s, v.w * s);
  }

  public dot(v: Vec4): number {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
  }

  public length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }

  public lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }

  public normalize(): this {
    const len = this.length();
    if (len > 0) {
      this.scale(1 / len);
    }
    return this;
  }

  public normalized(): Vec4 {
    const len = this.length();
    if (len > 0) {
      return new Vec4(this.x / len, this.y / len, this.z / len, this.w / len);
    }
    return this.clone();
  }

  public distance(v: Vec4): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    const dw = this.w - v.w;
    return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
  }

  public distanceSq(v: Vec4): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    const dw = this.w - v.w;
    return dx * dx + dy * dy + dz * dz + dw * dw;
  }

  public equals(v: Vec4): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
  }

  public exactEquals(v: Vec4): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
  }

  public lerp(v: Vec4, t: number): this {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    this.w += (v.w - this.w) * t;
    return this;
  }

  public static lerp(a: Vec4, b: Vec4, t: number): Vec4 {
    return new Vec4(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t,
      a.w + (b.w - a.w) * t
    );
  }

  public negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    this.w = -this.w;
    return this;
  }

  public negated(): Vec4 {
    return new Vec4(-this.x, -this.y, -this.z, -this.w);
  }

  public toString(): string {
    return `Vec4(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
  }

  public toArray(): number[] {
    return [this.x, this.y, this.z, this.w];
  }

  public fromArray(arr: number[], offset: number = 0): this {
    this.x = arr[offset];
    this.y = arr[offset + 1];
    this.z = arr[offset + 2];
    this.w = arr[offset + 3];
    return this;
  }

  public static fromVec3(v: Vec3, w: number = 0): Vec4 {
    return new Vec4(v.x, v.y, v.z, w);
  }

  public toVec3(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  public static zero(): Vec4 {
    return new Vec4(0, 0, 0, 0);
  }

  public static one(): Vec4 {
    return new Vec4(1, 1, 1, 1);
  }

  public static up(): Vec4 {
    return new Vec4(0, 1, 0, 0);
  }

  public static right(): Vec4 {
    return new Vec4(1, 0, 0, 0);
  }

  public static forward(): Vec4 {
    return new Vec4(0, 0, 1, 0);
  }

  public static fromColor(c: Color): Vec4 {
    return new Vec4(c.r, c.g, c.b, c.a);
  }

  public toColor(): Color {
    return new Color(this.x, this.y, this.z, this.w);
  }
}
