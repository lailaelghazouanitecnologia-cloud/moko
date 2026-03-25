import { IDisplay } from './idisplay';

export class Display implements IDisplay {
  public readonly width: number;
  public readonly height: number;
  private readonly buffer: boolean[][];
  private collision: boolean;

  constructor() {
    this.width = 64;
    this.height = 32;
    this.buffer = Array.from({ length: this.height }, () => Array(this.width).fill(false));
    this.collision = false;
  }

  public clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.buffer[y][x] = false;
      }
    }
    this.collision = false;
  }

  public drawSprite(x: number, y: number, sprite: Uint8Array): boolean {
    if (!Array.isArray(sprite) || !sprite.every((b) => typeof b === 'number')) {
      throw new TypeError('sprite must be an array of numbers');
    }

    this.collision = false;

    for (let row = 0; row < sprite.length; row++) {
      const byte = sprite[row];
      for (let bit = 0; bit < 8; bit++) {
        const pixelX = (x + bit) % this.width;
        const pixelY = (y + row) % this.height;
        const pixel = (byte & (0x80 >> bit)) !== 0;

        if (pixel) {
          const current = this.buffer[pixelY][pixelX];
          this.buffer[pixelY][pixelX] = !current;
          if (current) {
            this.collision = true;
          }
        }
      }
    }

    return this.collision;
  }

  public getPixel(x: number, y: number): boolean {
    const clampedX = ((x % this.width) + this.width) % this.width;
    const clampedY = ((y % this.height) + this.height) % this.height;
    return this.buffer[clampedY][clampedX];
  }

  public setPixel(x: number, y: number, value: boolean): void {
    const clampedX = ((x % this.width) + this.width) % this.width;
    const clampedY = ((y % this.height) + this.height) % this.height;
    this.buffer[clampedY][clampedX] = value;
  }

  public getCollision(): boolean {
    return this.collision;
  }

  public resetCollision(): void {
    this.collision = false;
  }

  /**
   * Exports the pixel buffer as a compact Uint8Array bit-packed representation.
   * Each byte represents 8 horizontal pixels.
   */
  public getBuffer(): Uint8Array {
    const buffer = new Uint8Array((this.width * this.height) / 8);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x += 8) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          if (this.buffer[y][x + bit]) {
            byte |= 0x80 >> bit;
          }
        }
        buffer[(y * this.width + x) / 8] = byte;
      }
    }
    return buffer;
  }
}
