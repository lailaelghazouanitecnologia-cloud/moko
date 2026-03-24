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

    mul(rhs: Quat): Quat {
        const qx = this.x;
        const qy = this.y;
        const qz = this.z;
        const qw = this.w;

        this.x = qx * rhs.w + qw * rhs.x + qy * rhs.z - qz * rhs.y;
        this.y = qy * rhs.w + qw * rhs.y + qz * rhs.x - qx * rhs.z;
        this.z = qz * rhs.w + qw * rhs.z + qx * rhs.y - qy * rhs.x;
        this.w = qw * rhs.w - qx * rhs.x - qy * rhs.y - qz * rhs.z;
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

    slerp(rhs: Quat, t: number): Quat {
        const ax = this.x;
        const ay = this.y;
        const az = this.z;
        const aw = this.w;

        let bx = rhs.x;
        let by = rhs.y;
        let bz = rhs.z;
        let bw = rhs.w;

        let dot = ax * bx + ay * by + az * bz + aw * bw;

        if (dot < 0) {
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
            dot = -dot;
        }

        if (dot > 0.9995) {
            this.x = ax + t * (bx - ax);
            this.y = ay + t * (by - ay);
            this.z = az + t * (bz - az);
            this.w = aw + t * (bw - aw);
            this.normalize();
            return this;
        }

        const omega = Math.acos(dot);
        const sinOmega = Math.sin(omega);
        const scale0 = Math.sin((1 - t) * omega) / sinOmega;
        const scale1 = Math.sin(t * omega) / sinOmega;

        this.x = scale0 * ax + scale1 * bx;
        this.y = scale0 * ay + scale1 * by;
        this.z = scale0 * az + scale1 * bz;
        this.w = scale0 * aw + scale1 * bw;

        return this;
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

    setFromMat4(m: { data: Float32Array }): Quat {
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

        if (trace > 0) {
            const s = Math.sqrt(trace + 1) * 2;
            this.w = 0.25 * s;
            this.x = (m21 - m12) / s;
            this.y = (m02 - m20) / s;
            this.z = (m10 - m01) / s;
        } else if (m00 > m11 && m00 > m22) {
            const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
            this.w = (m21 - m12) / s;
            this.x = 0.25 * s;
            this.y = (m01 + m10) / s;
            this.z = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
            this.w = (m02 - m20) / s;
            this.x = (m01 + m10) / s;
            this.y = 0.25 * s;
            this.z = (m12 + m21) / s;
        } else {
            const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
            this.w = (m10 - m01) / s;
            this.x = (m02 + m20) / s;
            this.y = (m12 + m21) / s;
            this.z = 0.25 * s;
        }

        return this;
    }

    transformVector(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
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

        return {
            x: vx + uvx + uuvx,
            y: vy + uvy + uuvy,
            z: vz + uvz + uuvz
        };
    }

    getEulerAngles(): { x: number; y: number; z: number } {
        const qx = this.x;
        const qy = this.y;
        const qz = this.z;
        const qw = this.w;

        const ysqr = qy * qy;

        const t0 = 2 * (qw * qx + qy * qz);
        const t1 = 1 - 2 * (qx * qx + ysqr);
        const ex = Math.atan2(t0, t1);

        let t2 = 2 * (qw * qy - qz * qx);
        t2 = t2 > 1 ? 1 : t2;
        t2 = t2 < -1 ? -1 : t2;
        const ey = Math.asin(t2);

        const t3 = 2 * (qw * qz + qx * qy);
        const t4 = 1 - 2 * (ysqr + qz * qz);
        const ez = Math.atan2(t3, t4);

        return { x: ex, y: ey, z: ez };
    }
}
