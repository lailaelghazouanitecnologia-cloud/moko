import { PictureProcessingUnit } from './picture-processing-unit';

export class BackgroundRenderer {
  private nameTable: number = 0;
  private patternTable: number = 0;
  private tileIndex: number = 0;
  private tileAttribute: number = 0;
  private tileLsb: number = 0;
  private tileMsb: number = 0;
  private shiftLow: number = 0;
  private shiftHigh: number = 0;
  private shiftAttrLow: number = 0;
  private shiftAttrHigh: number = 0;

  constructor() {}

  reset(): void {
    this.shiftLow = 0;
    this.shiftHigh = 0;
    this.shiftAttrLow = 0;
    this.shiftAttrHigh = 0;
  }

  fetchNameTable(vramAddr: number): void {
    const address = this.getNameTableAddress(vramAddr);
    this.nameTable = PictureProcessingUnit.prototype.readVRAM.call({ vramAddr: address } as any, address);
  }

  fetchAttribute(vramAddr: number): void {
    const address = this.getAttributeAddress(vramAddr);
    this.tileAttribute = PictureProcessingUnit.prototype.readVRAM.call({ vramAddr: address } as any, address);
  }

  fetchPatternLow(fineY: number): void {
    const address = this.getPatternAddress(this.patternTable, this.tileIndex, fineY, true);
    this.tileLsb = PictureProcessingUnit.prototype.readVRAM.call({ vramAddr: address } as any, address);
  }

  fetchPatternHigh(fineY: number): void {
    const address = this.getPatternAddress(this.patternTable, this.tileIndex, fineY, false);
    this.tileMsb = PictureProcessingUnit.prototype.readVRAM.call({ vramAddr: address } as any, address);
  }

  getPixel(fineX: number): { index: number; palette: number } {
    const bitMux = 0x8000 >> fineX;
    const p0 = (this.shiftLow & bitMux) > 0 ? 1 : 0;
    const p1 = (this.shiftHigh & bitMux) > 0 ? 1 : 0;
    const pixel = (p1 << 1) | p0;

    const a0 = (this.shiftAttrLow & bitMux) > 0 ? 1 : 0;
    const a1 = (this.shiftAttrHigh & bitMux) > 0 ? 1 : 0;
    const palette = (a1 << 1) | a0;

    return { index: pixel, palette: palette };
  }

  updateShifters(): void {
    this.shiftLow <<= 1;
    this.shiftHigh <<= 1;
    this.shiftAttrLow <<= 1;
    this.shiftAttrHigh <<= 1;
  }

  reloadShifters(): void {
    this.shiftLow = (this.shiftLow & 0xFF00) | this.tileLsb;
    this.shiftHigh = (this.shiftHigh & 0xFF00) | this.tileMsb;

    const attr = this.getAttribute((this.tileAttribute >> 0) & 0x3, (this.tileAttribute >> 2) & 0x3);
    const attrLow = attr & 0x1;
    const attrHigh = (attr >> 1) & 0x1;

    for (let i = 0; i < 8; i++) {
      this.shiftAttrLow = (this.shiftAttrLow & 0xFFFE) | attrLow;
      this.shiftAttrLow <<= 1;
      this.shiftAttrHigh = (this.shiftAttrHigh & 0xFFFE) | attrHigh;
      this.shiftAttrHigh <<= 1;
    }
  }

  getAttribute(tileX: number, tileY: number): number {
    const shift = (tileY & 0x2) << 1 | (tileX & 0x2);
    return (this.tileAttribute >> shift) & 0x3;
  }

  getPatternAddress(table: number, tile: number, fineY: number, low: boolean): number {
    return (table << 12) | (tile << 4) | (fineY << 1) | (low ? 0 : 1);
  }

  getNameTableAddress(vramAddr: number): number {
    return 0x2000 | (vramAddr & 0x0FFF);
  }

  getAttributeAddress(vramAddr: number): number {
    return 0x23C0 | (vramAddr & 0x0C00) | ((vramAddr >> 4) & 0x38) | ((vramAddr >> 2) & 0x07);
  }

  isLeftEdge(x: number): boolean {
    return x < 8;
  }

  clipLeft(mask: number): boolean {
    return (mask & 0x2) !== 0;
  }
}
