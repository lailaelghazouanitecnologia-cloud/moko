import { Vec3 } from './vec3';
import { Quat } from './quat';

export class Mat4 {
  data: Float32Array;

  constructor() {
    this.data = new Float32Array(16);
    this.setIdentity();
  }

  translate(x: number | Vec3, y?: number, z?: number): Mat4 {
    const v = x instanceof Vec3 ? x : new Vec3(x as number, y!, z!);
    const m = this.data;
    m[12] = m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12];
    m[13] = m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13];
    m[14] = m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14];
    m[15] = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15];
    return this;
  }

  rotate(angle: number, axis: Vec3): Mat4 {
    const x = axis.x;
    const y = axis.y;
    const z = axis.z;
    let len = Math.sqrt(x * x + y * y + z * z);
    if (len < 0.000001) return this;
    len = 1 / len;
    const xn = x * len;
    const yn = y * len;
    const zn = z * len;
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const t = 1 - c;
    const a00 = this.data[0];
    const a01 = this.data[1];
    const a02 = this.data[2];
    const a03 = this.data[3];
    const a10 = this.data[4];
    const a11 = this.data[5];
    const a12 = this.data[6];
    const a13 = this.data[7];
    const a20 = this.data[8];
    const a21 = this.data[9];
    const a22 = this.data[10];
    const a23 = this.data[11];
    const b00 = xn * xn * t + c;
    const b01 = yn * xn * t + zn * s;
    const b02 = zn * xn * t - yn * s;
    const b10 = xn * yn * t - zn * s;
    const b11 = yn * yn * t + c;
    const b12 = zn * yn * t + xn * s;
    const b20 = xn * zn * t + yn * s;
    const b21 = yn * zn * t - xn * s;
    const b22 = zn * zn * t + c;
    this.data[0] = a00 * b00 + a10 * b01 + a20 * b02;
    this.data[1] = a01 * b00 + a11 * b01 + a21 * b02;
    this.data[2] = a02 * b00 + a12 * b01 + a22 * b02;
    this.data[3] = a03 * b00 + a13 * b01 + a23 * b02;
    this.data[4] = a00 * b10 + a10 * b11 + a20 * b12;
    this.data[5] = a01 * b10 + a11 * b11 + a21 * b12;
    this.data[6] = a02 * b10 + a12 * b11 + a22 * b12;
    this.data[7] = a03 * b10 + a13 * b11 + a23 * b12;
    this.data[8] = a00 * b20 + a10 * b21 + a20 * b22;
    this.data[9] = a01 * b20 + a11 * b21 + a21 * b22;
    this.data[10] = a02 * b20 + a12 * b21 + a22 * b22;
    this.data[11] = a03 * b20 + a13 * b21 + a23 * b22;
    return this;
  }

  scale(x: number | Vec3, y?: number, z?: number): Mat4 {
    const v = x instanceof Vec3 ? x : new Vec3(x as number, y!, z!);
    this.data[0] *= v.x;
    this.data[1] *= v.x;
    this.data[2] *= v.x;
    this.data[3] *= v.x;
    this.data[4] *= v.y;
    this.data[5] *= v.y;
    this.data[6] *= v.y;
    this.data[7] *= v.y;
    this.data[8] *= v.z;
    this.data[9] *= v.z;
    this.data[10] *= v.z;
    this.data[11] *= v.z;
    return this;
  }

  invert(): Mat4 {
    const a = this.data;
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];
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
    if (!det) return this;
    det = 1.0 / det;
    a[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    a[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    a[2] = (a31 * b05 - a30 * b04 - a32 * b03) * det;
    a[3] = (a20 * b04 - a21 * b05 + a22 * b03) * det;
    a[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    a[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    a[6] = (a30 * b02 - a31 * b01 + a32 * b00) * det;
    a[7] = (a21 * b01 - a20 * b02 - a22 * b00) * det;
    a[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    a[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    a[10] = (a20 * b04 - a21 * b02 + a22 * b01) * det;
    a[11] = (a21 * b00 - a20 * b01 - a22 * b00) * det;
    a[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    a[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    a[14] = (a31 * b01 - a30 * b02 - a32 * b00) * det;
    a[15] = (a20 * b02 - a21 * b01 + a22 * b00) * det;
    return this;
  }

  transpose(): Mat4 {
    const m = this.data;
    const tmp = m[1];
    m[1] = m[4];
    m[4] = tmp;
    const tmp2 = m[2];
    m[2] = m[8];
    m[8] = tmp2;
    const tmp3 = m[3];
    m[3] = m[12];
    m[12] = tmp3;
    const tmp4 = m[6];
    m[6] = m[9];
    m[9] = tmp4;
    const tmp5 = m[7];
    m[7] = m[13];
    m[13] = tmp5;
    const tmp6 = m[11];
    m[11] = m[14];
    m[14] = tmp6;
    return this;
  }

  setIdentity(): Mat4 {
    const m = this.data;
    m[0] = 1;
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;
    m[4] = 0;
    m[5] = 1;
    m[6] = 0;
    m[7] = 0;
    m[8] = 0;
    m[9] = 0;
    m[10] = 1;
    m[11] = 0;
    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;
    return this;
  }

  setTRS(t: Vec3, r: Quat, s: Vec3): Mat4 {
    const x = r.x;
    const y = r.y;
    const z = r.z;
    const w = r.w;
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    const sx = s.x;
    const sy = s.y;
    const sz = s.z;
    const m = this.data;
    m[0] = (1 - (yy + zz)) * sx;
    m[1] = (xy + wz) * sx;
    m[2] = (xz - wy) * sx;
    m[3] = 0;
    m[4] = (xy - wz) * sy;
    m[5] = (1 - (xx + zz)) * sy;
    m[6] = (yz + wx) * sy;
    m[7] = 0;
    m[8] = (xz + wy) * sz;
    m[9] = (yz - wx) * sz;
    m[10] = (1 - (xx + yy)) * sz;
    m[11] = 0;
    m[12] = t.x;
    m[13] = t.y;
    m[14] = t.z;
    m[15] = 1;
    return this;
  }

  getTranslation(): Vec3 {
    return new Vec3(this.data[12], this.data[13], this.data[14]);
  }

  getScale(): Vec3 {
    const m = this.data;
    const sx = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]);
    const sy = Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6]);
    const sz = Math.sqrt(m[8] * m[8] + m[9] * m[9] + m[10] * m[10]);
    return new Vec3(sx, sy, sz);
  }

  getEulerAngles(): Vec3 {
    const m = this.data;
    const sy = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
    const singular = sy < 1e-6;
    let x, y, z;
    if (!singular) {
      x = Math.atan2(m[9], m[10]);
      y = Math.atan2(-m[8], sy);
      z = Math.atan2(m[4], m[0]);
    } else {
      x = Math.atan2(-m[6], m[5]);
      y = Math.atan2(-m[8], sy);
      z = 0;
    }
    return new Vec3(x, y, z);
  }

  perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    const m = this.data;
    m[0] = f / aspect;
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;
    m[4] = 0;
    m[5] = f;
    m[6] = 0;
    m[7] = 0;
    m[8] = 0;
    m[9] = 0;
    m[10] = (far + near) * nf;
    m[11] = -1;
    m[12] = 0;
    m[13] = 0;
    m[14] = 2 * far * near * nf;
    m[15] = 0;
    return this;
  }

  ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    const m = this.data;
    m[0] = -2 * lr;
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;
    m[4] = 0;
    m[5] = -2 * bt;
    m[6] = 0;
    m[7] = 0;
    m[8] = 0;
    m[9] = 0;
    m[10] = 2 * nf;
    m[11] = 0;
    m[12] = (left + right) * lr;
    m[13] = (top + bottom) * bt;
    m[14] = (far + near) * nf;
    m[15] = 1;
    return this;
  }

  mul(rhs: Mat4): Mat4 {
    const a = this.data;
    const b = rhs.data;
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];
    let b0 = b[0];
    let b1 = b[1];
    let b2 = b[2];
    let b3 = b[3];
    a[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    a[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    a[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    a[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    a[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    a[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    a[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    a[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    a[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    a[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    a[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    a[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    a[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    a[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    a[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    a[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return this;
  }

  static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
    const zAxis = new Vec3().sub2(eye, target).normalize();
    const xAxis = new Vec3().cross(up, zAxis).normalize();
    const yAxis = new Vec3().cross(zAxis, xAxis);
    const m = new Mat4();
    const d = m.data;
    d[0] = xAxis.x;
    d[1] = xAxis.y;
    d[2] = xAxis.z;
    d[3] = 0;
    d[4] = yAxis.x;
    d[5] = yAxis.y;
    d[6] = yAxis.z;
    d[7] = 0;
    d[8] = zAxis.x;
    d[9] = zAxis.y;
    d[10] = zAxis.z;
    d[11] = 0;
    d[12] = eye.x;
    d[13] = eye.y;
    d[14] = eye.z;
    d[15] = 1;
    return m;
  }
}
