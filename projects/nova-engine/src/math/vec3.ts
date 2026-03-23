export class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x: number, y: number, z: number): Vec3 {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    copy(v: Vec3): Vec3 {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    add(v: Vec3): Vec3 {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    sub(v: Vec3): Vec3 {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    mul(v: Vec3): Vec3 {
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
        return this;
    }

    mulScalar(s: number): Vec3 {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    div(v: Vec3): Vec3 {
        this.x /= v.x;
        this.y /= v.y;
        this.z /= v.z;
        return this;
    }

    dot(v: Vec3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v: Vec3): Vec3 {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    lengthSq(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    normalize(): Vec3 {
        const len = this.length();
        if (len > 0) {
            this.mulScalar(1 / len);
        }
        return this;
    }

    lerp(v: Vec3, t: number): Vec3 {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        this.z += (v.z - this.z) * t;
        return this;
    }

    distance(v: Vec3): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    min(v: Vec3): Vec3 {
        this.x = Math.min(this.x, v.x);
        this.y = Math.min(this.y, v.y);
        this.z = Math.min(this.z, v.z);
        return this;
    }

    max(v: Vec3): Vec3 {
        this.x = Math.max(this.x, v.x);
        this.y = Math.max(this.y, v.y);
        this.z = Math.max(this.z, v.z);
        return this;
    }

    floor(): Vec3 {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        this.z = Math.floor(this.z);
        return this;
    }

    ceil(): Vec3 {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        this.z = Math.ceil(this.z);
        return this;
    }

    round(): Vec3 {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        this.z = Math.round(this.z);
        return this;
    }

    equals(v: Vec3, eps: number = 1e-6): boolean {
        return Math.abs(this.x - v.x) < eps &&
               Math.abs(this.y - v.y) < eps &&
               Math.abs(this.z - v.z) < eps;
    }

    toString(): string {
        return `Vec3(${this.x}, ${this.y}, ${this.z})`;
    }

    static add(a: Vec3, b: Vec3, out?: Vec3): Vec3 {
        const result = out || new Vec3();
        result.x = a.x + b.x;
        result.y = a.y + b.y;
        result.z = a.z + b.z;
        return result;
    }

    static sub(a: Vec3, b: Vec3, out?: Vec3): Vec3 {
        const result = out || new Vec3();
        result.x = a.x - b.x;
        result.y = a.y - b.y;
        result.z = a.z - b.z;
        return result;
    }

    static cross(a: Vec3, b: Vec3, out?: Vec3): Vec3 {
        const result = out || new Vec3();
        result.x = a.y * b.z - a.z * b.y;
        result.y = a.z * b.x - a.x * b.z;
        result.z = a.x * b.y - a.y * b.x;
        return result;
    }

    static ZERO = new Vec3(0, 0, 0);
    static ONE = new Vec3(1, 1, 1);
    static UP = new Vec3(0, 1, 0);
    static DOWN = new Vec3(0, -1, 0);
    static LEFT = new Vec3(-1, 0, 0);
    static RIGHT = new Vec3(1, 0, 0);
    static FORWARD = new Vec3(0, 0, -1);
    static BACK = new Vec3(0, 0, 1);
}
