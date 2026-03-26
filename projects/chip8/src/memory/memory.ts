import { IMemory } from './imemory';

/**
 * 4KB CHIP-8 RAM/ROM manager.
 * Provides read/write access to 4096 bytes of memory with ROM loading at offset 0x200.
 */
export class Memory implements IMemory {
  readonly ram: Uint8Array;

  constructor() {
    this.ram = new Uint8Array(4096);
  }

  read(addr: number): number {
    if (!Number.isInteger(addr)) {
      throw new TypeError('Address must be an integer');
    }
    if (addr < 0 || addr >= this.ram.length) {
      throw new RangeError(`Address out of bounds: ${addr}`);
    }
    return this.ram[addr];
  }

  write(addr: number, val: number): void {
    if (!Number.isInteger(addr) || !Number.isInteger(val)) {
      throw new TypeError('Address and value must be integers');
    }
    if (addr < 0 || addr >= this.ram.length) {
      throw new RangeError(`Address out of bounds: ${addr}`);
    }
    if (val < 0 || val > 255) {
      throw new RangeError(`Value out of range: ${val}`);
    }
    this.ram[addr] = val;
  }

  loadRom(data: Uint8Array): void {
    if (data.length === 0) {
      throw new TypeError('ROM data cannot be empty');
    }
    if (data.length + 0x200 > this.ram.length) {
      throw new RangeError('ROM too large for memory');
    }
    this.ram.set(data, 0x200);
  }

  getState(): { ram: Uint8Array } {
    return { ram: new Uint8Array(this.ram) };
  }

  setState(state: { ram: Uint8Array }): void {
    if (!state || !(state.ram instanceof Uint8Array)) {
      throw new TypeError('State must be an object with a Uint8Array ram property');
    }
    if (state.ram.length !== this.ram.length) {
      throw new TypeError('Invalid RAM size');
    }
    this.ram.set(state.ram);
  }
}
