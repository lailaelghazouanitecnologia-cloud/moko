import { Vec2 } from './vec2';

/**
 * 3x3 column-major matrix
 */
export class Mat3 {
    data: Float32Array;

    constructor() {
        this.data = new Float32Array(9);
        this.identity();
    }

    /**
     * Set this matrix to the identity matrix
     * @returns this
     */
    identity(): Mat3 {
        const d = this.data;
        d[0] = 1; d[1] = 0; d[2] = 0;
        d[3] = 0; d[4] = 1; d[5] = 0;
        d[6] = 0; d[7] = 0; d[8] = 1;
        return this;
    }

    /**
     * Copy values from a Float32Array
     * @param m - Source array (must have at least 9 elements)
     * @returns this
     * @throws {TypeError} if m is not a Float32Array or has insufficient length
     */
    set(m: Float32Array): Mat3 {
        if (!(m instanceof Float32Array)) {
            throw new TypeError('Expected Float32Array');
        }
        if (m.length < 9) {
            throw new TypeError('Input array must have at least 9 elements');
        }
        this.data.set(m);
        return this;
    }

    /**
     * Create a new matrix with identical values
     * @returns new Mat3 instance
     */
    clone(): Mat3 {
        const m = new Mat3();
        m.data.set(this.data);
        return m;
    }

    /**
     * Copy values from another Mat3
     * @param m - Source matrix
     * @returns this
     * @throws {TypeError} if m is not a Mat3
     */
    copy(m: Mat3): Mat3 {
        if (!(m instanceof Mat3)) {
            throw new TypeError('Expected Mat3');
        }
        this.data.set(m.data);
        return this;
    }

    /**
     * Transpose this matrix in-place
     * @returns this
     */
    transpose(): Mat3 {
        const d = this.data;
        const m00 = d[0], m01 = d[1], m02 = d[2];
        const m10 = d[3], m11 = d[4], m12 = d[5];
        const m20 = d[6], m21 = d[7], m22 = d[8];
        d[0] = m00; d[1] = m10; d[2] = m20;
        d[3] = m01; d[4] = m11; d[5] = m21;
        d[6] = m02; d[7] = m12; d[8] = m22;
        return this;
    }

    /**
     * Invert this matrix in-place
     * @returns this
     * @remarks If the matrix is singular (determinant ≈ 0) it is reset to identity
     */
    invert(): Mat3 {
        const d = this.data;
        const m00 = d[0], m01 = d[1], m02 = d[2];
        const m10 = d[3], m11 = d[4], m12 = d[5];
        const m20 = d[6], m21 = d[7], m22 = d[8];

        const det = m00 * (m11 * m22 - m12 * m21) -
                    m01 * (m10 * m22 - m12 * m20) +
                    m02 * (m10 * m21 - m11 * m20);

        if (Math.abs(det) < 1e-6) {
            this.identity();
            return this;
        }

        const invDet = 1 / det;

        const r00 = (m11 * m22 - m12 * m21) * invDet;
        const r01 = (m02 * m21 - m01 * m22) * invDet;
        const r02 = (m01 * m12 - m02 * m11) * inv;
        const r10 = (m12 * m20 - m10 * m22) * invDet;
        const r11 = (m00 * m22 - m02 * m20) * invDet;
        const r12 = (m02 * m10 - m00 * m12) * invDet;
        const r20 = (m10 * m21 - m11 * m20) * invDet;
        const r21 = (m01 * m20 - m00 * m21) * invDet;
        const r22 = (m00 * m11 - m01 * m10) * invDet;

        d[0] = r00; d[1] = r01; d[2] = r02;
        d[3] = r10; d[4] = r11; d[5] = r12;
        d[6] = r20; d[7] = r21; d[8] = r22;

        return this;
    }

    /**
     * Multiply this matrix by another matrix (this = this * b)
     * @param b - Right-hand matrix
     * @returns this
     * @throws {TypeError} if b is not a Mat3
     */
    multiply(b: Mat3): Mat3 {
        if (!(b instanceof Mat3)) {
            throw new TypeError('Expected Mat3');
        }
        const a = this.data;
        const c = b.data;
        const out = new Float32Array(9);

        const a00 = a[0], a01 = a[1], a02 = a[2];
        const a10 = a[3], a11 = a[4], a12 = a[5];
        const a20 = a[6], a21 = a[7], a22 = a[8];

        const b00 = c[0], b01 = c[1], b02 = c[2];
        const b10 = c[3], b11 = c[4], b12 = c[5];
        const b20 = c[6], b21 = c[7], b22 = c[8];

        out[0] = a00 * b00 + a10 * b01 + a20 * b02;
        out[1] = a01 * b00 + a11 * b01 + a21 * b02;
        out[2] = a02 * b00 + a12 * b01 + a22 * b02;
        out[3] = a00 * b10 + a10 * b11 + a20 * b12;
        out[4] = a01 * b10 + a11 * b11 + a21 * b12;
        out[5] = a02 * b10 + a12 * b11 + a22 * b12;
        out[6] = a00 * b20 + a10 * b21 + a20 * b22;
        out[7] = a01 * b20 + a11 * b21 + a21 * b22;
        out[8] = a02 * b20 + a12 * b21 + a22 * b22;

        this.data = out;
        return this;
    }

    /**
     * Apply a translation transformation
     * @param v - Translation vector
     * @returns this
     * @throws {TypeError} if v is not a Vec2
     */
    translate(v: Vec2): Mat3 {
        if (!(v instanceof Vec2)) {
            throw new TypeError('Expected Vec2');
        }
        const d = this.data;
        const x = v.x, y = v.y;
        d[6] += d[0] * x + d[3] * y;
        d[7] += d[1] * x + d[4] * y;
        d[8] += d[2] * x + d[5] * y;
        return this;
    }

    /**
     * Apply a rotation transformation (in radians)
     * @param a - Angle in radians
     * @returns this
     * @throws {TypeError} if a is not a number
     */
    rotate(a: number): Mat3 {
        if (typeof a !== 'number' || isNaN(a)) {
            throw new TypeError('Expected finite number for angle');
        }
        const d = this.data;
        const s = Math.sin(a);
        const c = Math.cos(a);
        const a00 = d[0], a01 = d[1], a02 = d[2];
        const a10 = d[3], a11 = d[4], a12 = d[5];
        const a20 = d[6], a21 = d[7], a22 = d[8];
        d[0] = c * a00 + s * a10;
        d[1] = c * a01 + s * a11;
        d[2] = c * a02 + s * a12;
        d[3] = c * a10 - s * a00;
        d[4] = c * a11 - s * a01;
        d[5] = c * a12 - s * a02;
        d[6] = a20;
        d[7] = a21;
        d[8] = a22;
        return this;
    }

    /**
     * Apply a non-uniform scale transformation
     * @param v - Scale factors (x, y)
     * @returns this
     * @throws {TypeError} if v is not a Vec2
     */
    scale(v: Vec2): Mat3 {
        if (!(v instanceof Vec2)) {
            throw new TypeError('Expected Vec2');
        }
        const d = this.data;
        const x = v.x, y = v.y;
        d[0] *= x; d[1] *= x; d[2] *= x;
        d[3] *= y; d[4] *= y; d[5] *= y;
        return this;
    }

    /**
     * Create a translation matrix
     * @param v - Translation vector
     * @returns new Mat3
     * @throws {TypeError} if v is not a Vec2
     */
    static translation(v: Vec2): Mat3 {
        if (!(v instanceof Vec2)) {
            throw new TypeError('Expected Vec2');
        }
        const m = new Mat3();
        m.data[6] = v.x;
        m.data[7] = v.y;
        return m;
    }

    /**
     * Create a rotation matrix
     * @param a - Angle in radians
     * @returns new Mat3
     * @throws {TypeError} if a is not a number
     */
    static rotation(a: number): Mat3 {
        if (typeof a !== 'number' || isNaN(a)) {
            throw new TypeError('Expected finite number for angle');
        }
        const m = new Mat3();
        const c = Math.cos(a);
        const s = Math.sin(a);
        m.data[0] = c;
        m.data[1] = s;
        m.data[3] = -s;
        m.data[4] = c;
        return m;
    }

    /**
     * Create a scale matrix
     * @param v - Scale factors (x, y)
     * @returns new Mat3
     * @throws {TypeError} if v is not a Vec2
     */
    static scaling(v: Vec2): Mat3 {
        if (!(v instanceof Vec2)) {
            throw new TypeError('Expected Vec2');
        }
        const m = new Mat3();
        m.data[0] = v.x;
        m.data[4] = v.y;
        return m;
    }

    /**
     * Create an orthographic projection matrix
     * @param left - Left clipping plane
     * @param right - Right clipping plane
     * @param bottom - Bottom clipping plane
     * @param top - Top clipping plane
     * @returns new Mat3
     * @throws {RangeError} if left >= right or bottom >= top
     */
    static ortho(left: number, right: number, bottom: number, top: number): Mat3 {
        if (typeof left !== 'number' || typeof right !== 'number' ||
            typeof bottom !== 'number' || typeof top !== 'number' ||
            isNaN(left) || isNaN(right) || isNaN(bottom) || isNaN(top)) {
            throw new TypeError('Expected finite numbers for all parameters');
        }
        if (left >= right || bottom >= top) {
            throw new RangeError('Invalid clipping planes');
        }
        const m = new Mat3();
        const w = 1 / (right - left);
        const h = 1 / (top - bottom);
        m.data[0] = 2 * w;
        m.data[4] = 2 * h;
        m.data[6] = -(right + left) * w;
        m.data[7] = -(top + bottom) * h;
        return m;
    }

    /**
     * Create a matrix from an array (alias for constructor + set)
     * @param arr - Array of 9 numbers
     * @returns new Mat3
     * @throws {TypeError} if arr is not a Float32Array or has insufficient length
     */
    static fromArray(arr: Float32Array): Mat3 {
        const m = new Mat3();
        m.set(arr);
        return m;
        }
}
