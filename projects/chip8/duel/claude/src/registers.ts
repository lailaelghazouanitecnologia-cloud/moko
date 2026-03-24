import { u8, u12, u16 } from './types';

export class Registers {
  private _v: Uint8Array; // 16 general-purpose 8-bit registers (V0-VF)
  private _i: u16;       // 16-bit index register
  private _dt: u8;       // 8-bit delay timer
  private _st: u8;       // 8-bit sound timer
  private _pc: u12;      // 12-bit program counter
  private _sp: u8;       // 8-bit stack pointer

  constructor() {
    this._v = new Uint8Array(16);
    this._i = 0;
    this._dt = 0;
    this._st = 0;
    this._pc = 0x200; // Chip-8 programs start at 0x200
    this._sp = 0;
  }

  // General-purpose registers
  getV(index: u8): u8 {
    if (index > 15) throw new Error('Register index out of range');
    return this._v[index];
  }

  setV(index: u8, value: u8): void {
    if (index > 15) throw new Error('Register index out of range');
    this._v[index] = value & 0xFF;
  }

  // Index register
  get I(): u16 {
    return this._i;
  }

  set I(value: u16) {
    this._i = value & 0xFFFF;
  }

  // Delay timer
  get DT(): u8 {
    return this._dt;
  }

  set DT(value: u8) {
    this._dt = value & 0xFF;
  }

  // Sound timer
  get ST(): u8 {
    return this._st;
  }

  set ST(value: u8) {
    this._st = value & 0xFF;
  }

  // Program counter
  get PC(): u12 {
    return this._pc;
  }

  set PC(value: u12) {
    this._pc = value & 0xFFF;
  }

  // Stack pointer
  get SP(): u8 {
    return this._sp;
  }

  set SP(value: u8) {
    this._sp = value & 0xFF;
  }

  // Convenience methods
  reset(): void {
    this._v.fill(0);
    this._i = 0;
    this._dt = 0;
    this._st = 0;
    this._pc = 0x200;
    this._sp = 0;
  }
}
