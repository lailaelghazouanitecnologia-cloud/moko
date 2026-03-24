import { RegisterIndex, SegmentRegister, RegisterState, OperandSize } from '../registers';

export class RegisterBank {
  private eax: number = 0;
  private ebx: number = 0;
  private ecx: number = 0;
  private edx: number = 0;
  private esi: number = 0;
  private edi: number = 0;
  private esp: number = 0;
  private ebp: number = 0;
  private eip: number = 0;

  static readonly REG_COUNT = 8;

  getRegister(reg: RegisterIndex): number {
    switch (reg) {
      case RegisterIndex.EAX: return this.eax;
      case RegisterIndex.EBX: return this.ebx;
      case RegisterIndex.ECX: return this.ecx;
      case RegisterIndex.EDX: return this.edx;
      case RegisterIndex.ESI: return this.esi;
      case RegisterIndex.EDI: return this.edi;
      case RegisterIndex.ESP: return this.esp;
      case RegisterIndex.EBP: return this.ebp;
      default: throw new Error(`Invalid register index: ${reg}`);
    }
  }

  setRegister(reg: RegisterIndex, value: number): void {
    const maskedValue = value >>> 0;
    switch (reg) {
      case RegisterIndex.EAX: this.eax = maskedValue; break;
      case RegisterIndex.EBX: this.ebx = maskedValue; break;
      case RegisterIndex.ECX: this.ecx = maskedValue; break;
      case RegisterIndex.EDX: this.edx = maskedValue; break;
      case RegisterIndex.ESI: this.esi = maskedValue; break;
      case RegisterIndex.EDI: this.edi = maskedValue; break;
      case RegisterIndex.ESP: this.esp = maskedValue; break;
      case RegisterIndex.EBP: this.ebp = maskedValue; break;
      default: throw new Error(`Invalid register index: ${reg}`);
    }
  }

  getLowByte(reg: RegisterIndex): number {
    return this.getRegister(reg) & 0xFF;
  }

  setLowByte(reg: RegisterIndex, value: number): void {
    const current = this.getRegister(reg);
    const newValue = (current & 0xFFFFFF00) | (value & 0xFF);
    this.setRegister(reg, newValue);
  }

  getHighByte(reg: RegisterIndex): number {
    if (reg === RegisterIndex.EAX || reg === RegisterIndex.EBX || reg === RegisterIndex.ECX || reg === RegisterIndex.EDX) {
      return (this.getRegister(reg) >>> 8) & 0xFF;
    }
    throw new Error(`High byte not accessible for register ${reg}`);
  }

  setHighByte(reg: RegisterIndex, value: number): void {
    if (reg === RegisterIndex.EAX || reg === RegisterIndex.EBX || reg === RegisterIndex.ECX || reg === RegisterIndex.EDX) {
      const current = this.getRegister(reg);
      const newValue = (current & 0xFFFF00FF) | ((value & 0xFF) << 8);
      this.setRegister(reg, newValue);
    } else {
      throw new Error(`High byte not accessible for register ${reg}`);
    }
  }

  getLowWord(reg: RegisterIndex): number {
    return this.getRegister(reg) & 0xFFFF;
  }

  setLowWord(reg: RegisterIndex, value: number): void {
    const current = this.getRegister(reg);
    const newValue = (current & 0xFFFF0000) | (value & 0xFFFF);
    this.setRegister(reg, newValue);
  }

  push(value: number): void {
    this.esp = (this.esp - 4) >>> 0;
    this.setRegister(RegisterIndex.ESP, this.esp);
  }

  pop(): number {
    const value = this.esp;
    this.esp = (this.esp + 4) >>> 0;
    this.setRegister(RegisterIndex.ESP, this.esp);
    return value;
  }

  incrementIP(offset: number): void {
    this.eip = (this.eip + offset) >>> 0;
  }

  reset(): void {
    this.eax = 0;
    this.ebx = 0;
    this.ecx = 0;
    this.edx = 0;
    this.esi = 0;
    this.edi = 0;
    this.esp = 0;
    this.ebp = 0;
    this.eip = 0;
  }

  dump(): RegisterState {
    return {
      eax: this.eax,
      ebx: this.ebx,
      ecx: this.ecx,
      edx: this.edx,
      esi: this.esi,
      edi: this.edi,
      esp: this.esp,
      ebp: this.ebp,
      eip: this.eip
    };
  }

  restore(state: RegisterState): void {
    this.eax = state.eax;
    this.ebx = state.ebx;
    this.ecx = state.ecx;
    this.edx = state.edx;
    this.esi = state.esi;
    this.edi = state.edi;
    this.esp = state.esp;
    this.ebp = state.ebp;
    this.eip = state.eip;
  }

  getSegmentBase(segment: SegmentRegister): number {
    return 0;
  }
}
