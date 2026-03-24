export class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(v: Vec3): Vec3 {
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    sub(v: Vec3): Vec3 {
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    mul(v: Vec3): Vec3 {
        return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
    }

    mulScalar(s: number): Vec3 {
        return new Vec3(this.x * s, this.y * s, this.z * s);
    }

    div(v: Vec3): Vec3 {
        if (v.x === 0 || v.y === 0 || v.z === 0) {
            throw new Error("Division by zero");
        }
        return new Vec3(this.x / v.x, this.y / v.y, this.z / v.z);
    }

    dot(v: Vec3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v: Vec3): Vec3 {
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    normalize(): Vec3 {
        const len = this.length();
        if (len === 0) {
            return new Vec3(0, 0, 0);
        }
        return new Vec3(this.x / len, this.y / len, this.z / len);
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    lengthSq(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    lerp(v: Vec3, t: number): Vec3 {
        const clampedT = Math.max(0, Math.min(1, t));
        return new Vec3(
            this.x + (v.x - this.x) * clampedT,
            this.y + (v.y - this.y) * clampedT,
            this.z + (v.z - this.z) * clampedT
        );
    }

    distance(v: Vec3): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    min(v: Vec3): Vec3 {
        return new Vec3(
            Math.min(this.x, v.x),
            Math.min(this.y, v.y),
            Math.min(this.z, v.z)
        );
    }

    max(v: Vec3): Vec3 {
        return new Vec3(
            Math.max(this.x, v.x),
            Math.max(this.y, v.y),
            Math.max(this.z, v.z)
        );
    }

    floor(): Vec3 {
        return new Vec3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
    }

    ceil(): Vec3 {
        return new Vec3(Math.ceil(this.x), Math.ceil(this.y), Math.ceil(this.z));
    }

    round(): Vec3 {
        return new Vec3(Math.round(this.x), Math.round(this.y), Math.round(this.z));
    }

    equals(v: Vec3, epsilon: number = 1e-6): boolean {
        return (
            Math.abs(this.x - v.x) < epsilon &&
            Math.abs(this.y - v.y) < epsilon &&
            Math.abs(this.z - v.z) < epsilon
        );
    }

    clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    copy(v: Vec3): this {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    set(x: number, y: number, z: number): this {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    toString(): string {
        return `Vec3(${this.x}, ${this.y}, ${this.z})`;
    }

    static readonly ZERO = Object.freeze(new Vec3(0, 0, 0));
    static readonly ONE = Object.freeze(new Vec3(1, 1, 1));
    static readonly UP = Object.freeze(new Vec3(0, 1, 0));
    static readonly DOWN = Object.freeze(new Vec3(0, -1, 0));
    static readonly LEFT = Object.freeze(new Vec3(-1, 0, 0));
    static readonly RIGHT = Object.freeze(new Vec3(1, 0, 0));
    static readonly FORWARD = Object.freeze(new Vec3(0, 0, -1));
    static readonly BACK = Object.freeze(new Vec3(0, 0, 1));
}
