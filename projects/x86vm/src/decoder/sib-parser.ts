import { SibInfo, RexInfo } from '../types';

export class SibParser {
  private scale: number;
  private index: number;
  private base: number;

  constructor() {
    this.scale = 0;
    this.index = 0;
    this.base = 0;
  }

  parse(byte: number): SibInfo {
    this.scale = this.getScale(byte);
    this.index = this.getIndex(byte);
    this.base = this.getBase(byte);
    
    return {
      scale: this.scale,
      index: this.index,
      base: this.base,
      hasIndex: this.hasIndex(this.index),
      hasBase: this.hasBase(this.base),
      scaleFactor: this.getScaleFactor(this.scale)
    };
  }

  getScale(byte: number): number {
    return (byte >> 6) & 0x03;
  }

  getIndex(byte: number): number {
    return (byte >> 3) & 0x07;
  }

  getBase(byte: number): number {
    return byte & 0x07;
  }

  getScaleFactor(scale: number): number {
    return 1 << scale;
  }

  hasIndex(index: number): boolean {
    return index !== 0x04;
  }

  hasBase(base: number): boolean {
    return base !== 0x05;
  }

  isSpecialBase(base: number, mod: number): boolean {
    return base === 0x05 && mod === 0x00;
  }

  getEffectiveAddress(sib: SibInfo, displacement: number): number {
    let address = displacement;
    
    if (sib.hasBase) {
      address += sib.base;
    }
    
    if (sib.hasIndex) {
      address += sib.index * sib.scaleFactor;
    }
    
    return address;
  }

  parseWithRex(byte: number, rex: RexInfo): SibInfo {
    const baseInfo = this.parse(byte);
    
    return {
      ...baseInfo,
      index: this.getExtendedIndex(baseInfo.index, rex),
      base: this.getExtendedBase(baseInfo.base, rex)
    };
  }

  getExtendedIndex(index: number, rex: RexInfo): number {
    if (!this.hasIndex(index)) {
      return index;
    }
    
    return index | ((rex.x ? 1 : 0) << 3);
  }

  getExtendedBase(base: number, rex: RexInfo): number {
    if (!this.hasBase(base)) {
      return base;
    }
    
    return base | ((rex.b ? 1 : 0) << 3);
  }

  calculateDisplacement(sib: SibInfo, mod: number): number {
    if (mod === 0x00 && sib.base === 0x05) {
      return 4;
    } else if (mod === 0x01) {
      return 1;
    } else if (mod === 0x02) {
      return 4;
    }
    
    return 0;
  }

  isValidSib(byte: number): boolean {
    const scale = this.getScale(byte);
    const index = this.getIndex(byte);
    const base = this.getBase(byte);
    
    return scale <= 0x03 && index <= 0x07 && base <= 0x07;
  }

  getSibString(info: SibInfo): string {
    const parts: string[] = [];
    
    if (info.hasIndex) {
      const scaleStr = info.scaleFactor > 1 ? `*${info.scaleFactor}` : '';
      parts.push(`[${info.index}${scaleStr}]`);
    }
    
    if (info.hasBase) {
      if (parts.length > 0) {
        parts.push('+');
      }
      parts.push(`[${info.base}]`);
    }
    
    return parts.join('');
  }

  needsDisplacement(sib: SibInfo, mod: number): boolean {
    if (mod === 0x00 && sib.base === 0x05) {
      return true;
    }
    
    return mod === 0x01 || mod === 0x02;
  }
}
