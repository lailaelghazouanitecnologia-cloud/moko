import { Vec2 } from './vec2';
import { Vec3 } from './vec3';

export class Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x = 0, y = 0, z = 0, w = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  clone(): Vec4 {
    return new Vec4(this.x, this.y, this.z, this.w);
  }

  copy(v: Vec4): Vec4 {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    this.w = v.w;
    return this;
  }

  set(x: number, y: number, z: number, w: number): Vec4 {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  getX(): number {
    return this.x;
  }

  setX(x: number): Vec4 {
    this.x = x;
    return this;
  }

  getY(): number {
    return this.y;
  }

  setY(y: number): Vec4 {
    this.y = y;
    return this;
  }

  getZ(): number {
    return this.z;
  }

  setZ(z: number): Vec4 {
    this.z = z;
    return this;
  }

  getW(): number {
    return this.w;
  }

  setW(w: number): Vec4 {
    this.w = w;
    return this;
  }
}
