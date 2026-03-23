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

    set(x: number, y: number, z: number, w: number): Quat {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
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

    mul(q: Quat): Quat {
        const qx = this.x;
        const qy = this.y;
        const qz = this.z;
        const qw = this.w;

        this.x = qx * q.w + qw * q.x + qy * q.z - qz * q.y;
        this.y = qy * q.w + qw * q.y + qz * q.x - qx * q.z;
        this.z = qz * q.w + qw * q.z + qx * q.y - qy * q.x;
        this.w = qw * q.w - qx * q.x - qy * q.y - qz * q.z;
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

    slerp(q: Quat, t: number): Quat {
        const ax = this.x;
        const ay = this.y;
        const az = this.z;
        const aw = this.w;

        let bx = q.x;
        let by = q.y;
        let bz = q.z;
        let bw = q.w;

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
            const s = 0.5 / Math.sqrt(trace + 1.0);
            this.w = 0.25 / s;
            this.x = (m21 - m12) * s;
            this.y = (m02 - m20) * s;
            this.z = (m10 - m01) * s;
        } else if (m00 > m11 && m00 > m22) {
            const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
            this.w = (m21 - m12) / s;
            this.x = 0.25 * s;
            this.y = (m01 + m10) / s;
            this.z = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
            this.w = (m02 - m20) / s;
            this.x = (m01 + m10) / s;
            this.y = 0.25 * s;
            this.z = (m12 + m21) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
            this.w = (m10 - m01) / s;
            this.x = (m02 + m20) / s;
            this.y = (m12 + m21) / s;
            this.z = 0.25 * s;
        }

        return this;
    }

    getEulerAngles(): Vec3 {
        const x = this.x;
        const y = this.y;
        const z = this.z;
        const w = this.w;
        const x2 = x + x;
        const y2 = y + y;
        const z2 = z + z;
        const xx = x * x2;
        const xy = x * y2;
        const xz = x * z2;
        const yy = y * y2;
        const yz = y * z2;
        const zz = z * z2;
        const wx = w * x2;
        const wy = w * y2;
        const wz = w * z2;

        return new Vec3(
            Math.atan2(yz + wx, 1 - yy - zz),
            Math.asin(-(xz - wy)),
            Math.atan2(xy + wz, 1 - xx - zz)
        );
    }

    transformVector(v: Vec3): Vec3 {
        const x = v.x;
        const y = v.y;
        const z = v.z;
        const qx = this.x;
        const qy = this.y;
        const qz = this.z;
        const qw = this.w;

        const ix = qw * x + qy * z - qz * y;
        const iy = qw * y + qz * x - qx * z;
        const iz = qw * z + qx * y - qy * x;
        const iw = -qx * x - qy * y - qz * z;

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

    invert(): Quat {
        const x = this.x;
        const y = this.y;
        const z = this.z;
        const w = this.w;
        const len = x * x + y * y + z * z + w * w;
        if (len > 0) {
            const invLen = 1 / len;
            this.x = -x * invLen;
            this.y = -y * invLen;
            this.z = -z * invLen;
            this.w = w * invLen;
        }
        return this;
    }

    equals(q: Quat, epsilon: number = 1e-6): boolean {
        return Math.abs(this.x - q.x) < epsilon &&
               Math.abs(this.y - q.y) < epsilon &&
               Math.abs(this.z - q.z) < epsilon &&
               Math.abs(this.w - q.w) < epsilon;
    }

    toString(): string {
        return `Quat(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
    }

    static IDENTITY = new Quat(0, 0, 0, 1);
}
