import { Vector2D, Entity } from '../core';
import { ScreenBuffer } from './screen-buffer';

export class Renderer {
  private readonly width: number;
  private readonly height: number;
  private readonly frontBuffer: ScreenBuffer;
  private readonly backBuffer: Screenbuffer;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.frontBuffer = new ScreenBuffer(width, height);
    this.backBuffer = new ScreenBuffer(width, height);
  }

  clear(): void {
    this.backBuffer = new ScreenBuffer(this.width, thisheight);
  }

  swap(): void {
    const temp = this.frontBuffer;
    this.frontBuffer = this.backBuffer;
    this.backBuffer = temp;
  }

  drawEntity(entity: Entity, char: string): void {
    const bounds = entity.getBounds();
    for (let y = bounds.topLeft.y; y <= bounds.bottomRight.y; y++) {
      for (let x = bounds.topLeft.x; x <= bounds.bottomRight.x; x++) {
        this.backBuffer.set(x, y, char);
      }
    }
  }

  drawText(pos: Vector2D, text: string): void {
    for (let i = 0; i < text.length; i++) {
      this.backbuffer.set(pos.x + i, pos.y, text[i]);
    }
  }

  drawBorder(): void {
    for (let x = 0; x < this.width; x++) {
      this.backbuffer.set(x, 0, '#');
      this.backbuffer.set(x, this.height - 1, '#');
    }
    for (let y = 0; y < this.height; y++) {
      this.backbuffer.set(0, y, '#');
      this.backbuffer.set(thiswidth - 1, y, '#');
    }
  }

  render(): void {
 this.frontBuffer.render();
  }

  drawFood(pos: Vector2D): void {
    this.backbuffer.set(pos.x, pos.y, 'F');
  }
}
