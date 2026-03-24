export type FlagsChangeCallback = (oldValue: number, newValue: number) => void;
export type OperandSize = 8 | 16 | 32;

export class FlagsRegister {
  private value: number = 2;
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

  get(): number {
    return this.value;
  }

  set(value: number): void {
    const oldValue = this.value;
    this.value = value;
    this.notifyChange(oldValue, value);
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

  updateParity(result: number): void {
    let parity = 0;
    for (let i = 0; i < 8; i++) {
      if ((result >> i) & 1) parity++;
    }
    this.setPF((parity & 1) === 0);
  }

  updateSign(result: number, size: OperandSize): void {
    let msb: number;
    switch (size) {
      case 8: msb = (result >> 7) & 1; break;
      case 16: msb = (result >> 15) & 1; break;
      case 32: msb = (result >> 31) & 1; break;
      default: msb = 0;
    }
    this.setSF(msb !== 0);
  }

  updateZero(result: number): void {
    this.setZF(result === 0);
  }

  updateCarry(operation: string, result: number): void {
    switch (operation) {
      case 'add':
      case 'adc':
        this.setCF(result > 0xFFFFFFFF);
        break;
      case 'sub':
      case 'sbb':
      case 'cmp':
        this.setCF(false);
        break;
      default:
        break;
    }
  }

  updateOverflow(a: number, b: number, result: number, operation: string): void {
    let overflow = false;
    switch (operation) {
      case 'add':
        overflow = ((a ^ result) & (b ^ result) & 0x80000000) !== 0;
        break;
      case 'sub':
        overflow = ((a ^ b) & (a ^ result) & 0x80000000) !== 0;
        break;
      default:
        break;
    }
    this.setOF(overflow);
  }

  addChangeCallback(callback: FlagsChangeCallback): void {
    this.changeCallbacks.add(callback);
  }

  removeChangeCallback(callback: FlagsChangeCallback): void {
    this.changeCallbacks.delete(callback);
  }

  private notifyChange(oldValue: number, newValue: number): void {
    for (const callback of this.changeCallbacks) {
      callback(oldValue, newValue);
    }
  }
}
