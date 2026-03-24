export class Memory {
  private readonly ram: Uint8Array;

  constructor() {
    this.ram = new Uint8Array(4096);
  }

  reset(): void {
    this.ram.fill(0);
  }

  readByte(address: number): number {
    if (address < 0 || address > 0xFFF) {
      throw new RangeError(`Invalid address: 0x${address.toString(16).padStart(3, '0')}`);
    }
    return this.ram[address];
  }

  writeByte(address: number, value: number): void {
    if (address < 0 || address > 0xFFF) {
      throw new RangeError(`Invalid address: 0x${address.toString(16).padStart(3, '0')}`);
    }
    if (value < 0 || value > 0xFF) {
      throw new RangeError(`Invalid byte value: 0x${value.toString(16).padStart(2, '0')}`);
    }
    this.ram[address] = value;
  }

  readWord(address: number): number {
    if (address < 0 || address > 0xFFE) {
      throw new RangeError(`Invalid word address: 0x${address.toString(16).padStart(3, '0')}`);
    }
    const high = this.ram[address];
    const low = this.ram[address + 1];
    return (high << 8) | low;
  }

  writeWord(address: number, value: number): void {
    if (address < 0 || address > 0xFFE) {
      throw new RangeError(`Invalid word address: 0x${address.toString(16).padStart(3, '0')}`);
    }
    if (value < 0 || value > 0xFFFF) {
      throw new RangeError(`Invalid word value: 0x${value.toString(16).padStart(4, '0')}`);
    }
    this.ram[address] = (value >> 8) & 0xFF;
    this.ram[address + 1] = value & 0xFF;
  }

  loadRom(data: Uint8Array, offset: number = 0x200): void {
    if (offset < 0 || offset + data.length > 0x1000) {
      throw new RangeError('ROM data out of bounds');
    }
    this.ram.set(data, offset);
  }

  getBuffer(): Uint8Array {
    return this.ram.slice();
  }
}
