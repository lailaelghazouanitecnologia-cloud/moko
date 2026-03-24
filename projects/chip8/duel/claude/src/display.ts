import { Memory } from './memory';

export class Display {
  public static readonly WIDTH = 64;
  public static readonly HEIGHT = 32;
  public static readonly SIZE = Display.WIDTH * Display.HEIGHT;

  private buffer: Uint8Array;

  constructor() {
    this.buffer = new Uint8Array(Display.SIZE);
  }

  public clear(): void {
    this.buffer.fill(0);
  }

  public drawSprite(x: number, y: number, spriteAddr: number, height: number, memory: Memory): boolean {
    let collision = false;

    for (let row = 0; row < height; row++) {
      const spriteByte = memory.readByte(spriteAddr + row);
      for (let col = 0; col < 8; col++) {
        if ((spriteByte & (0x80 >> col)) !== 0) {
          const px = (x + col) % Display.WIDTH;
          const py = (y + row) % Display.HEIGHT;
          const idx = py * Display.WIDTH + px;
          const oldPixel = this.buffer[idx];
          this.buffer[idx] ^= 1;
          if (oldPixel === 1 && this.buffer[idx] === 0) {
            collision = true;
          }
        }
      }
    }

    return collision;
  }

  public getPixel(x: number, y: number): number {
    if (x < 0 || x >= Display.WIDTH || y < 0 || y >= Display.HEIGHT) {
      return 0;
    }
    return this.buffer[y * Display.WIDTH + x];
  }

  public getBuffer(): Uint8Array {
    return this.buffer;
  }
}
