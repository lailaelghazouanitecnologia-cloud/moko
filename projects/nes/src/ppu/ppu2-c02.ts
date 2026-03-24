import { Palette } from './palette';

export class PPU2C02 {
  vram = new Uint8Array(2048);
  oam = new Uint8Array(256);
  palette = new Palette();
  scanline = 0;
  cycle = 0;
  frame = 0;
  ctrl = 0;
  mask = 0;
  status = 0;
  oamAddr = 0;
  v = 0;
  t = 0;
  x = 0;
  w = false;
  dataBuffer = 0;
  nmiOccurred = false;
  nmiOutput = false;
  nmiPrevious = false;
  nameTableByte = 0;
  attributeTableByte = 0;
  lowTileByte = 0;
  highTileByte = 0;
  tileData = 0;
  spriteCount = 0;
  spritePatterns = new Uint32Array(8);
  spritePositions = new Uint8Array(8);
  spritePriorities = new Uint8Array(8);
  spriteIndexes = new Uint8Array(8);

  read(address: number): number {
    return this.readRegister(address & 7);
  }

  write(address: number, value: number): void {
    this.writeRegister(address & 7, value);
  }

  readRegister(address: number): number {
    switch (address) {
      case 2:
        const result = (this.status & 0xE0) | (this.dataBuffer & 0x1F);
        this.status &= 0x7F;
        this.nmiOccurred = false;
        this.nmiChange();
        return result;
      case 4:
        return this.oam[this.oamAddr];
      case 7:
        let value = this.dataBuffer;
        this.dataBuffer = this.vramRead(this.v);
        if (this.v >= 0x3F00) {
          value = this.dataBuffer;
        }
        this.v = (this.v + this.getVRAMIncrement()) & 0x7FFF;
        return value;
      default:
        return this.dataBuffer;
    }
  }

  writeRegister(address: number, value: number): void {
    switch (address) {
      case 0:
        this.ctrl = value;
        this.t = (this.t & 0xF3FF) | ((value & 0x03) << 10);
        this.nmiChange();
        break;
      case 1:
        this.mask = value;
        break;
      case 3:
        this.oamAddr = value;
        break;
      case 4:
        this.oam[this.oamAddr] = value;
        this.oamAddr = (this.oamAddr + 1) & 0xFF;
        break;
      case 5:
        if (!this.w) {
          this.t = (this.t & 0xFFE0) | (value >> 3);
          this.x = value & 0x07;
          this.w = true;
        } else {
          this.t = (this.t & 0x8FFF) | ((value & 0x07) << 12);
          this.t = (this.t & 0xFC1F) | ((value & 0xF8) << 2);
          this.w = false;
        }
        break;
      case 6:
        if (!this.w) {
          this.t = (this.t & 0x80FF) | ((value & 0x3F) << 8);
          this.w = true;
        } else {
          this.t = (this.t & 0xFF00) | value;
          this.v = this.t;
          this.w = false;
        }
        break;
      case 7:
        this.vramWrite(this.v, value);
        this.v = (this.v + this.getVRAMIncrement()) & 0x7FFF;
        break;
    }
  }

  step(): void {
    if (this.nmiOccurred && this.nmiOutput) {
      this.triggerNmi();
    }

    if (this.mask & 0x18) {
      this.renderPixel();
      this.fetchNameTableByte();
      this.fetchAttributeByte();
      this.fetchLowTileByte();
      this.fetchHighTileByte();
      this.storeTileData();
    }

    if (this.scanline === 241 && this.cycle === 1) {
      this.setVerticalBlank();
    }

    if (this.scanline === 261 && this.cycle === 1) {
      this.clearVerticalBlank();
      this.status &= 0xFF ^ 0x80;
      this.nmiOccurred = false;
      this.nmiChange();
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
  }

  renderPixel(): void {
    const x = this.cycle - 1;
    const y = this.scanline;

    if (x < 0 || x >= 256 || y < 0 || y >= 240) {
      return;
    }

    const background = this.backgroundPixel();
    const [sprite, spritePalette] = this.spritePixel();
    const bgPriority = (sprite & 0x20) === 0;

    let pixel = 0;
    let palette = 0;

    if (background === 0 && sprite === 0) {
      pixel = 0;
      palette = 0;
    } else if (background === 0 && sprite > 0) {
      pixel = sprite | 0x10;
      palette = spritePalette;
    } else if (background > 0 && sprite === 0) {
      pixel = background;
      palette = this.backgroundPalette();
    } else if (background > 0 && sprite > 0) {
      if (bgPriority) {
        pixel = background;
        palette = this.backgroundPalette();
      } else {
        pixel = sprite | 0x10;
        palette = spritePalette;
      }
      if (this.sprite0Hit() && sprite === 0 && this.cycle !== 256) {
        this.status |= 0x40;
      }
    }

    const color = this.palette.read(palette * 4 + pixel);
  }

  fetchNameTableByte(): void {
    if (this.cycle % 8 === 1) {
      this.nameTableByte = this.vramRead(0x2000 | (this.v & 0x0FFF));
    }
  }

  fetchAttributeByte(): void {
    if (this.cycle % 8 === 3) {
      const address = 0x23C0 | (this.v & 0x0C00) | ((this.v >> 4) & 0x38) | ((this.v >> 2) & 0x07);
      this.attributeTableByte = this.vramRead(address);
    }
  }

  fetchLowTileByte(): void {
    if (this.cycle % 8 === 5) {
      const fineY = (this.v >> 12) & 7;
      const table = (this.ctrl >> 4) & 1;
      const tile = this.nameTableByte;
      const address = table * 0x1000 + tile * 16 + fineY;
      this.lowTileByte = this.vramRead(address);
    }
  }

  fetchHighTileByte(): void {
    if (this.cycle % 8 === 7) {
      const fineY = (this.v >> 12) & 7;
      const table = (this.ctrl >> 4) & 1;
      const tile = this.nameTableByte;
      const address = table * 0x1000 + tile * 16 + fineY + 8;
      this.highTileByte = this.vramRead(address);
    }
  }

  storeTileData(): void {
    let data = 0;
    for (let i = 0; i < 8; i++) {
      const a = (this.attributeTableByte >> ((this.cycle & 0x02) | ((this.v & 0x40) >> 4))) & 1) << 1;
      const p1 = (this.lowTileByte & 0x80) >> 7;
      const p2 = (this.highTileByte & 0x80) >> 6;
      this.lowTileByte <<= 1;
      this.highTileByte <<= 1;
      data <<= 4;
      data |= a | p1 | p2;
    }
    this.tileData |= data;
  }

  evaluateSprites(): void {
    const h = (this.ctrl & 0x20) ? 16 : 8;
    let count = 0;
    for (let i = 0; i < 64; i++) {
      const y = this.oam[i * 4 + 0];
      const a = this.oam[i * 4 + 2];
      const x = this.oam[i * 4 + 3];
      const row = this.scanline - y;
      if (row < 0 || row >= h) {
        continue;
      }
      if (count < 8) {
        this.spritePositions[count] = x;
        this.spritePriorities[count] = (a >> 5) & 1;
        this.spriteIndexes[count] = i;
        this.loadSprite(count, row);
        count++;
      }
    }
    if (count > 8) {
      count = 8;
    }
    this.spriteCount = count;
  }

  loadSprite(i: number, row: number): void {
    const tile = this.oam[i * 4 + 1];
    const attributes = this.oam[i * 4 + 2];
    const address = (this.ctrl & 0x08) * 0x1000 + tile * 16 + row;
    const a = (attributes & 3) << 2;
    const spritePattern = this.fetchSpritePattern(i, row);
    this.spritePatterns[i] = spritePattern;
  }

  sprite0Hit(): boolean {
    return this.spriteCount > 0 && this.spriteIndexes[0] === 0;
  }

  setVerticalBlank(): void {
    this.nmiOccurred = true;
    this.nmiChange();
  }

  clearVerticalBlank(): void {
    this.nmiOccurred = false;
    this.nmiChange();
  }

  fetchSpritePattern(i: number, row: number): number {
    const tile = this.oam[i * 4 + 1];
    const attributes = this.oam[i * 4 + 2];
    const h = (this.ctrl & 0x20) ? 16 : 8;
    let tileRow = row;
    if (attributes & 0x80) {
      tileRow = h - 1 - row;
    }
    let tileIndex = tile;
    if (h === 16) {
      tileIndex = (tile & 1) * 256 + (tile & 0xFE) + (tileRow >= 8 ? 1 : 0);
      tileRow = tileRow & 7;
    }
    const table = (this.ctrl & 0x08) >> 3;
    const address = table * 0x1000 + tileIndex * 16 + tileRow;
    const lowTileByte = this.vramRead(address);
    const highTileByte = this.vramRead(address + 8);
    let data = 0;
    for (let j = 0; j < 8; j++) {
      let bit = j;
      if (attributes & 0x40) {
        bit = 7 - j;
      }
      const p1 = (lowTileByte >> bit) & 1;
      const p2 = ((highTileByte >> bit) & 1) << 1;
      data |= (p1 | p2) << (j * 4);
    }
    return data;
  }

  backgroundPixel(): number {
    if (!(this.mask & 0x08)) {
      return 0;
    }
    const data = this.tileData >> 32;
    return data & 0xFF;
  }

  backgroundPalette(): number {
    return (this.tileData >> 32) & 0xFF;
  }

  spritePixel(): [number, number] {
    if (!(this.mask & 0x10)) {
      return [0, 0];
    }
    for (let i = 0; i < this.spriteCount; i++) {
      const offset = (this.cycle - 1) - this.spritePositions[i];
      if (offset < 0 || offset > 7) {
        continue;
      }
      const data = this.spritePatterns[i];
      const pixel = (data >> (offset * 4)) & 0x0F;
      if (pixel % 4 === 0) {
        continue;
      }
      return [pixel, this.oam[this.spriteIndexes[i] * 4 + 2] & 3];
    }
    return [0, 0];
  }

  incrementX(): void {
    if ((this.v & 0x001F) === 31) {
      this.v &= 0xFFE0;
      this.v ^= 0x0400;
    } else {
      this.v++;
    }
  }

  incrementY(): void {
    if ((this.v & 0x7000) !== 0x7000) {
      this.v += 0x1000;
    } else {
      this.v &= 0x8FFF;
      let y = (this.v & 0x03E0) >> 5;
      if (y === 29) {
        y = 0;
        this.v ^= 0x0800;
      } else if (y === 31) {
        y = 0;
      } else {
        y++;
      }
      this.v = (this.v & 0xFC1F) | (y << 5);
    }
  }

  copyX(): void {
    this.v = (this.v & 0xFBE0) | (this.t & 0x041F);
  }

  copyY(): void {
    this.v = (this.v & 0x841F) | (this.t & 0x7BE0);
  }

  nmiChange(): void {
    const nmi = this.nmiOccurred && this.nmiOutput;
    if (nmi && !this.nmiPrevious) {
      this.triggerNmi();
    }
    this.nmiPrevious = nmi;
  }

  triggerNmi(): void {
  }

  private vramRead(address: number): number {
    address &= 0x3FFF;
    if (address < 0x2000) {
      return 0;
    } else if (address < 0x3F00) {
      return this.vram[this.mirrorAddress(address) & 0x7FF];
    } else if (address < 0x4000) {
      return this.palette.read(address & 0x1F);
    }
    return 0;
  }

  private vramWrite(address: number, value: number): void {
    address &= 0x3FFF;
    if (address < 0x2000) {
    } else if (address < 0x3F00) {
      this.vram[this.mirrorAddress(address) & 0x7FF] = value;
    } else if (address < 0x4000) {
      this.palette.write(address & 0x1F, value);
    }
  }

  private mirrorAddress(address: number): number {
    const mode = 0;
    address = (address - 0x2000) & 0x0FFF;
    const table = (address >> 10) & 3;
    const offset = address & 0x03FF;
    return 0x2000 + [0, 0, 1, 1][mode * 4 + table] * 0x0400 + offset;
  }

  private getVRAMIncrement(): number {
    return (this.ctrl & 0x04) ? 32 : 1;
  }
}
