import { SegmentRegisters } from './segment-registers';
import { EFlagsRegister } from './eflags-register';
import { ControlRegisters } from './control-registers';
import { DebugRegisters } from './debug-registers';

export class GeneralPurposeRegisters {
  private registers: Map<string, number> = new Map();
  private width: number = 32;

  constructor() {
    this.registers.set('AX', 0);
    this.registers.set('BX', 0);
    this.registers.set('CX', 0);
    this.registers.set('DX', 0);
    this.registers.set('SI', 0);
    this.registers.set('DI', 0);
    this.registers.set('BP', 0);
    this.registers.set('SP', 0);
  }

  getAX(): number {
    return this.registers.get('AX') || 0;
  }

  setAX(value: number): void {
    this.registers.set('AX', value & 0xFFFF);
  }

  getAH(): number {
    const ax = this.getAX();
    return (ax >> 8) & 0xFF;
  }

  setAH(value: number): void {
    const al = this.getAL();
    this.setAX(((value & 0xFF) << 8) | al);
  }

  getAL(): number {
    return this.getAX() & 0xFF;
  }

  setAL(value: number): void {
    const ah = this.getAH();
    this.setAX((ah << 8) | (value & 0xFF));
  }

  getBX(): number {
    return this.registers.get('BX') || 0;
  }

  setBX(value: number): void {
    this.registers.set('BX', value & 0xFFFF);
  }

  getCX(): number {
    return this.registers.get('CX') || 0;
  }

  setCX(value: number): void {
    this.registers.set('CX', value & 0xFFFF);
  }

  getDX(): number {
    return this.registers.get('DX') || 0;
  }

  setDX(value: number): void {
    this.registers.set('DX', value & 0xFFFF);
  }

  getSI(): number {
    return this.registers.get('SI') || 0;
  }

  setSI(value: number): void {
    this.registers.set('SI', value & 0xFFFF);
  }

  getDI(): number {
    return this.registers.get('DI') || 0;
  }

  setDI(value: number): void {
    this.registers.set('DI', value & 0xFFFF);
  }

  getBP(): number {
    return this.registers.get('BP') || 0;
  }

  setBP(value: number): void {
    this.registers.set('BP', value & 0xFFFF);
  }

  getSP(): number {
    return this.registers.get('SP') || 0;
  }

  setSP(value: number): void {
    this.registers.set('SP', value & 0xFFFF);
  }

  getRegister(name: string): number {
    return this.registers.get(name.toUpperCase()) || 0;
  }

  setRegister(name: string, value: number): void {
    const regName = name.toUpperCase();
    if (this.registers.has(regName)) {
      this.registers.set(regName, value & 0xFFFF);
    }
  }

  push(value: number): void {
    const sp = this.getSP();
    this.setSP((sp - 2) & 0xFFFF);
  }

  pop(): number {
    const sp = this.getSP();
    this.setSP((sp + 2) & 0xFFFF);
    return 0;
  }
}
