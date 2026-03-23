export class Vec2 {
    x: number;
    y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    add(v: Vec2): Vec2 {
        return new Vec2(this.x + v.x, this.y + v.y);
    }

    sub(v: Vec2): Vec2 {
        return new Vec2(this.x - v.x, this.y - v.y);
    }

    mul(s: number): Vec2;
    mul(v: Vec2): Vec2;
    mul(arg: number | Vec2): Vec2 {
        if (typeof arg === 'number') {
            return new Vec2(this.x * arg, this.y * arg);
        } else {
            return new Vec2(this.x * arg.x, this.y * arg.y);
        }
    }

    dot(v: Vec2): number {
        return this.x * v.x + this.y * v.y;
    }

    normalize(): Vec2 {
        const len = this.length();
        if (len === 0) {
            return new Vec2(0, 0);
        }
        return new Vec2(this.x / len, this.y / len);
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    lerp(target: Vec2, t: number): Vec2 {
        return new Vec2(
            this.x + (target.x - this.x) * t,
            this.y + (target.y - this.y) * t
        );
    }

    distance(v: Vec2): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    equals(v: Vec2): boolean {
        return this.x === v.x && this.y === v.y;
    }

    clone(): Vec2 {
        return new Vec2(this.x, this.y);
    }

    copy(v: Vec2): Vec2 {
        this.x = v.x;
        this.y = v.y;
        return this;
    }
}
