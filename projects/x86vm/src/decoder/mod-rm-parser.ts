import { ModRmInfo, RexInfo, DisplacementSize, EffectiveAddress } from '../types';
import { SibParser } from './sib-parser';

export class ModRmParser {
  private modRm: number = 0;
  private mod: number = 0;
  private reg: number = 0;
  private rm: number = 0;

  parse(byte: number): ModRmInfo {
    this.modRm = byte;
    this.mod = this.getMod(byte);
    this.reg = this.getReg(byte);
    this.rm = this.getRm(byte);

    return {
      mod: this.mod,
      reg: this.reg,
      rm: this.rm,
      hasDisplacement: this.hasDisplacement(this.mod),
      displacementSize: this.getDisplacementSize(this.mod),
      needsSib: this.needsSib(this.mod, this.rm),
      isRegisterMode: this.isRegisterMode(this.mod),
      isMemoryMode: this.isMemoryMode(this.mod),
      isSpecialCase: this.isSpecialCase(this.mod, this.rm)
    };
  }

  getMod(byte: number): number {
    return (byte >> 6) & 0x3;
  }

  getReg(byte: number): number {
    return (byte >> 3) & 0x7;
  }

  getRm(byte: number): number {
    return byte & 0x7;
  }

  isRegisterMode(mod: number): boolean {
    return mod === 0x3;
  }

  isMemoryMode(mod: number): boolean {
    return mod !== 0x3;
  }

  hasDisplacement(mod: number): boolean {
    return mod === 0x1 || mod === 0x2;
  }

  getDisplacementSize(mod: number): DisplacementSize {
    if (mod === 0x1) {
      return DisplacementSize.BYTE;
    } else if (mod === 0x2) {
      return DisplacementSize.DWORD;
    }
    return DisplacementSize.NONE;
  }

  isSpecialCase(mod: number, rm: number): boolean {
    return mod === 0x0 && rm === 0x5;
  }

  getRegisterNumber(reg: number, rex: RexInfo): number {
    let regNum = reg;
    if (rex && rex.b) {
      regNum += 8;
    }
    return regNum;
  }

  getEffectiveAddress(rm: number): EffectiveAddress {
    switch (rm) {
      case 0x0: return EffectiveAddress.BX_SI;
      case 0x1: return EffectiveAddress.BX_DI;
      case 0x2: return EffectiveAddress.BP_SI;
      case 0x3: return EffectiveAddress.BP_DI;
      case 0x4: return EffectiveAddress.SI;
      case 0x5: return EffectiveAddress.DI;
      case 0x6: return EffectiveAddress.BP;
      case 0x7: return EffectiveAddress.BX;
      default: return EffectiveAddress.NONE;
    }
  }

  needsSib(mod: number, rm: number): boolean {
    return mod !== 0x3 && rm === 0x4;
  }

  parseWithRex(byte: number, rex: RexInfo): ModRmInfo {
    const info = this.parse(byte);
    
    if (rex) {
      if (rex.r) {
        info.reg += 8;
      }
      if (rex.b) {
        info.rm += 8;
      }
    }
    
    return info;
  }

  isExtendedReg(reg: number, rex: RexInfo): boolean {
    return rex && rex.r && reg >= 0;
  }

  getExtendedReg(reg: number, rex: RexInfo): number {
    let extended = reg;
    if (rex && rex.r) {
      extended += 8;
    }
    return extended;
  }

  validateModRm(byte: number): boolean {
    const mod = this.getMod(byte);
    const rm = this.getRm(byte);
    
    if (mod === 0x0 && rm === 0x5) {
      return true;
    }
    
    if (mod === 0x3) {
      return true;
    }
    
    return mod === 0x1 || mod === 0x2;
  }

  getModRmString(info: ModRmInfo): string {
    const parts: string[] = [];
    
    parts.push(`mod:${info.mod}`);
    parts.push(`reg:${info.reg}`);
    parts.push(`rm:${info.rm}`);
    
    if (info.hasDisplacement) {
      parts.push(`disp:${DisplacementSize[info.displacementSize]}`);
    }
    
    if (info.needsSib) {
      parts.push('sib:needed');
    }
    
    if (info.isSpecialCase) {
      parts.push('special:true');
    }
    
    return `ModRm{${parts.join(',')}}`;
  }
}
