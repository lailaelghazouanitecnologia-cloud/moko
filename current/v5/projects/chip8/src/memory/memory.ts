import { IMemory } from './imemory';

export class Memory implements IMemory {
  private readonly ram: Uint8Array;

  constructor() {
    this.ram = new Uint8Array(4096);
    this.reset();
  }

  read(address: number): number {
    if (address < 0 || address > 0xFFF) {
      throw new RangeError(`Invalid memory address: ${address}`);
    }
    return this.ram[address];
  }

  write(address: number, value: number): void {
    if (address < 0 || address > 0xFFF) {
      throw new RangeError(`Invalid memory address: ${address}`);
    }
    if (value < 0 || value > 0xFF) {
      throw new RangeError(`Invalid byte value: ${value}`);
    }
    this.ram[address] = value;
  }

  readWord(address: number): number {
    if (address < 0 || address > 0xFFE) {
      throw new RangeError(`Invalid word address: ${address}`);
    }
    const high = this.read(address);
    const low = this.read(address + 1);
    return (high << 8) | low;
  }

  writeWord(address: number, value: number): void {
    if (address < 0 || address > 0xFFE) {
      throw new RangeError(`Invalid word address: ${address}`);
    }
    if (value < 0 || value > 0xFFFF) {
      throw new RangeError(`Invalid word value: ${value}`);
    }
    this.write(address, (value >> 8) & 0xFF);
    this.write(address + 1, value & 0xFF);
  }

  loadRom(data: Uint8Array): void {
    if (data.length > 3584) {
      throw new RangeError(`ROM too large: ${data.length} bytes (max 3584)`);
    }
    for (let i = 0; i < data.length; i++) {
      this.write(0x200 + i, data[i]);
    }
  }

  reset(): void {
    this.ram.fill(0);
    this.loadFonts();
  }

  loadFonts(): void {
    const fonts = new Uint8Array([
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
    for (let i = 0; i < fonts.length; i++) {
      this.write(i, fonts[i]);
    }
  }
}
