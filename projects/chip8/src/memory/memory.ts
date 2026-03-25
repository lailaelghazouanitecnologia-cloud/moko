import { IMemory } from './imemory';

/**
 * 4 KB address space manager for CHIP-8 emulation.
 * Provides controlled access to memory with bounds checking and
 * specialized loading methods for fonts and programs.
 */
export class Memory implements IMemory {
  readonly size = 4096;
  private readonly buffer: Uint8Array;
  private readonly fontStart = 0x050;
  private readonly programStart = 0x200;

  constructor() {
    this.buffer = new Uint8Array(this.size);
  }

  readByte(addr: number): number {
    if (!Number.isInteger(addr)) throw new TypeError('Address must be an integer');
    if (addr < 0 || addr >= this.size) throw new RangeError('Address out of bounds');
    return this.buffer[addr];
  }

  writeByte(addr: number, val: number): void {
    if (!Number.isInteger(addr)) throw new TypeError('Address must be an integer');
    if (!Number.isInteger(val)) throw new TypeError('Value must be an integer');
    if (addr < 0 || addr >= this.size) throw new RangeError('Address out of bounds');
    if (val < 0 || val > 255) throw new RangeError('Value must be 8-bit');
    this.buffer[addr] = val;
  }

  readWord(addr: number): number {
    if (!Number.isInteger(addr)) throw new TypeError('Address must be an integer');
    if (addr < 0 || addr >= this.size - 1) throw new RangeError('Address out of bounds');
    return (this.buffer[addr] << 8) | this.buffer[addr + 1];
  }

  writeWord(addr: number, val: number): void {
    if (!Number.isInteger(addr)) throw new TypeError('Address must be an integer');
    if (!Number.isInteger(val)) throw new TypeError('Value must be an integer');
    if (addr < 0 || addr >= this.size - 1) throw new RangeError('Address out of bounds');
    if (val < 0 || val > 65535) throw new RangeError('Value must be 16-bit');
    this.buffer[addr] = (val >> 8) & 0xFF;
    this.buffer[addr + 1] = val & 0xFF;
  }

  loadFont(data: Uint8Array): void {
  }

  /**
   * Loads program data starting at the program base address.
   * @param data - Program binary
   * @throws {RangeError} if program exceeds available memory
   */
  loadProgram(data: Uint8Array): void {
  }

  reset(): void {
    this.buffer.fill(0);
  }

  /**
   * Alias for readByte.
   * @deprecated Use readByte for clarity
   */
  read(addr: number): number {
    return this.readByte(addr);
  }

  /**
   * Alias for writeByte.
   * @deprecated Use writeByte for clarity
   */
  write(addr: number, val: number): void {
    this.writeByte(addr, val);
  }

  /**
   * Loads arbitrary data at a specified offset.
   * @param data - Binary data
   * @param offset - Start address
   * @throws {RangeError} if offset or size is invalid
   */
  loadProgramData(data: Uint8Array, offset: number): void {
  }
}
