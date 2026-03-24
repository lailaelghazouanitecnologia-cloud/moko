import { ModRMInfo, SIBInfo, Register, RMInfo, EffectiveAddress, Operand } from './instruction-decoder';

export class ModRMParser {
  private mod: number = 0;
  private reg: number = 0;
  private rm: number = 0;

  parse(modrm: number): ModRMInfo {
    this.mod = (modrm >> 6) & 0x03;
    this.reg = (modrm >> 3) & 0x07;
    this.rm = modrm & 0x07;
    return {
      mod: this.mod,
      reg: this.reg,
      rm: this.rm
    };
  }

  getMod(modrm: number): number {
    return (modrm >> 6) & 0x03;
  }

  getReg(modrm: number): number {
    return (modrm >> 3) & 0x07;
  }

  getRM(modrm: number): number {
    return modrm & 0x07;
  }

  isRegisterMode(mod: number): boolean {
    return mod === 0x03;
  }

  isMemoryMode(mod: number): boolean {
    return mod < 0x03;
  }

  hasDisplacement(mod: number): boolean {
    return mod === 0x01 || mod === 0x02;
  }

  getDisplacementSize(mod: number): number {
    if (mod === 0x01) return 1;
    if (mod === 0x02) return 4;
    return 0;
  }

  decodeRegister(reg: number, operandSize: number): Register {
    const regMap: { [key: string]: Register } = {
      '8_0': { type: 'register', name: 'AL', size: 1, encoding: 0 },
      '8_1': { type: 'register', name: 'CL', size: 1, encoding: 1 },
      '8_2': { type: 'register', name: 'DL', size: 1, encoding: 2 },
      '8_3': { type: 'register', name: 'BL', size: 1, encoding: 3 },
      '8_4': { type: 'register', name: 'AH', size: 1, encoding: 4 },
      '8_5': { type: 'register', name: 'CH', size: 1, encoding: 5 },
      '8_6': { type: 'register', name: 'DH', size: 1, encoding: 6 },
      '8_7': { type: 'register', name: 'BH', size: 1, encoding: 7 },
      '16_0': { type: 'register', name: 'AX', size: 2, encoding: 0 },
      '16_1': { type: 'register', name: 'CX', size: 2, encoding: 1 },
      '16_2': { type: 'register', name: 'DX', size: 2, encoding: 2 },
      '16_3': { type: 'register', name: 'BX', size: 2, encoding: 3 },
      '16_4': { type: 'register', name: 'SP', size: 2, encoding: 4 },
      '16_5': { type: 'register', name: 'BP', size: 2, encoding: 5 },
      '16_6': { type: 'register', name: 'SI', size: 2, encoding: 6 },
      '16_7': { type: 'register', name: 'DI', size: 2, encoding: 7 },
      '32_0': { type: 'register', name: 'EAX', size: 4, encoding: 0 },
      '32_1': { type: 'register', name: 'ECX', size: 4, encoding: 1 },
      '32_2': { type: 'register', name: 'EDX', size: 4, encoding: 2 },
      '32_3': { type: 'register', name: 'EBX', size: 4, encoding: 3 },
      '32_4': { type: 'register', name: 'ESP', size: 4, encoding: 4 },
      '32_5': { type: 'register', name: 'EBP', size: 4, encoding: 5 },
      '32_6': { type: 'register', name: 'ESI', size: 4, encoding: 6 },
      '32_7': { type: 'register', name: 'EDI', size: 4, encoding: 7 },
      '64_0': { type: 'register', name: 'RAX', size: 8, encoding: 0 },
      '64_1': { type: 'register', name: 'RCX', size: 8, encoding: 1 },
      '64_2': { type: 'register', name: 'RDX', size: 8, encoding: 2 },
      '64_3': { type: 'register', name: 'RBX', size: 8, encoding: 3 },
      '64_4': { type: 'register', name: 'RSP', size: 8, encoding: 4 },
      '64_5': { type: 'register', name: 'RBP', size: 8, encoding: 5 },
      '64_6': { type: 'register', name: 'RSI', size: 8, encoding: 6 },
      '64_7': { type: 'register', name: 'RDI', size: 8, encoding: 7 }
    };
    const key = `${operandSize}_${reg}`;
    return regMap[key] || { type: 'register', name: 'UNKNOWN', size: operandSize, encoding: reg };
  }

  decodeRM(rm: number, mod: number, addressSize: number): RMInfo {
    const isReg = this.isRegisterMode(mod);
    const needsSib = this.needsSIB(rm, mod);
    const hasDisp = this.hasDisplacement(mod);
    const dispSize = this.getDisplacementSize(mod);
    
    return {
      register: isReg ? this.decodeRegister(rm, addressSize) : undefined,
      needsSIB,
      hasDisplacement: hasDisp,
      displacementSize: dispSize,
      isDirect: isReg
    };
  }

  needsSIB(rm: number, mod: number): boolean {
    return rm === 0x04 && mod !== 0x03;
  }

  getEffectiveAddress(modrm: number, sib?: SIBInfo, displacement?: number): EffectiveAddress {
    const mod = this.getMod(modrm);
    const rm = this.getRM(modrm);
    
    if (this.isRegisterMode(mod)) {
      return {
        type: 'register',
        register: this.decodeRegister(rm, 4),
        displacement: 0
      };
    }
    
    let base: Register | undefined;
    let index: Register | undefined;
    let scale = 1;
    let disp = displacement || 0;
    
    if (this.needsSIB(rm, mod)) {
      if (sib) {
        base = this.decodeRegister(sib.base, 4);
        if (sib.index !== 0x04) {
          index = this.decodeRegister(sib.index, 4);
          scale = sib.scale;
        }
      }
    } else {
      if (rm !== 0x05 || mod !== 0x00) {
        base = this.decodeRegister(rm, 4);
      }
    }
    
    return {
      type: 'memory',
      base,
      index,
      scale,
      displacement: disp
    };
  }

  parseModRMFromStream(bytes: Uint8Array, offset: number): { modRM: number; newOffset: number } {
    const modRM = bytes[offset];
    return { modRM, newOffset: offset + 1 };
  }

  validateModRM(modrm: number): boolean {
    const mod = this.getMod(modrm);
    const rm = this.getRM(modrm);
    
    if (mod === 0x03) return true;
    if (rm === 0x05 && mod === 0x00) return true;
    if (rm === 0x04 && mod !== 0x03) return true;
    
    return mod < 0x03;
  }

  getRegisterOperand(reg: number, operandSize: number): Operand {
    return {
      type: 'register',
      register: this.decodeRegister(reg, operandSize),
      size: operandSize
    };
  }

  getMemoryOperand(modrm: number, sib?: SIBInfo, displacement?: number): Operand {
    const effectiveAddr = this.getEffectiveAddress(modrm, sib, displacement);
    return {
      type: 'memory',
      address: effectiveAddr,
      size: 4
    };
  }
}
