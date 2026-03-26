import { IDisplay } from './idisplay';

export class Display implements IDisplay {
  private readonly pixels: Uint8Array;

  constructor() {
    this.pixels = new Uint8Array(64 * 32);
  }

  drawSprite(x: number, y: number, bytes: Uint8Array, n: number): number {
    let collision = 0;
    const width = 64;
    const height = 32;

    for (let row = 0; row < n; row++) {
      const spriteByte = bytes[row];
      for (let col = 0; col < 8; col++) {
        const pixelX = (x + col) % width;
        const pixelY = (y + row) % height;
        const pixelIndex = pixelY * width + pixelX;
        const spritePixel = (spriteByte >> (7 - col)) & 1;
        const currentPixel = this.pixels[pixelIndex];
        
        if (spritePixel === 1 && currentPixel === 1) {
          collision = 1;
        }
        
        this.pixels[pixelIndex] = currentPixel ^ spritePixel;
      }
    }

    return collision;
  }

  clear(): void {
    this.pixels.fill(0);
  }

  getPixel(x: number, y: number): number {
    const width = 64;
    const height = 32;
    const pixelX = x & (width - 1);
    const pixelY = y & (height - 1);
    return this.pixels[pixelY * width + pixelX];
  }

  setPixel(x: number, y: number, value: number): void {
    const width = 64;
    const height = 32;
    const pixelX = x & (width - 1);
    const pixelY = y & (height - 1);
    this.pixels[pixelY * width + pixelX] = value & 1;
  }

  render(): ImageData {
    const width = 64;
    const height = 32;
    const imageData = new ImageData(width, height);
    
    for (let i = 0; i < this.pixels.length; i++) {
      const pixel = this.pixels[i];
      const color = pixel ? 255 : 0;
      const idx = i * 4;
      imageData.data[idx] = color;
      imageData.data[idx + 1] = color;
      imageData.data[idx + 2] = color;
      imageData.data[idx + 3] = 255;
    }
    
    return imageData;
  }

  getWidth(): number {
    return 64;
  }

  getHeight(): number {
    return 32;
  }
}
