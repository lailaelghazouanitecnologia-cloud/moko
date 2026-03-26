import { IMemory } from './imemory';

/**
 * Manages 4096 bytes of CHIP-8 memory with font set and ROM loading.
 * Memory layout:
 * - 0x000–0x1FF: Reserved for interpreter (font set stored here)
 * - 0x200–0xFFF: Program ROM and runtime memory
 */
export class Memory implements IMemory {
  private readonly memory: Uint8Array;

  constructor() {
    this.memory = new Uint8Array(4096);
    this.reset();
  }

  read(address: number): number {
    if (!this.isValidAddress(address)) {
      throw new RangeError(`Invalid memory address: ${address}`);
    }
    return this.memory[address];
  }

  write(address: number, value: number): void {
    if (!this.isValidAddress(address)) {
      throw new RangeError(`Invalid memory address: ${address}`);
    }
    if (address < 0x200) {
      throw new TypeError(`Cannot write to reserved memory at address: ${address}`);
    }
    this.memory[address] = value & 0xFF;
  }

  loadROM(data: Uint8Array): void {
    if (data.length > 3584) {
      throw new TypeError(`ROM too large: ${data.length} bytes (max 3584)`);
    }
    this.memory.set(data, 0x200);
  }

  reset(): void {
    this.memory.fill(0);
    this.loadFontSet();
  }

  getFontAddress(digit: number): number {
    if (digit < 0 || digit > 15) {
      throw new RangeError(`Invalid font digit: ${digit}`);
    }
    return digit * 5;
  }

  isValidAddress(address: number): boolean {
    return address >= 0 && address < 4096;
  }

  /**
   * Load the built-in font set into memory at 0x000.
   * Each digit (0–F) is represented by a 5-byte sprite.
   */
  private loadFontSet(): void {
    const fontSet = new Uint8Array([
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
    ]);
    this.memory.set(fontSet, 0x000);
  }
}
