import { Mat4 } from './mat4';

export class Vec4 {
    x: number;
    y: number;
    z: number;
    w: number;

    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    set(x: number, y: number, z: number, w: number): Vec4 {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    clone(): Vec4 {
        return new Vec4(this.x, this.y, this.z, this.w);
    }

    copy(v: Vec4): Vec4 {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        this.w = v.w;
        return this;
    }

    add(v: Vec4, out?: Vec4): Vec4 {
        const result = out || new Vec4();
        result.x = this.x + v.x;
        result.y = this.y + v.y;
        result.z = this.z + v.z;
        result.w = this.w + v.w;
        return result;
    }

    sub(v: Vec4, out?: Vec4): Vec4 {
        const result = out || new Vec4();
        result.x = this.x - v.x;
        result.y = this.y - v.y;
        result.z = this.z - v.z;
        result.w = this.w - v.w;
        return result;
    }

    scale(s: number, out?: Vec4): Vec4 {
        const result = out || new Vec4();
        result.x = this.x * s;
        result.y = this.y * s;
        result.z = this.z * s;
        result.w = this.w * s;
        return result;
    }

    dot(v: Vec4): number {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }

    normalize(out?: Vec4): Vec4 {
        const result = out || new Vec4();
        const len = this.length();
        if (len > 0) {
            const invLen = 1 / len;
            result.x = this.x * invLen;
            result.y = this.y * invLen;
            result.z = this.z * invLen;
            result.w = this.w * invLen;
        } else {
            result.x = 0;
            result.y = 0;
            result.z = 0;
            result.w = 0;
        }
        return result;
    }

    transformMat4(mat: Mat4, out?: Vec4): Vec4 {
        const result = out || new Vec4();
        const x = this.x, y = this.y, z = this.z, w = this.w;
        const m = mat.elements;
        result.x = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
        result.y = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
        result.z = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
        result.w = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
        return result;
    }
}
