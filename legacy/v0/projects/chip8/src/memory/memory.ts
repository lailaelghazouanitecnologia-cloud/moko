import { IMemory } from './imemory';

/**
 * 4 KB RAM with ROM loader and font storage.
 * Provides read/write access to memory and automatic font loading.
 */
export class Memory implements IMemory {
  private readonly ram: Uint8Array;

  constructor() {
    this.ram = new Uint8Array(4096);
    this.loadFont();
  }

  loadRom(bytes: Uint8Array): void {
    if (0x200 + bytes.length > this.ram.length) {
      throw new RangeError('ROM too large for memory');
    }
    this.ram.set(bytes, 0x200);
  }

  read(addr: number): number {
    if (!Number.isInteger(addr) || addr < 0 || addr >= this.ram.length) {
      throw new RangeError(`Address must be an integer between 0 and ${this.ram.length - 1}`);
    }
    return this.ram[addr];
  }

  write(addr: number, val: number): void {
    if (!Number.isInteger(addr) || addr < 0 || addr >= this.ram.length) {
      throw new RangeError(`Address must be an integer between 0 and ${this.ram.length - 1}`);
    }
    if (!Number.isInteger(val)) {
      throw new TypeError('Value must be an integer');
    }
    this.ram[addr] = val & 0xFF;
  }

  loadFont(): void {
    const hexSprites = [
      0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
      0x20, 0x60, 0x20, 0x20, 0x70, // 1
      0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
      0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
      0x90, 0x90, 0xF0, 0x10, 0x10, // 4
      0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
      0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
      0xF0, 0x10, 0x20, 0x40, 0x40, // 7
      0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
      0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
      0xF0, 0x90, 0xF0, 0x90, 0x90, // A
      0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
      0xF0, 0x80, 0x80, 0x80, 0xF0, // C
      0xE0, 0x90, 0x90, 0x90, 0xE0, // D
      0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
      0xF0, 0x80, 0xF0, 0x80, 0x80  // F
    ];
    this.ram.set(hexSprites, 0x50);
  }

  reset(): void {
    this.ram.fill(0);
    this.loadFont();
  }
}
