import { IDisplay } from './idisplay';

export class Display implements IDisplay {
  readonly width = 64;
  readonly height = 32;
  private readonly video: Uint8Array;
  private scale: number;

  constructor(scale = 10) {
    if (!Number.isInteger(scale) || scale <= 0) {
      throw new RangeError('Scale must be a positive integer');
    }
    this.video = new Uint8Array(this.width * this.height);
    this.scale = scale;
  }

  clear(): void {
    this.video.fill(0);
  }

  drawSprite(x: number, y: number, bytes: Uint8Array, n: number): number {
    if (!Number.isInteger(n) || n < 0 || n > bytes.length) {
      throw new RangeError('n must be an integer between 0 and bytes.length');
    }
    if (!Number.isInteger(x) || x < 0 || x >= this.width) {
      throw new RangeError(`x must be an integer between 0 and ${this.width - 1}`);
    }
    if (!Number.isInteger(y) || y < 0 || y >= this.height) {
      throw new RangeError(`y must be an integer between 0 and ${this.height - 1}`);
    }

    let collision = 0;
    for (let row = 0; row < n; row++) {
      const byte = bytes[row];
      for (let col = 0; col < 8; col++) {
        const bit = (byte >> (7 - col)) & 1;
        if (bit === 0) continue;
        const px = (x + col) % this.width;
        const py = (y + row) % this.height;
        const idx = py * this.width + px;
        const old = this.video[idx];
        this.video[idx] ^= 1;
        if (old === 1 && this.video[idx] === 0) collision = 1;
      }
    }
    return collision;
  }

  getPixel(x: number, y: number): 0 | 1 {
    if (!Number.isInteger(x) || x < 0 || x >= this.width) {
      throw new RangeError(`x must be an integer between 0 and ${this.width - 1}`);
    }
    if (!Number.isInteger(y) || y < 0 || y >= this.height) {
      throw new RangeError(`y must be an integer between 0 and ${this.height - 1}`);
    }
    const idx = y * this.width + x;
    return this.video[idx] as 0 | 1;
  }

  getImageData(): ImageData {
    const imageData = new ImageData(this.width * this.scale, this.height * this.scale);
    for (let py = 0; py < this.height; py++) {
      for (let px = 0; px < this.width; px++) {
        const pixel = this.getPixel(px, py);
        const color = pixel === 1 ? 255 : 0;
        for (let dy = 0; dy < this.scale; dy++) {
          for (let dx = 0; dx < this.scale; dx++) {
            const idx = ((py * this.scale + dy) * (this.width * this.scale) + (px * this.scale + dx)) * 4;
            imageData.data[idx] = color;
            imageData.data[idx + 1] = color;
            imageData.data[idx + 2] = color;
            imageData.data[idx + 3] = 255;
          }
        }
      }
    }
    return imageData;
  }

  setScale(scale: number): void {
    if (!Number.isInteger(scale) || scale <= 0) {
      throw new RangeError('Scale must be a positive integer');
    }
    this.scale = scale;
  }
}
