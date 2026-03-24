import { IOPortSpace } from './io-port-space';

export class VGATextBuffer {
  private memory: Uint8Array;
  private cursorX: number;
  private cursorY: number;
  private cursorStart: number;
  private cursorEnd: number;
  private mode: number;
  private color: number;
  private width: number;
  private height: number;

  constructor() {
    this.memory = new Uint8Array(32768);
    this.cursorX = 0;
    this.cursorY = 0;
    this.cursorStart = 0;
    this.cursorEnd = 0;
    this.mode = 0x03;
    this.color = 0x07;
    this.width = 80;
    this.height = 25;
  }

  writeChar(x: number, y: number, char: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    const offset = (y * this.width + x) * 2;
    this.memory[offset] = char & 0xFF;
    this.memory[offset + 1] = this.color;
  }

  readChar(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return 0;
    }
    const offset = (y * this.width + x) * 2;
    return this.memory[offset];
  }

  setCursor(x: number, y: number): void {
    if (x < 0 || x >= this.width) {
      x = 0;
    }
    if (y < 0 || y >= this.height) {
      y = 0;
    }
    this.cursorX = x;
    this.cursorY = y;
  }

  getCursor(): { x: number; y: number } {
    return { x: this.cursorX, y: this.cursorY };
  }

  scrollUp(lines: number): void {
    if (lines <= 0 || lines >= this.height) {
      return;
    }
    const bytesPerLine = this.width * 2;
    const bytesToCopy = (this.height - lines) * bytesPerLine;
    const srcOffset = lines * bytesPerLine;
    
    for (let i = 0; i < bytesToCopy; i++) {
      this.memory[i] = this.memory[srcOffset + i];
    }
    
    const clearStart = bytesToCopy;
    const clearEnd = this.height * bytesPerLine;
    for (let i = clearStart; i < clearEnd; i++) {
      this.memory[i] = 0;
    }
    
    this.cursorY = Math.max(0, this.cursorY - lines);
  }

  clearScreen(): void {
    this.memory.fill(0);
    this.cursorX = 0;
    this.cursorY = 0;
  }

  setMode(mode: number): void {
    this.mode = mode & 0xFF;
  }

  getMode(): number {
    return this.mode;
  }

  setColor(fg: number, bg: number): void {
    this.color = ((bg & 0x0F) << 4) | (fg & 0x0F);
  }

  getColor(): number {
    return this.color;
  }

  setCursorShape(start: number, end: number): void {
    this.cursorStart = start & 0x1F;
    this.cursorEnd = end & 0x1F;
  }

  getCursorShape(): { start: number; end: number } {
    return { start: this.cursorStart, end: this.cursorEnd };
  }

  writeString(x: number, y: number, text: string): void {
    for (let i = 0; i < text.length; i++) {
      this.writeChar(x + i, y, text.charCodeAt(i));
    }
  }

  getScreenSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  setScreenSize(width: number, height: number): void {
    if (width > 0 && width <= 132 && height > 0 && height <= 60) {
      this.width = width;
      this.height = height;
      this.clearScreen();
    }
  }

  getFrameBuffer(): Uint8Array {
    return this.memory;
  }
}
