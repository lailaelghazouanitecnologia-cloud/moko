import { Vec3 } from './Vec3';

export class Mat4 {
    public data: Float32Array;

    constructor() {
        this.data = new Float32Array(16);
        this.setIdentity();
    }

    public setIdentity(): Mat4 {
        const m = this.data;
        m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 0;
        m[4] = 0; m[5] = 1; m[6] = 0; m[7] = 0;
        m[8] = 0; m[9] = 0; m[10] = 1; m[11] = 0;
        m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
        return this;
    }

    public translate(x: number, y: number, z: number): Mat4 {
        const m = this.data;
        m[12] = m[0] * x + m[4] * y + m[8] * z + m[12];
        m[13] = m[1] * x + m[5] * y + m[9] * z + m[13];
        m[14] = m[2] * x + m[6] * y + m[10] * z + m[14];
        m[15] = m[3] * x + m[7] * y + m[11] * z + m[15];
        return this;
    }

    public rotate(angle: number, x: number, y: number, z: number): Mat4 {
        const m = this.data;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const omc = 1 - c;
        const xx = x * x;
        const yy = y * y;
        const zz = z * z;
        const xy = x * y;
        const xz = x * z;
        const yz = y * z;

        const r00 = xx * omc + c;
        const r01 = xy * omc + z * s;
        const r02 = xz * omc - y * s;
        const r10 = xy * omc - z * s;
        const r11 = yy * omc + c;
        const r12 = yz * omc + x * s;
        const r20 = xz * omc + y * s;
        const r21 = yz * omc - x * s;
        const r22 = zz * omc + c;

        const m00 = m[0], m01 = m[1], m02 = m[2], m03 = m[3];
        const m10 = m[4], m11 = m[5], m12 = m[6], m13 = m[7];
        const m20 = m[8], m21 = m[9], m22 = m[10], m23 = m[11];

        m[0] = r00 * m00 + r01 * m10 + r02 * m20;
        m[1] = r00 * m01 + r01 * m11 + r02 * m21;
        m[2] = r00 * m02 + r01 * m12 + r02 * m22;
        m[3] = r00 * m03 + r01 * m13 + r02 * m23;
        m[4] = r10 * m00 + r11 * m10 + r12 * m20;
        m[5] = r10 * m01 + r11 * m11 + r12 * m21;
        m[6] = r10 * m02 + r11 * m12 + r12 * m22;
        m[7] = r10 * m03 + r11 * m13 + r12 * m23;
        m[8] = r20 * m00 + r21 * m10 + r22 * m20;
        m[9] = r20 * m01 + r21 * m11 + r22 * m21;
        m[10] = r20 * m02 + r21 * m12 + r22 * m22;
        m[11] = r20 * m03 + r21 * m13 + r22 * m23;
        return this;
    }

    public scale(x: number, y: number, z: number): Mat4 {
        const m = this.data;
        m[0] *= x; m[1] *= x; m[2] *= x; m[3] *= x;
        m[4] *= y; m[5] *= y; m[6] *= y; m[7] *= y;
        m[8] *= z; m[9] *= z; m[10] *= z; m[11] *= z;
        return this;
    }

    public invert(): Mat4 {
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
        if (!det) return this.setIdentity();
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
        m[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        m[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        m[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        m[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        m[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
        return this;
    }

    public transpose(): Mat4 {
        const m = this.data;
        let tmp: number;
        tmp = m[1]; m[1] = m[4]; m[4] = tmp;
        tmp = m[2]; m[2] = m[8]; m[8] = tmp;
        tmp = m[3]; m[3] = m[12]; m[12] = tmp;
        tmp = m[6]; m[6] = m[9]; m[9] = tmp;
        tmp = m[7]; m[7] = m[13]; m[13] = tmp;
        tmp = m[11]; m[11] = m[14]; m[14] = tmp;
        return this;
    }

    public setTRS(translation: Vec3, rotation: { x: number; y: number; z: number; w: number }, scale: Vec3): Mat4 {
        const m = this.data;
        const x = rotation.x, y = rotation.y, z = rotation.z, w = rotation.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;
        const sx = scale.x, sy = scale.y, sz = scale.z;

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
        m[12] = translation.x;
        m[13] = translation.y;
        m[14] = translation.z;
        m[15] = 1;
        return this;
    }

    public getTranslation(): Vec3 {
        const m = this.data;
        return new Vec3(m[12], m[13], m[14]);
    }

    public getScale(): Vec3 {
        const m = this.data;
        const sx = new Vec3(m[0], m[1], m[2]).length();
        const sy = new Vec3(m[4], m[5], m[6]).length();
        const sz = new Vec3(m[8], m[9], m[10]).length();
        return new Vec3(sx, sy, sz);
    }

    public getEulerAngles(): Vec3 {
        const m = this.data;
        const x = Math.atan2(m[6], m[10]);
        const y = Math.asin(-m[2]);
        const z = Math.atan2(m[1], m[0]);
        return new Vec3(x, y, z);
    }

    public static perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
        const out = new Mat4();
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        const m = out.data;
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
        return out;
    }

    public static ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
        const out = new Mat4();
        const m = out.data;
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);
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
        return out;
    }

    public static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
        const out = new Mat4();
        const m = out.data;
        const zAxis = new Vec3().sub(target, eye).normalize();
        const xAxis = new Vec3().cross(up, zAxis).normalize();
        const yAxis = new Vec3().cross(zAxis, xAxis);
        m[0] = xAxis.x;
        m[1] = xAxis.y;
        m[2] = xAxis.z;
        m[3] = 0;
        m[4] = yAxis.x;
        m[5] = yAxis.y;
        m[6] = yAxis.z;
        m[7] = 0;
        m[8] = zAxis.x;
        m[9] = zAxis.y;
        m[10] = zAxis.z;
        m[11] = 0;
        m[12] = -xAxis.dot(eye);
        m[13] = -yAxis.dot(eye);
        m[14] = -zAxis.dot(eye);
        m[15] = 1;
        return out;
    }

    public mul(rhs: Mat4): Mat4 {
        const a = this.data;
        const b = rhs.data;
        const out = new Mat4();
        const r = out.data;

        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        r[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        r[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        r[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        r[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        r[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        r[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        r[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        r[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        r[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        r[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        r[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        r[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        r[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        r[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        r[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        r[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        this.data.set(r);
        return this;
    }
}
