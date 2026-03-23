import { Vec3 } from './vec3';

export class Mat4 {
  data = new Float32Array(16);

  constructor() {
    this.setIdentity();
  }

  setIdentity(): Mat4 {
    const d = this.data;
    d[0] = 1; d[1] = 0; d[2] = 0; d[3] = 0;
    d[4] = 0; d[5] = 1; d[6] = 0; d[7] = 0;
    d[8] = 0; d[9] = 0; d[10] = 1; d[11] = 0;
    d[12] = 0; d[13] = 0; d[14] = 0; d[15] = 1;
    return this;
  }

  identity(): Mat4 {
    return this.setIdentity();
  }

  perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    const d = this.data;
    d[0] = f / aspect; d[1] = 0; d[2] = 0; d[3] = 0;
    d[4] = 0; d[5] = f; d[6] = 0; d[7] = 0;
    d[8] = 0; d[9] = 0; d[10] = (far + near) * nf; d[11] = -1;
    d[12] = 0; d[13] = 0; d[14] = 2 * far * near * nf; d[15] = 0;
    return this;
  }

  lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
    const z = target.sub(eye).normalize();
    const x = z.cross(up).normalize();
    const y = x.cross(z);
    const d = this.data;
    d[0] = x.x; d[1] = x.y; d[2] = x.z; d[3] = 0;
    d[4] = y.x; d[5] = y.y; d[6] = y.z; d[7] = 0;
    d[8] = -z.x; d[9] = -z.y; d[10] = -z.z; d[11] = 0;
    d[12] = -x.dot(eye); d[13] = -y.dot(eye); d[14] = z.dot(eye); d[15] = 1;
    return this;
  }

  mul(rhs: Mat4): Mat4 {
    const a = this.data;
    const b = rhs.data;
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

  // Static factory methods for Transform usage
  static translation(x: number, y: number, z: number): Mat4 {
    const m = new Mat4();
    m.data[12] = x;
    m.data[13] = y;
    m.data[14] = z;
    return m;
  }

  static euler(rx: number, ry: number, rz: number): Mat4 {
    const m = new Mat4();
    const cx = Math.cos(rx * Math.PI / 180);
    const sx = Math.sin(rx * Math.PI / 180);
    const cy = Math.cos(ry * Math.PI / 180);
    const sy = Math.sin(ry * Math.PI / 180);
    const cz = Math.cos(rz * Math.PI / 180);
    const sz = Math.sin(rz * Math.PI / 180);
    const d = m.data;
    d[0] = cy * cz; d[1] = cy * sz; d[2] = -sy;
    d[4] = sx * sy * cz - cx * sz; d[5] = sx * sy * sz + cx * cz; d[6] = sx * cy;
    d[8] = cx * sy * cz + sx * sz; d[9] = cx * sy * sz - sx * cz; d[10] = cx * cy;
    return m;
  }

  static scale(x: number, y: number, z: number): Mat4 {
    const m = new Mat4();
    m.data[0] = x;
    m.data[5] = y;
    m.data[10] = z;
    return m;
  }

  static mul(a: Mat4, b: Mat4, out: Mat4): Mat4 {
    const ad = a.data;
    const bd = b.data;
    const od = out.data;
    const tmp = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        tmp[i * 4 + j] =
          ad[i * 4 + 0] * bd[0 * 4 + j] +
          ad[i * 4 + 1] * bd[1 * 4 + j] +
          ad[i * 4 + 2] * bd[2 * 4 + j] +
          ad[i * 4 + 3] * bd[3 * 4 + j];
      }
    }
    od.set(tmp);
    return out;
  }

  static perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
    return new Mat4().perspective(fovy, aspect, near, far);
  }

  static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
    return new Mat4().lookAt(eye, target, up);
  }
}
