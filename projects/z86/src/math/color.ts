export class Color {
    r: number;
    g: number;
    b: number;
    a: number;

    constructor(r: number = 0, g: number = 0, b: number = 0, a: number = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    toHexString(): string {
        const toHex = (c: number) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}${toHex(this.a)}`;
    }

    static fromHexString(hex: string): Color {
        const parseHex = (hex: string) => parseInt(hex, 16) / 255;
        hex = hex.replace('#', '');
        if (hex.length === 6) {
            const r = parseHex(hex.substr(0, 2));
            const g = parseHex(hex.substr(2, 2));
            const b = parseHex(hex.substr(4, 2));
            return new Color(r, g, b, 1);
        } else if (hex.length === 8) {
            const r = parseHex(hex.substr(0, 2));
            const g = parseHex(hex.substr(2, 2));
            const b = parseHex(hex.substr(4, 2));
            const a = parseHex(hex.substr(6, 2));
            return new Color(r, g, b, a);
        } else {
            throw new Error('Invalid hex color format');
        }
    }
}
