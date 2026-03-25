import { Vector2D } from '../core';

export class ScreenBuffer {
  private readonly width: number;
  private readonly height: number;
  private readonly buffer: string[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.buffer = Array.from({ length: height }, () => Array(width).fill(' '));
  }

  clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.buffer[y][x] = ' ';
      }
    }
  }

  setChar(x: number, y: number, char: string): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.buffer[y][x] = char.length > 0 ? char[0] : ' ';
  }

  getChar(x: number, y: number): string {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return ' ';
    return this.buffer[y][x];
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getBuffer(): ReadonlyArray<ReadonlyArray<string>> {
    return this.buffer;
  }

  drawText(pos: Vector2D, text: string): void {
    for (let i = 0; i < text.length; i++) {
      this.setChar(pos.x + i, pos.y, text[i]);
    }
  }

  drawHorizontalLine(y: number, x1: number, x2: number, char: string): void {
    const start = Math.max(0, Math.min(x1, x2));
    const end = Math.min(this.width - 1, Math.max(x1, x2));
    for (let x = start; x <= end; x++) {
      this.setChar(x, y, char);
    }
  }

  drawVerticalLine(x: number, y1: number, y2: number, char: string): void {
    const start = Math.max(0, Math.min(y1, y2));
    const end = Math.min(this.height - 1, Math.max(y1, y2));
    for (let y = start; y <= end; y++) {
      this.setChar(x, y, char);
    }
  }

  clone(): ScreenBuffer {
    const copy = new ScreenBuffer(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        copy.setChar(x, y, this.getChar(x, y));
      }
    }
    return copy;
  }
}
