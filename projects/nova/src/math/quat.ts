import { Vec3 } from './vec3';
import { Mat4 } from './mat4';

export class Quat {
    x: number;
    y: number;
    z: number;
    w: number;

    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    static IDENTITY = new Quat(0, 0, 0, 1);

    clone(): Quat {
        return new Quat(this.x, this.y, this.z, this.w);
    }

    copy(q: Quat): Quat {
        this.x = q.x;
        this.y = q.y;
        this.z = q.z;
        this.w = q.w;
        return this;
    }

    conjugate(): Quat {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    invert(): Quat {
        const lenSq = this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
        if (lenSq > 0) {
            const invLen = 1 / lenSq;
            this.x *= -invLen;
            this.y *= -invLen;
            this.z *= -invLen;
            this.w *= invLen;
        }
        return this;
    }

    normalize(): Quat {
        const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        if (len > 0) {
            const invLen = 1 / len;
            this.x *= invLen;
            this.y *= invLen;
            this.z *= invLen;
            this.w *= invLen;
        }
        return this;
    }

    mul(q: Quat): Quat {
        const qx = this.x, qy = this.y, qz = this.z, qw = this.w;
        this.x = qx * q.w + qw * q.x + qy * q.z - qz * q.y;
        this.y = qy * q.w + qw * q.y + qz * q.x - qx * q.z;
        this.z = qz * q.w + qw * q.z + qx * q.y - qy * q.x;
        this.w = qw * q.w - qx * q.x - qy * q.y - qz * q.z;
        return this;
    }

    slerp(q: Quat, t: number): Quat {
        let ax = this.x, ay = this.y, az = this.z, aw = this.w;
        let bx = q.x, by = q.y, bz = q.z, bw = q.w;

        let omega, cosom, sinom, scale0, scale1;

        cosom = ax * bx + ay * by + az * bz + aw * bw;

        if (cosom < 0) {
            cosom = -cosom;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }

        if (1 - cosom > 0.000001) {
            omega = Math.acos(cosom);
            sinom = Math.sin(omega);
            scale0 = Math.sin((1 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        } else {
            scale0 = 1 - t;
            scale1 = t;
        }

        this.x = scale0 * ax + scale1 * bx;
        this.y = scale0 * ay + scale1 * by;
        this.z = scale0 * az + scale1 * bz;
        this.w = scale0 * aw + scale1 * bw;

        return this;
    }

    setFromEulerAngles(x: number, y: number, z: number): Quat {
        const sx = Math.sin(x * 0.5);
        const cx = Math.cos(x * 0.5);
        const sy = Math.sin(y * 0.5);
        const cy = Math.cos(y * 0.5);
        const sz = Math.sin(z * 0.5);
        const cz = Math.cos(z * 0.5);

        this.x = sx * cy * cz - cx * sy * sz;
        this.y = cx * sy * cz + sx * cy * sz;
        this.z = cx * cy * sz - sx * sy * cz;
        this.w = cx * cy * cz + sx * sy * sz;

        return this;
    }

    setFromMat4(m: Mat4): Quat {
        const m00 = m.data[0], m01 = m.data[4], m02 = m.data[8];
        const m10 = m.data[1], m11 = m.data[5], m12 = m.data[9];
        const m20 = m.data[2], m21 = m.data[6], m22 = m.data[10];
        const trace = m00 + m11 + m22;

        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1);
            this.w = 0.25 / s;
            this.x = (m21 - m12) * s;
            this.y = (m02 - m20) * s;
            this.z = (m10 - m01) * s;
        } else if (m00 > m11 && m00 > m22) {
            const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
            this.w = (m21 - m12) / s;
            this.x = 0.25 * s;
            this.y = (m01 + m10) / s;
            this.z = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
            this.w = (m02 - m20) / s;
            this.x = (m01 + m10) / s;
            this.y = 0.25 * s;
            this.z = (m12 + m21) / s;
        } else {
            const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
            this.w = (m10 - m01) / s;
            this.x = (m02 + m20) / s;
            this.y = (m12 + m21) / s;
            this.z = 0.25 * s;
        }

        return this;
    }

    transformVector(v: Vec3): Vec3 {
        const qx = this.x, qy = this.y, qz = this.z, qw = this.w;
        const vx = v.x, vy = v.y, vz = v.z;

        const uvx = qy * vz - qz * vy;
        const uvy = qz * vx - qx * vz;
        const uvz = qx * vy - qy * vx;

        const uuvx = qy * uvz - qz * uvy;
        const uuvy = qz * uvx - qx * uvz;
        const uuvz = qx * uvy - qy * uvx;

        const w2 = qw * 2;
        uvx *= w2;
        uvy *= w2;
        uvz *= w2;

        uuvx *= 2;
        uuvy *= 2;
        uuvz *= 2;

        v.x = vx + uvx + uuvx;
        v.y = vy + uvy + uuvy;
        v.z = vz + uvz + uuvz;

        return v;
    }

    getEulerAngles(): Vec3 {
        const x = this.x, y = this.y, z = this.z, w = this.w;
        const sx = 2 * (w * x + y * z);
        const cx = 1 - 2 * (x * x + y * y);
        const sy = 2 * (w * y - z * x);
        const cy = 1 - 2 * (y * y + z * z);
        const sz = 2 * (w * z + x * y);
        const cz = 1 - 2 * (x * x + z * z);

        return new Vec3(
            Math.atan2(sx, cx),
            Math.asin(Math.max(-1, Math.min(1, sy))),
            Math.atan2(sz, cz)
        );
    }
}
