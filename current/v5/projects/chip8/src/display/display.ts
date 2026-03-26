import { IDisplay } from './idisplay';

/**
 * 64×32 pixel framebuffer with sprite drawing and collision detection.
 * Coordinates wrap around the edges.
 */
export class Display implements IDisplay {
  private readonly framebuffer: boolean[][];

  constructor() {
    this.framebuffer = Array.from({ length: 32 }, () => Array(64).fill(false));
  }

  /**
   * Draws an 8-pixel-wide sprite starting at (x, y).
   * Each byte in `spriteData` represents one row of 8 pixels (MSB first).
   * Pixels are XORed onto the framebuffer.
   * @param x Horizontal coordinate (wraps at 64).
   * @param y Vertical coordinate (wraps at 32).
   * @param spriteData Raw sprite bytes.
   * @param height Number of rows to draw.
   * @returns `true` if any pixel changed from on to off (collision).
   * @throws {TypeError} If `spriteData` is not a Uint8Array.
   * @throws {RangeError} If `height` is negative or exceeds sprite data length.
   */
  drawSprite(x: number, y: number, spriteData: Uint8Array, height: number): boolean {
    if (height < 0 || height > spriteData.length) {
      throw new RangeError('height must be between 0 and spriteData.length');
    }

    let collision = false;

    for (let row = 0; row < height; row++) {
      const spriteByte = spriteData[row];
      const screenY = (y + row) % 32;

      for (let col = 0; col < 8; col++) {
        const spritePixel = (spriteByte >> (7 - col)) & 1;
        if (spritePixel === 0) continue;

        const screenX = (x + col) % 64;
        const currentPixel = this.framebuffer[screenY][screenX];

        if (currentPixel && spritePixel === 1) {
          collision = true;
        }

        this.framebuffer[screenY][screenX] = currentPixel !== (spritePixel === 1);
      }
    }

    return collision;
  }

  clear(): void {
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 64; x++) {
        this.framebuffer[y][x] = false;
      }
    }
  }

  getPixel(x: number, y: number): boolean {
    const wrappedX = x % 64;
    const wrappedY = y % 32;
    return this.framebuffer[wrappedY][wrappedX];
  }

  setPixel(x: number, y: number, state: boolean): void {
    const wrappedX = x % 64;
    const wrappedY = y % 32;
    this.framebuffer[wrappedY][wrappedX] = state;
  }

  /**
   * Notifies the rendering system that the framebuffer has changed.
   * Actual implementation depends on the target platform.
   */
  refresh(): void {
    // Display updated notification - implementation depends on rendering system
  }

  getWidth(): number {
    return 64;
  }

  getHeight(): number {
    return 32;
  }
}
