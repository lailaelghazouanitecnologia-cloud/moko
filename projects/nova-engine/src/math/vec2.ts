export class Vec2 {
    x: number;
    y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    set(x: number, y: number): Vec2 {
        this.x = x;
        this.y = y;
        return this;
    }

    clone(): Vec2 {
        return new Vec2(this.x, this.y);
    }

    copy(v: Vec2): Vec2 {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    add(v: Vec2): Vec2 {
        return new Vec2(this.x + v.x, this.y + v.y);
    }

    sub(v: Vec2): Vec2 {
        return new Vec2(this.x - v.x, this.y - v.y);
    }

    mul(v: Vec2): Vec2 {
        return new Vec2(this.x * v.x, this.y * v.y);
    }

    mulScalar(s: number): Vec2 {
        return new Vec2(this.x * s, this.y * s);
    }

    div(v: Vec2): Vec2 {
        return new Vec2(this.x / v.x, this.y / v.y);
    }

    dot(v: Vec2): number {
        return this.x * v.x + this.y * v.y;
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    lengthSq(): number {
        return this.x * this.x + this.y * this.y;
    }

    normalize(): Vec2 {
        const len = this.length();
        if (len === 0) return new Vec2(0, 0);
        return new Vec2(this.x / len, this.y / len);
    }

    lerp(v: Vec2, t: number): Vec2 {
        return new Vec2(
            this.x + (v.x - this.x) * t,
            this.y + (v.y - this.y) * t
        );
    }

    distance(v: Vec2): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    equals(v: Vec2, epsilon: number = 1e-6): boolean {
        return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
    }

    toString(): string {
        return `Vec2(${this.x}, ${this.y})`;
    }

    static ZERO = new Vec2(0, 0);
    static ONE = new Vec2(1, 1);
    static UP = new Vec2(0, 1);
    static RIGHT = new Vec2(1, 0);
}
