export class Vec4 {
    x: number;
    y: number;
    z: number;
    w: number;

    constructor(x = 0, y = 0, z = 0, w = 0) {
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

    toArray(): number[] {
        return [this.x, this.y, this.z, this.w];
    }

    fromArray(arr: number[], offset = 0): Vec4 {
        this.x = arr[offset];
        this.y = arr[offset + 1];
        this.z = arr[offset + 2];
        this.w = arr[offset + 3];
        return this;
    }

    add(v: Vec4): Vec4 {
        return new Vec4(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
    }

    sub(v: Vec4): Vec4 {
        return new Vec4(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
    }

    mul(v: Vec4): Vec4 {
        return new Vec4(this.x * v.x, this.y * v.y, this.z * v.z, this.w * v.w);
    }

    mulScalar(s: number): Vec4 {
        return new Vec4(this.x * s, this.y * s, this.z * s, this.w * s);
    }

    dot(v: Vec4): number {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }

    normalize(): Vec4 {
        const len = this.length();
        if (len === 0) return new Vec4();
        return new Vec4(this.x / len, this.y / len, this.z / len, this.w / len);
    }

    min(v: Vec4): Vec4 {
        return new Vec4(
            Math.min(this.x, v.x),
            Math.min(this.y, v.y),
            Math.min(this.z, v.z),
            Math.min(this.w, v.w)
        );
    }

    max(v: Vec4): Vec4 {
        return new Vec4(
            Math.max(this.x, v.x),
            Math.max(this.y, v.y),
            Math.max(this.z, v.z),
            Math.max(this.w, v.w)
        );
    }

    equals(v: Vec4, epsilon = 1e-6): boolean {
        return (
            Math.abs(this.x - v.x) < epsilon &&
            Math.abs(this.y - v.y) < epsilon &&
            Math.abs(this.z - v.z) < epsilon &&
            Math.abs(this.w - v.w) < epsilon
        );
    }
}
