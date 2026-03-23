import { Vec3 } from './vec3';
import { Quat } from './quat';

export class Mat4 {
    data: Float32Array;

    constructor() {
        this.data = new Float32Array(16);
        this.setIdentity();
    }

    mul(rhs: Mat4): Mat4 {
        const a = this.data;
        const b = rhs.data;
        const out = new Mat4();
        const o = out.data;

        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        o[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        o[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        o[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        o[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        o[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        o[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        o[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        o[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        o[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        o[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        o[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        o[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        o[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        o[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        o[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        o[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        return out;
    }

    translate(v: Vec3): Mat4 {
        const x = v.x, y = v.y, z = v.z;
        const m = this.data;

        m[12] = m[0] * x + m[4] * y + m[8] * z + m[12];
        m[13] = m[1] * x + m[5] * y + m[9] * z + m[13];
        m[14] = m[2] * x + m[6] * y + m[10] * z + m[14];
        m[15] = m[3] * x + m[7] * y + m[11] * z + m[15];

        return this;
    }

    rotate(q: Quat): Mat4 {
        const x = q.x, y = q.y, z = q.z, w = q.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const r00 = 1 - (yy + zz), r01 = xy + wz, r02 = xz - wy;
        const r10 = xy - wz, r11 = 1 - (xx + zz), r12 = yz + wx;
        const r20 = xz + wy, r21 = yz - wx, r22 = 1 - (xx + yy);

        const m = this.data;

        const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
        const m4 = m[4], m5 = m[5], m6 = m[6], m7 = m[7];
        const m8 = m[8], m9 = m[9], m10 = m[10], m11 = m[11];

        m[0] = r00 * m0 + r01 * m4 + r02 * m8;
        m[1] = r00 * m1 + r01 * m5 + r02 * m9;
        m[2] = r00 * m2 + r01 * m6 + r02 * m10;
        m[3] = r00 * m3 + r01 * m7 + r02 * m11;

        m[4] = r10 * m0 + r11 * m4 + r12 * m8;
        m[5] = r10 * m1 + r11 * m5 + r12 * m9;
        m[6] = r10 * m2 + r11 * m6 + r12 * m10;
        m[7] = r10 * m3 + r11 * m7 + r12 * m11;

        m[8] = r20 * m0 + r21 * m4 + r22 * m8;
        m[9] = r20 * m1 + r21 * m5 + r22 * m9;
        m[10] = r20 * m2 + r21 * m6 + r22 * m10;
        m[11] = r20 * m3 + r21 * m7 + r22 * m11;

        return this;
    }

    scale(v: Vec3): Mat4 {
        const x = v.x, y = v.y, z = v.z;
        const m = this.data;

        m[0] *= x; m[1] *= x; m[2] *= x; m[3] *= x;
        m[4] *= y; m[5] *= y; m[6] *= y; m[7] *= y;
        m[8] *= z; m[9] *= z; m[10] *= z; m[11] *= z;

        return this;
    }

    invert(): Mat4 {
        const m = this.data;
        const out = new Mat4();
        const o = out.data;

        const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
        const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
        const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
        const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

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

        let det = b00 * a22 - b01 * a21 + b02 * a20 + b03 * a23 - b04 * a22 + b05 * a21;
        det += b06 * a13 - b07 * a12 + b08 * a11 - b09 * a13 + b10 * a12 - b11 * a11;

        if (!det) return out;

        det = 1.0 / det;

        o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

        return out;
    }

    transpose(): Mat4 {
        const m = this.data;
        const out = new Mat4();
        const o = out.data;

        o[0] = m[0]; o[1] = m[4]; o[2] = m[8]; o[3] = m[12];
        o[4] = m[1]; o[5] = m[5]; o[6] = m[9]; o[7] = m[13];
        o[8] = m[2]; o[9] = m[6]; o[10] = m[10]; o[11] = m[14];
        o[12] = m[3]; o[13] = m[7]; o[14] = m[11]; o[15] = m[15];

        return out;
    }

    setIdentity(): Mat4 {
        const m = this.data;
        m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 0;
        m[4] = 0; m[5] = 1; m[6] = 0; m[7] = 0;
        m[8] = 0; m[9] = 0; m[10] = 1; m[11] = 0;
        m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
        return this;
    }

    setTRS(t: Vec3, r: Quat, s: Vec3): Mat4 {
        const x = r.x, y = r.y, z = r.z, w = r.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const sx = s.x, sy = s.y, sz = s.z;

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
        const m = this.data;
        return new Vec3(m[12], m[13], m[14]);
    }

    getScale(): Vec3 {
        const m = this.data;
        const x = Math.hypot(m[0], m[1], m[2]);
        const y = Math.hypot(m[4], m[5], m[6]);
        const z = Math.hypot(m[8], m[9], m[10]);
        return new Vec3(x, y, z);
    }

    getEulerAngles(): Vec3 {
        const m = this.data;
        const out = new Vec3();
        const sx = Math.hypot(m[0], m[1], m[2]);
        const sy = Math.hypot(m[4], m[5], m[6]);
        const sz = Math.hypot(m[8], m[9], m[10]);

        if (sx > 1e-6 && sy > 1e-6) {
            out.x = Math.atan2(m[9], m[10]);
            out.y = Math.atan2(-m[8], Math.hypot(m[9], m[10]));
            out.z = Math.atan2(m[4], m[0]);
        } else {
            out.x = 0;
            out.y = Math.atan2(-m[8], sx);
            out.z = Math.atan2(-m[6], m[5]);
        }

        return out;
    }

    static perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
        const out = new Mat4();
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        const m = out.data;

        m[0] = f / aspect; m[1] = 0; m[2] = 0; m[3] = 0;
        m[4] = 0; m[5] = f; m[6] = 0; m[7] = 0;
        m[8] = 0; m[9] = 0; m[10] = (far + near) * nf; m[11] = -1;
        m[12] = 0; m[13] = 0; m[14] = 2 * far * near * nf; m[15] = 0;

        return out;
    }

    static ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
        const out = new Mat4();
        const m = out.data;
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);

        m[0] = -2 * lr; m[1] = 0; m[2] = 0; m[3] = 0;
        m[4] = 0; m[5] = -2 * bt; m[6] = 0; m[7] = 0;
        m[8] = 0; m[9] = 0; m[10] = 2 * nf; m[11] = 0;
        m[12] = (left + right) * lr; m[13] = (top + bottom) * bt; m[14] = (far + near) * nf; m[15] = 1;

        return out;
    }

    static lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
        const zAxis = new Vec3().sub2(eye, center).normalize();
        const xAxis = new Vec3().cross(up, zAxis).normalize();
        const yAxis = new Vec3().cross(zAxis, xAxis);

        const out = new Mat4();
        const m = out.data;

        m[0] = xAxis.x; m[1] = xAxis.y; m[2] = xAxis.z; m[3] = 0;
        m[4] = yAxis.x; m[5] = yAxis.y; m[6] = yAxis.z; m[7] = 0;
        m[8] = zAxis.x; m[9] = zAxis.y; m[10] = zAxis.z; m[11] = 0;
        m[12] = -xAxis.dot(eye); m[13] = -yAxis.dot(eye); m[14] = -zAxis.dot(eye); m[15] = 1;

        return out;
    }
}
