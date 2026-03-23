import { Vec3 } from './vec3';
import { Quat } from './quat';

export class Mat4 {
    data: Float32Array;

    constructor() {
        this.data = new Float32Array(16);
        this.setIdentity();
    }

    translate(v: Vec3): Mat4 {
        const m = this.data;
        const x = v.x, y = v.y, z = v.z;
        m[12] = m[0] * x + m[4] * y + m[8] * z + m[12];
        m[13] = m[1] * x + m[5] * y + m[9] * z + m[13];
        m[14] = m[2] * x + m[6] * y + m[10] * z + m[14];
        m[15] = m[3] * x + m[7] * y + m[11] * z + m[15];
        return this;
    }

    rotate(q: Quat): Mat4 {
        const m = this.data;
        const x = q.x, y = q.y, z = q.z, w = q.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
        const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
        const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];

        const b00 = 1 - yy - zz, b01 = xy - wz, b02 = xz + wy;
        const b10 = xy + wz, b11 = 1 - xx - zz, b12 = yz - wx;
        const b20 = xz - wy, b21 = yz + wx, b22 = 1 - xx - yy;

        m[0] = a00 * b00 + a10 * b01 + a20 * b02;
        m[1] = a01 * b00 + a11 * b01 + a21 * b02;
        m[2] = a02 * b00 + a12 * b01 + a22 * b02;
        m[3] = a03 * b00 + a13 * b01 + a23 * b02;
        m[4] = a00 * b10 + a10 * b11 + a20 * b12;
        m[5] = a01 * b10 + a11 * b11 + a21 * b12;
        m[6] = a02 * b10 + a12 * b11 + a22 * b12;
        m[7] = a03 * b10 + a13 * b11 + a23 * b12;
        m[8] = a00 * b20 + a10 * b21 + a20 * b22;
        m[9] = a01 * b20 + a11 * b21 + a21 * b22;
        m[10] = a02 * b20 + a12 * b21 + a22 * b22;
        m[11] = a03 * b20 + a13 * b21 + a23 * b22;
        return this;
    }

    scale(v: Vec3): Mat4 {
        const m = this.data;
        const x = v.x, y = v.y, z = v.z;
        m[0] *= x; m[1] *= x; m[2] *= x; m[3] *= x;
        m[4] *= y; m[5] *= y; m[6] *= y; m[7] *= y;
        m[8] *= z; m[9] *= z; m[10] *= z; m[11] *= z;
        return this;
    }

    invert(): Mat4 {
        const m = this.data;
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

        let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        if (!det) return this;
        det = 1.0 / det;

        m[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        m[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        m[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        m[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        m[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        m[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        m[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        m[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        m[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        m[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        m[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        m[11] = (a21 * b02 - a20 * b04 - a22 * b00) * det;
        m[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        m[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        m[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        m[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
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
        m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 0;
        m[4] = 0; m[5] = 1; m[6] = 0; m[7] = 0;
        m[8] = 0; m[9] = 0; m[10] = 1; m[11] = 0;
        m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
        return this;
    }

    setTRS(t: Vec3, r: Quat, s: Vec3): Mat4 {
        const m = this.data;
        const x = r.x, y = r.y, z = r.z, w = r.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const sx = s.x, sy = s.y, sz = s.z;

        m[0] = (1 - yy - zz) * sx;
        m[1] = (xy + wz) * sx;
        m[2] = (xz - wy) * sx;
        m[3] = 0;
        m[4] = (xy - wz) * sy;
        m[5] = (1 - xx - zz) * sy;
        m[6] = (yz + wx) * sy;
        m[7] = 0;
        m[8] = (xz + wy) * sz;
        m[9] = (yz - wx) * sz;
        m[10] = (1 - xx - yy) * sz;
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
        const sx = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]);
        const sy = Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6]);
        const sz = Math.sqrt(m[8] * m[8] + m[9] * m[9] + m[10] * m[10]);
        return new Vec3(sx, sy, sz);
    }

    getEulerAngles(): Vec3 {
        const m = this.data;
        const x = Math.atan2(m[6], m[10]);
        const y = Math.asin(-m[2]);
        const z = Math.atan2(m[1], m[0]);
        return new Vec3(x, y, z);
    }

    perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
        const m = this.data;
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        m[0] = f / aspect; m[1] = 0; m[2] = 0; m[3] = 0;
        m[4] = 0; m[5] = f; m[6] = 0; m[7] = 0;
        m[8] = 0; m[9] = 0; m[10] = (far + near) * nf; m[11] = -1;
        m[12] = 0; m[13] = 0; m[14] = 2 * far * near * nf; m[15] = 0;
        return this;
    }

    ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
        const m = this.data;
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);
        m[0] = -2 * lr; m[1] = 0; m[2] = 0; m[3] = 0;
        m[4] = 0; m[5] = -2 * bt; m[6] = 0; m[7] = 0;
        m[8] = 0; m[9] = 0; m[10] = 2 * nf; m[11] = 0;
        m[12] = (left + right) * lr; m[13] = (top + bottom) * bt; m[14] = (far + near) * nf; m[15] = 1;
        return this;
    }

    mul(rhs: Mat4): Mat4 {
        const a = this.data;
        const b = rhs.data;
        const out = new Float32Array(16);

        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        this.data.set(out);
        return this;
    }

    static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
        const z = new Vec3().sub(target, eye).normalize();
        const x = new Vec3().cross(up, z).normalize();
        const y = new Vec3().cross(z, x).normalize();

        const out = new Mat4();
        const m = out.data;
        m[0] = x.x; m[1] = x.y; m[2] = x.z; m[3] = 0;
        m[4] = y.x; m[5] = y.y; m[6] = y.z; m[7] = 0;
        m[8] = z.x; m[9] = z.y; m[10] = z.z; m[11] = 0;
        m[12] = -x.dot(eye); m[13] = -y.dot(eye); m[14] = -z.dot(eye); m[15] = 1;
        return out;
    }
}
