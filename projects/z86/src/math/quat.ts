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

    static IDENTITY(): Quat {
        return new Quat(0, 0, 0, 1);
    }

    conjugate(): Quat {
        return new Quat(-this.x, -this.y, -this.z, this.w);
    }

    inverse(): Quat {
        const lenSq = this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
        if (lenSq === 0) return new Quat();
        const inv = 1 / lenSq;
        return new Quat(-this.x * inv, -this.y * inv, -this.z * inv, this.w * inv);
    }

    slerp(q: Quat, t: number): Quat {
        let qx = q.x;
        let qy = q.y;
        let qz = q.z;
        let qw = q.w;

        let dot = this.x * qx + this.y * qy + this.z * qz + this.w * qw;

        if (dot < 0) {
            dot = -dot;
            qx = -qx;
            qy = -qy;
            qz = -qz;
            qw = -qw;
        }

        if (dot > 0.9995) {
            const rx = this.x + t * (qx - this.x);
            const ry = this.y + t * (qy - this.y);
            const rz = this.z + t * (qz - this.z);
            const rw = this.w + t * (qw - this.w);
            const len = 1 / Math.sqrt(rx * rx + ry * ry + rz * rz + rw * rw);
            return new Quat(rx * len, ry * len, rz * len, rw * len);
        }

        const theta = Math.acos(dot);
        const sinTheta = Math.sin(theta);
        const invSinTheta = 1 / sinTheta;

        const w1 = Math.sin((1 - t) * theta) * invSinTheta;
        const w2 = Math.sin(t * theta) * invSinTheta;

        return new Quat(
            this.x * w1 + qx * w2,
            this.y * w1 + qy * w2,
            this.z * w1 + qz * w2,
            this.w * w1 + qw * w2
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
        const data = m.data;
        const m00 = data[0];
        const m01 = data[1];
        const m02 = data[2];
        const m10 = data[4];
        const m11 = data[5];
        const m12 = data[6];
        const m20 = data[8];
        const m21 = data[9];
        const m22 = data[10];

        const trace = m00 + m11 + m22;
        let s: number;

        if (trace > 0) {
            s = 0.5 / Math.sqrt(trace + 1);
            this.w = 0.25 / s;
            this.x = (m21 - m12) * s;
            this.y = (m02 - m20) * s;
            this.z = (m10 - m01) * s;
        } else if (m00 > m11 && m00 > m22) {
            s = 2 * Math.sqrt(1 + m00 - m11 - m22);
            this.w = (m21 - m12) / s;
            this.x = 0.25 * s;
            this.y = (m01 + m10) / s;
            this.z = (m02 + m20) / s;
        } else if (m11 > m22) {
            s = 2 * Math.sqrt(1 + m11 - m00 - m22);
            this.w = (m02 - m20) / s;
            this.x = (m01 + m10) / s;
            this.y = 0.25 * s;
            this.z = (m12 + m21) / s;
        } else {
            s = 2 * Math.sqrt(1 + m22 - m00 - m11);
            this.w = (m10 - m01) / s;
            this.x = (m02 + m20) / s;
            this.y = (m12 + m21) / s;
            this.z = 0.25 * s;
        }

        return this;
    }

    transformVector(v: Vec3): Vec3 {
        const qx = this.x;
        const qy = this.y;
        const qz = this.z;
        const qw = this.w;

        const vx = v.x;
        const vy = v.y;
        const vz = v.z;

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

        return new Vec3(
            vx + uvx + uuvx,
            vy + uvy + uuvy,
            vz + uvz + uuvz
        );
    }

    mul(q: Quat): Quat {
        const q1x = this.x;
        const q1y = this.y;
        const q1z = this.z;
        const q1w = this.w;

        const q2x = q.x;
        const q2y = q.y;
        const q2z = q.z;
        const q2w = q.w;

        return new Quat(
            q1w * q2x + q1x * q2w + q1y * q2z - q1z * q2y,
            q1w * q2y - q1x * q2z + q1y * q2w + q1z * q2x,
            q1w * q2z + q1x * q2y - q1y * q2x + q1z * q2w,
            q1w * q2w - q1x * q2x - q1y * q2y - q1z * q2z
        );
    }

    normalize(): Quat {
        const len = 1 / Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        this.x *= len;
        this.y *= len;
        this.z *= len;
        this.w *= len;
        return this;
    }

    getEulerAngles(): Vec3 {
        const x = this.x;
        const y = this.y;
        const z = this.z;
        const w = this.w;

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
}
