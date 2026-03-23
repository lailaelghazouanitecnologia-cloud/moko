import { Vec3 } from './vec3';
import { Mat4 } from './mat4';

export class Quat {
    x: number;
    y: number;
    z: number;
    w: number;

    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    static IDENTITY = new Quat(0, 0, 0, 1);

    mul(q: Quat): Quat {
        const qx = this.x, qy = this.y, qz = this.z, qw = this.w;
        this.x = qx * q.w + qw * q.x + qy * q.z - qz * q.y;
        this.y = qy * q.w + qw * q.y + qz * q.x - qx * q.z;
        this.z = qz * q.w + qw * q.z + qx * q.y - qy * q.x;
        this.w = qw * q.w - qx * q.x - qy * q.y - qz * q.z;
        return this;
    }

    normalize(): Quat {
        const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        if (len > 0) {
            const inv = 1 / len;
            this.x *= inv;
            this.y *= inv;
            this.z *= inv;
            this.w *= inv;
        }
        return this;
    }

    static slerp(a: Quat, b: Quat, t: number): Quat {
        let ax = a.x, ay = a.y, az = a.z, aw = a.w;
        let bx = b.x, by = b.y, bz = b.z, bw = b.w;

        let cos = ax * bx + ay * by + az * bz + aw * bw;
        if (cos < 0) {
            bx = -bx; by = -by; bz = -bz; bw = -bw;
            cos = -cos;
        }

        let scale0, scale1;
        if (cos < 0.999999) {
            const omega = Math.acos(cos);
            const sin = Math.sin(omega);
            scale0 = Math.sin((1 - t) * omega) / sin;
            scale1 = Math.sin(t * omega) / sin;
        } else {
            scale0 = 1 - t;
            scale1 = t;
        }

        return new Quat(
            scale0 * ax + scale1 * bx,
            scale0 * ay + scale1 * by,
            scale0 * az + scale1 * bz,
            scale0 * aw + scale1 * bw
        );
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
        const te = m.data;
        const m11 = te[0], m12 = te[4], m13 = te[8];
        const m21 = te[1], m22 = te[5], m23 = te[9];
        const m31 = te[2], m32 = te[6], m33 = te[10];
        const trace = m11 + m22 + m33;

        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1);
            this.w = 0.25 / s;
            this.x = (m32 - m23) * s;
            this.y = (m13 - m31) * s;
            this.z = (m21 - m12) * s;
        } else if (m11 > m22 && m11 > m33) {
            const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
            this.w = (m32 - m23) / s;
            this.x = 0.25 * s;
            this.y = (m12 + m21) / s;
            this.z = (m13 + m31) / s;
        } else if (m22 > m33) {
            const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
            this.w = (m13 - m31) / s;
            this.x = (m12 + m21) / s;
            this.y = 0.25 * s;
            this.z = (m23 + m32) / s;
        } else {
            const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
            this.w = (m21 - m12) / s;
            this.x = (m13 + m31) / s;
            this.y = (m23 + m32) / s;
            this.z = 0.25 * s;
        }
        return this;
    }

    getEulerAngles(): Vec3 {
        const x = this.x, y = this.y, z = this.z, w = this.w;
        const ysqr = y * y;

        const t0 = 2 * (w * x + y * z);
        const t1 = 1 - 2 * (x * x + ysqr);
        const roll = Math.atan2(t0, t1);

        let t2 = 2 * (w * y - z * x);
        t2 = t2 > 1 ? 1 : t2;
        t2 = t2 < -1 ? -1 : t2;
        const pitch = Math.asin(t2);

        const t3 = 2 * (w * z + x * y);
        const t4 = 1 - 2 * (ysqr + z * z);
        const yaw = Math.atan2(t3, t4);

        return new Vec3(roll, pitch, yaw);
    }

    transformVector(v: Vec3): Vec3 {
        const qx = this.x, qy = this.y, qz = this.z, qw = this.w;
        const vx = v.x, vy = v.y, vz = v.z;

        const ix = qw * vx + qy * vz - qz * vy;
        const iy = qw * vy + qz * vx - qx * vz;
        const iz = qw * vz + qx * vy - qy * vx;
        const iw = -qx * vx - qy * vy - qz * vz;

        return new Vec3(
            ix * qw + iw * -qx + iy * -qz - iz * -qy,
            iy * qw + iw * -qy + iz * -qx - ix * -qz,
            iz * qw + iw * -qz + ix * -qy - iy * -qx
        );
    }

    conjugate(): Quat {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    inverse(): Quat {
        const len = this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
        if (len > 0) {
            const inv = 1 / len;
            this.x *= -inv;
            this.y *= -inv;
            this.z *= -inv;
            this.w *= inv;
        }
        return this;
    }
}
