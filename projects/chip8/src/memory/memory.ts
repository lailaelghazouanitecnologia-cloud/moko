import { IMemory } from './imemory';

/**
 * 4KB RAM with fontset and ROM loading capabilities.
 * Provides memory operations for the Chip-8 emulator.
 */
export class Memory implements IMemory {
  readonly size = 4096;
  private readonly ram: Uint8Array;
  private readonly fontsetAddress = 0x50;

  constructor() {
    this.ram = new Uint8Array(this.size);
  }

  read(address: number): number {
    if (!Number.isInteger(address)) {
      throw new TypeError('Address must be an integer');
    }
    if (address < 0 || address >= this.size) {
      throw new RangeError(`Address out of bounds: ${address}`);
    }
    return this.ram[address];
  }

  write(address: number, value: number): void {
    if (!Number.isInteger(address)) {
      throw new TypeError('Address must be an integer');
    }
    if (!Number.isInteger(value)) {
      throw new TypeError('Value must be an integer');
    }
    if (address < 0 || address >= this.size) {
      throw new RangeError(`Address out of bounds: ${address}`);
    }
    if (value < 0 || value > 255) {
      throw new RangeError(`Value out of range: ${value}`);
    }
    this.ram[address] = value;
  }

  /**
   * Loads the built-in fontset into memory at the fontset address.
   * Each character is 5 bytes tall.
   */
  loadFontset(): void {
    const fontset = new Uint8Array([
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
    for (let i = 0; i < fontset.length; i++) {
      this.ram[this.fontsetAddress + i] = fontset[i];
    }
  }

  loadRom(rom: Uint8Array): void {
    if (rom.length === 0) {
      throw new RangeError('ROM cannot be empty');
    }
    if (rom.length > this.size - 0x200) {
      throw new RangeError('ROM too large');
    }
    for (let i = 0; i < rom.length; i++) {
      this.ram[0x200 + i] = rom[i];
    }
  }

  reset(): void {
    this.ram.fill(0);
  }

  getFontAddress(digit: number): number {
    if (!Number.isInteger(digit)) {
      throw new TypeError('Digit must be an integer');
    }
    if (digit < 0 || digit > 15) {
      throw new RangeError(`Digit must be 0-15: ${digit}`);
    }
    return this.fontsetAddress + digit * 5;
  }
}
