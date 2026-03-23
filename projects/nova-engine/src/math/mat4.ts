import { Vec3 } from './vec3';
import { Quat } from './quat';

export class Mat4 {
  data: Float32Array;

  constructor() {
    this.data = new Float32Array(16);
    this.setIdentity();
  }

  set(m11: number, m12: number, m13: number, m14: number,
      m21: number, m22: number, m23: number, m24: number,
      m31: number, m32: number, m33: number, m34: number,
      m41: number, m42: number, m43: number, m44: number): Mat4 {
    const d = this.data;
    d[0] = m11; d[1] = m21; d[2] = m31; d[3] = m41;
    d[4] = m12; d[5] = m22; d[6] = m32; d[7] = m42;
    d[8] = m13; d[9] = m23; d[10] = m33; d[11] = m43;
    d[12] = m14; d[13] = m24; d[14] = m34; d[15] = m44;
    return this;
  }

  clone(): Mat4 {
    const m = new Mat4();
    m.data.set(this.data);
    return m;
  }

  copy(m: Mat4): Mat4 {
    this.data.set(m.data);
    return this;
  }

  get(row: number, col: number): number {
    return this.data[col * 4 + row];
  }

  setIdentity(): Mat4 {
    const d = this.data;
    d[0] = 1; d[1] = 0; d[2] = 0; d[3] = 0;
    d[4] = 0; d[5] = 1; d[6] = 0; d[7] = 0;
    d[8] = 0; d[9] = 0; d[10] = 1; d[11] = 0;
    d[12] = 0; d[13] = 0; d[14] = 0; d[15] = 1;
    return this;
  }

  mul(m: Mat4): Mat4 {
    const a = this.data;
    const b = m.data;
    const out = new Float32Array(16);

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        out[i * 4 + j] =
          a[i * 4 + 0] * b[0 * 4 + j] +
          a[i * 4 + 1] * b[1 * 4 + j] +
          a[i * 4 + 2] * b[2 * 4 + j] +
          a[i * 4 + 3] * b[3 * 4 + j];
      }
    }
    this.data.set(out);
    return this;
  }

  translate(v: Vec3): Mat4 {
    const t = Mat4.identity().set(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      v.x, v.y, v.z, 1
    );
    return this.mul(t);
  }

  rotate(angle: number, axis: Vec3): Mat4 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    const x = axis.x;
    const y = axis.y;
    const z = axis.z;
    const tx = t * x;
    const ty = t * y;
    const tz = t * z;
    const sx = s * x;
    const sy = s * y;
    const sz = s * z;

    const r = Mat4.identity().set(
      tx * x + c, tx * y - sz, tx * z + sy, 0,
      tx * y + sz, ty * y + c, ty * z - sx, 0,
      tx * z - sy, ty * z + sx, tz * z + c, 0,
      0, 0, 0, 1
    );
    return this.mul(r);
  }

  scale(v: Vec3): Mat4 {
    const s = Mat4.identity().set(
      v.x, 0, 0, 0,
      0, v.y, 0, 0,
      0, 0, v.z, 0,
      0, 0, 0, 1
    );
    return this.mul(s);
  }

  invert(): Mat4 {
    const m = this.data;
    const out = new Float32Array(16);

    const b00 = m[0] * m[5] - m[1] * m[4];
    const b01 = m[0] * m[6] - m[2] * m[4];
    const b02 = m[0] * m[7] - m[3] * m[4];
    const b03 = m[1] * m[6] - m[2] * m[5];
    const b04 = m[1] * m[7] - m[3] * m[5];
    const b05 = m[2] * m[7] - m[3] * m[6];
    const b06 = m[8] * m[13] - m[9] * m[12];
    const b07 = m[8] * m[14] - m[10] * m[12];
    const b08 = m[8] * m[15] - m[11] * m[12];
    const b09 = m[9] * m[14] - m[10] * m[13];
    const b10 = m[9] * m[15] - m[11] * m[13];
    const b11 = m[10] * m[15] - m[11] * m[14];

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return this.setIdentity();

    det = 1 / det;

    out[0] = (m[5] * b11 - m[6] * b10 + m[7] * b09) * det;
    out[1] = (m[2] * b10 - m[1] * b11 - m[3] * b09) * det;
    out[2] = (m[13] * b05 - m[14] * b04 + m[15] * b03) * det;
    out[3] = (m[10] * b04 - m[9] * b05 - m[11] * b03) * det;
    out[4] = (m[6] * b08 - m[4] * b11 - m[7] * b07) * det;
    out[5] = (m[0] * b11 - m[2] * b08 + m[3] * b07) * det;
    out[6] = (m[14] * b02 - m[12] * b05 - m[15] * b01) * det;
    out[7] = (m[8] * b05 - m[10] * b02 + m[11] * b01) * det;
    out[8] = (m[4] * b10 - m[5] * b08 + m[7] * b06) * det;
    out[9] = (m[1] * b08 - m[0] * b10 - m[3] * b06) * det;
    out[10] = (m[12] * b04 - m[13] * b02 + m[15] * b00) * det;
    out[11] = (m[9] * b02 - m[8] * b04 - m[11] * b00) * det;
    out[12] = (m[5] * b07 - m[4] * b09 - m[6] * b06) * det;
    out[13] = (m[0] * b09 - m[1] * b07 + m[2] * b06) * det;
    out[14] = (m[13] * b01 - m[12] * b03 - m[14] * b00) * det;
    out[15] = (m[8] * b03 - m[9] * b01 + m[10] * b00) * det;

    this.data.set(out);
    return this;
  }

  transpose(): Mat4 {
    const m = this.data;
    const out = new Float32Array(16);
    out[0] = m[0]; out[1] = m[4]; out[2] = m[8]; out[3] = m[12];
    out[4] = m[1]; out[5] = m[5]; out[6] = m[9]; out[7] = m[13];
    out[8] = m[2]; out[9] = m[6]; out[10] = m[10]; out[11] = m[14];
    out[12] = m[3]; out[13] = m[7]; out[14] = m[11]; out[15] = m[15];
    this.data.set(out);
    return this;
  }

  setTRS(t: Vec3, r: Quat, s: Vec3): Mat4 {
    const x2 = r.x + r.x;
    const y2 = r.y + r.y;
    const z2 = r.z + r.z;
    const xx = r.x * x2;
    const xy = r.x * y2;
    const xz = r.x * z2;
    const yy = r.y * y2;
    const yz = r.y * z2;
    const zz = r.z * z2;
    const wx = r.w * x2;
    const wy = r.w * y2;
    const wz = r.w * z2;

    this.set(
      (1 - (yy + zz)) * s.x, (xy + wz) * s.x, (xz - wy) * s.x, 0,
      (xy - wz) * s.y, (1 - (xx + zz)) * s.y, (yz + wx) * s.y, 0,
      (xz + wy) * s.z, (yz - wx) * s.z, (1 - (xx + yy)) * s.z, 0,
      t.x, t.y, t.z, 1
    );
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
      x = Math.atan2(m[6], m[10]);
      y = Math.atan2(-m[2], sy);
      z = Math.atan2(m[1], m[0]);
    } else {
      x = Math.atan2(-m[9], m[5]);
      y = Math.atan2(-m[2], sy);
      z = 0;
    }
    return new Vec3(x, y, z);
  }

  toString(): string {
    const d = this.data;
    return `[${d[0]}, ${d[4]}, ${d[8]}, ${d[12]},
 ${d[1]}, ${d[5]}, ${d[9]}, ${d[13]},
 ${d[2]}, ${d[6]}, ${d[10]}, ${d[14]},
 ${d[3]}, ${d[7]}, ${d[11]}, ${d[15]}]`;
  }

  static identity(): Mat4 {
    const m = new Mat4();
    m.setIdentity();
    return m;
  }

  static perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    const m = new Mat4();
    m.set(
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    );
    return m;
  }

  static ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    const m = new Mat4();
    m.set(
      -2 * lr, 0, 0, 0,
      0, -2 * bt, 0, 0,
      0, 0, 2 * nf, 0,
      (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
    );
    return m;
  }

  static lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
    const z = eye.clone().sub(center).normalize();
    const x = up.clone().cross(z).normalize();
    const y = z.clone().cross(x);

    const m = new Mat4();
    m.set(
      x.x, x.y, x.z, 0,
      y.x, y.y, y.z, 0,
      z.x, z.y, z.z, 0,
      -x.dot(eye), -y.dot(eye), -z.dot(eye), 1
    );
    return m;
  }
}
