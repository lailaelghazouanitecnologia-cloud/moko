import { IDisplay } from './idisplay';

export class Display implements IDisplay {
  private readonly width: number;
  private readonly height: number;
  private readonly pixels: Uint8Array;
  private dirty: boolean;

  constructor() {
    this.width = 64;
    this.height = 32;
    this.pixels = new Uint8Array(this.width * this.height);
    this.dirty = false;
  }

  /**
   * Draws an 8-pixel-wide sprite starting at (x, y) with the given height.
   * Each byte in spriteData represents a row of 8 pixels (MSB left).
   * Pixels are XORed onto the display; if any pixel is erased (1→0),
   * the return value is 1 (collision), otherwise 0.
   *
   * @param x - Left column (0–63)
   * @param y - Top row (0–31)
   * @param spriteData - Array of height bytes
   * @param height - Number of rows to draw (0–15)
   * @returns 1 if any pixel was erased, 0 otherwise
   * @throws {TypeError} If spriteData is not a Uint8Array
   * @throws {RangeError} If height is out of range
   */
  drawSprite(x: number, y: number, spriteData: Uint8Array, height: number): number {
    if (height > 15) {
      throw new RangeError('height must be ≤ 15');
    }

    let collision = 0;

    for (let row = 0; row < height; row++) {
      const spriteByte = spriteData[row];
      const screenY = (y + row) % this.height;

      for (let col = 0; col < 8; col++) {
        const spritePixel = (spriteByte >> (7 - col)) & 1;
        if (spritePixel === 0) continue;

        const screenX = (x + col) % this.width;
        const pixelIndex = screenY * this.width + screenX;
        const currentPixel = this.pixels[pixelIndex];

        if (currentPixel === 1) {
          collision = 1;
        }

        this.pixels[pixelIndex] ^= 1;
        this.dirty = true;
      }
    }

    return collision;
  }

  clear(): void {
    this.pixels.fill(0);
    this.dirty = true;
  }

  getPixel(x: number, y: number): number {
    const index = y * this.width + x;
    return this.pixels[index];
  }

  setPixel(x: number, y: number, value: number): void {
    const index = y * this.width + x;
    this.pixels[index] = value & 1;
    this.dirty = true;
  }

  render(): void {
    this.dirty = false;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  isDirty(): boolean {
    return this.dirty;
  }
}
