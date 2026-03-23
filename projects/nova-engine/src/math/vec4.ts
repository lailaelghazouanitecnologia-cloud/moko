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

  set(x: number, y: number, z: number, w: number): Vec4 {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
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

  toArray(out?: number[]): number[] {
    const arr = out || [];
    arr[0] = this.x;
    arr[1] = this.y;
    arr[2] = this.z;
    arr[3] = this.w;
    return arr;
  }

  fromArray(arr: number[]): Vec4 {
    this.x = arr[0] || 0;
    this.y = arr[1] || 0;
    this.z = arr[2] || 0;
    this.w = arr[3] || 0;
    return this;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }

  max(v: Vec4): Vec4 {
    this.x = Math.max(this.x, v.x);
    this.y = Math.max(this.y, v.y);
    this.z = Math.max(this.z, v.z);
    this.w = Math.max(this.w, v.w);
    return this;
  }

  min(v: Vec4): Vec4 {
    this.x = Math.min(this.x, v.x);
    this.y = Math.min(this.y, v.y);
    this.z = Math.min(this.z, v.z);
    this.w = Math.min(this.w, v.w);
    return this;
  }

  add(v: Vec4): Vec4 {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    this.w += v.w;
    return this;
  }

  sub(v: Vec4): Vec4 {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    this.w -= v.w;
    return this;
  }

  mul(v: Vec4): Vec4 {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    this.w *= v.w;
    return this;
  }

  mulScl(s: number): Vec4 {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    this.w *= s;
    return this;
  }

  dot(v: Vec4): number {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
  }

  cross(v: Vec4): Vec4 {
    const ax = this.x, ay = this.y, az = this.z;
    const bx = v.x, by = v.y, bz = v.z;
    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    this.w = 0;
    return this;
  }

  nor(): Vec4 {
    const len = this.length();
    if (len > 0) {
      const inv = 1 / len;
      this.x *= inv;
      this.y *= inv;
      this.z *= inv;
      this.w *= inv;
    }
    return this;
  }

  equals(v: Vec4, eps = 1e-6): boolean {
    return Math.abs(this.x - v.x) < eps &&
           Math.abs(this.y - v.y) < eps &&
           Math.abs(this.z - v.z) < eps &&
           Math.abs(this.w - v.w) < eps;
  }
}
