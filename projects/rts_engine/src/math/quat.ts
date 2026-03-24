import { Vec3 } from './vec3';

/**
 * Quaternion for rotation.
 * Stored as [x, y, z, w] in a Float32Array.
 */
export class Quat {
    private data: Float32Array;

    /**
     * Creates a new quaternion.
     * @param x - X component (default: 0)
     * @param y - Y component (default: 0)
     * @param z - Z component (default: 0)
     * @param w - W component (default: 1)
     */
    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
        this.data = new Float32Array([x, y, z, w]);
    }

    /**
     * Copies the values from another quaternion.
     * @param q - Source quaternion
     * @returns This quaternion for chaining
     * @throws {TypeError} If q is not a valid Quat instance
     */
    copy(q: Quat): Quat {
        if (!(q instanceof Quat)) {
            throw new TypeError('Expected a Quat instance');
        }
        this.data[0] = q.data[0];
        this.data[1] = q.data[1];
        this.data[2] = q.data[2];
        this.data[3] = q.data[3];
        return this;
    }

    /**
     * Creates a new quaternion with the same values as this one.
     * @returns New quaternion
     */
    clone(): Quat {
        return new Quat(this.data[0], this.data[1], this.data[2], this.data[3]);
    }

    /**
     * Sets this quaternion to the identity (no rotation).
     * @returns This quaternion for chaining
     */
    setIdentity(): Quat {
        this.data[0] = 0;
        this.data[1] = 0;
        this.data[2] = 0;
        this.data[3] = 1;
        return this;
    }

    /**
     * Computes the length (magnitude) of this quaternion.
     * @returns Length
     */
    length(): number {
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        const w = this.data[3];
        return Math.sqrt(x * x + y * y + z * z + w * w);
    }

    /**
     * Normalizes this quaternion in-place.
     * @returns This quaternion for chaining
     */
    normalize(): Quat {
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        const w = this.data[3];
        let len = x * x + y * y + z * z + w * w;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            this.data[0] = x * len;
            this.data[1] = y * len;
            this.data[2] = z * len;
            this.data[3] = w * len;
        }
        return this;
    }

    /**
     * Computes the conjugate of this quaternion.
     * @returns This quaternion for chaining
     */
    conjugate(): Quat {
        this.data[0] = -this.data[0];
        this.data[1] = -this.data[1];
        this.data[2] = -this.data[2];
        return this;
    }

    /**
     * Inverts this quaternion in-place.
     * @returns This quaternion for chaining
     */
    invert(): Quat {
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        const w = this.data[3];
        const len = x * x + y * y + z * z + w * w;
        if (len > 0) {
            const inv = 1 / len;
            this.data[0] = -x * inv;
            this.data[1] = -y * inv;
            this.data[2] = -z * inv;
            this.data[3] = w * inv;
        }
        return this;
    }

    /**
     * Multiplies this quaternion by another (this = this * q).
     * @param q - Right operand
     * @returns This quaternion for chaining
     * @throws {TypeError} If q is not a valid Quat instance
     */
    mul(q: Quat): Quat {
        if (!(q instanceof Quat)) {
            throw new TypeError('Expected a Quat instance');
        }
        const qx = q.data[0];
        const qy = q.data[1];
        const qz = q.data[2];
        const qw = q.data[3];
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        const w = this.data[3];
        this.data[0] = x * qw + w * qx + y * qz - z * qy;
        this.data[1] = y * qw + w * qy + z * qx - x * qz;
        this.data[2] = z * qw + w * qz + x * qy - y * qx;
        this.data[3] = w * qw - x * qx - y * qy - z * qz;
        return this;
    }

    /**
     * Rotates a 3D vector by this quaternion.
     * @param v - Vector to rotate
     * @returns Rotated vector
     * @throws {TypeError} If v is not a valid Vec3 instance
     */
    rotate(v: Vec3): Vec3 {
        if (!(v instanceof Vec3)) {
            throw new TypeError('Expected a Vec3 instance');
        }
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        const w = this.data[3];
        const vx = v.x;
        const vy = v.y;
        const vz = v.z;
        const ix = w * vx + y * vz - z * vy;
        const iy = w * vy + z * vx - x * vz;
        const iz = w * vz + x * vy - y * vx;
        const iw = -x * vx - y * vy - z * vz;
        return new Vec3(
            ix * w + iw * -x + iy * -z - iz * -y,
            iy * w + iw * -y + iz * -x - ix * -z,
            iz * w + iw * -z + ix * -y - iy * -x
        );
    }

    /**
     * Sets this quaternion from an axis-angle representation.
     * @param axis - Axis of rotation (must be non-zero)
     * @param angle - Angle in radians
     * @returns This quaternion for chaining
     * @throws {TypeError} If axis is not a valid Vec3 instance
     * @throws {RangeError} If axis is a zero vector
     */
    fromAxisAngle(axis: Vec3, angle: number): Quat {
        if (!(axis instanceof Vec3)) {
            throw new TypeError('Expected a Vec3 instance');
        }
        const halfAngle = angle * 0.5;
        const s = Math.sin(halfAngle);
        const a = axis.clone().normalize();
        if (isNaN(a.x) || isNaN(a.y) || isNaN(a.z)) {
            throw new RangeError('Axis must be non-zero');
        }
        this.data[0] = a.x * s;
        this.data[1] = a.y * s;
        this.data[2] = a.z * s;
        this.data[3] = Math.cos(halfAngle);
        return this;
    }

    /**
     * Sets this quaternion from Euler angles (intrinsic XYZ).
     * @param x - Pitch in radians
     * @param y - Yaw in radians
     * @param z - Roll in radians
     * @returns This quaternion for chaining
     */
    fromEuler(x: number, y: number, z: number): Quat {
        const sx = Math.sin(x * 0.5);
        const cx = Math.cos(x * 0.5);
        const sy = Math.sin(y * 0.5);
        const cy = Math.cos(y * 0.5);
        const sz = Math.sin(z * 0.5);
        const cz = Math.cos(z * 0.5);
        this.data[0] = sx * cy * cz - cx * sy * sz;
        this.data[1] = cx * sy * cz + sx * cy * sz;
        this.data[2] = cx * cy * sz - sx * sy * cz;
        this.data[3] = cx * cy * cz + sx * sy * sz;
        return this;
    }

    /**
     * Converts this quaternion to Euler angles (intrinsic XYZ).
     * @returns Euler angles as Vec3 (pitch, yaw, roll) in radians
     */
    toEuler(): Vec3 {
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        const w = this.data[3];
        const ysqr = y * y;
        const t0 = -2 * (x * x + ysqr) + 1;
        const t1 = 2 * (w * x + y * z);
        const t2 = -2 * (w * z - x * y);
        const t3 = 2 * (w * y + x * z);
        const t4 = -2 * (w * z - x * y);
        const pitch = Math.atan2(t3, t4);
        const roll = Math.atan2(t1, t0);
        let yaw = Math.asin(t2);
        if (t2 > 0.9999) {
            yaw = 2 * Math.atan2(x, w);
        } else if (t2 < -0.9999) {
            yaw = -2 * Math.atan2(x, w);
        }
        return new Vec3(pitch, yaw, roll);
    }

    /**
     * Spherical linear interpolation between this and another quaternion.
     * @param q - Target quaternion
     * @param t - Interpolation factor in [0, 1]
     * @returns This quaternion for chaining
     * @throws {TypeError} If q is not a valid Quat instance
     * @throws {RangeError} If t is not in [0, 1]
     */
    slerp(q: Quat, t: number): Quat {
        if (!(q instanceof Quat)) {
            throw new TypeError('Expected a Quat instance');
        }
        if (t < 0 || t > 1 || !isFinite(t)) {
            throw new RangeError('t must be in [0, 1]');
        }
        let x = this.data[0];
        let y = this.data[1];
        let z = this.data[2];
        let w = this.data[3];
        let qx = q.data[0];
        let qy = q.data[1];
        let qz = q.data[2];
        let qw = q.data[3];
        let cos = x * qx + y * qy + z * qz + w * qw;
        if (cos < 0) {
            qx = -qx;
            qy = -qy;
            qz = -qz;
            qw = -qw;
            cos = -cos;
        }
        let k0, k1;
        if (cos > 0.9999) {
            k0 = 1 - t;
            k1 = t;
        } else {
            const sin = Math.sqrt(1 - cos * cos);
            const angle = Math.atan2(sin, cos);
            const invSin = 1 / sin;
            k0 = Math.sin((1 - t) * angle) * invSin;
            k1 = Math.sin(t * angle) * invSin;
        }
        this.data[0] = x * k0 + qx * k1;
        this.data[1] = y * k0 + qy * k1;
        this.data[2] = z * k0 + qz * k1;
        this.data[3] = w * k0 + qw * k1;
        return this;
    }

    /**
     * Creates an identity quaternion (no rotation).
     * @returns New identity quaternion
     */
    static identity(): Quat {
        return new Quat(0, 0, 0, 1);
    }

    /**
     * Creates a quaternion from an axis and angle.
     * @param axis - Axis of rotation (must be non-zero)
     * @param angle - Angle in radians
     * @returns New quaternion
     * @throws {TypeError} If axis is not a valid Vec3 instance
     * @throws {RangeError} If axis is a zero vector
     */
    static fromAxisAngle(axis: Vec3, angle: number): Quat {
        return new Quat().fromAxisAngle(axis, angle);
    }

    /**
     * Creates a quaternion from Euler angles (intrinsic XYZ).
     * @param x - Pitch in radians
     * @param y - Yaw in radians
     * @param z - Roll in radians
     * @returns New quaternion
     */
    static fromEuler(x: number, y: number, z: number): Quat {
        return new Quat().fromEuler(x, y, z);
    }

    /**
     * Performs spherical linear interpolation between two quaternions.
     * @param a - Start quaternion
     * @param b - End quaternion
     * @param t - Interpolation factor in [0, 1]
     * @returns New interpolated quaternion
     * @throws {TypeError} If a or b are not valid Quat instances
     * @throws {RangeError} If t is not in [0, 1]
     */
    static slerp(a: Quat, b: Quat, t: number): Quat {
        if (!(a instanceof Quat) || !(b instanceof Quat)) {
            throw new TypeError('Expected Quat instances');
        }
        return a.clone().slerp(b, t);
    }

    /**
     * Dot product of two quaternions.
     * @param a - First quaternion
     * @param b - Second quaternion
     * @returns Dot product
     * @throws {TypeError} If a or b are not valid Quat instances
     */
    static dot(a: Quat, b: Quat): number {
        if (!(a instanceof Quat) || !(b instanceof Quat)) {
            throw new TypeError('Expected Quat instances');
        }
        return a.data[0] * b.data[0] +
               a.data[1] * b.data[1] +
               a.data[2] * b.data[2] +
               a.data[3] * b.data[3];
    }

    /**
     * Checks if two quaternions are approximately equal.
     * @param a - First quaternion
     * @param b - Second quaternion
     * @param epsilon - Tolerance (default: 1e-6)
     * @returns True if quaternions are approximately equal
     * @throws {TypeError} If a or b are not valid Quat instances
     */
    static equals(a: Quat, b: Quat, epsilon: number = 1e-6): boolean {
        if (!(a instanceof Quat) || !(b instanceof Quat)) {
            throw new TypeError('Expected Quat instances');
        }
        return Math.abs(a.data[0] - b.data[0]) < epsilon &&
               Math.abs(a.data[1] - b.data[1]) < epsilon &&
               Math.abs(a.data[2] - b.data[2]) < epsilon &&
               Math.abs(a.data[3] - b.data[3]) < epsilon;
    }
}
