import { strict as assert } from 'assert';

export class Memory {
  private readonly ram: Uint8Array;
  private readonly size: number;

  constructor(size: number = 4096) {
    assert(size > 0 && size <= 65536, 'Memory size must be between 1 and 65536 bytes');
    this.size = size;
    this.ram = new Uint8Array(size);
  }

  reset(): void {
    this.ram.fill(0);
  }

  getSize(): number {
    return this.size;
  }

  readByte(address: number): number {
    if (address < 0 || address >= this.size) {
      throw new RangeError(`Memory read out of bounds: 0x${address.toString(16).padStart(4, '0')}`);
    }
    return this.ram[address];
  }

  writeByte(address: number, value: number): void {
    if (address < 0 || address >= this.size) {
      throw new RangeError(`Memory write out of bounds: 0x${address.toString(16).padStart(4, '0')}`);
    }
    if (value < 0 || value > 0xFF) {
      throw new RangeError(`Invalid byte value: 0x${value.toString(16).padStart(2, '0')}`);
    }
    this.ram[address] = value;
  }

  readWord(address: number): number {
    const high = this.readByte(address);
    const low = this.readByte(address + 1);
    return (high << 8) | low;
  }

  writeWord(address: number, value: number): void {
    if (value < 0 || value > 0xFFFF) {
      throw new RangeError(`Invalid word value: 0x${value.toString(16).padStart(4, '0')}`);
    }
    this.writeByte(address, (value >>> 8) & 0xFF);
    this.writeByte(address + 1, value & 0xFF);
  }

  load(data: Uint8Array, offset: number = 0): void {
    if (offset < 0 || offset + data.length > this.size) {
      throw new RangeError('Data load out of bounds');
    }
    this.ram.set(data, offset);
  }

  dump(start: number = 0, length?: number): Uint8Array {
    const end = length === undefined ? this.size : start + length;
    if (start < 0 || end > this.size || start >= end) {
      throw new RangeError('Invalid dump range');
    }
    return this.ram.slice(start, end);
  }
}
