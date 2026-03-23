export class Color {
    r: number;
    g: number;
    b: number;
    a: number;

    constructor(r: number = 1, g: number = 1, b: number = 1, a: number = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    set(r: number, g: number, b: number, a: number = 1): Color {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        return this;
    }

    clone(): Color {
        return new Color(this.r, this.g, this.b, this.a);
    }

    copy(c: Color): Color {
        this.r = c.r;
        this.g = c.g;
        this.b = c.b;
        this.a = c.a;
        return this;
    }

    lerp(c: Color, t: number): Color {
        this.r += (c.r - this.r) * t;
        this.g += (c.g - this.g) * t;
        this.b += (c.b - this.b) * t;
        this.a += (c.a - this.a) * t;
        return this;
    }

    multiply(c: Color): Color {
        this.r *= c.r;
        this.g *= c.g;
        this.b *= c.b;
        this.a *= c.a;
        return this;
    }

    toHex(): string {
        const r = Math.round(this.r * 255);
        const g = Math.round(this.g * 255);
        const b = Math.round(this.b * 255);
        return '#' +
            (r < 16 ? '0' : '') + r.toString(16) +
            (g < 16 ? '0' : '') + g.toString(16) +
            (b < 16 ? '0' : '') + b.toString(16);
    }

    fromHex(hex: string): Color {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) {
            this.r = 0;
            this.g = 0;
            this.b = 0;
            this.a = 1;
            return this;
        }
        this.r = parseInt(result[1], 16) / 255;
        this.g = parseInt(result[2], 16) / 255;
        this.b = parseInt(result[3], 16) / 255;
        this.a = 1;
        return this;
    }

    toRGB(): number[] {
        return [this.r, this.g, this.b];
    }

    toRGBA(): number[] {
        return [this.r, this.g, this.b, this.a];
    }

    equals(c: Color, epsilon: number = 1e-6): boolean {
        return Math.abs(this.r - c.r) < epsilon &&
               Math.abs(this.g - c.g) < epsilon &&
               Math.abs(this.b - c.b) < epsilon &&
               Math.abs(this.a - c.a) < epsilon;
    }

    toString(): string {
        return `Color(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    }

    static WHITE = new Color(1, 1, 1, 1);
    static BLACK = new Color(0, 0, 0, 1);
    static RED = new Color(1, 0, 0, 1);
    static GREEN = new Color(0, 1, 0, 1);
    static BLUE = new Color(0, 0, 1, 1);
    static TRANSPARENT = new Color(0, 0, 0, 0);
}
