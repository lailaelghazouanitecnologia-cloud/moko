import { IMemory } from './imemory';
import { Uint8 } from '../input/iinput';

export class Memory implements IMemory {
  private readonly ram: Uint8Array;
  private readonly fontData: Uint8Array;

  constructor() {
    this.ram = new Uint8Array(4096);
    this.fontData = new Uint8Array([
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
    this.reset();
  }

  read(address: number): number {
    if (!Number.isInteger(address) || address < 0 || address > 0xFFFF) {
      throw new RangeError('Address must be a 16-bit unsigned integer');
    }
    const addr = address & 0xFFF;
    return this.ram[addr];
  }

  /**
   * Write a byte to memory at the specified address.
   * Only writable in the range 0x200–0xFFE.
   * @param address - 12-bit address (0x000–0xFFF)
   * @param value - 8-bit value to write
   * @throws {RangeError} If address is not a 16-bit unsigned integer
   * @throws {TypeError} If value is not an 8-bit unsigned integer
   */
  write(address: number, value: number): void {
    if (!Number.isInteger(address) || address < 0 || address > 0xFFFF) {
      throw new RangeError('Address must be a 16-bit unsigned integer');
    }
    if (!Number.isInteger(value) || value < 0 || value > 0xFF) {
      throw new TypeError('Value must be an 8-bit unsigned integer');
    }
    const addr = address & 0xFFF;
    if (addr >= 0x200 && addr < 0xFFF) {
      this.ram[addr] = value;
    }
  }

  loadRom(data: Uint8Array): void {
    const startAddress = 0x200;
    const endAddress = Math.min(startAddress + data.length, 0xFFF);
    for (let i = startAddress; i < endAddress; i++) {
      this.ram[i] = data[i - startAddress];
    }
  }

  reset(): void {
    this.ram.fill(0);
    for (let i = 0; i < this.fontData.length; i++) {
      this.ram[0x050 + i] = this.fontData[i];
    }
  }

  getSize(): number {
    return 4096;
  }
}
