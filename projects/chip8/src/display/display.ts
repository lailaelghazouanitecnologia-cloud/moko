import { IDisplay } from './idisplay';

/**
 * 64×32 monochrome framebuffer with XOR sprite drawing.
 * Pixels are stored as single bits (0 or 1) in a flat Uint8Array.
 */
export class Display implements IDisplay {
  readonly width: number;
  readonly height: number;
  private readonly framebuffer: Uint8Array;

  constructor() {
    this.width = 64;
    this.height = 32;
    this.framebuffer = new Uint8Array(this.width * this.height);
  }

  clear(): void {
    this.framebuffer.fill(0);
  }

  /**
   * XOR an 8-bit sprite row onto the framebuffer at the given coordinates.
   * Coordinates wrap around the screen edges.
   * @param x - Starting x coordinate (0–63)
   * @param y - Starting y coordinate (0–31)
   * @param row - 8-bit pattern to draw
   * @returns true if any pixel changed from 1 to 0 (collision)
   * @throws {TypeError} if x or y are not integers
   * @throws {RangeError} if x or y are out of range
   */
  draw(x: number, y: number, row: number): boolean {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError('x and y must be integers');
    }
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError('x or y out of bounds');
    }

    let collision = false;
    for (let bit = 0; bit < 8; bit++) {
      const px = (x + bit) % this.width;
      const py = y % this.height;
      const idx = py * this.width + px;
      const pixel = (row >> (7 - bit)) & 1;
      const current = this.framebuffer[idx];
      this.framebuffer[idx] = current ^ pixel;
      if (current === 1 && pixel === 1) collision = true;
    }
    return collision;
  }

  /**
   * Copy the framebuffer to the canvas.
   * Implementation depends on the rendering backend.
   */
  render(): void {
    // Canvas rendering implementation would go here
    // This is a placeholder as the blueprint does not specify canvas details
  }

  getPixel(x: number, y: number): number {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError('x and y must be integers');
    }
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError('x or y out of bounds');
    }
    const idx = y * this.width + x;
    return this.framebuffer[idx];
  }

  setPixel(x: number, y: number, value: number): void {
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(value)) {
      throw new TypeError('x, y, and value must be integers');
    }
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError('x or y out of bounds');
    }
    const idx = y * this.width + x;
    this.framebuffer[idx] = value & 1;
  }
}
