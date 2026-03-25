import { IDisplay } from './idisplay';

/**
 * 64×32 monochrome framebuffer.
 * Coordinates are zero-based: (0,0) is top-left, (63,31) is bottom-right.
 */
export class Display implements IDisplay {
  readonly width: number;
  readonly height: number;
  readonly buffer: Uint8Array;

  constructor() {
    this.width = 64;
    this.height = 32;
    this.buffer = new Uint8Array(this.width * this.height);
  }

  clear(): void {
    this.buffer.fill(0);
  }

  setPixel(x: number, y: number, val: number | boolean): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError('Coordinates out of bounds');
    }
    this.buffer[y * this.width + x] = (typeof val === 'boolean' ? (val ? 1 : 0) : val) & 1;
  }

  getPixel(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError('Coordinates out of bounds');
    }
    return this.buffer[y * this.width + x] !== 0;
  }

  invert(): void {
    for (let i = 0; i < this.buffer.length; i++) {
      this.buffer[i] ^= 1;
    }
  }

  /**
   * Push the framebuffer to the screen.
   * Base implementation is a no-op; subclasses override for specific backends.
   */
  render(): void {
    // Implementation depends on rendering backend
  }

  /**
   * Shift the framebuffer contents by (dx, dy).
   * Pixels shifted out are lost; new pixels are cleared to 0.
   * @param dx - Horizontal offset (positive = right)
   * @param dy - Vertical offset (positive = down)
   * @throws {TypeError} If dx or dy is not a number
   */
  scroll(dx: number, dy: number): void {
    const newBuffer = new Uint8Array(this.buffer.length);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const srcX = x - dx;
        const srcY = y - dy;

        if (srcX >= 0 && srcX < this.width && srcY >= 0 && srcY < this.height) {
          newBuffer[y * this.width + x] = this.buffer[srcY * this.width + srcX];
        }
      }
    }

    this.buffer.set(newBuffer);
  }
}
