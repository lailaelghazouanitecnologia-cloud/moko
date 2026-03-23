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

  toHex(): string {
    const toHexComponent = (value: number): string => {
      const clamped = Math.max(0, Math.min(1, value));
      const hex = Math.round(clamped * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHexComponent(this.r)}${toHexComponent(this.g)}${toHexComponent(this.b)}`;
  }

  toRgb(): string {
    const r = Math.round(this.r * 255);
    const g = Math.round(this.g * 255);
    const b = Math.round(this.b * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  toRgba(): string {
    const r = Math.round(this.r * 255);
    const g = Math.round(this.g * 255);
    const b = Math.round(this.b * 255);
    const a = this.a;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  clone(): Color {
    return new Color(this.r, this.g, this.b, this.a);
  }

  copy(color: Color): Color {
    this.r = color.r;
    this.g = color.g;
    this.b = color.b;
    this.a = color.a;
    return this;
  }

  set(r: number, g: number, b: number, a: number = 1): Color {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
    return this;
  }

  equals(color: Color): boolean {
    return this.r === color.r && this.g === color.g && this.b === color.b && this.a === color.a;
  }

  lerp(color: Color, t: number): Color {
    this.r += (color.r - this.r) * t;
    this.g += (color.g - this.g) * t;
    this.b += (color.b - this.b) * t;
    this.a += (color.a - this.a) * t;
    return this;
  }

  multiply(color: Color): Color {
    this.r *= color.r;
    this.g *= color.g;
    this.b *= color.b;
    this.a *= color.a;
    return this;
  }

  add(color: Color): Color {
    this.r += color.r;
    this.g += color.g;
    this.b += color.b;
    this.a += color.a;
    return this;
  }

  subtract(color: Color): Color {
    this.r -= color.r;
    this.g -= color.g;
    this.b -= color.b;
    this.a -= color.a;
    return this;
  }

  scale(scalar: number): Color {
    this.r *= scalar;
    this.g *= scalar;
    this.b *= scalar;
    this.a *= scalar;
    return this;
  }

  static fromHex(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      throw new Error('Invalid hex color format');
    }
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    return new Color(r, g, b);
  }

  static fromRgb(r: number, g: number, b: number, a: number = 1): Color {
    return new Color(r / 255, g / 255, b / 255, a);
  }

  static white(): Color {
    return new Color(1, 1, 1, 1);
  }

  static black(): Color {
    return new Color(0, 0, 0, 1);
  }

  static red(): Color {
    return new Color(1, 0, 0, 1);
  }

  static green(): Color {
    return new Color(0, 1, 0, 1);
  }

  static blue(): Color {
    return new Color(0, 0, 1, 1);
  }

  static yellow(): Color {
    return new Color(1, 1, 0, 1);
  }

  static cyan(): Color {
    return new Color(0, 1, 1, 1);
  }

  static magenta(): Color {
    return new Color(1, 0, 1, 1);
  }

  static gray(): Color {
    return new Color(0.5, 0.5, 0.5, 1);
  }

  static transparent(): Color {
    return new Color(0, 0, 0, 0);
  }
}
