import { Vec3 } from './vec3';

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

  mul(c: Color): Color {
    this.r *= c.r;
    this.g *= c.g;
    this.b *= c.b;
    this.a *= c.a;
    return this;
  }

  add(c: Color): Color {
    this.r += c.r;
    this.g += c.g;
    this.b += c.b;
    this.a += c.a;
    return this;
  }

  scale(s: number): Color {
    this.r *= s;
    this.g *= s;
    this.b *= s;
    this.a *= s;
    return this;
  }

  fromHex(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      throw new Error('Invalid hex color format');
    }
    this.r = parseInt(result[1], 16) / 255;
    this.g = parseInt(result[2], 16) / 255;
    this.b = parseInt(result[3], 16) / 255;
    this.a = 1;
    return this;
  }

  toHex(): string {
    const r = Math.round(this.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(this.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(this.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  fromHSV(h: number, s: number, v: number): Color {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

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

  toHSV(out?: Vec3): Vec3 {
    const r = this.r;
    const g = this.g;
    const b = this.b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    const v = max;

    if (diff !== 0) {
      if (max === r) {
        h = ((g - b) / diff) % 6;
      } else if (max === g) {
        h = (b - r) / diff + 2;
      } else {
        h = (r - g) / diff + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }

    const result = out || new Vec3();
    result.set(h, s, v);
    return result;
  }

  gamma(gamma: number): Color {
    this.r = Math.pow(this.r, gamma);
    this.g = Math.pow(this.g, gamma);
    this.b = Math.pow(this.b, gamma);
    return this;
  }

  equals(c: Color, eps: number = 1e-6): boolean {
    return Math.abs(this.r - c.r) < eps &&
           Math.abs(this.g - c.g) < eps &&
           Math.abs(this.b - c.b) < eps &&
           Math.abs(this.a - c.a) < eps;
  }

  toString(): string {
    return `Color(${this.r.toFixed(3)}, ${this.g.toFixed(3)}, ${this.b.toFixed(3)}, ${this.a.toFixed(3)})`;
  }

  static WHITE = new Color(1, 1, 1, 1);
  static BLACK = new Color(0, 0, 0, 1);
  static RED = new Color(1, 0, 0, 1);
  static GREEN = new Color(0, 1, 0, 1);
  static BLUE = new Color(0, 0, 1, 1);
  static TRANSPARENT = new Color(0, 0, 0, 0);
}
