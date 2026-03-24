import { CPU6502 } from '../cpu';
import { PPU2C02 } from '../ppu';
import { Cartridge } from './cartridge';
import { Mapper } from './mapper';
import { RAM } from './ram';

export interface MemoryState {
  cpuRam: Uint8Array;
  ppuMemory: Uint8Array;
}

export class MemoryBus {
  private cpu: CPU6502;
  private ppu: PPU2C02;
  private cartridge: Cartridge;
  private cpuRam: RAM;
  private ppuMemory: PPU2C02Memory;

  constructor(cpu: CPU6502, ppu: PPU2C02, cartridge: Cartridge) {
    this.cpu = cpu;
    this.ppu = ppu;
    this.cartridge = cartridge;
    this.cpuRam = new RAM(0x0800);
    this.ppuMemory = new PPU2C02Memory();
  }

  cpuRead(address: number): number {
    if (address < 0x2000) {
      return this.cpuRam.read(address & 0x07FF);
    } else if (address < 0x4000) {
      return this.ppu.cpuRead(address & 0x0007);
    } else if (address === 0x4014) {
      return 0;
    } else if (address === 0x4015) {
      return 0;
    } else if (address === 0x4016) {
      return 0;
    } else if (address === 0x4017) {
      return 0;
    } else if (address >= 0x4020) {
      return this.cartridge.cpuRead(address);
    }
    return 0;
  }

  cpuWrite(address: number, data: number): void {
    if (address < 0x2000) {
      this.cpuRam.write(address & 0x07FF, data);
    } else if (address < 0x4000) {
      this.ppu.cpuWrite(address & 0x0007, data);
    } else if (address === 0x4014) {
      this.dmaTransfer(data);
    } else if (address === 0x4015) {
      // APU
    } else if (address === 0x4016) {
      // Controller 1
    } else if (address === 0x4017) {
      // Controller 2 / APU
    } else if (address >= 0x4020) {
      this.cartridge.cpuWrite(address, data);
    }
  }

  ppuRead(address: number): number {
    return this.ppuMemory.read(address);
  }

  ppuWrite(address: number, data: number): void {
    this.ppuMemory.write(address, data);
  }

  dmaTransfer(page: number): void {
    const baseAddress = page << 8;
    for (let i = 0; i < 256; i++) {
      const data = this.cpuRead(baseAddress + i);
      this.ppu.oamWrite(i, data);
    }
  }

  getMapper(): Mapper {
    return this.cartridge.getMapper();
  }

  reset(): void {
    this.cpuRam.reset();
    this.ppuMemory.reset();
    this.cartridge.reset();
  }

  saveState(): MemoryState {
    return {
      cpuRam: this.cpuRam.saveState(),
      ppuMemory: this.ppuMemory.saveState()
    };
  }

  loadState(state: MemoryState): void {
    this.cpuRam.loadState(state.cpuRam);
    this.ppuMemory.loadState(state.ppuMemory);
  }
}

class PPU2C02Memory {
  private memory: Uint8Array;
  private palette: Uint8Array;

  constructor() {
    this.memory = new Uint8Array(0x0800);
    this.palette = new Uint8Array(0x20);
  }

  read(address: number): number {
    address &= 0x3FFF;
    if (address < 0x2000) {
      return this.memory[address];
    } else if (address < 0x3F00) {
      return this.memory[this.mirrorAddress(address)];
    } else if (address < 0x4000) {
      return this.palette[this.mirrorPaletteAddress(address)];
    }
    return 0;
  }

  write(address: number, data: number): void {
    address &= 0x3FFF;
    if (address < 0x2000) {
      this.memory[address] = data;
    } else if (address < 0x3F00) {
      this.memory[this.mirrorAddress(address)] = data;
    } else if (address < 0x4000) {
      this.palette[this.mirrorPaletteAddress(address)] = data;
    }
  }

  private mirrorAddress(address: number): number {
    const mode = this.getMirrorMode();
    const nametable = (address >> 10) & 0x03;
    const offset = address & 0x03FF;
    
    switch (mode) {
      case 0: // Horizontal
        return ((nametable & 0x01) << 10) | offset;
      case 1: // Vertical
        return ((nametable >> 1) << 10) | offset;
      default:
        return address & 0x07FF;
    }
  }

  private mirrorPaletteAddress(address: number): number {
    address &= 0x1F;
    if (address >= 0x10 && (address & 0x03) === 0) {
      address -= 0x10;
    }
    return address;
  }

  private getMirrorMode(): number {
    return 0;
  }

  reset(): void {
    this.memory.fill(0);
    this.palette.fill(0);
  }

  saveState(): Uint8Array {
    const state = new Uint8Array(0x820);
    state.set(this.memory);
    state.set(this.palette, 0x800);
    return state;
  }

  loadState(state: Uint8Array): void {
    this.memory.set(state.subarray(0, 0x800));
    this.palette.set(state.subarray(0x800, 0x820));
  }
}
