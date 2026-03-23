import { Vec3 } from './vec3';
import { Vec4 } from './vec4';

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

  get red(): number {
    return this.r;
  }

  set red(value: number) {
    this.r = value;
  }

  get green(): number {
    return this.g;
  }

  set green(value: number) {
    this.g = value;
  }

  get blue(): number {
    return this.b;
  }

  set blue(value: number) {
    this.b = value;
  }

  get alpha(): number {
    return this.a;
  }

  set alpha(value: number) {
    this.a = value;
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

  fromArray(array: number[], offset: number = 0): Color {
    this.r = array[offset];
    this.g = array[offset + 1];
    this.b = array[offset + 2];
    this.a = array[offset + 3];
    return this;
  }

  toArray(array: number[] = [], offset: number = 0): number[] {
    array[offset] = this.r;
    array[offset + 1] = this.g;
    array[offset + 2] = this.b;
    array[offset + 3] = this.a;
    return array;
  }

  fromHex(hex: number): Color {
    hex = Math.floor(hex);
    this.r = ((hex >> 16) & 255) / 255;
    this.g = ((hex >> 8) & 255) / 255;
    this.b = (hex & 255) / 255;
    return this;
  }

  toHex(): number {
    return (Math.round(this.r * 255) << 16) ^ (Math.round(this.g * 255) << 8) ^ Math.round(this.b * 255);
  }

  fromHexString(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      this.r = parseInt(result[1], 16) / 255;
      this.g = parseInt(result[2], 16) / 255;
      this.b = parseInt(result[3], 16) / 255;
    }
    return this;
  }

  toHexString(): string {
    const r = Math.round(this.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(this.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(this.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  fromHSL(h: number, s: number, l: number, a: number = 1): Color {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
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
    this.a = a;
    return this;
  }

  toHSL(): { h: number; s: number; l: number } {
    const r = this.r;
    const g = this.g;
    const b = this.b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    const l = sum / 2;

    if (diff === 0) {
      return { h: 0, s: 0, l };
    }

    const s = l > 0.5 ? diff / (2 - sum) : diff / sum;

    let h: number;
    switch (max) {
      case r:
        h = ((g - b) / diff) + (g < b ? 6 : 0);
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
    h /= 6;

    return { h: h * 360, s, l };
  }

  fromVec3(v: Vec3, a: number = 1): Color {
    this.r = v.x;
    this.g = v.y;
    this.b = v.z;
    this.a = a;
    return this;
  }

  toVec3(): Vec3 {
    return new Vec3(this.r, this.g, this.b);
  }

  fromVec4(v: Vec4): Color {
    this.r = v.x;
    this.g = v.y;
    this.b = v.z;
    this.a = v.w;
    return this;
  }

  toVec4(): Vec4 {
    return new Vec4(this.r, this.g, this.b, this.a);
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

  scale(s: number): Color {
    this.r *= s;
    this.g *= s;
    this.b *= s;
    this.a *= s;
    return this;
  }

  equals(color: Color): boolean {
    return this.r === color.r && this.g === color.g && this.b === color.b && this.a === color.a;
  }

  static fromHex(hex: number): Color {
    return new Color().fromHex(hex);
  }

  static fromHexString(hex: string): Color {
    return new Color().fromHexString(hex);
  }

  static fromHSL(h: number, s: number, l: number, a: number = 1): Color {
    return new Color().fromHSL(h, s, l, a);
  }

  static fromVec3(v: Vec3, a: number = 1): Color {
    return new Color().fromVec3(v, a);
  }

  static fromVec4(v: Vec4): Color {
    return new Color().fromVec4(v);
  }

  static lerp(a: Color, b: Color, t: number): Color {
    return new Color().copy(a).lerp(b, t);
  }

  static multiply(a: Color, b: Color): Color {
    return new Color().copy(a).multiply(b);
  }

  static add(a: Color, b: Color): Color {
    return new Color().copy(a).add(b);
  }

  static subtract(a: Color, b: Color): Color {
    return new Color().copy(a).subtract(b);
  }

  static scale(color: Color, s: number): Color {
    return new Color().copy(color).scale(s);
  }
}
