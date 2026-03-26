import { IDisplay } from './idisplay';

/**
 * 64×32 monochrome framebuffer with XOR sprite drawing.
 * Pixels are packed into 256 bytes (64×32 ÷ 8).
 */
export class Display implements IDisplay {
  private readonly framebuffer: Uint8Array;
  private readonly width: number;
  private readonly height: number;

  constructor() {
    this.width = 64;
    this.height = 32;
    this.framebuffer = new Uint8Array(256);
  }

  drawSprite(x: number, y: number, sprite: Uint8Array, height: number): boolean {
    if (!Number.isInteger(x) || x < 0 || x >= this.width) {
      throw new RangeError(`x must be an integer in [0, ${this.width})`);
    }
    if (!Number.isInteger(y) || y < 0 || y >= this.height) {
      throw new RangeError(`y must be an integer in [0, ${this.height})`);
    }
    if (!Number.isInteger(height) || height <= 0 || height > this.height) {
      throw new RangeError(`height must be an integer in (0, ${this.height}]`);
    }

    let collision = false;

    for (let row = 0; row < height; row++) {
      const spriteByte = sprite[row];
      const screenY = (y + row) % this.height;

      for (let col = 0; col < 8; col++) {
        const spritePixel = (spriteByte >> (7 - col)) & 1;
        if (spritePixel === 0) continue;

        const screenX = (x + col) % this.width;
        const pixelIndex = screenY * this.width + screenX;
        const byteIndex = Math.floor(pixelIndex / 8);
        const bitIndex = 7 - (pixelIndex % 8);

        const currentBit = (this.framebuffer[byteIndex] >> bitIndex) & 1;
        if (currentBit === 1 && spritePixel === 1) {
          collision = true;
        }

        const newBit = currentBit ^ spritePixel;
        const mask = 1 << bitIndex;
        this.framebuffer[byteIndex] =
          (this.framebuffer[byteIndex] & ~mask) | (newBit << bitIndex);
      }
    }

    return collision;
  }

  clear(): void {
    this.framebuffer.fill(0);
  }

  getPixel(x: number, y: number): boolean {
    if (!Number.isInteger(x) || x < 0 || x >= this.width) {
      throw new RangeError(`x must be an integer in [0, ${this.width})`);
    }
    if (!Number.isInteger(y) || y < 0 || y >= this.height) {
      throw new RangeError(`y must be an integer in [0, ${this.height})`);
    }

    const pixelIndex = y * this.width + x;
    const byteIndex = Math.floor(pixelIndex / 8);
    const bitIndex = 7 - (pixelIndex % 8);

    return ((this.framebuffer[byteIndex] >> bitIndex) & 1) === 1;
  }

  getFramebuffer(): Uint8Array {
    return new Uint8Array(this.framebuffer);
  }

  reset(): void {
    this.framebuffer.fill(0);
  }
}
