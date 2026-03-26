import { IMemory, Memory } from '../memory'
import { IIo, Io } from '../io'
import { Decoder, IDecoder } from '../decoder'
import { Alu, IAlu } from '../alu'

export enum CpuMode {
  Real = 'real',
  Protected = 'protected'
}

export interface ICpu {
  eax: number
  ebx: number
  ecx: number
  edx: number
  esi: number
  edi: number
}

export class Cpu implements ICpu {
  private readonly registers: Uint32Array
  private readonly segments: Uint16Array
  private _eflags: number
  private _eip: number
  private mode: CpuMode

  constructor() {
    this.registers = new Uint32Array(8)
    this.segments = new Uint16Array(6)
    this._eflags = 0x2
    this._eip = 0
    this.mode = CpuMode.Real
  }

  get eax(): number {
    return this.registers[0]
  }

  set eax(value: number) {
    this.registers[0] = value >>> 0
  }

  get ebx(): number {
    return this.registers[1]
  }

  set ebx(value: number) {
    this.registers[1] = value >>> 0
  }

  get ecx(): number {
    return this.registers[2]
  }

  set ecx(value: number) {
    this.registers[2] = value >>> 0
  }

  get edx(): number {
    return this.registers[3]
  }

  set edx(value: number) {
    this.registers[3] = value >>> 0
  }

  get esi(): number {
    return this.registers[4]
  }

  set esi(value: number) {
    this.registers[4] = value >>> 0
  }

  get edi(): number {
    return this.registers[5]
  }

  set edi(value: number) {
    this.registers[5] = value >>> 0
  }

  get ebp(): number {
    return this.registers[6]
  }

  set ebp(value: number) {
    this.registers[6] = value >>> 0
  }

  get esp(): number {
    return this.registers[7]
  }

  set esp(value: number) {
    this.registers[7] = value >>> 0
  }

  get eip(): number {
    return this._eip
  }

  set eip(value: number) {
    this._eip = value >>> 0
  }

  get eflags(): number {
    return this._eflags
  }

  set eflags(value: number) {
    this._eflags = value >>> 0
  }

  get cs(): number {
    return this.segments[0]
  }

  set cs(value: number) {
    this.segments[0] = value & 0xFFFF
  }

  get ds(): number {
    return this.segments[1]
  }

  set ds(value: number) {
    this.segments[1] = value & 0xFFFF
  }

  get es(): number {
    return this.segments[2]
  }

  set es(value: number) {
    this.segments[2] = value & 0xFFFF
  }

  get fs(): number {
    return this.segments[3]
  }

  set fs(value: number) {
    this.segments[3] = value & 0xFFFF
  }

  get gs(): number {
    return this.segments[4]
  }

  set gs(value: number) {
    this.segments[4] = value & 0xFFFF
  }

  get ss(): number {
    return this.segments[5]
  }

  set ss(value: number) {
    this.segments[5] = value & 0xFFFF
  }

  getRegister(register: number): number {
    if (!Number.isInteger(register) || register < 0 || register >= 8) {
      throw new RangeError('Invalid register index')
    }
    return this.registers[register]
  }

  setRegister(register: number, value: number): void {
    if (!Number.isInteger(register) || register < 0 || register >= 8) {
      throw new RangeError('Invalid register index')
    }
    this.registers[register] = value >>> 0
  }

  getSegment(segment: number): number {
    if (!Number.isInteger(segment) || segment < 0 || segment >= 6) {
      throw new RangeError('Invalid segment index')
    }
    return this.segments[segment]
  }

  setSegment(segment: number, selector: number): void {
    if (!Number.isInteger(segment) || segment < 0 || segment >= 6) {
      throw new RangeError('Invalid segment index')
    }
    this.segments[segment] = selector & 0xFFFF
  }

  getFlag(flag: number): boolean {
    if (!Number.isInteger(flag) || flag < 0 || flag >= 32) {
      throw new RangeError('Invalid flag bit')
    }
    return (this._eflags & (1 << flag)) !== 0
  }

  setFlag(flag: number, value: boolean): void {
    if (!Number.isInteger(flag) || flag < 0 || flag >= 32) {
      throw new RangeError('Invalid flag bit')
    }
    if (value) {
      this._eflags |= (1 << flag)
    } else {
      this._eflags &= ~(1 << flag)
    }
  }

  switchToRealMode(): void {
    this.mode = CpuMode.Real
  }

  switchToProtectedMode(): void {
    this.mode = CpuMode.Protected
  }

  raiseInterrupt(vector: number): void {
    if (!Number.isInteger(vector) || vector < 0 || vector >= 256) {
      throw new RangeError('Invalid interrupt vector')
    }
  }

  raiseException(vector: number, errorCode: number): void {
    if (!Number.isInteger(vector) || vector < 0 || vector >= 256) {
      throw new RangeError('Invalid exception vector')
    }
  }
}
