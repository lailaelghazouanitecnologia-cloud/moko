import { Vec3 } from './vec3';
import { Quat } from './quat';

/**
 * 4x4 column-major matrix for 3D transformations.
 */
export class Mat4 {
    data: Float32Array;

    /**
     * Creates a new identity matrix.
     */
    constructor() {
        this.data = new Float32Array(16);
        this.identity();
    }

    /**
     * Sets this matrix to the identity matrix.
     * @returns This matrix for chaining.
     */
    identity(): Mat4 {
        const d = this.data;
        d[0] = 1; d[1] = 0; d[2] = 0; d[3] = 0;
        d[4] = 0; d[5] = 1; d[6] = 0; d[7] = 0;
        d[8] = 0; d[9] = 0; d[10] = 1; d[11] = 0;
        d[12] = 0; d[13] = 0; d[14] = 0; d[15] = 1;
        return this;
    }

    /**
     * Sets all elements of this matrix.
     * @param m11 Element at row 1, column 1.
     * @param m12 Element at row 1, column 2.
     * @param m13 Element at row 1, column 3.
     * @param m14 Element at row 1, column 4.
     * @param m21 Element at row 2, column 1.
     * @param m22 Element at row 2, column 2.
     * @param m23 Element at row 2, column 3.
     * @param m24 Element at row 2, column 4.
     * @param m31 Element at row 3, column 1.
     * @param m32 Element at row 3, column 2.
     * @param m33 Element at row 3, column 3.
     * @param m34 Element at row 3, column 4.
     * @param m41 Element at row 4, column 1.
     * @param m42 Element at row 4, column 2.
     * @param m43 Element at row 4, column 3.
     * @param m44 Element at row 4, column 4.
     * @returns This matrix for chaining.
     */
    set(
        m11: number, m12: number, m13: number, m14: number,
        m21: number, m22: number, m23: number, m24: number,
        m31: number, m32: number, m33: number, m34: number,
        m41: number, m42: number, m43: number, m44: number
    ): Mat4 {
        if (!this.#validateNumber(m11) || !this.#validateNumber(m12) || !this.#validateNumber(m13) || !this.#validateNumber(m14) ||
            !this.#validateNumber(m21) || !this.#validateNumber(m22) || !this.#validateNumber(m23) || !this.#validateNumber(m24) ||
            !this.#validateNumber(m31) || !this.#validateNumber(m32) || !this.#validateNumber(m33) || !this.#validateNumber(m34) ||
            !this.#validateNumber(m41) || !this.#validateNumber(m42) || !this.#validateNumber(m43) || !this.#validateNumber(m44)) {
            throw new Error('Invalid number provided to Mat4.set');
        }
        const d = this.data;
        d[0] = m11; d[1] = m21; d[2] = m31; d[3] = m41;
        d[4] = m12; d[5] = m22; d[6] = m32; d[7] = m42;
        d[8] = m13; d[9] = m23; d[10] = m33; d[11] = m43;
        d[12] = m14; d[13] = m24; d[14] = m34; d[15] = m44;
        return this;
    }

    /**
     * Multiplies this matrix by another matrix (this = this * b).
     * @param b The matrix to multiply by.
     * @returns This matrix for chaining.
     * @throws {Error} If b is not a valid Mat4 instance.
     */
    multiply(b: Mat4): Mat4 {
        if (!b || !(b instanceof Mat4)) {
            throw new Error('Invalid Mat4 instance provided to multiply');
        }
        const a = this.data;
        const bData = b.data;
        const out = new Float32Array(16);

        const a00 = a[0], a01 = a[4], a02 = a[8], a03 = a[12];
        const a10 = a[1], a11 = a[5], a12 = a[9], a13 = a[13];
        const a20 = a[2], a21 = a[6], a22 = a[10], a23 = a[14];
        const a30 = a[3], a31 = a[7], a32 = a[11], a33 = a[15];

        const b00 = bData[0], b01 = bData[4], b02 = bData[8], b03 = bData[12];
        const b10 = bData[1], b11 = bData[5], b12 = bData[9], b13 = bData[13];
        const b20 = bData[2], b21 = bData[6], b22 = bData[10], b23 = bData[14];
        const b30 = bData[3], b31 = bData[7], b32 = bData[11], b33 = bData[15];

        out[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
        out[1] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
        out[2] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
        out[3] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;

        out[4] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
        out[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
        out[6] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
        out[7] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;

        out[8] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
        out[9] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
        out[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
        out[11] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;

        out[12] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
        out[13] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
        out[14] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
        out[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

        this.data = out;
        return this;
    }

    /**
     * Applies a translation to this matrix.
     * @param v The translation vector.
     * @returns This matrix for chaining.
     * @throws {Error} If v is not a valid Vec3 instance.
     */
    translate(v: Vec3): Mat4 {
        if (!v || !(v instanceof Vec3)) {
            throw new Error('Invalid Vec3 instance provided to translate');
        }
        const d = this.data;
        const x = v.x, y = v.y, z = v.z;
        d[12] += d[0] * x + d[4] * y + d[8] * z;
        d[13] += d[1] * x + d[5] * y + d[9] * z;
        d[14] += d[2] * x + d[6] * y + d[10] * z;
        d[15] += d[3] * x + d[7] * y + d[11] * z;
        return this;
    }

    /**
     * Applies a rotation to this matrix around the given axis.
     * @param angle The angle in radians.
     * @param axis The axis to rotate around.
     * @returns This matrix for chaining.
     * @throws {Error} If axis is not a valid Vec3 instance or if axis is zero vector.
     */
    rotate(angle: number, axis: Vec3): Mat4 {
        if (!axis || !(axis instanceof Vec3)) {
            throw new Error('Invalid Vec3 instance provided to rotate');
        }
        if (!this.#validateNumber(angle)) {
            throw new Error('Invalid angle provided to rotate');
        }
        const d = this.data;
        const x = axis.x, y = axis.y, z = axis.z;
        const len = Math.sqrt(x * x + y * y + z * z);
        if (len < 1e-6) return this;
        const invLen = 1 / len;
        const nx = x * invLen, ny = y * invLen, nz = z * invLen;

        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const t = 1 - c;

        const a00 = nx * nx * t + c;
        const a01 = nx * ny * t + nz * s;
        const a02 = nx * nz * t - ny * s;
        const a10 = nx * ny * t - nz * s;
        const a11 = ny * ny * t + c;
        const a12 = ny * nz * t + nx * s;
        const a20 = nx * nz * t + ny * s;
        const a21 = ny * nz * t - nx * s;
        const a22 = nz * nz * t + c;

        const b00 = d[0], b01 = d[4], b02 = d[8], b03 = d[12];
        const b10 = d[1], b11 = d[5], b12 = d[9], b13 = d[13];
        const b20 = d[2], b21 = d[6], b22 = d[10], b23 = d[14];

        d[0] = b00 * a00 + b01 * a10 + b02 * a20;
        d[1] = b10 * a00 + b11 * a10 + b12 * a20;
        d[2] = b20 * a00 + b21 * a10 + b22 * a20;
        d[3] = d[3];

        d[4] = b00 * a01 + b01 * a11 + b02 * a21;
        d[5] = b10 * a01 + b11 * a11 + b12 * a21;
        d[6] = b20 * a01 + b21 * a11 + b22 * a21;
        d[7] = d[7];

        d[8] = b00 * a02 + b01 * a12 + b02 * a22;
        d[9] = b10 * a02 + b11 * a12 + b12 * a22;
        d[10] = b20 * a02 + b21 * a12 + b22 * a22;
        d[11] = d[11];

        d[12] = b00 * a03 + b01 * a13 + b02 * a23 + b03;
        d[13] = b10 * a03 + b11 * a13 + b12 * a23 + b13;
        d[14] = b20 * a03 + b21 * a13 + b22 * a23 + b23;
        d[15] = d[15];

        return this;
    }

    /**
     * Applies a scaling to this matrix.
     * @param v The scaling vector.
     * @returns This matrix for chaining.
     * @throws {Error} If v is not a valid Vec3 instance.
     */
    scale(v: Vec3): Mat4 {
        if (!v || !(v instanceof Vec3)) {
            throw new Error('Invalid Vec3 instance provided to scale');
        }
        const d = this.data;
        const x = v.x, y = v.y, z = v.z;
        d[0] *= x; d[1] *= x; d[2] *= x; d[3] *= x;
        d[4] *= y; d[5] *= y; d[6] *= y; d[7] *= y;
        d[8] *= z; d[9] *= z; d[10] *= z; d[11] *= z;
        return this;
    }

    /**
     * Computes the inverse of this matrix.
     * @returns This matrix for chaining. If the matrix is not invertible, returns the original matrix.
     */
    invert(): Mat4 {
        const d = this.data;
        const a00 = d[0], a01 = d[4], a02 = d[8], a03 = d[12];
        const a10 = d[1], a11 = d[5], a12 = d[9], a13 = d[13];
        const a20 = d[2], a21 = d[6], a22 = d[10], a23 = d[14];
        const a30 = d[3], a31 = d[7], a32 = d[11], a33 = d[15];

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

        let det = b00 * a22 - b01 * a21 + b02 * a20 + b03 * a23 - b04 * a22 + b05 * a21 +
                  b06 * a12 - b07 * a11 + b08 * a10 + b09 * a13 - b10 * a12 + b11 * a11;

        if (!det) return this;
        det = 1 / det;

        const out = new Float32Array(16);
        out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

        this.data = out;
        return this;
    }

    /**
     * Transposes this matrix (swaps rows and columns).
     * @returns This matrix for chaining.
     */
    transpose(): Mat4 {
        const d = this.data;
        let t = d[1]; d[1] = d[4]; d[4] = t;
        t = d[2]; d[2] = d[8]; d[8] = t;
        t = d[3]; d[3] = d[12]; d[12] = t;
        t = d[6]; d[6] = d[9]; d[9] = t;
        t = d[7]; d[7] = d[13]; d[13] = t;
        t = d[11]; d[11] = d[14]; d[14] = t;
        return this;
    }

    /**
     * Extracts the translation component of this matrix.
     * @returns A new Vec3 containing the translation.
     */
    getTranslation(): Vec3 {
        const d = this.data;
        return new Vec3(d[12], d[13], d[14]);
    }

    /**
     * Extracts the rotation component of this matrix as a quaternion.
     * @returns A new Quat containing the rotation.
     */
    getRotation(): Quat {
        const d = this.data;
        const m00 = d[0], m01 = d[4], m02 = d[8];
        const m10 = d[1], m11 = d[5], m12 = d[9];
        const m20 = d[2], m21 = d[6], m22 = d[10];

        const trace = m00 + m11 + m22;
        let s: number, x: number, y: number, z: number, w: number;

        if (trace > 0) {
            s = 0.5 / Math.sqrt(trace + 1);
            w = 0.25 / s;
            x = (m21 - m12) * s;
            y = (m02 - m20) * s;
            z = (m10 - m01) * s;
        } else if (m00 > m11 && m00 > m22) {
            s = 2 * Math.sqrt(1 + m00 - m11 - m22);
            w = (m21 - m12) / s;
            x = 0.25 * s;
            y = (m01 + m10) / s;
            z = (m02 + m20) / s;
        } else if (m11 > m22) {
            s = 2 * Math.sqrt(1 + m11 - m00 - m22);
            w = (m02 - m20) / s;
            x = (m01 + m10) / s;
            y = 0.25 * s;
            z = (m12 + m21) / s;
        } else {
            s = 2 * Math.sqrt(1 + m22 - m00 - m11);
            w = (m10 - m01) / s;
            x = (m02 + m20) / s;
            y = (m12 + m21) / s;
            z = 0.25 * s;
        }

        const q = new Quat();
        q.x = x;
        q.y = y;
        q.z = z;
        q.w = w;
        return q;
    }

    /**
     * Validates that a value is a finite number.
     * @param n The number to validate.
     * @returns True if the number is finite.
     */
    #validateNumber(n: number): boolean {
        return Number.isFinite(n);
    }
}
