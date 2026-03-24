import { Display } from './display';
import { Pixel } from './pixel';
import { Renderer } from './renderer';

export class Sprite {
  private pixels: Pixel[] = [];
  private transform: Transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  private texture: Texture | null = null;
  private visible: boolean = true;
  private alpha: number = 1;

  constructor(width: number, height: number) {
    this.pixels = new Array(width * height);
    for (let i = 0; i < this.pixels.length; i++) {
      this.pixels[i] = new Pixel(0, 0, 0, 0);
    }
  }

  setPixel(x: number, y: number, pixel: Pixel): void {
    const width = Math.sqrt(this.pixels.length);
    const index = y * width + x;
    if (index >= 0 && index < this.pixels.length) {
      this.pixels[index] = pixel;
    }
  }

  getPixel(x: number, y: number): Pixel {
    const width = Math.sqrt(this.pixels.length);
    const index = y * width + x;
    return this.pixels[index] || new Pixel(0, 0, 0, 0);
  }

  setTexture(texture: Texture): void {
    this.texture = texture;
  }

  getTexture(): Texture | null {
    return this.texture;
  }

  setTransform(transform: Transform): void {
    this.transform = transform;
  }

  getTransform(): Transform {
    return this.transform;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setAlpha(alpha: number): void {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  getAlpha(): number {
    return this.alpha;
  }

  render(renderer: Renderer): void {
    if (!this.visible) return;

    renderer.save();
    renderer.translate(this.transform.x, this.transform.y);
    renderer.rotate(this.transform.rotation);
    renderer.scale(this.transform.scaleX, this.transform.scaleY);
    renderer.setAlpha(this.alpha);

    if (this.texture) {
      renderer.drawTexture(this.texture);
    } else {
      const width = Math.sqrt(this.pixels.length);
      const height = width;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixel = this.getPixel(x, y);
          if (pixel.a > 0) {
            renderer.drawPixel(x, y, pixel);
          }
        }
      }
    }

    renderer.restore();
  }

  getWidth(): number {
    return Math.sqrt(this.pixels.length);
  }

  getHeight(): number {
    return Math.sqrt(this.pixels.length);
  }

  clear(): void {
    for (let i = 0; i < this.pixels.length; i++) {
      this.pixels[i] = new Pixel(0, 0, 0, 0);
    }
  }

  clone(): Sprite {
    const width = this.getWidth();
    const height = this.getHeight();
    const clone = new Sprite(width, height);
    for (let i = 0; i < this.pixels.length; i++) {
      clone.pixels[i] = this.pixels[i];
    }
    clone.transform = { ...this.transform };
    clone.texture = this.texture;
    clone.visible = this.visible;
    clone.alpha = this.alpha;
    return clone;
  }
}

type Texture = any;
type Transform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};
