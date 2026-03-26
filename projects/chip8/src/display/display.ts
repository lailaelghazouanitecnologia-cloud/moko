import { IDisplay } from './idisplay';

/**
 * 64x32 monochrome display with sprite drawing and collision detection.
 * The display uses a packed bit buffer where each bit represents a pixel.
 */
export class Display implements IDisplay {
  private readonly framebuffer: Uint8Array;
  private readonly width: number;
  private readonly height: number;

  constructor() {
    this.width = 64;
    this.height = 32;
    this.framebuffer = new Uint8Array(256); // 64 * 32 / 8 = 256 bytes
  }

  /**
   * Draws an 8-pixel-wide sprite at the given coordinates using XOR logic.
   * If any pixel is flipped from on to off, a collision is detected.
   * Coordinates wrap around the screen edges.
   *
   * @param x - Horizontal position (0-63)
   * @param y - Vertical position (0-31)
   * @param sprite - Array of bytes where each byte represents an 8-pixel row
   * @returns true if any pixel was turned off (collision), false otherwise
   * @throws {TypeError} If sprite is not a Uint8Array
   * @throws {RangeError} If x or y are not integers
   */
  drawSprite(x: number, y: number, sprite: Uint8Array): boolean {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new RangeError('Coordinates must be integers');
    }

    let collision = false;

    for (let row = 0; row < sprite.length; row++) {
      const spriteRow = sprite[row];
      const screenY = (y + row) % this.height;

      for (let col = 0; col < 8; col++) {
        const spritePixel = (spriteRow >> (7 - col)) & 1;
        if (spritePixel === 0) continue;

        const screenX = (x + col) % this.width;
        const pixelIndex = screenY * this.width + screenX;
        const byteIndex = Math.floor(pixelIndex / 8);
        const bitIndex = pixelIndex % 8;

        const currentBit = (this.framebuffer[byteIndex] >> bitIndex) & 1;
        if (currentBit === 1) collision = true;

        if (currentBit === 1) {
          this.framebuffer[byteIndex] &= ~(1 << bitIndex);
        } else {
          this.framebuffer[byteIndex] |= 1 << bitIndex;
        }
      }
    }

    return collision;
  }

  clear(): void {
    this.framebuffer.fill(0);
  }

  getPixel(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError('Pixel coordinates out of bounds');
    }

    const pixelIndex = y * this.width + x;
    const byteIndex = Math.floor(pixelIndex / 8);
    const bitIndex = pixelIndex % 8;

    return ((this.framebuffer[byteIndex] >> bitIndex) & 1) === 1;
  }

  setPixel(x: number, y: number, value: boolean): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError('Pixel coordinates out of bounds');
    }

    const pixelIndex = y * this.width + x;
    const byteIndex = Math.floor(pixelIndex / 8);
    const bitIndex = pixelIndex % 8;

    if (value) {
      this.framebuffer[byteIndex] |= 1 << bitIndex;
    } else {
      this.framebuffer[byteIndex] &= ~(1 << bitIndex);
    }
  }

  getFramebuffer(): Uint8Array {
    return new Uint8Array(this.framebuffer);
  }
}
