import { Vec3 } from './vec3';
import { Vec4 } from './vec4';

/**
 * 4x4 column-major matrix.
 */
export class Mat4 {
    public readonly data: Float32Array;

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
     * Applies a translation to this matrix.
     * @param v The translation vector.
     * @returns This matrix for chaining.
     * @throws {TypeError} If v is not a valid Vec3.
     */
    translate(v: Vec3): Mat4 {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new TypeError('Invalid Vec3 provided to translate');
        }
        const d = this.data;
        const x = v.x, y = v.y, z = v.z;
        d[12] = d[0] * x + d[4] * y + d[8] * z + d[12];
        d[13] = d[1] * x + d[5] * y + d[9] * z + d[13];
        d[14] = d[2] * x + d[6] * y + d[10] * z + d[14];
        d[15] = d[3] * x + d[7] * y + d[11] * z + d[15];
        return this;
    }

    /**
     * Applies a rotation to this matrix.
     * @param angle The angle in radians.
     * @param axis The axis of rotation.
     * @returns This matrix for chaining.
     * @throws {TypeError} If axis is not a valid Vec3.
     */
    rotate(angle: number, axis: Vec3): Mat4 {
        if (!axis || typeof axis.x !== 'number' || typeof axis.y !== 'number' || typeof axis.z !== 'number') {
            throw new TypeError('Invalid Vec3 provided as axis');
        }
        const d = this.data;
        const x = axis.x, y = axis.y, z = axis.z;
        const len = Math.sqrt(x * x + y * y + z * z);
        if (len < 0.000001) return this;
        const invLen = 1 / len;
        const nx = x * invLen, ny = y * invLen, nz = z * invLen;
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const t = 1 - c;
        const a00 = d[0], a01 = d[1], a02 = d[2], a03 = d[3];
        const a10 = d[4], a11 = d[5], a12 = d[6], a13 = d[7];
        const a20 = d[8], a21 = d[9], a22 = d[10], a23 = d[11];
        const b00 = nx * nx * t + c, b01 = ny * nx * t + nz * s, b02 = nz * nx * t - ny * s;
        const b10 = nx * ny * t - nz * s, b11 = ny * ny * t + c, b12 = nz * ny * t + nx * s;
        const b20 = nx * nz * t + ny * s, b21 = ny * nz * t - nx * s, b22 = nz * nz * t + c;
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

    /**
     * Applies a scaling to this matrix.
     * @param v The scaling vector.
     * @returns This matrix for chaining.
     * @throws {TypeError} If v is not a valid Vec3.
     */
    scale(v: Vec3): Mat4 {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new TypeError('Invalid Vec3 provided to scale');
        }
        const d = this.data;
        const x = v.x, y = v.y, z = v.z;
        d[0] *= x; d[1] *= x; d[2] *= x; d[3] *= x;
        d[4] *= y; d[5] *= y; d[6] *= y; d[7] *= y;
        d[8] *= z; d[9] *= z; d[10] *= z; d[11] *= z;
        return this;
    }

    /**
     * Multiplies this matrix by another matrix in place.
     * @param m The matrix to multiply by.
     * @returns This matrix for chaining.
     * @throws {TypeError} If m is not a valid Mat4.
     */
    multiply(m: Mat4): Mat4 {
        if (!m || !(m instanceof Mat4)) {
            throw new TypeError('Invalid Mat4 provided to multiply');
        }
        const a = this.data, b = m.data;
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
        let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        a[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        a[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        a[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        a[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        a[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        a[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        a[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        a[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        a[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        a[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        a[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        a[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        a[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        a[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        a[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        a[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        return this;
    }

    /**
     * Inverts this matrix in place.
     * @returns This matrix for chaining.
     * @remarks If the matrix is singular, it is left unchanged.
     */
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
        det = 1 / det;
        d[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        d[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        d[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        d[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        d[4] = (a12 * b08 - a10 * b11 - a13 *b07) * det;
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

    /**
     * Transposes this matrix in place.
     * @returns This matrix for chaining.
     */
    transpose(): Mat4 {
        const d = this.data;
        let t;
        t = d[1]; d[1] = d[4]; d[4] = t;
        t = d[2]; d[2] = d[8]; d[8] = t;
        t = d[3]; d[3] = d[12]; d[12] = t;
        t = d[6]; d[6] = d[9]; d[9] = t;
        t = d[7]; d[7] = d[13]; d[13] = t;
        t = d[11]; d[11] = d[14]; d[14] = t;
        return this;
    }

    /**
     * Sets this matrix to a perspective projection matrix.
     * @param fovy The vertical field of view in radians.
     * @param aspect The aspect ratio (width / height).
     * @param near The near clipping plane.
     * @param far The far clipping plane.
     * @returns This matrix for chaining.
     * @throws {RangeError} If any parameter is non-positive or if near >= far.
     */
    perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
        if (fovy <= 0 || aspect <= 0 || near <= 0 || far <= 0 || near >= far) {
            throw new RangeError('Invalid perspective parameters');
        }
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        const d = this.data;
        d[0] = f / aspect; d[1] = 0; d[2] = 0; d[3] = 0;
        d[4] = 0; d[5] = f; d[6] = 0; d[7] = 0;
        d[8] = 0; d[9] = 0; d[10] = (far + near) * nf; d[11] = -1;
        d[12] = 0; d[13] = 0; d[14] = 2 * far * near * nf; d[15] = 0;
        return this;
    }

    /**
     * Sets this matrix to a look-at view matrix.
     * @param eye The eye position.
     * @param center The target position.
     * @param up The up vector.
     * @returns This matrix for chaining.
     * @throws {TypeError} If any vector is invalid.
     */
    lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
        if (!eye || !center || !up ||
            typeof eye.x !== 'number' || typeof eye.y !== 'number' || typeof eye.z !== 'number' ||
            typeof center.x !== 'number' || typeof center.y !== 'number' || typeof center.z !== 'number' ||
            typeof up.x !== 'number' || typeof up.y !== 'number' || typeof up.z !== 'number') {
            throw new TypeError('Invalid Vec3 parameters provided to lookAt');
        }
        const d = this.data;
        const zx = eye.x - center.x;
        const zy = eye.y - center.y;
        const zz = eye.z - center.z;
        let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
        if (!len) return this.identity();
        const invLen = 1 / len;
        const zAxisX = zx * invLen;
        const zAxisY = zy * invLen;
        const zAxisZ = zz * invLen;
        let xx = up.y * zAxisZ - up.z * zAxisY;
        let xy = up.z * zAxisX - up.x * zAxisZ;
        let xz = up.x * zAxisY - up.y * zAxisX;
        len = Math.sqrt(xx * xx + xy * xy + xz * xz);
        if (!len) {
            xx = 0; xy = 0; xz = 0;
        } else {
            const invLen2 = 1 / len;
            xx *= invLen2; xy *= invLen2; xz *= invLen2;
        }
        const yx = zAxisY * xz - zAxisZ * xy;
        const yy = zAxisZ * xx - zAxisX * xz;
        const yz = zAxisX * xy - zAxisY * xx;
        d[0] = xx; d[1] = xy; d[2] = xz; d[3] = 0;
        d[4] = yx; d[5] = yy; d[6] = yz; d[7] = 0;
        d[8] = zAxisX; d[9] = zAxisY; d[10] = zAxisZ; d[11] = 0;
        d[12] = eye.x; d[13] = eye.y; d[14] = eye.z; d[15] = 1;
        return this;
    }

    /**
     * Transforms a 4D vector by this matrix.
     * @param v The vector to transform.
     * @returns A new transformed Vec4.
     * @throws {TypeError} If v is not a valid Vec4.
     */
    transformVec4(v: Vec4): Vec4 {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number' || typeof v.w !== 'number') {
            throw new TypeError('Invalid Vec4 provided to transformVec4');
        }
        const d = this.data;
        const x = v.x, y = v.y, z = v.z, w = v.w;
        return new Vec4(
            d[0] * x + d[4] * y + d[8] * z + d[12] * w,
            d[1] * x + d[5] * y + d[9] * z + d[13] * w,
            d[2] * x + d[6] * y + d[10] * z + d[14] * w,
            d[3] * x + d[7] * y + d[11] * z + d[15] * w
        );
    }
}
