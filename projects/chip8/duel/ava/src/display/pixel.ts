import { Display } from './display';
import { Sprite } from './sprite';
import { Renderer } from './renderer';

export class Pixel {
  private _r: number;
  private _g: number;
  private _b: number;
  private _a: number;

  constructor(r: number, g: number, b: number, a: number = 255) {
    this._r = Math.max(0, Math.min(255, Math.round(r)));
    this._g = Math.max(0, Math.min(255, Math.round(g)));
    this._b = Math.max(0, Math.min(255, Math.round(b)));
    this._a = Math.max(0, Math.min(255, Math.round(a)));
  }

  get r(): number {
    return this._r;
  }

  set r(value: number) {
    this._r = Math.max(0, Math.min(255, Math.round(value)));
  }

  get g(): number {
    return this._g;
  }

  set g(value: number) {
    this._g = Math.max(0, Math.min(255, Math.round(value)));
  }

  get b(): number {
    return this._b;
  }

  set b(value: number) {
    this._b = Math.max(0, Math.min(255, Math.round(value)));
  }

  get a(): number {
    return this._a;
  }

  set a(value: number) {
    this._a = Math.max(0, Math.min(255, Math.round(value)));
  }

  toHex(): string {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(this._r)}${toHex(this._g)}${toHex(this._b)}${toHex(this._a)}`;
  }

  toRgba(): string {
    return `rgba(${this._r}, ${this._g}, ${this._b}, ${(this._a / 255).toFixed(3)})`;
  }

  toArray(): [number, number, number, number] {
    return [this._r, this._g, this._b, this._a];
  }

  toObject(): { r: number; g: number; b: number; a: number } {
    return { r: this._r, g: this._g, b: this._b, a: this._a };
  }

  clone(): Pixel {
    return new Pixel(this._r, this._g, this._b, this._a);
  }

  static fromHex(hex: string): Pixel {
    const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i);
    if (!match) throw new Error('Invalid hex color');
    const r = parseInt(match[1], 16);
    const g = parseInt(match[2], 16);
    const b = parseInt(match[3], 16);
    const a = match[4] ? parseInt(match[4], 16) : 255;
    return new Pixel(r, g, b, a);
  }

  static fromRgba(rgba: string): Pixel {
    const match = rgba.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i);
    if (!match) throw new Error('Invalid rgba color');
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = match[4] ? Math.round(parseFloat(match[4]) * 255) : 255;
    return new Pixel(r, g, b, a);
  }
}
