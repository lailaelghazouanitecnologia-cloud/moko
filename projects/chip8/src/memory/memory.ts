import { IMemory } from './imemory';

export class Memory implements IMemory {
  private readonly ram: Uint8Array;

  constructor() {
    this.ram = new Uint8Array(4096);
  }

  read(address: number): number {
    if (!Number.isInteger(address)) {
      throw new TypeError(`Address must be an integer: ${address}`);
    }
    if (address < 0 || address > 0xFFF) {
      throw new RangeError(`Memory address out of bounds: 0x${address.toString(16).padStart(3, '0')}`);
    }
    return this.ram[address];
  }

  write(address: number, value: number): void {
    if (!Number.isInteger(address)) {
      throw new TypeError(`Address must be an integer: ${address}`);
    }
    if (!Number.isInteger(value)) {
      throw new TypeError(`Value must be an integer: ${value}`);
    }
    if (address < 0 || address > 0xFFF) {
      throw new RangeError(`Memory address out of bounds: 0x${address.toString(16).padStart(3, '0')}`);
    }
    if (value < 0 || value > 0xFF) {
      throw new RangeError(`Value out of bounds: ${value}`);
    }
    this.ram[address] = value;
  }

  /**
   * Loads the built-in hexadecimal font sprites into memory starting at address 0x000.
   * Each character is 5 bytes tall, representing a 4x5 pixel sprite.
   */
  loadFont(): void {
    const fontData = new Uint8Array([
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
    
    for (let i = 0; i < fontData.length; i++) {
      this.ram[i] = fontData[i];
    }
  }

  loadROM(data: Uint8Array): void {
    if (data.length > 3584) {
      throw new RangeError(`ROM too large: ${data.length} bytes (max 3584)`);
    }
    
    for (let i = 0; i < data.length; i++) {
      this.ram[0x200 + i] = data[i];
    }
  }
}
