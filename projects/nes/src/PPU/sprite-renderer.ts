import { PictureProcessingUnit } from './picture-processing-unit';

export class SpriteRenderer {
  private oamData: Uint8Array = new Uint8Array(256);
  private secondaryOAM: Uint8Array = new Uint8Array(32);
  private spriteCount: number = 0;
  private spriteHeight: number = 8;
  private spriteOverflow: boolean = false;

  constructor() {}

  reset(): void {
    this.oamData.fill(0);
    this.secondaryOAM.fill(0);
    this.spriteCount = 0;
    this.spriteHeight = 8;
    this.spriteOverflow = false;
  }

  evaluate(scanline: number): void {
    this.clearSecondary();
    this.spriteCount = 0;
    this.spriteOverflow = false;

    for (let i = 0; i < 64; i++) {
      const sprite = this.getSpriteData(i);
      const y = sprite.y;
      const bottom = y + this.spriteHeight;

      if (scanline >= y && scanline < bottom) {
        if (this.spriteCount < 8) {
          const offset = this.spriteCount * 4;
          this.secondaryOAM[offset] = sprite.y;
          this.secondaryOAM[offset + 1] = sprite.tile;
          this.secondaryOAM[offset + 2] = sprite.attr;
          this.secondaryOAM[offset + 3] = sprite.x;
          this.spriteCount++;
        } else {
          this.spriteOverflow = true;
          break;
        }
      }
    }
  }

  fetchPattern(index: number, row: number): number {
    if (index >= this.spriteCount) return 0;
    
    const offset = index * 4;
    const tile = this.secondaryOAM[offset + 1];
    const attr = this.secondaryOAM[offset + 2];
    const flipVertical = (attr & 0x80) !== 0;
    
    let actualRow = row;
    if (flipVertical) {
      actualRow = this.spriteHeight - 1 - row;
    }
    
    return (tile << 8) | actualRow;
  }

  getPixel(x: number, y: number): {index: number, priority: number, palette: number} {
    for (let i = this.spriteCount - 1; i >= 0; i--) {
      const offset = i * 4;
      const spriteX = this.secondaryOAM[offset + 3];
      const spriteY = this.secondaryOAM[offset];
      const attr = this.secondaryOAM[offset + 2];
      
      const flipHorizontal = (attr & 0x40) !== 0;
      const flipVertical = (attr & 0x80) !== 0;
      
      let localX = x - spriteX;
      let localY = y - spriteY;
      
      if (localX < 0 || localX >= 8 || localY < 0 || localY >= this.spriteHeight) {
        continue;
      }
      
      if (flipHorizontal) {
        localX = 7 - localX;
      }
      
      if (flipVertical) {
        localY = this.spriteHeight - 1 - localY;
      }
      
      const palette = this.getPalette(i);
      const priority = this.getPriority(i);
      
      return {index: i, priority, palette};
    }
    
    return {index: -1, priority: 0, palette: 0};
  }

  checkOverflow(): boolean {
    return this.spriteOverflow;
  }

  setSpriteSize(size: number): void {
    this.spriteHeight = size;
  }

  readOAM(address: number): number {
    return this.oamData[address & 0xFF];
  }

  writeOAM(address: number, value: number): void {
    this.oamData[address & 0xFF] = value & 0xFF;
  }

  clearSecondary(): void {
    this.secondaryOAM.fill(0);
  }

  loadSprites(): void {
    this.clearSecondary();
    this.spriteCount = 0;
    
    for (let i = 0; i < 64 && this.spriteCount < 8; i++) {
      const sprite = this.getSpriteData(i);
      const offset = this.spriteCount * 4;
      
      this.secondaryOAM[offset] = sprite.y;
      this.secondaryOAM[offset + 1] = sprite.tile;
      this.secondaryOAM[offset + 2] = sprite.attr;
      this.secondaryOAM[offset + 3] = sprite.x;
      
      this.spriteCount++;
    }
  }

  getSpriteData(index: number): {y: number, tile: number, attr: number, x: number} {
    const offset = index * 4;
    return {
      y: this.oamData[offset],
      tile: this.oamData[offset + 1],
      attr: this.oamData[offset + 2],
      x: this.oamData[offset + 3]
    };
  }

  isSpriteZero(index: number): boolean {
    return index === 0;
  }

  hasSpriteZeroHit(x: number): boolean {
    if (this.spriteCount === 0) return false;
    
    const spriteX = this.secondaryOAM[3];
    const spriteY = this.secondaryOAM[0];
    
    return this.isSpriteZero(0) && x === spriteX;
  }

  getPriority(index: number): number {
    if (index >= this.spriteCount) return 0;
    const offset = index * 4;
    const attr = this.secondaryOAM[offset + 2];
    return (attr >> 5) & 0x01;
  }

  getPalette(index: number): number {
    if (index >= this.spriteCount) return 0;
    const offset = index * 4;
    const attr = this.secondaryOAM[offset + 2];
    return (attr & 0x03) + 4;
  }
}
