import { IDisplay } from './idisplay';

export class Display implements IDisplay {
  private readonly buffer: Uint8Array;
  public readonly width: number;
  public readonly height: number;

  constructor() {
    this.width = 64;
    this.height = 32;
    this.buffer = new Uint8Array((this.width * this.height) >> 3);
  }

  public clear(): void {
    this.buffer.fill(0);
  }

  public draw_sprite(x: number, y: number, height: number, bytes: Uint8Array): number {
    if (height < 0 || height > bytes.length) {
      throw new RangeError('height must be 0..bytes.length');
    }

    let collision = 0;
    for (let row = 0; row < height; row++) {
      const byte = bytes[row] ?? 0;
      for (let bit = 0; bit < 8; bit++) {
        const pixel = (byte >> (7 - bit)) & 1;
        if (pixel === 0) continue;
        const px = (x + bit) % this.width;
        const py = (y + row) % this.height;
        const idx = py * this.width + px;
        const byteIdx = idx >> 3;
        const bitIdx = 7 - (idx & 7);
        const oldBit = (this.buffer[byteIdx] >> bitIdx) & 1;
        if (oldBit === 1) collision = 1;
        this.buffer[byteIdx] ^= (1 << bitIdx);
      }
    }
    return collision;
  }

  public get_pixel(x: number, y: number): number {
    if (!Number.isInteger(x) || x < 0 || x >= this.width) {
      throw new RangeError('x must be an integer 0..width-1');
    }
    if (!Number.isInteger(y) || y < 0 || y >= this.height) {
      throw new RangeError('y must be an integer 0..height-1');
    }
    const idx = y * this.width + x;
    const byteIdx = idx >> 3;
    const bitIdx = 7 - (idx & 7);
    return (this.buffer[byteIdx] >> bitIdx) & 1;
  }

  public set_pixel(x: number, y: number, val: number): void {
    if (!Number.isInteger(x) || x < 0 || x >= this.width) {
      throw new RangeError('x must be an integer 0..width-1');
    }
    if (!Number.isInteger(y) || y < 0 || y >= this.height) {
      throw new RangeError('y must be an integer 0..height-1');
    }
    const idx = y * this.width + x;
    const byteIdx = idx >> 3;
    const bitIdx = 7 - (idx & 7);
    const mask = 1 << bitIdx;
    if (val === 0) {
      this.buffer[byteIdx] &= ~mask;
    } else {
      this.buffer[byteIdx] |= mask;
    }
  }

  public get_buffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  public set_buffer(buffer: Uint8Array): void {
    if (buffer.length !== this.buffer.length) {
      throw new RangeError(`buffer length must be exactly ${this.buffer.length}`);
    }
    this.buffer.set(buffer);
  }
}
