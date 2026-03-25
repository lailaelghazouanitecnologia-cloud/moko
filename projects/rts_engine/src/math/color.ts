/**
 * RGBA color value
 */
export class Color {
  public readonly r: number;
  public readonly g: number;
  public readonly b: number;
  public readonly a: number;

  constructor(r: number = 0, g: number = 0, b: number = 0, a: number = 1) {
    this.r = this.clamp(r);
    this.g = this.clamp(g);
    this.b = this.clamp(b);
    this.a = this.clamp(a);
  }

  /**
   * Create a Color from a hexadecimal string
   * @param hex - Hexadecimal color string (e.g., "#ff0000" or "#ff0000ff")
   * @returns A new Color instance
   */
  static fromHex(hex: string): Color {
    if (typeof hex !== 'string') {
      throw new TypeError('Hex must be a string');
    }

    const hexStr = hex.replace('#', '');
    if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hexStr)) {
      throw new Error('Invalid hex format');
    }

    const r = parseInt(hexStr.substr(0, 2), 16) / 255;
    const g = parseInt(hexStr.substr(2, 2), 16) / 255;
    const b = parseInt(hexStr.substr(4, 2), 16) / 255;
    const a = hexStr.length > 6 ? parseInt(hexStr.substr(6, 2), 16) / 255 : 1;

    return new Color(r, g, b, a);
  }

  /**
   * Convert the color to a hexadecimal string
   * @returns Hexadecimal color string (e.g., "#ff0000ff")
   */
  toHex(): string {
    const r = Math.round(this.clamp(this.r) * 255).toString(16).padStart(2, '0');
    const g = Math.round(this.clamp(this.g) * 255).toString(16).padStart(2, '0');
    const b = Math.round(this.clamp(this.b) * 255).toString(16).padStart(2, '0');
    const a = Math.round(this.clamp(this.a) * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`;
  }

  /**
   * Create a Color from HSL values
   * @param h - Hue (0-360)
   * @param s - Saturation (0-1)
   * @param l - Lightness (0-1)
   * @param a - Alpha (0-1), defaults to 1
   * @returns A new Color instance
   */
  static fromHSL(h: number, s: number, l: number, a: number = 1): Color {
    if (typeof h !== 'number' || typeof s !== 'number' || typeof l !== 'number') {
      throw new TypeError('HSL values must be numbers');
    }

    const normalizedH = ((h % 360) + 360) % 360;
    const clampedS = this.clamp(s);
    const clampedL = this.clamp(l);
    const clampedA = this.clamp(a);

    const c = (1 - Math.abs(2 * clampedL - 1)) * clampedS;
    const x = c * (1 - Math.abs((normalizedH / 60) % 2 - 1));
    const m = clampedL - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (normalizedH >= 0 && normalizedH < 60) {
      r = c; g = x; b = 0;
    } else if (normalizedH >= 60 && normalizedH < 120) {
      r = x; g = c; b = 0;
    } else if (normalizedH >= 120 && normalizedH < 180) {
      r = 0; g = c; b = x;
    } else if (normalizedH >= 180 && normalizedH < 240) {
      r = 0; g = x; b = c;
    } else if (normalizedH >= 240 && normalizedH < 300) {
      r = x; g = 0; b = c;
    } else if (normalizedH >= 300 && normalizedH < 360) {
      r = c; g = 0; b = x;
    }
    
    return new Color(r + m, g + m, b + m, clampedA);
  }

  /**
   * Convert the color to HSL values
   * @returns Object with h (0-360), s (0-1), l (0-1), and a (0-1)
   */
  toHSL(): {h: number, s: number, l: number, a: number} {
    const r = this.clamp(this.r);
    const g = this.clamp(this.g);
    const b = this.clamp(this.b);
    const a = this.clamp(this.a);
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    const l = sum / 2;
    
    let h = 0;
    let s = 0;
    
    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - sum) : diff / sum;
      
      switch (max) {
        case r: h = (g - b) / diff + (g < b ? 6 : 0); break;
        case g: h = (b - r) / diff + 2; break;
        case b: h = (r - g) / diff + 4; break;
      }
      h /= 6;
    }
    
    return { h: h * 360, s, l, a };
  }

  /**
   * Linearly interpolate between this color and another
   * @param target - Target color to interpolate to
   * @param t - Interpolation factor (0-1)
   * @returns A new Color instance
   */
  lerp(target: Color, t: number): Color {
    if (!(target instanceof Color)) {
      throw new TypeError('Target must be a Color instance');
    }
    if (typeof t !== 'number') {
      throw new TypeError('Interpolation factor must be a number');
    }

    const clampedT = this.clamp(t);
    return new Color(
      this.r + (target.r - this.r) * clampedT,
      this.g + (target.g - this.g) * clampedT,
      this.b + (target.b - this.b) * clampedT,
      this.a + (target.a - this.a) * clampedT
    );
  }

  /**
   * Multiply this color by another color component-wise
   * @param other - Color to multiply by
   * @returns A new Color instance
   */
  multiply(other: Color): Color {
    if (!(other instanceof Color)) {
      throw new TypeError('Other must be a Color instance');
    }

    return new Color(
      this.clamp(this.r * other.r),
      this.clamp(this.g * other.g),
      this.clamp(this.b * other.b),
      this.clamp(this.a * other.a)
    );
  }

  /**
   * Add another color to this color component-wise
   * @param other - Color to add
   * @returns A new Color instance
   */
  add(other: Color): Color {
    if (!(other instanceof Color)) {
      throw new TypeError('Other must be a Color instance');
    }

    return new Color(
      this.clamp(this.r + other.r),
      this.clamp(this.g + other.g),
      this.clamp(this.b + other.b),
      this.clamp(this.a + other.a)
    );
  }

  /**
   * Create a deep copy of this color
   * @returns A new Color instance with the same values
   */
  clone(): Color {
    return new Color(this.r, this.g, this.b, this.a);
  }

  /**
   * Check if this color equals another color
   * @param other - Color to compare to
   * @returns True if all components are equal
   */
  equals(other: Color): boolean {
    if (!(other instanceof Color)) {
      return false;
    }

    const EPSILON = 1e-10;
    return Math.abs(this.r - other.r) < EPSILON &&
           Math.abs(this.g - other.g) < EPSILON &&
           Math.abs(this.b - other.b) < EPSILON &&
           Math.abs(this.a - other.a) < EPSILON;
  }

  /**
   * Clamp a value between 0 and 1
   * @param value - Value to clamp
   * @returns Clamped value
   */
  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
