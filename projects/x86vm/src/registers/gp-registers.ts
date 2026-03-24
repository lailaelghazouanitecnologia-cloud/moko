import { RegisterIndex, RegisterIndex8, RegisterIndex16, RegisterChangeCallback } from './types';

export class GpRegisters {
  private registers: Uint32Array;
  private changeCallbacks: Map<number, Set<RegisterChangeCallback>>;

  constructor() {
    this.registers = new Uint32Array(8);
    this.changeCallbacks = new Map();
  }

  get(reg: RegisterIndex): number {
    return this.registers[reg];
  }

  set(reg: RegisterIndex, value: number): void {
    const oldValue = this.registers[reg];
    this.registers[reg] = value >>> 0;
    this.triggerCallbacks(reg, oldValue, value);
  }

  get8(reg: RegisterIndex8): number {
    const regIndex = reg >> 1;
    const isHigh = (reg & 1) !== 0;
    const value = this.registers[regIndex];
    return isHigh ? (value >>> 8) & 0xFF : value & 0xFF;
  }

  set8(reg: RegisterIndex8, value: number): void {
    const regIndex = reg >> 1;
    const isHigh = (reg & 1) !== 0;
    const oldValue = this.registers[regIndex];
    const maskedValue = value & 0xFF;
    
    if (isHigh) {
      this.registers[regIndex] = (oldValue & 0xFFFF00FF) | (maskedValue << 8);
    } else {
      this.registers[regIndex] = (oldValue & 0xFFFFFF00) | maskedValue;
    }
    
    this.triggerCallbacks(regIndex, oldValue, this.registers[regIndex]);
  }

  get16(reg: RegisterIndex16): number {
    return this.registers[reg] & 0xFFFF;
  }

  set16(reg: RegisterIndex16, value: number): void {
    const oldValue = this.registers[reg];
    this.registers[reg] = (oldValue & 0xFFFF0000) | (value & 0xFFFF);
    this.triggerCallbacks(reg, oldValue, this.registers[reg]);
  }

  get32(reg: RegisterIndex): number {
    return this.get(reg);
  }

  set32(reg: RegisterIndex, value: number): void {
    this.set(reg, value);
  }

  get64(reg: RegisterIndex): bigint {
    const low = BigInt(this.registers[reg]);
    const high = BigInt(this.registers[(reg + 1) & 7]);
    return (high << 32n) | low;
  }

  set64(reg: RegisterIndex, value: bigint): void {
    const low = Number(value & 0xFFFFFFFFn);
    const high = Number((value >> 32n) & 0xFFFFFFFFn);
    
    const oldLow = this.registers[reg];
    const oldHigh = this.registers[(reg + 1) & 7];
    
    this.registers[reg] = low >>> 0;
    this.registers[(reg + 1) & 7] = high >>> 0;
    
    this.triggerCallbacks(reg, oldLow, low);
    this.triggerCallbacks((reg + 1) & 7, oldHigh, high);
  }

  reset(): void {
    for (let i = 0; i < 8; i++) {
      const oldValue = this.registers[i];
      this.registers[i] = 0;
      this.triggerCallbacks(i, oldValue, 0);
    }
  }

  clone(): GpRegisters {
    const cloned = new GpRegisters();
    cloned.registers = new Uint32Array(this.registers);
    cloned.changeCallbacks = new Map();
    for (const [reg, callbacks] of this.changeCallbacks) {
      cloned.changeCallbacks.set(reg, new Set(callbacks));
    }
    return cloned;
  }

  onChange(reg: RegisterIndex, callback: RegisterChangeCallback): void {
    if (!this.changeCallbacks.has(reg)) {
      this.changeCallbacks.set(reg, new Set());
    }
    this.changeCallbacks.get(reg)!.add(callback);
  }

  offChange(reg: RegisterIndex, callback: RegisterChangeCallback): void {
    const callbacks = this.changeCallbacks.get(reg);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.changeCallbacks.delete(reg);
      }
    }
  }

  getFlags(): number {
    return this.registers[0];
  }

  setFlags(value: number): void {
    const oldValue = this.registers[0];
    this.registers[0] = value >>> 0;
    this.triggerCallbacks(0, oldValue, value);
  }

  private triggerCallbacks(reg: RegisterIndex, oldValue: number, newValue: number): void {
    const callbacks = this.changeCallbacks.get(reg);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(reg, oldValue, newValue);
      }
    }
  }

  static readonly COUNT = 8;
  static readonly INDEX_EAX = 0;
  static readonly INDEX_ECX = 1;
  static readonly INDEX_EDX = 2;
  static readonly INDEX_EBX = 3;
  static readonly INDEX_ESP = 4;
  static readonly INDEX_EBP = 5;
  static readonly INDEX_ESI = 6;
  static readonly INDEX_EDI = 7;
}
