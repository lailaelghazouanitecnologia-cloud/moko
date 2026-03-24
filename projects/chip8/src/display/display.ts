import { Pixel } from './pixel';
import { Sprite } from './sprite';
import { Renderer } from './renderer';

export class Display {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = context;
    this.width = canvas.width;
    this.height = canvas.height;
    this.renderer = new Renderer(this.ctx);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getRenderer(): Renderer {
    return this.renderer;
  }

  clear(color?: string): void {
    if (color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  render(): void {
    this.renderer.render();
  }

  update(deltaTime: number): void {
    this.renderer.update(deltaTime);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderer.onResize(width, height);
  }

  drawPixel(pixel: Pixel): void {
    this.renderer.drawPixel(pixel);
  }

  drawSprite(sprite: Sprite, x: number, y: number): void {
    this.renderer.drawSprite(sprite, x, y);
  }

  setPixel(x: number, y: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, 1, 1);
  }

  getPixel(x: number, y: number): string {
    const imageData = this.ctx.getImageData(x, y, 1, 1);
    const [r, g, b, a] = imageData.data;
    return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
  }
}
