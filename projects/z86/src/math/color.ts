import { Vec3 } from './vec3';
import { Vec4 } from './vec4';

export class Color {
  private _r: number;
  private _g: number;
  private _b: number;
  private _a: number;

  constructor(r: number = 1, g: number = 1, b: number = 1, a: number = 1) {
    this._r = Math.max(0, Math.min(1, r));
    this._g = Math.max(0, Math.min(1, g));
    this._b = Math.max(0, Math.min(1, b));
    this._a = Math.max(0, Math.min(1, a));
  }

  get r(): number { return this._r; }
  set r(value: number) { this._r = Math.max(0, Math.min(1, value)); }

  get g(): number { return this._g; }
  set g(value: number) { this._g = Math.max(0, Math.min(1, value)); }

  get b(): number { return this._b; }
  set b(value: number) { this._b = Math.max(0, Math.min(1, value)); }

  get a(): number { return this._a; }
  set a(value: number) { this._a = Math.max(0, Math.min(1, value)); }

  toVec3(): Vec3 {
    return new Vec3(this._r, this._g, this._b);
  }

  toVec4(): Vec4 {
    return new Vec4(this._r, this._g, this._b, this._a);
  }

  static fromVec3(v: Vec3, a: number = 1): Color {
    return new Color(v.x, v.y, v.z, a);
  }

  static fromVec4(v: Vec4): Color {
    return new Color(v.x, v.y, v.z, v.w);
  }

  toHex(): string {
    const toHexByte = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHexByte(this._r)}${toHexByte(this._g)}${toHexByte(this._b)}${this._a < 1 ? toHexByte(this._a) : ''}`;
  }

  static fromHex(hex: string): Color {
    const clean = hex.replace('#', '');
    const len = clean.length;
    if (len !== 6 && len !== 8) throw new Error('Invalid hex color length');
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const a = len === 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
    return new Color(r, g, b, a);
  }

  toHSL(): { h: number; s: number; l: number } {
    const max = Math.max(this._r, this._g, this._b);
    const min = Math.min(this._r, this._g, this._b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    switch (max) {
      case this._r: h = (this._g - this._b) / d + (this._g < this._b ? 6 : 0); break;
      case this._g: h = (this._b - this._r) / d + 2; break;
      case this._b: h = (this._r - this._g) / d + 4; break;
    }
    h /= 6;
    return { h, s, l };
  }

  static fromHSL(h: number, s: number, l: number, a: number = 1): Color {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    if (s === 0) return new Color(l, l, l, a);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1 / 3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1 / 3);
    return new Color(r, g, b, a);
  }

  toHSV(): { h: number; s: number; v: number } {
    const max = Math.max(this._r, this._g, this._b);
    const min = Math.min(this._r, this._g, this._b);
    const v = max;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    let h = 0;
    if (max !== min) {
      switch (max) {
        case this._r: h = (this._g - this._b) / d + (this._g < this._b ? 6 : 0); break;
        case this._g: h = (this._b - this._r) / d + 2; break;
        case this._b: h = (this._r - this._g) / d + 4; break;
      }
      h /= 6;
    }
    return { h, s, v };
  }

  static fromHSV(h: number, s: number, v: number, a: number = 1): Color {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0, g = 0, b = 0;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return new Color(r, g, b, a);
  }

  clone(): Color {
    return new Color(this._r, this._g, this._b, this._a);
  }

  equals(other: Color): boolean {
    return this._r === other._r && this._g === other._g && this._b === other._b && this._a === other._a;
  }

  lerp(target: Color, t: number): Color {
    return new Color(
      this._r + (target._r - this._r) * t,
      this._g + (target._g - this._g) * t,
      this._b + (target._b - this._b) * t,
      this._a + (target._a - this._a) * t
    );
  }

  multiply(scalar: number): Color {
    return new Color(this._r * scalar, this._g * scalar, this._b * scalar, this._a);
  }

  add(other: Color): Color {
    return new Color(
      Math.min(1, this._r + other._r),
      Math.min(1, this._g + other._g),
      Math.min(1, this._b + other._b),
      Math.min(1, this._a + other._a)
    );
  }

  static white(alpha: number = 1): Color { return new Color(1, 1, 1, alpha); }
  static black(alpha: number = 1): Color { return new Color(0, 0, 0, alpha); }
  static red(alpha: number = 1): Color { return new Color(1, 0, 0, alpha); }
  static green(alpha: number = 1): Color { return new Color(0, 1, 0, alpha); }
  static blue(alpha: number = 1): Color { return new Color(0, 0, 1, alpha); }
  static yellow(alpha: number = 1): Color { return new Color(1, 1, 0, alpha); }
  static cyan(alpha: number = 1): Color { return new Color(0, 1, 1, alpha); }
  static magenta(alpha: number = 1): Color { return new Color(1, 0, 1, alpha); }
  static gray(alpha: number = 1): Color { return new Color(0.5, 0.5, 0.5, alpha); }
}
