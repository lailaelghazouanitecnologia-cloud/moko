/**
 * RGBA color with utilities
 */
export class Color {
    r: number;
    g: number;
    b: number;
    a: number;

    /**
     * Creates a new Color instance
     * @param r - Red component (0-1)
     * @param g - Green component (0-1)
     * @param b - Blue component (0-1)
     * @param a - Alpha component (0-1), defaults to 1
     */
    constructor(r: number = 1, g: number = 1, b: number = 1, a: number = 1) {
        this.r = this.clamp(r, 0, 1);
        this.g = this.clamp(g, 0, 1);
        this.b = this.clamp(b, 0, 1);
        this.a = this.clamp(a, 0, 1);
    }

    /**
     * Set rgba values
     * @param r - Red component (0-1)
     * @param g - Green component (0-1)
     * @param b - Blue component (0-1)
     * @param a - Alpha component (0-1), defaults to 1
     * @returns This color instance for chaining
     */
    set(r: number, g: number, b: number, a: number = 1): Color {
        this.r = this.clamp(r, 0, 1);
        this.g = this.clamp(g, 0, 1);
        this.b = this.clamp(b, 0, 1);
        this.a = this.clamp(a, 0, 1);
        return this;
    }

    /**
     * Copy color
     * @returns New Color instance with same values
     */
    clone(): Color {
        return new Color(this.r, this.g, this.b, this.a);
    }

    /**
     * Copy from color
     * @param c - Color to copy from
     * @returns This color instance for chaining
     * @throws Error if c is not a valid Color
     */
    copy(c: Color): Color {
        if (!this.isValidColor(c)) {
            throw new Error('Invalid color object provided');
        }
        this.r = c.r;
        this.g = c.g;
        this.b = c.b;
        this.a = c.a;
        return this;
    }

    /**
     * Parse hex string
     * @param hex - Hex color string (e.g., "#ff0000" or "ff0000")
     * @returns This color instance for chaining
     * @throws Error if hex format is invalid
     */
    fromHex(hex: string): Color {
        if (typeof hex !== 'string') {
            throw new Error('Hex must be a string');
        }

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
        if (!result) {
            throw new Error('Invalid hex color format');
        }
        
        this.r = parseInt(result[1], 16) / 255;
        this.g = parseInt(result[2], 16) / 255;
        this.b = parseInt(result[3], 16) / 255;
        this.a = result[4] ? parseInt(result[4], 16) / 255 : 1;
        
        return this;
    }

    /**
     * Convert to hex
     * @returns Hex color string with alpha
     */
    toHex(): string {
        const r = Math.round(this.clamp(this.r, 0, 1) * 255).toString(16).padStart(2, '0');
        const g = Math.round(this.clamp(this.g, 0, 1) * 255).toString(16).padStart(2, '0');
        const b = Math.round(this.clamp(this.b, 0, 1) * 255).toString(16).padStart(2, '0');
        const a = Math.round(this.clamp(this.a, 0, 1) * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}${a}`;
    }

    /**
     * Create from hsl
     * @param h - Hue (0-360)
     * @param s - Saturation (0-1)
     * @param l - Lightness (0-1)
     * @returns This color instance for chaining
     */
    fromHSL(h: number, s: number, l: number): Color {
        h = this.clamp(h, 0, 360);
        s = this.clamp(s, 0, 1);
        l = this.clamp(l, 0, 1);

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        
        let r = 0, g = 0, b = 0;
        
        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else if (h >= 300 && h < 360) {
            r = c; g = 0; b = x;
        }
        
        this.r = r + m;
        this.g = g + m;
        this.b = b + m;
        this.a = 1;
        
        return this;
    }

    /**
     * Convert to hsl
     * @returns Object with h, s, l properties
     */
    toHSL(): {h: number, s: number, l: number} {
        const r = this.clamp(this.r, 0, 1);
        const g = this.clamp(this.g, 0, 1);
        const b = this.clamp(this.b, 0, 1);
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        const sum = max + min;
        
        const l = sum / 2;
        
        if (diff === 0) {
            return {h: 0, s: 0, l};
        }
        
        const s = l > 0.5 ? diff / (2 - sum) : diff / sum;
        
        let h: number;
        switch (max) {
            case r:
                h = (g - b) / diff + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / diff + 2;
                break;
            case b:
                h = (r - g) / diff + 4;
                break;
            default:
                h = 0;
        }
        h *= 60;
        
        return {h, s, l};
    }

    /**
     * Linear interpolate
     * @param c - Target color
     * @param t - Interpolation factor (0-1)
     * @returns This color instance for chaining
     * @throws Error if c is not a valid Color or t is not a number
     */
    lerp(c: Color, t: number): Color {
        if (!this.isValidColor(c)) {
            throw new Error('Invalid color object provided');
        }
        if (typeof t !== 'number' || isNaN(t)) {
            throw new Error('Interpolation factor must be a valid number');
        }

        t = this.clamp(t, 0, 1);
        this.r += (c.r - this.r) * t;
        this.g += (c.g - this.g) * t;
        this.b += (c.b - this.b) * t;
        this.a += (c.a - this.a) * t;
        return this;
    }

    /**
     * Multiply colors
     * @param c - Color to multiply with
     * @returns This color instance for chaining
     * @throws Error if c is not a valid Color
     */
    multiply(c: Color): Color {
        if (!this.isValidColor(c)) {
            throw new Error('Invalid color object provided');
        }
        this.r *= c.r;
        this.g *= c.g;
        this.b *= c.b;
        this.a *= c.a;
        return this;
    }

    /**
     * Add colors
     * @param c - Color to add
     * @returns This color instance for chaining
     * @throws Error if c is not a valid Color
     */
    add(c: Color): Color {
        if (!this.isValidColor(c)) {
            throw new Error('Invalid color object provided');
        }
        this.r += c.r;
        this.g += c.g;
        this.b += c.b;
        this.a += c.a;
        return this;
    }

    /**
     * Clamp a value between min and max
     * @param value - Value to clamp
     * @param min - Minimum value
     * @param max - Maximum value
     * @returns Clamped value
     */
    private clamp(value: number, min: number, max: number): number {
        if (typeof value !== 'number' || isNaN(value)) return min;
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Validate if an object is a Color instance
     * @param obj - Object to validate
     * @returns True if valid Color
     */
    private isValidColor(obj: any): obj is Color {
        return obj instanceof Color &&
               typeof obj.r === 'number' &&
               typeof obj.g === 'number' &&
               typeof obj.b === 'number' &&
               typeof obj.a === 'number' &&
               !isNaN(obj.r) && !isNaN(obj.g) && !isNaN(obj.b) && !isNaN(obj.a);
    }
}
