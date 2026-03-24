mod: number;
  reg: number;
  rm: number;
}

export class Register {
  constructor(public id: number, public name: string, public size: number) {}
}

export class ModRMParser {
  private mod: number = 0;
  private reg: number = 0;
  private rm: number = 0;

  parse(byte: number): ModRMInfo {
    this.mod = (byte >> 6) & 0x03;
    this.reg = (byte >> 3) & 0x07;
    this.rm = byte & 0x07;
    return { mod: this.mod, reg: this.reg, rm: this.rm };
  }

  hasModRM(opcode: number): boolean {
    const primaryOpcode = opcode & 0xFF;
    const secondaryOpcode = (opcode >> 8) & 0xFF;
    
    if (secondaryOpcode === 0x0F) {
      return true;
    }
    
    const needsModRM = [
      0x00, 0x01, 0x02, 0x03, 0x08, 0x09, 0x0A, 0x0B,
      0x10, 0x11, 0x12, 0x13, 0x18, 0x19, 0x1A, 0x1B,
      0x20, 0x21, 0x22, 0x23, 0x28, 0x29, 0x2A, 0x2B,
      0x30, 0x31,0x32, 0x33, 0x38, 0x39, 0x3A, 0x3B,
      0x62, 0x63, 0x69, 0x6B, 0x80, 0x81, 0x82, 0x83,
      0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B,
      0x8C, 0x8D, 0x8E, 0x8F, 0xC0, 0xC1, 0xC4, 0xC5,
      0xC6, 0xC7, 0xD0, 0xD1, 0xD2, 0x3, 0xF6, 0xF7,
      0xFE, 0xFF
    ];
    
    return needsModRM.includes(primaryOpcode);
  }

  getModRMByte(inst: DecodedInstruction): number {
    return inst.modrm ? ((inst.modrm.mod << 6) | (inst.modrm.reg << 3) | inst.modrm.rm) : 0;
  }

  parseDisplacement(modrm: ModRMInfo, addressSize: number): number {
    if (modrm.mod === 0) {
      if (modrm.rm === 0x05) {
        return addressSize === 16 ? 2 : 4;
      }
      return 0;
    } else if (modrm.mod === 1) {
      return 1;
    } else if (modrm.mod === 2) {
      return addressSize === 16 ? 2 : 4;
    }
    return 0;
  }

  needsSIB(modrm: ModRMInfo): boolean {
    return modrm.mod !== 3 && modrm.rm === 0x04;
  }

  getEffectiveAddress(modrm: ModRMInfo, sib: SIBInfo, displacement: number, registers: RegisterBank): number {
    let base = 0;
    let index = 0;
    
    if (sib) {
      if (sib.base !== 0x05 || modrm.mod !== 0) {
        base = registers.getRegister(sib.base);
      }
      if (sib.index !== 0x04) {
        index = registers.getRegister(s.index);
      }
      const scale = [1, 2, 4, 8][sib.scale];
      return base + (index * scale) + displacement;
    } else {
      if (modrm.rm === 0x04) {
        return displacement;
      }
      if (modrm.rm === 0x05 && modrm.mod === 0) {
        return displacement;
      }
      return registers.getRegister(modrm.rm) + displacement;
    }
  }

  getRegisterFromReg(reg: number, operandSize: number): Register {
    const is64Bit = operandSize === 64;
    const is16Bit = operandSize === 16;
    const is8Bit = operandSize === 8;
    
    const regMap = {
      0: is64Bit ? new Register(0, 'RAX', 64) : is16Bit ? new Register(0, 'AX', 16) : is8Bit ? new Register(0, 'AL', 8) : new Register(0, 'EAX', 32),
      1: is64Bit ? new Register(1, 'RCX', 64) : is16Bit ? new Register(1, 'CX', 16) : is8Bit ? new Register(1, 'CL', 8) : new Register(1, 'ECX', 32),
      2: is64Bit ? new Register(2, 'RDX', 64) : is16Bit ? new Register(2, 'DX', 16) : is8Bit ? new Register(2, 'DL', 8) : new Register(2, 'EDX', 32),
      3: is64Bit ? new Register(3, 'RBX', 64) : is16Bit ? new Register(3, 'BX', 16) : is8Bit ? new Register(3, 'BL', 8) : new Register(3, 'EBX', 32),
      4: is64Bit ? new Register(4, 'RSP', 64) : is16Bit ? new Register(4, 'SP', 16) : is8Bit ? new Register(4, 'AH', 8) : new Register(4, 'ESP', 32),
      5: is64Bit ? new Register(5, 'RBP', 64) : is16Bit ? new Register(5, 'BP', 16) : is8Bit ? new Register(5, 'CH', 8) : new Register(5, 'EBP', 32),
      6: is64Bit ? new Register(6, 'RSI', 64) : is16Bit ? new Register(6, 'SI', 16) : is8Bit ? new Register(6, 'DH', 8) : new Register(6, 'ESI', 32),
      7: is64Bit ? new Register(7, 'RDI', 64) : is16Bit ? new Register(7, 'DI', 16) : is8Bit ? new Register(7, 'BH', 8) : new Register(7, 'EDI', 32)
    };
    
    return regMap[reg] || new Register(reg, `R${reg}`, operandSize);
  }

  getRegisterFromRM(modrm: ModRMInfo, operandSize: number): Register {
    return this.getRegisterFromReg(modrm.rm, operandSize);
  }
}
