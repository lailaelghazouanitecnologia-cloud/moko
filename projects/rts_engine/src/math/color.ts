class MathUtils {
    static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    static wrap(value: number, min: number, max: number): number {
        const range = max - min;
        return min + ((((value - min) % range) + range) % range);
    }
}

/**
 * RGBA color class with floating-point components.
 * All components are stored in the range [0, 1].
 */
export class Color {
    private data: Float32Array;

    /**
     * Creates a new Color instance.
     * @param r - Red component (0-1). Defaults to 1.
     * @param g - Green component (0-1). Defaults to r.
     * @param b - Blue component (0-1). Defaults to r.
     * @param a - Alpha component (0-1). Defaults to 1.
     * @throws {Error} If any component is not a finite number.
     */
    constructor(r: number = 1, g: number = r, b: number = r, a: number = 1) {
        Color.validateComponent(r, 'r');
        Color.validateComponent(g, 'g');
        Color.validateComponent(b, 'b');
        Color.validateComponent(a, 'a');

        this.data = new Float32Array(4);
        this.set(r, g, b, a);
    }

    /**
     * Sets the color components.
     * @param r - Red component (0-1).
     * @param g - Green component (0-1). Defaults to r.
     * @param b - Blue component (0-1). Defaults to g.
     * @param a - Alpha component (0-1). Defaults to 1.
     * @returns This color instance for chaining.
     * @throws {Error} If any component is not a finite number.
     */
    set(r: number, g: number = r, b: number = g, a: number = 1): Color {
        Color.validateComponent(r, 'r');
        Color.validateComponent(g, 'g');
        Color.validateComponent(b, 'b');
        Color.validateComponent(a, 'a');

        this.data[0] = MathUtils.clamp(r, 0, 1);
        this.data[1] = MathUtils.clamp(g, 0, 1);
        this.data[2] = MathUtils.clamp(b, 0, 1);
        this.data[3] = MathUtils.clamp(a, 0, 1);
        return this;
    }

    /**
     * Copies the components from another color.
     * @param c - The color to copy from.
     * @returns This color instance for chaining.
     * @throws {Error} If c is not a Color instance.
     */
    copy(c: Color): Color {
        if (!(c instanceof Color)) {
            throw new Error('copy() expects a Color instance');
        }
        this.data[0] = c.data[0];
        this.data[1] = c.data[1];
        this.data[2] = c.data[2];
        this.data[3] = c.data[3];
        return this;
    }

    /**
     * Creates a new color with the same components.
     * @returns A new Color instance.
     */
    clone(): Color {
        return new Color(this.data[0], this.data[1], this.data[2], this.data[3]);
    }

    /**
     * Linearly interpolates between this color and another.
     * @param c - The target color.
     * @param t - Interpolation factor (0-1).
     * @returns A new Color instance.
     * @throws {Error} If c is not a Color instance or t is not a finite number.
     */
    lerp(c: Color, t: number): Color {
        if (!(c instanceof Color)) {
            throw new Error('lerp() expects a Color instance');
        }
        Color.validateComponent(t, 't');
        t = MathUtils.clamp(t, 0, 1);

        const r = this.data[0] + (c.data[0] - this.data[0]) * t;
        const g = this.data[1] + (c.data[1] - this.data[1]) * t;
        const b = this.data[2] + (c.data[2] - this.data[2]) * t;
        const a = this.data[3] + (c.data[3] - this.data[3]) * t;
        return new Color(r, g, b, a);
    }

    /**
     * Converts the color to a hexadecimal string.
     * @returns Hexadecimal color string (e.g., "#ff0000ff").
     */
    toHex(): string {
        const r = Math.round(this.data[0] * 255);
        const g = Math.round(this.data[1] * 255);
        const b = Math.round(this.data[2] * 255);
        const a = Math.round(this.data[3] * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
    }

    /**
     * Sets the color from a hexadecimal string.
     * @param hex - Hexadecimal color string (3, 4, 6, or 8 digits).
     * @returns This color instance for chaining.
     * @throws {Error} If the hex string is invalid.
     */
    fromHex(hex: string): Color {
        if (typeof hex !== 'string') {
            throw new Error('fromHex() expects a string');
        }
        const str = hex.replace('#', '');
        const len = str.length;
        if (![3, 4, 6, 8].includes(len)) {
            throw new Error('fromHex() expects a hex string of 3, 4, 6, or 8 digits');
        }
        const expanded = len <= 4 ? str.split('').map(ch => ch + ch).join('') : str;
        const r = parseInt(expanded.substr(0, 2), 16) / 255;
        const g = parseInt(expanded.substr(2, 2), 16) / 255;
        const b = parseInt(expanded.substr(4, 2), 16) / 255;
        const a = expanded.length === 8 ? parseInt(expanded.substr(6, 2), 16) / 255 : 1;
        if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
            throw new Error('fromHex() received an invalid hex string');
        }
        return this.set(r, g, b, a);
    }

    /**
     * Converts the color to HSL format.
     * @returns Object with h (0-1), s (0-1), l (0-1).
     */
    toHSL(): { h: number; s: number; l: number } {
        const r = this.data[0];
        const g = this.data[1];
        const b = this.data[2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max === min) {
            return { h: 0, s: 0, l };
        }
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h: number;
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
            default: h = 0;
        }
        h /= 6;
        return { h, s, l };
    }

    /**
     * Sets the color from HSL format.
     * @param h - Hue (0-1).
     * @param s - Saturation (0-1).
     * @param l - Lightness (0-1).
     * @returns This color instance for chaining.
     * @throws {Error} If any component is not a finite number.
     */
    fromHSL(h: number, s: number, l: number): Color {
        Color.validateComponent(h, 'h');
        Color.validateComponent(s, 's');
        Color.validateComponent(l, 'l');
        h = MathUtils.wrap(h, 0, 1);
        s = MathUtils.clamp(s, 0, 1);
        l = MathUtils.clamp(l, 0, 1);

        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        let r: number, g: number, b: number;
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return this.set(r, g, b, this.data[3]);
    }

    /**
     * Creates a white color.
     * @returns A new white Color instance.
     */
    static white(): Color {
        return new Color(1, 1, 1, 1);
    }

    /**
     * Creates a black color.
     * @returns A new black Color instance.
     */
    static black(): Color {
        return new Color(0, 0, 0, 1);
    }

    /**
     * Creates a red color.
     * @returns A new red Color instance.
     */
    static red(): Color {
        return new Color(1, 0, 0, 1);
    }

    /**
     * Creates a green color.
     * @returns A new green Color instance.
     */
    static green(): Color {
        return new Color(0, 1, 0, 1);
    }

    /**
     * Creates a blue color.
     * @returns A new blue Color instance.
     */
    static blue(): Color {
        return new Color(0, 0, 1, 1);
    }

    /**
     * Validates a color component.
     * @param value - The value to validate.
     * @param name - The name of the component for error messages.
     * @throws {Error} If the value is not a finite number.
     */
    private static validateComponent(value: number, name: string): void {
        if (!Number.isFinite(value)) {
            throw new Error(`Color component '${name}' must be a finite number`);
        }
    }
}
