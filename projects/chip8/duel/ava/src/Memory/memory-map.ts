import { Ram } from './ram';
import { Rom } from './rom';

export enum MemoryRegion {
  RAM = 'RAM',
  ROM = 'ROM',
  FONT = 'FONT',
  INVALID = 'INVALID'
}

export class MemoryMap {
  private ram: Ram;
  private rom: Rom;
  private font: Uint8Array;

  constructor() {
    this.ram = new Ram();
    this.rom = new Rom();
    this.font = new Uint8Array(0);
  }

  read(address: number): number {
    this.validateAddress(address);
    const region = this.getMemoryRegion(address);
    
    switch (region) {
      case MemoryRegion.RAM:
        return this.ram.read(address);
      case MemoryRegion.ROM:
        return this.rom.read(address);
      case MemoryRegion.FONT:
        return this.font[address];
      default:
        throw new Error(`Cannot read from invalid memory region at address 0x${address.toString(16).padStart(3, '0')}`);
    }
  }

  write(address: number, value: number): void {
    this.validateAddress(address);
    
    if (!this.isRamAddress(address)) {
      throw new Error(`Cannot write to read-only memory region at address 0x${address.toString(16).padStart(3, '0')}`);
    }
    
    this.ram.write(address, value);
  }

  loadRom(data: Uint8Array): void {
    this.rom.load(data);
  }

  loadFont(fontData: Uint8Array): void {
    this.font = new Uint8Array(fontData);
  }

  isRomAddress(address: number): boolean {
    return address >= 0x200 && address <= 0xFFF;
  }

  isRamAddress(address: number): boolean {
    return address >= 0x000 && address <= 0x1FF;
  }

  isFontAddress(address: number): boolean {
    return address >= 0x000 && address <= 0x04F;
  }

  getMemoryRegion(address: number): MemoryRegion {
    if (this.isFontAddress(address)) {
      return MemoryRegion.FONT;
    }
    if (this.isRamAddress(address)) {
      return MemoryRegion.RAM;
    }
    if (this.isRomAddress(address)) {
      return MemoryRegion.ROM;
    }
    return MemoryRegion.INVALID;
  }

  validateAddress(address: number): void {
    if (address < 0 || address > 0xFFF) {
      throw new Error(`Invalid memory address: 0x${address.toString(16).padStart(3, '0')}. Must be 12-bit (0x000-0xFFF)`);
    }
  }

  reset(): void {
    this.ram.reset();
    this.rom.reset();
    this.font = new Uint8Array(0);
  }
}
