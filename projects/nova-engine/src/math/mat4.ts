import { Vec3 } from './vec3';
import { Vec4 } from './vec4';
import { Quat } from './quat';

export class Mat4 {
    data: Float32Array;

    constructor() {
        this.data = new Float32Array(16);
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
                out[j * 4 + i] =
                    a[0 * 4 + i] * b[j * 4 + 0] +
                    a[1 * 4 + i] * b[j * 4 + 1] +
                    a[2 * 4 + i] * b[j * 4 + 2] +
                    a[3 * 4 + i] * b[j * 4 + 3];
            }
        }
        this.data = out;
        return this;
    }

    translate(v: Vec3): Mat4 {
        const d = this.data;
        const x = v.x, y = v.y, z = v.z;
        d[12] += d[0] * x + d[4] * y + d[8] * z;
        d[13] += d[1] * x + d[5] * y + d[9] * z;
        d[14] += d[2] * x + d[6] * y + d[10] * z;
        d[15] += d[3] * x + d[7] * y + d[11] * z;
        return this;
    }

    rotate(angle: number, axis: Vec3): Mat4 {
        const d = this.data;
        let x = axis.x, y = axis.y, z = axis.z;
        let len = Math.sqrt(x * x + y * y + z * z);
        if (len < 0.000001) return this;
        len = 1 / len;
        x *= len; y *= len; z *= len;

        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const t = 1 - c;

        const a00 = d[0], a01 = d[1], a02 = d[2], a03 = d[3];
        const a10 = d[4], a11 = d[5], a12 = d[6], a13 = d[7];
        const a20 = d[8], a21 = d[9], a22 = d[10], a23 = d[11];

        const b00 = x * x * t + c, b01 = y * x * t + z * s, b02 = z * x * t - y * s;
        const b10 = x * y * t - z * s, b11 = y * y * t + c, b12 = z * y * t + x * s;
        const b20 = x * z * t + y * s, b21 = y * z * t - x * s, b22 = z * z * t + c;

        d[0] = a00 * b00 + a10 * b01 + a20 * b02;
        d[1] = a01 * b00 + a11 * b01 + a21 * b02;
        d[2] = a02 * b00 + a12 * b01 + a22 * b02;
        d[3] = a03 * b00 + a13 * b01 + a23 * b02;
        d[4] = a00 * b10 + a10 * b11 + a20 * b12;
        d[5] = a01 * b10 + a11 * b11 + a21 * b12;
        d[6] = a02 * b10 + a12 * b11 + a22 * b12;
        d[7] = a03 * b10 + a13 * b11 + a23 * b12;
        d[8] = a00 * b20 + a10 * b21 + a20 * b22;
        d[9] = a01 * b20 + a11 * b21 + a21 * b22;
        d[10] = a02 * b20 + a12 * b21 + a22 * b22;
        d[11] = a03 * b20 + a13 * b21 + a23 * b22;
        return this;
    }

    scale(v: Vec3): Mat4 {
        const d = this.data;
        const x = v.x, y = v.y, z = v.z;
        d[0] *= x; d[1] *= x; d[2] *= x; d[3] *= x;
        d[4] *= y; d[5] *= y; d[6] *= y; d[7] *= y;
        d[8] *= z; d[9] *= z; d[10] *= z; d[11] *= z;
        return this;
    }

    invert(): Mat4 {
        const d = this.data;
        const a00 = d[0], a01 = d[1], a02 = d[2], a03 = d[3];
        const a10 = d[4], a11 = d[5], a12 = d[6], a13 = d[7];
        const a20 = d[8], a21 = d[9], a22 = d[10], a23 = d[11];
        const a30 = d[12], a31 = d[13], a32 = d[14], a33 = d[15];

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

        d[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        d[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        d[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        d[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        d[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        d[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        d[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        d[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        d[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        d[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        d[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        d[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        d[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        d[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        d[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        d[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
        return this;
    }

    transpose(): Mat4 {
        const d = this.data;
        let tmp;
        tmp = d[1]; d[1] = d[4]; d[4] = tmp;
        tmp = d[2]; d[2] = d[8]; d[8] = tmp;
        tmp = d[3]; d[3] = d[12]; d[12] = tmp;
        tmp = d[6]; d[6] = d[9]; d[9] = tmp;
        tmp = d[7]; d[7] = d[13]; d[13] = tmp;
        tmp = d[11]; d[11] = d[14]; d[14] = tmp;
        return this;
    }

    setTRS(t: Vec3, r: Quat, s: Vec3): Mat4 {
        const tx = t.x, ty = t.y, tz = t.z;
        const qx = r.x, qy = r.y, qz = r.z, qw = r.w;
        const sx = s.x, sy = s.y, sz = s.z;

        const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
        const xx = qx * x2, xy = qx * y2, xz = qx * z2;
        const yy = qy * y2, yz = qy * z2, zz = qz * z2;
        const wx = qw * x2, wy = qw * y2, wz = qw * z2;

        const d = this.data;
        d[0] = (1 - (yy + zz)) * sx;
        d[1] = (xy + wz) * sx;
        d[2] = (xz - wy) * sx;
        d[3] = 0;
        d[4] = (xy - wz) * sy;
        d[5] = (1 - (xx + zz)) * sy;
        d[6] = (yz + wx) * sy;
        d[7] = 0;
        d[8] = (xz + wy) * sz;
        d[9] = (yz - wx) * sz;
        d[10] = (1 - (xx + yy)) * sz;
        d[11] = 0;
        d[12] = tx;
        d[13] = ty;
        d[14] = tz;
        d[15] = 1;
        return this;
    }

    getTranslation(out?: Vec3): Vec3 {
        const o = out || new Vec3();
        const d = this.data;
        o.x = d[12];
        o.y = d[13];
        o.z = d[14];
        return o;
    }

    getScale(out?: Vec3): Vec3 {
        const o = out || new Vec3();
        const d = this.data;
        const sx = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
        const sy = Math.sqrt(d[4] * d[4] + d[5] * d[5] + d[6] * d[6]);
        const sz = Math.sqrt(d[8] * d[8] + d[9] * d[9] + d[10] * d[10]);
        o.x = sx;
        o.y = sy;
        o.z = sz;
        return o;
    }

    getEulerAngles(out?: Vec3): Vec3 {
        const o = out || new Vec3();
        const d = this.data;
        const m32 = d[9];
        if (m32 < 1) {
            if (m32 > -1) {
                o.x = Math.atan2(-d[6], d[10]);
                o.y = Math.asin(m32);
                o.z = Math.atan2(-d[1], d[5]);
            } else {
                o.x = 0;
                o.y = -Math.PI / 2;
                o.z = -Math.atan2(d[4], d[0]);
            }
        } else {
            o.x = 0;
            o.y = Math.PI / 2;
            o.z = Math.atan2(d[4], d[0]);
        }
        return o;
    }

    static identity(out?: Mat4): Mat4 {
        const m = out || new Mat4();
        m.setIdentity();
        return m;
    }

    static zeros(out?: Mat4): Mat4 {
        const m = out || new Mat4();
        m.data.fill(0);
        return m;
    }

    static translation(t: Vec3, out?: Mat4): Mat4 {
        const m = out || new Mat4();
        m.setIdentity();
        m.data[12] = t.x;
        m.data[13] = t.y;
        m.data[14] = t.z;
        return m;
    }

    static rotation(angle: number, axis: Vec3, out?: Mat4): Mat4 {
        const m = out || new Mat4();
        m.setIdentity();
        let x = axis.x, y = axis.y, z = axis.z;
        let len = Math.sqrt(x * x + y * y + z * z);
        if (len < 0.000001) return m;
        len = 1 / len;
        x *= len; y *= len; z *= len;

        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const t = 1 - c;

        const d = m.data;
        d[0] = x * x * t + c;
        d[1] = y * x * t + z * s;
        d[2] = z * x * t - y * s;
        d[4] = x * y * t - z * s;
        d[5] = y * y * t + c;
        d[6] = z * y * t + x * s;
        d[8] = x * z * t + y * s;
        d[9] = y * z * t - x * s;
        d[10] = z * z * t + c;
        return m;
    }

    static scale(s: Vec3, out?: Mat4): Mat4 {
        const m = out || new Mat4();
        m.setIdentity();
        m.data[0] = s.x;
        m.data[5] = s.y;
        m.data[10] = s.z;
        return m;
    }

    static mulMM(a: Mat4, b: Mat4, out?: Mat4): Mat4 {
        const m = out || new Mat4();
        const ad = a.data;
        const bd = b.data;
        const od = m.data;

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                od[j * 4 + i] =
                    ad[0 * 4 + i] * bd[j * 4 + 0] +
                    ad[1 * 4 + i] * bd[j * 4 + 1] +
                    ad[2 * 4 + i] * bd[j * 4 + 2] +
                    ad[3 * 4 + i] * bd[j * 4 + 3];
            }
        }
        return m;
    }

    static mulMV(m: Mat4, v: Vec4, out?: Vec4): Vec4 {
        const o = out || new Vec4();
        const d = m.data;
        const x = v.x, y = v.y, z = v.z, w = v.w;
        o.x = d[0] * x + d[4] * y + d[8] * z + d[12] * w;
        o.y = d[1] * x + d[5] * y + d[9] * z + d[13] * w;
        o.z = d[2] * x + d[6] * y + d[10] * z + d[14] * w;
        o.w = d[3] * x + d[7] * y + d[11] * z + d[15] * w;
        return o;
    }

    static perspective(fovy: number, aspect: number, near: number, far: number, out?: Mat4): Mat4 {
        const m = out || new Mat4();
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        const d = m.data;
        d[0] = f / aspect;
        d[1] = 0;
        d[2] = 0;
        d[3] = 0;
        d[4] = 0;
        d[5] = f;
        d[6] = 0;
        d[7] = 0;
        d[8] = 0;
        d[9] = 0;
        d[10] = (far + near) * nf;
        d[11] = -1;
        d[12] = 0;
        d[13] = 0;
        d[14] = 2 * far * near * nf;
        d[15] = 0;
        return m;
    }

    static ortho(left: number, right: number, bottom: number, top: number, near: number, far: number, out?: Mat4): Mat4 {
        const m = out || new Mat4();
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);
        const d = m.data;
        d[0] = -2 * lr;
        d[1] = 0;
        d[2] = 0;
        d[3] = 0;
        d[4] = 0;
        d[5] = -2 * bt;
        d[6] = 0;
        d[7] = 0;
        d[8] = 0;
        d[9] = 0;
        d[10] = 2 * nf;
        d[11] = 0;
        d[12] = (left + right) * lr;
        d[13] = (top + bottom) * bt;
        d[14] = (far + near) * nf;
        d[15] = 1;
        return m;
    }

    static lookAt(eye: Vec3, target: Vec3, up: Vec3, out?: Mat4): Mat4 {
        const m = out || new Mat4();
        const zx = eye.x - target.x;
        let zy = eye.y - target.y;
        let zz = eye.z - target.z;
        let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
        if (!len) {
            zy = 1;
            len = 1;
        }
        len = 1 / len;
        const zAxis = new Vec3(zx * len, zy * len, zz * len);

        const xx = up.y * zAxis.z - up.z * zAxis.y;
        let xy = up.z * zAxis.x - up.x * zAxis.z;
        let xz = up.x * zAxis.y - up.y * zAxis.x;
        len = Math.sqrt(xx * xx + xy * xy + xz * xz);
        if (!len) {
            xz = 1;
            len = 1;
        }
        len = 1 / len;
        const xAxis = new Vec3(xx * len, xy * len, xz * len);

        const yx = zAxis.y * xAxis.z - zAxis.z * xAxis.y;
        const yy = zAxis.z * xAxis.x - zAxis.x * xAxis.z;
        const yz = zAxis.x * xAxis.y - zAxis.y * xAxis.x;
        const yAxis = new Vec3(yx, yy, yz);

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
        d[12] = -(xAxis.x * eye.x + xAxis.y * eye.y + xAxis.z * eye.z);
        d[13] = -(yAxis.x * eye.x + yAxis.y * eye.y + yAxis.z * eye.z);
        d[14] = -(zAxis.x * eye.x + zAxis.y * eye.y + zAxis.z * eye.z);
        d[15] = 1;
        return m;
    }
}
