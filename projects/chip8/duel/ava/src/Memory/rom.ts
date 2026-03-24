import { MemoryMap } from './memory-map';
import { Ram } from './ram';

export class Rom {
  private data: Uint8Array;
  private size: number;
  private loaded: boolean;

  static readonly MAX_SIZE = 0xE00;
  static readonly START_ADDRESS = 0x200;

  constructor() {
    this.data = new Uint8Array(0);
    this.size = 0;
    this.loaded = false;
  }

  read(address: number): number {
    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid ROM address: 0x${address.toString(16).padStart(3, '0')}`);
    }
    const offset = address - Rom.START_ADDRESS;
    return this.data[offset];
  }

  readWord(address: number): number {
    if (!this.isValidAddress(address) || !this.isValidAddress(address + 1)) {
      throw new Error(`Invalid ROM word address: 0x${address.toString(16).padStart(3, '0')}`);
    }
    const offset = address - Rom.START_ADDRESS;
    return (this.data[offset] << 8) | this.data[offset + 1];
  }

  load(data: Uint8Array): void {
    this.validateRomSize(data.length);
    this.data = new Uint8Array(data);
    this.size = data.length;
    this.loaded = true;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getSize(): number {
    return this.size;
  }

  isValidAddress(address: number): boolean {
    return address >= Rom.START_ADDRESS && address < Rom.START_ADDRESS + this.size;
  }

  getData(): Uint8Array {
    return new Uint8Array(this.data);
  }

  reset(): void {
    this.data = new Uint8Array(0);
    this.size = 0;
    this.loaded = false;
  }

  validateRomSize(size: number): void {
    if (size <= 0) {
      throw new Error('ROM size must be positive');
    }
    if (size > Rom.MAX_SIZE) {
      throw new Error(`ROM size 0x${size.toString(16)} exceeds maximum 0x${Rom.MAX_SIZE.toString(16)}`);
    }
  }

  getStartAddress(): number {
    return Rom.START_ADDRESS;
  }

  getEndAddress(): number {
    return Rom.START_ADDRESS + this.size - 1;
  }
}
