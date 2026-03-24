import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';

export class Mat4 {
    data: Float32Array;

    constructor(m?: number[]) {
        this.data = new Float32Array(16);
        if (m && m.length === 16) {
            this.data.set(m);
        } else {
            this.setIdentity();
        }
    }

    copy(m: Mat4): Mat4 {
        const out = new Mat4();
        out.data.set(m.data);
        return out;
    }

    clone(): Mat4 {
        return this.copy(this);
    }

    identity(): Mat4 {
        return Mat4.identity();
    }

    setIdentity(): Mat4 {
        const d = this.data;
        d[0] = 1; d[1] = 0; d[2] = 0; d[3] = 0;
        d[4] = 0; d[5] = 1; d[6] = 0; d[7] = 0;
        d[8] = 0; d[9] = 0; d[10] = 1; d[11] = 0;
        d[12] = 0; d[13] = 0; d[14] = 0; d[15] = 1;
        return this;
    }

    transpose(): Mat4 {
        const out = new Mat4();
        const a = this.data;
        const b = out.data;
        b[0] = a[0]; b[1] = a[4]; b[2] = a[8]; b[3] = a[12];
        b[4] = a[1]; b[5] = a[5]; b[6] = a[9]; b[7] = a[13];
        b[8] = a[2]; b[9] = a[6]; b[10] = a[10]; b[11] = a[14];
        b[12] = a[3]; b[13] = a[7]; b[14] = a[11]; b[15] = a[15];
        return out;
    }

    invert(): Mat4 {
        const out = new Mat4();
        const m = this.data;
        const r = out.data;

        const m00 = m[0], m01 = m[4], m02 = m[8], m03 = m[12];
        const m10 = m[1], m11 = m[5], m12 = m[9], m13 = m[13];
        const m20 = m[2], m21 = m[6], m22 = m[10], m23 = m[14];
        const m30 = m[3], m31 = m[7], m32 = m[11], m33 = m[15];

        const b00 = m00 * m11 - m10 * m01;
        const b01 = m00 * m12 - m10 * m02;
        const b02 = m00 * m13 - m10 * m03;
        const b03 = m01 * m12 - m11 * m02;
        const b04 = m01 * m13 - m11 * m03;
        const b05 = m02 * m13 - m12 * m03;
        const b06 = m20 * m31 - m30 * m21;
        const b07 = m20 * m32 - m30 * m22;
        const b08 = m20 * m33 - m30 * m23;
        const b09 = m21 * m32 - m31 * m22;
        const b10 = m21 * m33 - m31 * m23;
        const b11 = m22 * m33 - m32 * m23;

        let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        if (!det) return out;
        det = 1 / det;

        r[0] = (m11 * b11 - m12 * b10 + m13 * b09) * det;
        r[1] = (m12 * b08 - m10 * b11 - m13 * b07) * det;
        r[2] = (m10 * b10 - m11 * b08 + m13 * b06) * det;
        r[3] = (m11 * b07 - m10 * b09 - m12 * b06) * det;
        r[4] = (m02 * b10 - m01 * b11 - m03 * b09) * det;
        r[5] = (m00 * b11 - m02 * b08 + m03 * b07) * det;
        r[6] = (m01 * b08 - m00 * b10 - m03 * b06) * det;
        r[7] = (m00 * b09 - m01 * b07 + m02 * b06) * det;
        r[8] = (m31 * b05 - m32 * b04 + m33 * b03) * det;
        r[9] = (m32 * b02 - m30 * b05 - m33 * b01) * det;
        r[10] = (m30 * b04 - m31 * b02 + m33 * b00) * det;
        r[11] = (m31 * b01 - m30 * b03 - m32 * b00) * det;
        r[12] = (m22 * b04 - m21 * b05 - m23 * b03) * det;
        r[13] = (m20 * b05 - m22 * b02 + m23 * b01) * det;
        r[14] = (m21 * b02 - m20 * b04 - m23 * b00) * det;
        r[15] = (m20 * b03 - m21 * b01 + m22 * b00) * det;

        return out;
    }

    mul(m: Mat4): Mat4 {
        const out = new Mat4();
        const a = this.data;
        const b = m.data;
        const r = out.data;

        const a00 = a[0], a01 = a[4], a02 = a[8], a03 = a[12];
        const a10 = a[1], a11 = a[5], a12 = a[9], a13 = a[13];
        const a20 = a[2], a21 = a[6], a22 = a[10], a23 = a[14];
        const a30 = a[3], a31 = a[7], a32 = a[11], a33 = a[15];

        let b0 = b[0], b1 = b[4], b2 = b[8], b3 = b[12];
        r[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        r[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        r[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        r[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[1]; b1 = b[5]; b2 = b[9]; b3 = b[13];
        r[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        r[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        r[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        r[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[2]; b1 = b[6]; b2 = b[10]; b3 = b[14];
        r[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        r[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        r[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        r[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[3]; b1 = b[7]; b2 = b[11]; b3 = b[15];
        r[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        r[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        r[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        r[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        return out;
    }

    transform(v: Vec3): Vec3 {
        const m = this.data;
        const x = v.data[0], y = v.data[1], z = v.data[2], w = 1;
        return new Vec3(
            m[0] * x + m[4] * y + m[8] * z + m[12] * w,
            m[1] * x + m[5] * y + m[9] * z + m[13] * w,
            m[2] * x + m[6] * y + m[10] * z + m[14] * w
        );
    }

    transformPoint(v: Vec3): Vec3 {
        return this.transform(v);
    }

    transformVector(v: Vec3): Vec3 {
        const m = this.data;
        const x = v.data[0], y = v.data[1], z = v.data[2];
        return new Vec3(
            m[0] * x + m[4] * y + m[8] * z,
            m[1] * x + m[5] * y + m[9] * z,
            m[2] * x + m[6] * y + m[10] * z
        );
    }

    translate(v: Vec3): Mat4 {
        const out = this.clone();
        const d = out.data;
        const x = v.data[0], y = v.data[1], z = v.data[2];
        d[12] = d[0] * x + d[4] * y + d[8] * z + d[12];
        d[13] = d[1] * x + d[5] * y + d[9] * z + d[13];
        d[14] = d[2] * x + d[6] * y + d[10] * z + d[14];
        d[15] = d[3] * x + d[7] * y + d[11] * z + d[15];
        return out;
    }

    rotateX(angle: number): Mat4 {
        const out = new Mat4();
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const m = this.data;
        const r = out.data;

        const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
        const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];

        r[0] = m[0]; r[1] = m[1]; r[2] = m[2]; r[3] = m[3];
        r[4] = a10 * c + a20 * s;
        r[5] = a11 * c + a21 * s;
        r[6] = a12 * c + a22 * s;
        r[7] = a13 * c + a23 * s;
        r[8] = a20 * c - a10 * s;
        r[9] = a21 * c - a11 * s;
        r[10] = a22 * c - a12 * s;
        r[11] = a23 * c - a13 * s;
        r[12] = m[12]; r[13] = m[13]; r[14] = m[14]; r[15] = m[15];

        return out;
    }

    rotateY(angle: number): Mat4 {
        const out = new Mat4();
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const m = this.data;
        const r = out.data;

        const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
        const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];

        r[0] = a00 * c - a20 * s;
        r[1] = a01 * c - a21 * s;
        r[2] = a02 * c - a22 * s;
        r[3] = a03 * c - a23 * s;
        r[4] = m[4]; r[5] = m[5]; r[6] = m[6]; r[7] = m[7];
        r[8] = a00 * s + a20 * c;
        r[9] = a01 * s + a21 * c;
        r[10] = a02 * s + a22 * c;
        r[11] = a03 * s + a23 * c;
        r[12] = m[12]; r[13] = m[13]; r[14] = m[14]; r[15] = m[15];

        return out;
    }

    rotateZ(angle: number): Mat4 {
        const out = new Mat4();
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const m = this.data;
        const r = out.data;

        const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
        const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];

        r[0] = a00 * c + a10 * s;
        r[1] = a01 * c + a11 * s;
        r[2] = a02 * c + a12 * s;
        r[3] = a03 * c + a13 * s;
        r[4] = a10 * c - a00 * s;
        r[5] = a11 * c - a01 * s;
        r[6] = a12 * c - a02 * s;
        r[7] = a13 * c - a03 * s;
        r[8] = m[8]; r[9] = m[9]; r[10] = m[10]; r[11] = m[11];
        r[12] = m[12]; r[13] = m[13]; r[14] = m[14]; r[15] = m[15];

        return out;
    }

    rotate(q: Quat): Mat4 {
        const out = new Mat4();
        const x = q.data[0], y = q.data[1], z = q.data[2], w = q.data[3];
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const m = this.data;
        const r = out.data;

        const a00 = m[0], a01 = m[4], a02 = m[8], a03 = m[12];
        const a10 = m[1], a11 = m[5], a12 = m[9], a13 = m[13];
        const a20 = m[2], a21 = m[6], a22 = m[10], a23 = m[11];

        const b00 = 1 - yy - zz, b01 = xy - wz, b02 = xz + wy;
        const b10 = xy + wz, b11 = 1 - xx - zz, b12 = yz - wx;
        const b20 = xz - wy, b21 = yz + wx, b22 = 1 - xx - yy;

        r[0] = a00 * b00 + a10 * b01 + a20 * b02;
        r[1] = a01 * b00 + a11 * b01 + a21 * b02;
        r[2] = a02 * b00 + a12 * b01 + a22 * b02;
        r[3] = a03 * b00 + a13 * b01 + a23 * b02;
        r[4] = a00 * b10 + a10 * b11 + a20 * b12;
        r[5] = a01 * b10 + a11 * b11 + a21 * b12;
        r[6] = a02 * b10 + a12 * b11 + a22 * b12;
        r[7] = a03 * b10 + a13 * b11 + a23 * b12;
        r[8] = a00 * b20 + a10 * b21 + a20 * b22;
        r[9] = a01 * b20 + a11 * b21 + a21 * b22;
        r[10] = a02 * b20 + a12 * b21 + a22 * b22;
        r[11] = a03 * b20 + a13 * b21 + a23 * b22;
        r[12] = m[12]; r[13] = m[13]; r[14] = m[14]; r[15] = m[15];

        return out;
    }

    scale(v: Vec3): Mat4 {
        const out = new Mat4();
        const m = this.data;
        const r = out.data;
        const sx = v.data[0], sy = v.data[1], sz = v.data[2];

        r[0] = m[0] * sx; r[1] = m[1] * sx; r[2] = m[2] * sx; r[3] = m[3] * sx;
        r[4] = m[4] * sy; r[5] = m[5] * sy; r[6] = m[6] * sy; r[7] = m[7] * sy;
        r[8] = m[8] * sz; r[9] = m[9] * sz; r[10] = m[10] * sz; r[11] = m[11] * sz;
        r[12] = m[12]; r[13] = m[13]; r[14] = m[14]; r[15] = m[15];

        return out;
    }

    fromTRS(t: Vec3, r: Quat, s: Vec3): Mat4 {
        const out = new Mat4();
        const x = r.data[0], y = r.data[1], z = r.data[2], w = r.data[3];
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const sx = s.data[0], sy = s.data[1], sz = s.data[2];
        const tx = t.data[0], ty = t.data[1], tz = t.data[2];

        const rData = out.data;
        rData[0] = (1 - yy - zz) * sx;
        rData[1] = (xy + wz) * sx;
        rData[2] = (xz - wy) * sx;
        rData[3] = 0;
        rData[4] = (xy - wz) * sy;
        rData[5] = (1 - xx - zz) * sy;
        rData[6] = (yz + wx) * sy;
        rData[7] = 0;
        rData[8] = (xz + wy) * sz;
        rData[9] = (yz - wx) * sz;
        rData[10] = (1 - xx - yy) * sz;
        rData[11] = 0;
        rData[12] = tx;
        rData[13] = ty;
        rData[14] = tz;
        rData[15] = 1;

        return out;
    }

    lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
        const out = new Mat4();
        const z = eye.clone().sub(center).normalize();
        const x = up.clone().cross(z).normalize();
        const y = z.clone().cross(x).normalize();

        const r = out.data;
        r[0] = x.data[0]; r[1] = x.data[1]; r[2] = x.data[2]; r[3] = 0;
        r[4] = y.data[0]; r[5] = y.data[1]; r[6] = y.data[2]; r[7] = 0;
        r[8] = z.data[0]; r[9] = z.data[1]; r[10] = z.data[2]; r[11] = 0;
        r[12] = eye.data[0]; r[13] = eye.data[1]; r[14] = eye.data[2]; r[15] = 1;

        return out.invert();
    }

    perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
        const out = new Mat4();
        const f = 1 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        const r = out.data;

        r[0] = f / aspect; r[1] = 0; r[2] = 0; r[3] = 0;
        r[4] = 0; r[5] = f; r[6] = 0; r[7] = 0;
        r[8] = 0; r[9] = 0; r[10] = (far + near) * nf; r[11] = -1;
        r[12] = 0; r[13] = 0; r[14] = 2 * far * near * nf; r[15] = 0;

        return out;
    }

    orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
        const out = new Mat4();
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);
        const r = out.data;

        r[0] = -2 * lr; r[1] = 0; r[2] = 0; r[3] = 0;
        r[4] = 0; r[5] = -2 * bt; r[6] = 0; r[7] = 0;
        r[8] = 0; r[9] = 0; r[10] = 2 * nf; r[11] = 0;
        r[12] = (left + right) * lr; r[13] = (top + bottom) * bt; r[14] = (far + near) * nf; r[15] = 1;

        return out;
    }

    static identity(): Mat4 {
        const m = new Mat4();
        m.setIdentity();
        return m;
    }
}
