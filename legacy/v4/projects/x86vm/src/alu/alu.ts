import { IAlu } from './ialu';
import { ICpu } from '../decoder/idecoder';

export class Alu implements IAlu {
  private readonly cpu: ICpu;

  constructor(cpu: ICpu) {
    this.cpu = cpu;
  }

  add(dest: number, src: number, size: number): number {
    const mask = this.getMask(size);
    const signBit = this.getSignBit(size);
    const result = (dest + src) & mask;
    
    const carry = (dest & mask) + (src & mask) > mask;
    const overflow = ((dest ^ result) & (src ^ result) & signBit) !== 0;
    const sign = (result & signBit) !== 0;
    const zero = (result & mask) === 0;
    const parity = this.getParity(result & 0xFF);
    const auxCarry = ((dest & 0xF) + (src & 0xF)) > 0xF;
    
    (this.cpu as any).setFlag(0, carry);        // CF
    (this.cpu as any).setFlag(1, true);          // Reserved
    (this.cpu as any).setFlag(2, parity);        // PF
    (this.cpu as any).setFlag(3, false);        // Reserved
    (this.cpu as any).setFlag(4, auxCarry);     // AF
    (this.cpu as any).setFlag(5, false);        // Reserved
    (this.cpu as any).setFlag(6, zero);         // ZF
    (this.cpu as any).setFlag(7, sign);          // SF
    (this.cpu as any).setFlag(11, overflow);    // OF
    
    return result;
  }

  sub(dest: number, src: number, size: number): number {
    const mask = this.getMask(size);
    const signBit = this.getSignBit(size);
    const result = (dest - src) & mask;
    
    const borrow = (dest & mask) < (src & mask);
    const overflow = ((dest ^ src) & (dest ^ result) & signBit) !== 0;
    const sign = (result & signBit) !== 0;
    const zero = (result & mask) === 0;
    const parity = this.getParity(result & 0xFF);
    const auxBorrow = (dest & 0xF) < (src & 0xF);
    
    (this.cpu as any).setFlag(0, borrow);       // CF
    (this.cpu as any).setFlag(1, true);          // Reserved
    (this.cpu as any).setFlag(2, parity);         // PF
    (this.cpu as any).setFlag(3, false);         // Reserved
    (this.cpu as any).setFlag(4, auxBorrow);     // AF
    (this.cpu as any).setFlag(5, false);         // Reserved
    (this.cpu as any).setFlag(6, zero);          // ZF
    (this.cpu as any).setFlag(7, sign);           // SF
    (this.cpu as any).setFlag(11, overflow);      // OF
    
    return result;
  }

  mul(value: number, size: number): number {
    const mask = this.getMask(size);
    const result = value & mask;
    
    const carry = value > mask;
    const overflow = carry;
    
    (this.cpu as any).setFlag(0, carry);     // CF
    (this.cpu as any).setFlag(11, overflow); // OF
    
    return result;
  }

  imul(value: number, size: number): number {
    const mask = this.getMask(size);
    const signBit = this.getSignBit(size);
    const sign = (value & signBit) !== 0;
    
    let result = value & mask;
    if (sign && size < 32) {
      result |= ~mask;
    }
    
    const carry = value > mask || value < 0;
    const overflow = carry;
    
    (this.cpu as any).setFlag(0, carry);     // CF
    (this.cpu as any).setFlag(11, overflow); // OF
    
    return result;
  }

  div(value: number, size: number): number {
    if (value === 0) {
      (this.cpu as any).raiseException(0, 0);
      return 0;
    }
    
    const result = Math.floor(value);
    
    (this.cpu as any).setFlag(0, false);     // CF
    (this.cpu as any).setFlag(11, false);    // OF
    
    return result;
  }

  idiv(value: number, size: number): number {
    if (value === 0) {
      (this.cpu as any).raiseException(0, 0);
      return 0;
    }
    
    const result = value < 0 ? Math.ceil(value) : Math.floor(value);
    
    (this.cpu as any).setFlag(0, false);     // CF
    (this.cpu as any).setFlag(11, false);    // OF
    
    return result;
  }

  and(dest: number, src: number, size: number): number {
    const mask = this.getMask(size);
    const result = (dest & src) & mask;
    
    const sign = (result & this.getSignBit(size)) !== 0;
    const zero = (result & mask) === 0;
    const parity = this.getParity(result & 0xFF);
    
    (this.cpu as any).setFlag(0, false);     // CF
    (this.cpu as any).setFlag(2, parity);    // PF
    (this.cpu as any).setFlag(6, zero);      // ZF
    (this.cpu as any).setFlag(7, sign);      // SF
    (this.cpu as any).setFlag(11, false);    // OF
    
    return result;
  }

  or(dest: number, src: number, size: number): number {
    const mask = this.getMask(size);
    const result = (dest | src) & mask;
    
    const sign = (result & this.getSignBit(size)) !== 0;
    const zero = (result & mask) === 0;
    const parity = this.getParity(result & 0xFF);
    
    (this.cpu as any).setFlag(0, false);     // CF
    (this.cpu as any).setFlag(2, parity);    // PF
    (this.cpu as any).setFlag(6, zero);      // ZF
    (this.cpu as any).setFlag(7, sign);      // SF
    (this.cpu as any).setFlag(11, false);    // OF
    
    return result;
  }

  xor(dest: number, src: number, size: number): number {
    const mask = this.getMask(size);
    const result = (dest ^ src) & mask;
    
    const sign = (result & this.getSignBit(size)) !== 0;
    const zero = (result & mask) === 0;
    const parity = this.getParity(result & 0xFF);
    
    (this.cpu as any).setFlag(0, false);     // CF
    (this.cpu as any).setFlag(2, parity);    // PF
    (this.cpu as any).setFlag(6, zero);      // ZF
    (this.cpu as any).setFlag(7, sign);      // SF
    (this.cpu as any).setFlag(11, false);    // OF
    
    return result;
  }

  not(value: number, size: number): number {
    const mask = this.getMask(size);
    return (~value) & mask;
  }

  shl(value: number, count: number, size: number): number {
    const mask = this.getMask(size);
    const effectiveCount = count & ((size * 8) - 1);
    const result = (value << effectiveCount) & mask;
    
    const carry = effectiveCount > 0 ? (value << (effectiveCount - 1)) & (mask + 1) : 0;
    const overflow = ((result ^ value) & this.getSignBit(size)) !== 0;
    
    (this.cpu as any).setFlag(0, carry !== 0); // CF
    (this.cpu as any).setFlag(11, overflow); // OF
    
    return result;
  }

  shr(value: number, count: number, size: number): number {
    const mask = this.getMask(size);
    const effectiveCount = count & ((size * 8) - 1);
    const result = (value >>> effectiveCount) & mask;
    
    const carry = effectiveCount > 0 ? (value >>> (effectiveCount - 1)) & 1 : 0;
    
    (this.cpu as any).setFlag(0, carry !== 0); // CF
    (this.cpu as any).setFlag(11, false);     // OF
    
    return result;
  }

  sar(value: number, count: number, size: number): number {
    const mask = this.getMask(size);
    const signBit = this.getSignBit(size);
    const effectiveCount = count & ((size * 8) - 1);
    
    let result = value >>> effectiveCount;
    if ((value & signBit) !== 0) {
      const shiftMask = (1 << effectiveCount) - 1;
      result |= (shiftMask << ((size * 8) - effectiveCount));
    }
    result &= mask;
    
    const carry = effectiveCount > 0 ? (value >>> (effectiveCount - 1)) & 1 : 0;
    
    (this.cpu as any).setFlag(0, carry !== 0); // CF
    (this.cpu as any).setFlag(11, false);     // OF
    
    return result;
  }

  rol(value: number, count: number, size: number): number {
    const mask = this.getMask(size);
    const bitCount = size * 8;
    const effectiveCount = count & (bitCount - 1);
    
    let result = value & mask;
    for (let i = 0; i < effectiveCount; i++) {
      const carry = (result >>> (bitCount - 1)) & 1;
      result = ((result << 1) & mask) | carry;
    }
    
    const carry = effectiveCount > 0 ? (result & 1) : (value & 1);
    
    (this.cpu as any).setFlag(0, carry !== 0); // CF
    (this.cpu as any).setFlag(11, false);     // OF
    
    return result;
  }

  ror(value: number, count: number, size: number): number {
    const mask = this.getMask(size);
    const bitCount = size * 8;
    const effectiveCount = count & (bitCount - 1);
    
    let result = value & mask;
    for (let i = 0; i < effectiveCount; i++) {
      const carry = result & 1;
      result = (result >>> 1) | (carry << (bitCount - 1));
    }
    result &= mask;
    
    const carry = effectiveCount > 0 ? ((result >>> (bitCount - 1)) & 1) : (value & 1);
    
    (this.cpu as any).setFlag(0, carry !== 0); // CF
    (this.cpu as any).setFlag(11, false);     // OF
    
    return result;
  }

  updateFlags(result: number, dest: number, src: number, size: number, operation: string): void {
    const mask = this.getMask(size);
    const signBit = this.getSignBit(size);
    
    const sign = (result & signBit) !== 0;
    const zero = (result & mask) === 0;
    const parity = this.getParity(result & 0xFF);
    
    (this.cpu as any).setFlag(2, parity); // PF
    (this.cpu as any).setFlag(6, zero);    // ZF
    (this.cpu as any).setFlag(7, sign);    // SF
    
    switch (operation) {
      case 'add':
      case 'sub':
        break;
      default:
        (this.cpu as any).setFlag(0, false);  // CF
        (this.cpu as any).setFlag(11, false); // OF
        break;
    }
  }

  private getMask(size: number): number {
    switch (size) {
      case 1: return 0xFF;
      case 2: return 0xFFFF;
      case 4: return 0xFFFFFFFF;
      default: throw new RangeError('Invalid size');
    }
  }

  private getSignBit(size: number): number {
    switch (size) {
      case 1: return 0x80;
      case 2: return 0x8000;
      case 4: return 0x80000000;
      default: throw new RangeError('Invalid size');
    }
  }

  private getParity(byte: number): boolean {
    let count = 0;
    for (let i = 0; i < 8; i++) {
      if ((byte >> i) & 1) count++;
    }
    return (count & 1) === 0;
  }
}
