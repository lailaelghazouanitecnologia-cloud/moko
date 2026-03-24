import { Vec3 } from './vec3';
import { Mat4 } from './mat4';
import { Vec4 } from './vec4';

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

    slerp(q: Quat, t: number): Quat {
        const ax = this.x, ay = this.y, az = this.z, aw = this.w;
        const bx = q.x, by = q.y, bz = q.z, bw = q.w;

        let omega, cosom, sinom, scale0, scale1;

        cosom = ax * bx + ay * by + az * bz + aw * bw;

        if (cosom < 0.0) {
            cosom = -cosom;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }

        if (1.0 - cosom > 0.000001) {
            omega = Math.acos(cosom);
            sinom = Math.sin(omega);
            scale0 = Math.sin((1.0 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        } else {
            scale0 = 1.0 - t;
            scale1 = t;
        }

        const out = new Quat();
        out.x = scale0 * ax + scale1 * bx;
        out.y = scale0 * ay + scale1 * by;
        out.z = scale0 * az + scale1 * bz;
        out.w = scale0 * aw + scale1 * bw;
        return out;
    }

    setFromEulerAngles(ex: number, ey: number, ez: number): Quat {
        const sx = Math.sin(ex * 0.5);
        const cx = Math.cos(ex * 0.5);
        const sy = Math.sin(ey * 0.5);
        const cy = Math.cos(ey * 0.5);
        const sz = Math.sin(ez * 0.5);
        const cz = Math.cos(ez * 0.5);

        this.x = sx * cy * cz - cx * sy * sz;
        this.y = cx * sy * cz + sx * cy * sz;
        this.z = cx * cy * sz - sx * sy * cz;
        this.w = cx * cy * cz + sx * sy * sz;
        return this;
    }

    setFromMat4(m: Mat4): Quat {
        const m00 = m.data[0];
        const m01 = m.data[1];
        const m02 = m.data[2];
        const m10 = m.data[4];
        const m11 = m.data[5];
        const m12 = m.data[6];
        const m20 = m.data[8];
        const m21 = m.data[9];
        const m22 = m.data[10];
        const trace = m00 + m11 + m22;

        let s: number;

        if (trace > 0) {
            s = 0.5 / Math.sqrt(trace + 1.0);
            this.w = 0.25 / s;
            this.x = (m21 - m12) * s;
            this.y = (m02 - m20) * s;
            this.z = (m10 - m01) * s;
        } else if (m00 > m11 && m00 > m22) {
            s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
            this.w = (m21 - m12) / s;
            this.x = 0.25 * s;
            this.y = (m01 + m10) / s;
            this.z = (m02 + m20) / s;
        } else if (m11 > m22) {
            s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
            this.w = (m02 - m20) / s;
            this.x = (m01 + m10) / s;
            this.y = 0.25 * s;
            this.z = (m12 + m21) / s;
        } else {
            s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
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

        return new Vec3(vx + uvx + uuvx, vy + uvy + uuvy, vz + uvz + uuvz);
    }

    mul(q: Quat): Quat {
        const q1x = this.x, q1y = this.y, q1z = this.z, q1w = this.w;
        const q2x = q.x, q2y = q.y, q2z = q.z, q2w = q.w;

        return new Quat(
            q1x * q2w + q1w * q2x + q1y * q2z - q1z * q2y,
            q1y * q2w + q1w * q2y + q1z * q2x - q1x * q2z,
            q1z * q2w + q1w * q2z + q1x * q2y - q1y * q2x,
            q1w * q2w - q1x * q2x - q1y * q2y - q1z * q2z
        );
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

    getEulerAngles(): Vec3 {
        const x = this.x, y = this.y, z = this.z, w = this.w;
        const ysqr = y * y;

        const t0 = 2 * (w * x + y * z);
        const t1 = 1 - 2 * (x * x + ysqr);
        const ex = Math.atan2(t0, t1);

        let t2 = 2 * (w * y - z * x);
        t2 = t2 > 1 ? 1 : t2;
        t2 = t2 < -1 ? -1 : t2;
        const ey = Math.asin(t2);

        const t3 = 2 * (w * z + x * y);
        const t4 = 1 - 2 * (ysqr + z * z);
        const ez = Math.atan2(t3, t4);

        return new Vec3(ex, ey, ez);
    }

    conjugate(): Quat {
        return new Quat(-this.x, -this.y, -this.z, this.w);
    }

    invert(): Quat {
        const len = this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
        if (len > 0) {
            const inv = 1 / len;
            return new Quat(-this.x * inv, -this.y * inv, -this.z * inv, this.w * inv);
        }
        return new Quat();
    }

    static identity(): Quat {
        return new Quat(0, 0, 0, 1);
    }

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
}
