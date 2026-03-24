import { Vec2 } from './vec2';
import { Vec3 } from './vec3';

/**
 * A 3x3 matrix stored in column-major order.
 */
export class Mat3 {
    private data: Float32Array;

    /**
     * Creates a new 3x3 matrix.
     * @param m Optional array of 9 numbers to initialize the matrix. If not provided, the identity matrix is used.
     * @throws {TypeError} If m is not an array of 9 numbers.
     */
    constructor(m?: number[]) {
        this.data = new Float32Array(9);
        if (m !== undefined) {
            if (!Array.isArray(m)) {
                throw new TypeError('Expected m to be an array');
            }
            if (m.length !== 9) {
                throw new RangeError('Expected m to contain exactly 9 numbers');
            }
            for (let i = 0; i < 9; i++) {
                if (typeof m[i] !== 'number' || !isFinite(m[i])) {
                    throw new TypeError(`Expected m[${i}] to be a finite number`);
                }
            }
            this.data.set(m);
        } else {
            this.setIdentity();
        }
    }

    /**
     * Creates a copy of the provided matrix.
     * @param m The matrix to copy.
     * @returns A new Mat3 instance with the same values as m.
     * @throws {TypeError} If m is not an instance of Mat3.
     */
    copy(m: Mat3): Mat3 {
        if (!(m instanceof Mat3)) {
            throw new TypeError('Expected m to be an instance of Mat3');
        }
        const result = new Mat3();
        result.data.set(m.data);
        return result;
    }

    /**
     * Creates a copy of this matrix.
     * @returns A new Mat3 instance with the same values as this.
     */
    clone(): Mat3 {
        return this.copy(this);
    }

    /**
     * Returns the identity matrix. This is a static method; use Mat3.identity().
     * @returns A new identity matrix.
     */
    identity(): Mat3 {
        return Mat3.identity();
    }

    /**
     * Sets this matrix to the identity matrix.
     * @returns This matrix for chaining.
     */
    setIdentity(): Mat3 {
        const m = this.data;
        m[0] = 1; m[1] = 0; m[2] = 0;
        m[3] = 0; m[4] = 1; m[5] = 0;
        m[6] = 0; m[7] = 0; m[8] = 1;
        return this;
    }

    /**
     * Computes the transpose of this matrix.
     * @returns A new Mat3 which is the transpose of this.
     */
    transpose(): Mat3 {
        const m = this.data;
        const result = new Mat3();
        const r = result.data;
        r[0] = m[0]; r[1] = m[3]; r[2] = m[6];
        r[3] = m[1]; r[4] = m[4]; r[5] = m[7];
        r[6] = m[2]; r[7] = m[5]; r[8] = m[8];
        return result;
    }

    /**
     * Computes the inverse of this matrix.
     * @returns A new Mat3 which is the inverse of this. If this matrix is singular, returns a clone of this.
     */
    invert(): Mat3 {
        const m = this.data;
        const result = new Mat3();
        const r = result.data;

        const a00 = m[0], a01 = m[1], a02 = m[2];
        const a10 = m[3], a11 = m[4], a12 = m[5];
        const a20 = m[6], a21 = m[7], a22 = m[8];

        const b01 = a22 * a11 - a12 * a21;
        const b11 = -a22 * a10 + a12 * a20;
        const b21 = a21 * a10 - a11 * a20;

        let det = a00 * b01 + a01 * b11 + a02 * b21;
        if (Math.abs(det) < 1e-10) {
            return this.clone();
        }
        det = 1.0 / det;

        r[0] = b01 * det;
        r[1] = (-a22 * a01 + a02 * a21) * det;
        r[2] = (a12 * a01 - a02 * a11) * det;
        r[3] = b11 * det;
        r[4] = (a22 * a00 - a02 * a20) * det;
        r[5] = (-a12 * a00 + a02 * a10) * det;
        r[6] = b21 * det;
        r[7] = (-a21 * a00 + a01 * a20) * det;
        r[8] = (a11 * a00 - a01 * a10) * det;

        return result;
    }

    /**
     * Multiplies this matrix by another matrix (this * m).
     * @param m The right-hand matrix.
     * @returns A new Mat3 representing the product.
     * @throws {TypeError} If m is not an instance of Mat3.
     */
    mul(m: Mat3): Mat3 {
        if (!(m instanceof Mat3)) {
            throw new TypeError('Expected m to be an instance of Mat3');
        }
        const a = this.data;
        const b = m.data;
        const result = new Mat3();
        const r = result.data;

        const a00 = a[0], a01 = a[1], a02 = a[2];
        const a10 = a[3], a11 = a[4], a12 = a[5];
        const a20 = a[6], a21 = a[7], a22 = a[8];

        const b00 = b[0], b01 = b[1], b02 = b[2];
        const b10 = b[3], b11 = b[4], b12 = b[5];
        const b20 = b[6], b21 = b[7], b22 = b[8];

        r[0] = a00 * b00 + a10 * b01 + a20 * b02;
        r[1] = a01 * b00 + a11 * b01 + a21 * b02;
        r[2] = a02 * b00 + a12 * b01 + a22 * b02;
        r[3] = a00 * b10 + a10 * b11 + a20 * b12;
        r[4] = a01 * b10 + a11 * b11 + a21 * b12;
        r[5] = a02 * b10 + a12 * b11 + a22 * b12;
        r[6] = a00 * b20 + a10 * b21 + a20 * b22;
        r[7] = a01 * b20 + a11 * b21 + a21 * b22;
        r[8] = a02 * b20 + a12 * b21 + a22 * b22;

        return result;
    }

    /**
     * Transforms a 3D vector by this matrix.
     * @param v The vector to transform.
     * @returns A new Vec3 which is the transformed vector.
     * @throws {TypeError} If v is not an instance of Vec3.
     */
    transform(v: Vec3): Vec3 {
        if (!(v instanceof Vec3)) {
            throw new TypeError('Expected v to be an instance of Vec3');
        }
        const m = this.data;
        const x = v.x, y = v.y, z = v.z;
        return new Vec3(
            m[0] * x + m[3] * y + m[6] * z,
            m[1] * x + m[4] * y + m[7] * z,
            m[2] * x + m[5] * y + m[8] * z
        );
    }

    /**
     * Creates a translation matrix and multiplies this matrix by it.
     * @param v The translation vector.
     * @returns A new Mat3 representing the translated matrix.
     * @throws {TypeError} If v is not an instance of Vec2.
     */
    translate(v: Vec2): Mat3 {
        if (!(v instanceof Vec2)) {
            throw new TypeError('Expected v to be an instance of Vec2');
        }
        const result = this.clone();
        const m = result.data;
        const x = v.x, y = v.y;
        m[6] += x;
        m[7] += y;
        return result;
    }

    /**
     * Creates a rotation matrix and multiplies this matrix by it.
     * @param angle The rotation angle in radians.
     * @returns A new Mat3 representing the rotated matrix.
     * @throws {TypeError} If angle is not a finite number.
     */
    rotate(angle: number): Mat3 {
        if (typeof angle !== 'number' || !isFinite(angle)) {
            throw new TypeError('Expected angle to be a finite number');
        }
        const result = new Mat3();
        const r = result.data;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        r[0] = c; r[1] = s; r[2] = 0;
        r[3] = -s; r[4] = c; r[5] = 0;
        r[6] = 0; r[7] = 0; r[8] = 1;
        return this.mul(result);
    }

    /**
     * Creates a scale matrix and multiplies this matrix by it.
     * @param v The scale vector.
     * @returns A new Mat3 representing the scaled matrix.
     * @throws {TypeError} If v is not an instance of Vec2.
     */
    scale(v: Vec2): Mat3 {
        if (!(v instanceof Vec2)) {
            throw new TypeError('Expected v to be an instance of Vec2');
        }
        const result = new Mat3();
        const s = v;
        const r = result.data;
        r[0] = s.x; r[1] = 0; r[2] = 0;
        r[3] = 0; r[4] = s.y; r[5] = 0;
        r[6] = 0; r[7] = 0; r[8] = 1;
        return this.mul(result);
    }

    /**
     * Creates a matrix from translation, rotation, and scale.
     * @param t Translation vector.
     * @param r Rotation angle in radians.
     * @param s Scale vector.
     * @returns A new Mat3 composed from the transform components.
     * @throws {TypeError} If t or s are not instances of Vec2, or if r is not a finite number.
     */
    fromTRS(t: Vec2, r: number, s: Vec2): Mat3 {
        if (!(t instanceof Vec2)) {
            throw new TypeError('Expected t to be an instance of Vec2');
        }
        if (!(s instanceof Vec2)) {
            throw new TypeError('Expected s to be an instance of Vec2');
        }
        if (typeof r !== 'number' || !isFinite(r)) {
            throw new TypeError('Expected r to be a finite number');
        }
        const result = new Mat3();
        const m = result.data;

        const c = Math.cos(r);
        const sin = Math.sin(r);

        const sx = s.x, sy = s.y;
        const tx = t.x, ty = t.y;

        m[0] = c * sx;
        m[1] = sin * sx;
        m[2] = 0;
        m[3] = -sin * sy;
        m[4] = c * sy;
        m[5] = 0;
        m[6] = tx;
        m[7] = ty;
        m[8] = 1;

        return result;
    }

    /**
     * Returns the identity matrix.
     * @returns A new identity matrix.
     */
    static identity(): Mat3 {
        const m = new Mat3();
        m.setIdentity();
        return m;
    }
}
