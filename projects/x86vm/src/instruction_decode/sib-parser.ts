scale: number;
  index: number;
  base: number;
}

export class SIBParser {
  private scale: number = 0;
  private index: number = 0;
  private base: number = 0;

  parse(byte: number): SIBInfo {
    this.scale = (byte >> 6) & 0b11;
    this.index = (byte >> 3) & 0b111;
    this.base = byte & 0b111;
    return { scale: this.scale, index: this.index, base: this.base };
  }

  calculateAddress(sib: SIBInfo, displacement: number, registers: RegisterBank, addressSize: number): number {
    let address = 0;
    const scaleFactor = this.getScaleFactor(sib.scale);
    
    if (!this.isIndexInvalid(sib.index)) {
      const indexReg = this.getIndexRegister(sib.index, addressSize);
      const indexValue = registers.getRegister(indexReg);
      address += indexValue * scaleFactor;
    }
    
    if (sib.base !== 0b101 || (sib.base === 0b101 && displacement !== 0)) {
      const baseReg = this.getBaseRegister(sib.base, addressSize);
      const baseValue = registers.getRegister(baseReg);
      address += baseValue;
    }
    
    address += displacement;
    
    if (addressSize === 16) {
      address = address & 0xFFFF;
    } else if (addressSize === 32) {
      address = address >>> 0;
    }
    
    return address;
  }

  getScaleFactor(scale: number): number {
    return 1 << scale;
  }

  needsDisplacement(sib: SIBInfo, mod: number): boolean {
    return sib.base === 0b101 && mod === 0b00;
  }

  getIndexRegister(index: number, addressSize: number): string {
    if (addressSize === 16) {
      const index16: { [key: number]: string } = {
        0b000: 'SI',
        0b001: 'DI',
        0b010: 'BP',
        0b011: 'BX',
        0b100: 'SP',
        0b101: 'BP',
        0b110: 'SI',
        0b111: 'DI'
      };
      return index16[index] || 'SI';
    } else {
      const index32: { [key: number]: string } = {
        0b000: 'EAX',
        0b001: 'ECX',
        0b010: 'EDX',
        0b011: 'EBX',
        0b100: 'ESP',
        0b101: 'EBP',
        0b110: 'ESI',
        0b111: 'EDI'
      };
      return index32[index] || 'EAX';
    }
  }

  getBaseRegister(base: number, addressSize: number): string {
    if (addressSize === 16) {
      const base16: { [key: number]: string } = {
        0b000: 'AX',
        0b001: 'CX',
        0b010: 'DX',
        0b011: 'BX',
        0b100: 'SP',
        0b101: 'BP',
        0b110: 'SI',
        0b111: 'DI'
      };
      return base16[base] || 'AX';
    } else {
      const base32: { [key: number]: string } = {
        0b000: 'EAX',
        0b001: 'ECX',
        0b010: 'EDX',
        0b011: 'EBX',
        0b100: 'ESP',
        0b101: 'EBP',
        0b110: 'ESI',
        0b111: 'EDI'
      };
      return base32[base] || 'EAX';
    }
  }

  isIndexInvalid(index: number): boolean {
    return index === 0b100;
  }
}
