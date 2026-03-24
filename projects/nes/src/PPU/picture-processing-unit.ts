import { SpriteRenderer } from './sprite-renderer';
import { BackgroundRenderer } from './background-renderer';
import { PaletteTable } from './palette-table';

export class PictureProcessingUnit {
  private ctrl: number = 0;
  private mask: number = 0;
  private status: number = 0;
  private oamAddr: number = 0;
  private scroll: number = 0;
  private addr: number = 0;
  private data: number = 0;
  private vramAddr: number = 0;
  private tempAddr: number = 0;
  private fineX: number = 0;
  private writeToggle: boolean = false;
  private scanline: number = 0;
  private cycle: number = 0;
  private frame: number = 0;
  private vramReadBuffer: number = 0;
  private spriteRenderer: SpriteRenderer;
  private backgroundRenderer: BackgroundRenderer;
  private paletteTable: PaletteTable;

  constructor() {
    this.spriteRenderer = new SpriteRenderer();
    this.backgroundRenderer = new BackgroundRenderer();
    this.paletteTable = new PaletteTable();
  }

  reset(): void {
    this.ctrl = 0;
    this.mask = 0;
    this.status = 0;
    this.oamAddr = 0;
    this.scroll = 0;
    this.addr = 0;
    this.data = 0;
    this.vramAddr = 0;
    this.tempAddr = 0;
    this.fineX = 0;
    this.writeToggle = false;
    this.scanline = 0;
    this.cycle = 0;
    this.frame = 0;
    this.vramReadBuffer = 0;
    this.spriteRenderer.reset();
    this.backgroundRenderer.reset();
  }

  step(): void {
    if (this.isRendering()) {
      if (this.cycle >= 1 && this.cycle <= 256) {
        this.renderPixel();
      }
      if (this.cycle >= 321 && this.cycle <= 336) {
        this.fetchTile();
      }
      if (this.cycle === 257) {
        if (this.scanline >= 0 && this.scanline <= 239) {
          this.evaluateSprites();
        }
      }
    }

    this.cycle++;
    if (this.cycle > 340) {
      this.cycle = 0;
      this.scanline++;
      if (this.scanline > 261) {
        this.scanline = 0;
        this.frame++;
      }
    }

    if (this.scanline === 241 && this.cycle === 1) {
      this.status |= 0x80;
      if (this.ctrl & 0x80) {
        this.triggerNMI();
      }
    }

    if (this.scanline === 261 && this.cycle === 1) {
      this.status &= 0x7F;
      this.status &= 0xBF;
      this.status &= 0xDF;
    }
  }

  readRegister(address: number): number {
    switch (address & 0x07) {
      case 0x02:
        const result = this.status;
        this.status &= 0x7F;
        this.writeToggle = false;
        return result;
      case 0x04:
        return this.spriteRenderer.readOAM(this.oamAddr);
      case 0x07:
        let value = this.vramReadBuffer;
        if (this.vramAddr >= 0x3F00) {
          value = this.paletteTable.read(this.vramAddr & 0x1F);
          this.vramReadBuffer = this.readVRAM(this.vramAddr);
        } else {
          this.vramReadBuffer = this.readVRAM(this.vramAddr);
        }
        this.incrementVRAM();
        return value;
      default:
        return 0;
    }
  }

  writeRegister(address: number, value: number): void {
    switch (address & 0x07) {
      case 0x00:
        this.ctrl = value;
        this.tempAddr = (this.tempAddr & 0xF3FF) | ((value & 0x03) << 10);
        break;
      case 0x01:
        this.mask = value;
        break;
      case 0x03:
        this.oamAddr = value;
        break;
      case 0x04:
        this.spriteRenderer.writeOAM(this.oamAddr, value);
        this.oamAddr = (this.oamAddr + 1) & 0xFF;
        break;
      case 0x05:
        if (!this.writeToggle) {
          this.tempAddr = (this.tempAddr & 0xFFE0) | (value >> 3);
          this.fineX = value & 0x07;
        } else {
          this.tempAddr = (this.tempAddr & 0x8FFF) | ((value & 0x07) << 12);
          this.tempAddr = (this.tempAddr & 0xFC1F) | ((value & 0xF8) << 2);
        }
        this.writeToggle = !this.writeToggle;
        break;
      case 0x06:
        if (!this.writeToggle) {
          this.tempAddr = (this.tempAddr & 0x80FF) | ((value & 0x3F) << 8);
        } else {
          this.tempAddr = (this.tempAddr & 0xFF00) | value;
          this.vramAddr = this.tempAddr;
        }
        this.writeToggle = !this.writeToggle;
        break;
      case 0x07:
        this.writeVRAM(this.vramAddr, value);
        this.incrementVRAM();
        break;
    }
  }

  readVRAM(address: number): number {
    address = address & 0x3FFF;
    const mirrored = this.mirrorAddress(address);
    return 0;
  }

  writeVRAM(address: number, value: number): void {
    address = address & 0x3FFF;
    const mirrored = this.mirrorAddress(address);
  }

  readOAM(address: number): number {
    return this.spriteRenderer.readOAM(address);
  }

  writeOAM(address: number, value: number): void {
    this.spriteRenderer.writeOAM(address, value);
  }

  renderPixel(): void {
    const x = this.cycle - 1;
    const y = this.scanline;

    const bgPixel = this.backgroundRenderer.getPixel(this.fineX);
    const spritePixel = this.spriteRenderer.getPixel(x, y);

    let finalPixel = 0;
    let finalPalette = 0;

    if (bgPixel.index === 0 && spritePixel.index === 0) {
      finalPixel = 0;
      finalPalette = 0;
    } else if (bgPixel.index === 0 && spritePixel.index !== 0) {
      finalPixel = spritePixel.index;
      finalPalette = spritePixel.palette | 0x10;
    } else if (bgPixel.index !== 0 && spritePixel.index === 0) {
      finalPixel = bgPixel.index;
      finalPalette = bgPixel.palette;
    } else {
      if (spritePixel.priority === 0) {
        finalPixel = spritePixel.index;
        finalPalette = spritePixel.palette | 0x10;
      } else {
        finalPixel = bgPixel.index;
        finalPalette = bgPixel.palette;
      }
    }

    const color = this.paletteTable.getColor(this.paletteTable.read((finalPalette << 2) | finalPixel));
  }

  fetchTile(): void {
    const fineY = (this.vramAddr >> 12) & 0x07;
    this.backgroundRenderer.fetchNameTable(this.vramAddr);
    this.backgroundRenderer.fetchAttribute(this.vramAddr);
    this.backgroundRenderer.fetchPatternLow(fineY);
  }

  evaluateSprites(): void {
    this.spriteRenderer.evaluate(this.scanline);
  }

  incrementVRAM(): void {
    if ((this.mask & 0x18) !== 0x08) {
      this.vramAddr += (this.ctrl & 0x04) ? 32 : 1;
    } else {
      this.vramAddr += (this.ctrl & 0x04) ? 32 : 1;
    }
  }

  updateVerticalScroll(): void {
    if ((this.vramAddr & 0x7000) !== 0x7000) {
      this.vramAddr += 0x1000;
    } else {
      this.vramAddr &= 0x8FFF;
      let y = (this.vramAddr & 0x03E0) >> 5;
      if (y === 29) {
        y = 0;
        this.vramAddr ^= 0x0800;
      } else if (y === 31) {
        y = 0;
      } else {
        y++;
      }
      this.vramAddr = (this.vramAddr & 0xFC1F) | (y << 5);
    }
  }

  updateHorizontalScroll(): void {
    if ((this.vramAddr & 0x001F) === 31) {
      this.vramAddr &= 0xFFE0;
      this.vramAddr ^= 0x0400;
    } else {
      this.vramAddr++;
    }
  }

  copyHorizontal(): void {
    this.vramAddr = (this.vramAddr & 0xFBE0) | (this.tempAddr & 0x041F);
  }

  copyVertical(): void {
    this.vramAddr = (this.vramAddr & 0x841F) | (this.tempAddr & 0x7BE0);
  }

  triggerNMI(): void {
  }

  isRendering(): boolean {
    return (this.mask & 0x18) !== 0 && (this.scanline < 240 || this.scanline === 261);
  }

  getMirroringType(): number {
    return 0;
  }

  private mirrorAddress(address: number): number {
    const mirrorMode = this.getMirroringType();
    if (address >= 0x2000 && address < 0x3F00) {
      const offset = address & 0x0FFF;
      const table = offset >> 10;
      const index = offset & 0x03FF;
      if (mirrorMode === 0) {
        return 0x2000 + (table & 1) * 0x0400 + index;
      } else {
        return 0x2000 + (table >> 1) * 0x0400 + index;
      }
    }
    return address;
  }
}
