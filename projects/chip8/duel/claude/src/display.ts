import { EventEmitter } from 'events';

export interface DisplayOptions {
  width?: number;
  height?: number;
  scale?: number;
}

export class Display extends EventEmitter {
  public readonly width: number;
  public readonly height: number;
  public readonly scale: number;
  private buffer: Uint8Array;

  constructor(options: DisplayOptions = {}) {
    super();
    this.width = options.width ?? 64;
    this.height = options.height ?? 32;
    this.scale = options.scale ?? 10;
    this.buffer = new Uint8Array(this.width * this.height);
  }

  public clear(): void {
    this.buffer.fill(0);
    this.emit('refresh');
  }

  public setPixel(x: number, y: number, value: number): boolean {
    const idx = y * this.width + x;
    const old = this.buffer[idx];
    this.buffer[idx] = value & 1;
    return old !== this.buffer[idx];
  }

  public getPixel(x: number, y: number): number {
    return this.buffer[y * this.width + x] & 1;
  }

  public draw(x: number, y: number, sprite: Uint8Array): boolean {
    let collision = false;
    for (let row = 0; row < sprite.length; row++) {
      const byte = sprite[row];
      for (let col = 0; col < 8; col++) {
        const bit = (byte >> (7 - col)) & 1;
        if (bit === 0) continue;
        const px = (x + col) % this.width;
        const py = (y + row) % this.height;
        const old = this.getPixel(px, py);
        this.setPixel(px, py, old ^ 1);
        if (old === 1) collision = true;
      }
    }
    this.emit('refresh');
    return collision;
  }

  public getBuffer(): Uint8Array {
    return this.buffer;
  }

  public getImageData(): ImageData {
    const imageData = new ImageData(this.width * this.scale, this.height * this.scale);
    const data = imageData.data;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const pixel = this.getPixel(x, y) ? 255 : 0;
        const baseX = x * this.scale;
        const baseY = y * this.scale;
        for (let dy = 0; dy < this.scale; dy++) {
          for (let dx = 0; dx < this.scale; dx++) {
            const idx = ((baseY + dy) * imageData.width + (baseX + dx)) * 4;
            data[idx] = pixel;
            data[idx + 1] = pixel;
            data[idx + 2] = pixel;
            data[idx + 3] = 255;
          }
        }
      }
    }
    return imageData;
  }
}
