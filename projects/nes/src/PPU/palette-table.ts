import { PictureProcessingUnit } from './picture-processing-unit';

export class PaletteTable {
  private paletteRAM: Uint8Array = new Uint8Array(32);
  private emphasis: number = 0;
  private ntscColors: Uint32Array = new Uint32Array(64);
  private palColors: Uint32Array = new Uint32Array(64);

  constructor() {
    this.loadNTSC();
    this.loadPAL();
  }

  read(address: number): number {
    const mirrored = this.mirrorAddress(address);
    return this.paletteRAM[mirrored];
  }

  write(address: number, value: number): void {
    const mirrored = this.mirrorAddress(address);
    this.paletteRAM[mirrored] = value & 0x3F;
  }

  getColor(index: number): number {
    const colorIndex = index & 0x3F;
    return this.ntscColors[colorIndex];
  }

  getEmphasizedColor(color: number): number {
    if (this.emphasis === 0) return color;
    
    let r = (color >> 16) & 0xFF;
    let g = (color >> 8) & 0xFF;
    let b = color & 0xFF;
    
    if (this.emphasis & 0x20) {
      r = Math.floor(r * 0.75);
      g = Math.floor(g * 0.75);
    }
    if (this.emphasis & 0x40) {
      r = Math.floor(r * 0.75);
      b = Math.floor(b * 0.75);
    }
    if (this.emphasis & 0x80) {
      g = Math.floor(g * 0.75);
      b = Math.floor(b * 0.75);
    }
    
    return (r << 16) | (g << 8) | b;
  }

  isSpritePalette(address: number): boolean {
    return (address & 0x10) !== 0;
  }

  mirrorAddress(address: number): number {
    address &= 0x1F;
    if (address >= 0x10 && address < 0x14) {
      address -= 0x10;
    } else if (address >= 0x14 && address < 0x18) {
      address -= 0x14;
    } else if (address >= 0x18 && address < 0x1C) {
      address -= 0x18;
    } else if (address >= 0x1C) {
      address -= 0x1C;
    }
    return address;
  }

  loadNTSC(): void {
    const ntscPalette = [
      0x666666, 0x002A88, 0x1412A7, 0x3B00A4, 0x5C007E, 0x6E0040, 0x6C0600, 0x561D00,
      0x333500, 0x0B4800, 0x005200, 0x004F08, 0x00404D, 0x000000, 0x000000, 0x000000,
      0xADADAD, 0x155FD9, 0x4240FF, 0x7527FE, 0xA01ACC, 0xB71E7B, 0xB53120, 0x994E00,
      0x6B6D00, 0x388700, 0x0C9300, 0x008F32, 0x007C8D, 0x000000, 0x000000, 0x000000,
      0xFFFEFF, 0x64B0FF, 0x9290FF, 0xC676FF, 0xF36AFF, 0xFE6ECC, 0xFE8170, 0xEA9E22,
      0xBCBE00, 0x88D800, 0x5CE430, 0x45E082, 0x48CDDE, 0x4F4F4F, 0x000000, 0x000000,
      0xFFFEFF, 0xC0EFFF, 0xD3E2FF, 0xE8D5FF, 0xFBCFEF, 0xFED1E3, 0xFED6C6, 0xF7E2B5,
      0xE7EDB2, 0xD5F4B1, 0xC5F7B8, 0xBEF7CE, 0xBFF2E5, 0xB8B8B8, 0x000000, 0x000000
    ];
    
    for (let i = 0; i < 64; i++) {
      this.ntscColors[i] = ntscPalette[i];
    }
  }

  loadPAL(): void {
    const palPalette = [
      0x666666, 0x00127D, 0x1800A4, 0x3C0098, 0x5D0077, 0x6E0041, 0x6C1500, 0x562900,
      0x333C00, 0x0C4B00, 0x005100, 0x004C14, 0x00405C, 0x000000, 0x000000, 0x000000,
      0xADADAD, 0x1153D1, 0x4B36FE, 0x7B27FE, 0xA61ACC, 0xB91E7B, 0xB53120, 0x994E00,
      0x6B6D00, 0x388700, 0x0C9300, 0x008F32, 0x007C8D, 0x000000, 0x000000, 0x000000,
      0xFFFEFF, 0x64B0FF, 0x9290FF, 0xC676FF, 0xF36AFF, 0xFE6ECC, 0xFE8170, 0xEA9E22,
      0xBCBE00, 0x88D800, 0x5CE430, 0x45E082, 0x48CDDE, 0x4F4F4F, 0x000000, 0x000000,
      0xFFFEFF, 0xC0EFFF, 0xD3E2FF, 0xE8D5FF, 0xFBCFEF, 0xFED1E3, 0xFED6C6, 0xF7E2B5,
      0xE7EDB2, 0xD5F4B1, 0xC5F7B8, 0xBEF7CE, 0xBFF2E5, 0xB8B8B8, 0x000000, 0x000000
    ];
    
    for (let i = 0; i < 64; i++) {
      this.palColors[i] = palPalette[i];
    }
  }

  setEmphasis(emphasis: number): void {
    this.emphasis = emphasis & 0xE0;
  }

  getUniversal(): number {
    return this.getColor(this.read(0x3F00));
  }

  getBackground(index: number): number {
    const paletteIndex = index & 0x0F;
    const address = 0x3F00 + (paletteIndex < 4 ? paletteIndex : 4 + (paletteIndex & 0x03));
    return this.getColor(this.read(address));
  }

  getSprite(index: number): number {
    const paletteIndex = index & 0x0F;
    const address = 0x3F10 + (paletteIndex < 4 ? paletteIndex : 4 + (paletteIndex & 0x03));
    return this.getColor(this.read(address));
  }

  isGrayscale(mask: number): boolean {
    return (mask & 0x01) !== 0;
  }

  applyGrayscale(color: number): number {
    const gray = 0x7F7F7F;
    return gray;
  }
}
