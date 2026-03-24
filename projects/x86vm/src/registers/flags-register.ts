export type FlagsChangeCallback = (oldValue: number, newValue: number) => void;

export class FlagsRegister {
  private value: number = 0x2;
  private changeCallbacks: Set<FlagsChangeCallback> = new Set();

  static readonly CF_MASK = 0x0001;
  static readonly PF_MASK = 0x0004;
  static readonly AF_MASK = 0x0010;
  static readonly ZF_MASK = 0x0040;
  static readonly SF_MASK = 0x0080;
  static readonly TF_MASK = 0x0100;
  static readonly IF_MASK = 0x0200;
  static readonly DF_MASK = 0x0400;
  static readonly OF_MASK = 0x0800;
  static readonly IOPL_MASK = 0x3000;
  static readonly NT_MASK = 0x4000;
  static readonly RF_MASK = 0x10000;
  static readonly VM_MASK = 0x20000;
  static readonly AC_MASK = 0x40000;
  static readonly VIF_MASK = 0x80000;
  static readonly VIP_MASK = 0x100000;
  static readonly ID_MASK = 0x200000;
  static readonly RESERVED_MASK = 0x2;

  get(): number {
    return this.value;
  }

  set(value: number): void {
    const oldValue = this.value;
    this.value = (value & ~FlagsRegister.RESERVED_MASK) | FlagsRegister.RESERVED_MASK;
    this.notifyChange(oldValue, this.value);
  }

  getCF(): boolean {
    return (this.value & FlagsRegister.CF_MASK) !== 0;
  }

  setCF(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.CF_MASK;
    } else {
      this.value &= ~FlagsRegister.CF_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getPF(): boolean {
    return (this.value & FlagsRegister.PF_MASK) !== 0;
  }

  setPF(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.PF_MASK;
    } else {
      this.value &= ~FlagsRegister.PF_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getAF(): boolean {
    return (this.value & FlagsRegister.AF_MASK) !== 0;
  }

  setAF(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.AF_MASK;
    } else {
      this.value &= ~FlagsRegister.AF_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getZF(): boolean {
    return (this.value & FlagsRegister.ZF_MASK) !== 0;
  }

  setZF(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.ZF_MASK;
    } else {
      this.value &= ~FlagsRegister.ZF_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getSF(): boolean {
    return (this.value & FlagsRegister.SF_MASK) !== 0;
  }

  setSF(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.SF_MASK;
    } else {
      this.value &= ~FlagsRegister.SF_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getTF(): boolean {
    return (this.value & FlagsRegister.TF_MASK) !== 0;
  }

  setTF(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.TF_MASK;
    } else {
      this.value &= ~FlagsRegister.TF_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getIF(): boolean {
    return (this.value & FlagsRegister.IF_MASK) !== 0;
  }

  setIF(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.IF_MASK;
    } else {
      this.value &= ~FlagsRegister.IF_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getDF(): boolean {
    return (this.value & FlagsRegister.DF_MASK) !== 0;
  }

  setDF(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.DF_MASK;
    } else {
      this.value &= ~FlagsRegister.DF_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getOF(): boolean {
    return (this.value & FlagsRegister.OF_MASK) !== 0;
  }

  setOF(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.OF_MASK;
    } else {
      this.value &= ~FlagsRegister.OF_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getIOPL(): number {
    return (this.value & FlagsRegister.IOPL_MASK) >> 12;
  }

  setIOPL(level: number): void {
    const oldValue = this.value;
    this.value = (this.value & ~FlagsRegister.IOPL_MASK) | ((level & 3) << 12);
    this.notifyChange(oldValue, this.value);
  }

  getNT(): boolean {
    return (this.value & FlagsRegister.NT_MASK) !== 0;
  }

  setNT(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.NT_MASK;
    } else {
      this.value &= ~FlagsRegister.NT_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getRF(): boolean {
    return (this.value & FlagsRegister.RF_MASK) !== 0;
  }

  setRF(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.RF_MASK;
    } else {
      this.value &= ~FlagsRegister.RF_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getVM(): boolean {
    return (this.value & FlagsRegister.VM_MASK) !== 0;
  }

  setVM(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.VM_MASK;
    } else {
      this.value &= ~FlagsRegister.VM_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getAC(): boolean {
    return (this.value & FlagsRegister.AC_MASK) !== 0;
  }

  setAC(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.AC_MASK;
    } else {
      this.value &= ~FlagsRegister.AC_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getVIF(): boolean {
    return (this.value & FlagsRegister.VIF_MASK) !== 0;
  }

  setVIF(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.VIF_MASK;
    } else {
      this.value &= ~FlagsRegister.VIF_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getVIP(): boolean {
    return (this.value & FlagsRegister.VIP_MASK) !== 0;
  }

  setVIP(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.VIP_MASK;
    } else {
      this.value &= ~FlagsRegister.VIP_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  getID(): boolean {
    return (this.value & FlagsRegister.ID_MASK) !== 0;
  }

  setID(value: boolean): void {
    const oldValue = this.value;
    if (value) {
      this.value |= FlagsRegister.ID_MASK;
    } else {
      this.value &= ~FlagsRegister.ID_MASK;
    }
    this.notifyChange(oldValue, this.value);
  }

  updateArithmeticFlags(result: number, operand1: number, operand2: number, isSubtraction: boolean): void {
    const oldValue = this.value;
    
    this.setZF((result & 0xFFFFFFFF) === 0);
    this.setSF((result & 0x80000000) !== 0);
    
    const bit0 = (result & 0x1) !== 0;
    const bit1 = (result & 0x2) !== 0;
    const bit2 = (result & 0x4) !== 0;
    const bit3 = (result & 0x8) !== 0;
    const bit4 = (result & 0x10) !== 0;
    const bit5 = (result & 0x20) !== 0;
    const bit6 = (result & 0x40) !== 0;
    const bit7 = (result & 0x80) !== 0;
    const parity = bit0 ^ bit1 ^ bit2 ^ bit3 ^ bit4 ^ bit5 ^ bit6 ^ bit7;
    this.setPF(!parity);
    
    const carry = isSubtraction 
      ? (operand1 >>> 0) < (operand2 >>> 0)
      : (result >>> 0) < (operand1 >>> 0);
    this.setCF(carry);
    
    const overflow = ((operand1 ^ operand2 ^ 0x80000000) & (operand1 ^ result) & 0x80000000) !== 0;
    this.setOF(overflow);
    
    const auxCarry = isSubtraction
      ? ((operand1 & 0xF) < (operand2 & 0xF))
      : ((result & 0xF) < (operand1 & 0xF));
    this.setAF(auxCarry);
    
    this.notifyChange(oldValue, this.value);
  }

  updateIncDecFlags(result: number, operand: number, isDecrement: boolean): void {
    const oldValue = this.value;
    
    this.setZF((result & 0xFFFFFFFF) === 0);
    this.setSF((result & 0x80000000) !== 0);
    
    const bit0 = (result & 0x1) !== 0;
    const bit1 = (result & 0x2) !== 0;
    const bit2 = (result & 0x4) !== 0;
    const bit3 = (result & 0x8) !== 0;
    const bit4 = (result & 0x10) !== 0;
    const bit5 = (result & 0x20) !== 0;
    const bit6 = (result & 0x40) !== 0;
    const bit7 = (result & 0x80) !== 0;
    const parity = bit0 ^ bit1 ^ bit2 ^ bit3 ^ bit4 ^ bit5 ^ bit6 ^ bit7;
    this.setPF(!parity);
    
    const overflow = ((operand ^ result) & 0x80000000) !== 0;
    this.setOF(overflow);
    
    const auxCarry = isDecrement
      ? ((operand & 0xF) === 0xF)
      : ((operand & 0xF) === 0);
    this.setAF(auxCarry);
    
    this.notifyChange(oldValue, this.value);
  }

  updateLogicFlags(result: number): void {
    const oldValue = this.value;
    
    this.setZF((result & 0xFFFFFFFF) === 0);
    this.setSF((result & 0x80000000) !== 0);
    
    const bit0 = (result & 0x1) !== 0;
    const bit1 = (result & 0x2) !== 0;
    const bit2 = (result & 0x4) !== 0;
    const bit3 = (result & 0x8) !== 0;
    const bit4 = (result & 0x10) !== 0;
    const bit5 = (result & 0x20) !== 0;
    const bit6 = (result & 0x40) !== 0;
    const bit7 = (result & 0x80) !== 0;
    const parity = bit0 ^ bit1 ^ bit2 ^ bit3 ^ bit4 ^ bit5 ^ bit6 ^ bit7;
    this.setPF(!parity);
    
    this.setCF(false);
    this.setOF(false);
    
    this.notifyChange(oldValue, this.value);
  }

  updateShiftFlags(result: number, carry: boolean): void {
    const oldValue = this.value;
    
    this.setZF((result & 0xFFFFFFFF) === 0);
    this.setSF((result & 0x80000000) !== 0);
    
    const bit0 = (result & 0x1) !== 0;
    const bit1 = (result & 0x2) !== 0;
    const bit2 = (result & 0x4) !== 0;
    const bit3 = (result & 0x8) !== 0;
    const bit4 = (result & 0x10) !== 0;
    const bit5 = (result & 0x20) !== 0;
    const bit6 = (result & 0x40) !== 0;
    const bit7 = (result & 0x80) !== 0;
    const parity = bit0 ^ bit1 ^ bit2 ^ bit3 ^ bit4 ^ bit5 ^ bit6 ^ bit7;
    this.setPF(!parity);
    
    this.setCF(carry);
    
    this.notifyChange(oldValue, this.value);
  }

  onChange(callback: FlagsChangeCallback): void {
    this.changeCallbacks.add(callback);
  }

  offChange(callback: FlagsChangeCallback): void {
    this.changeCallbacks.delete(callback);
  }

  private notifyChange(oldValue: number, newValue: number): void {
    if (oldValue !== newValue) {
      for (const callback of this.changeCallbacks) {
        callback(oldValue, newValue);
      }
    }
  }
}
