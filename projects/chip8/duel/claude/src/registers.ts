import { u8, u12, u16 } from './types';

export class Registers {
  V: Uint8Array; // 16×8-bit general-purpose registers
  I: u16;       // 16-bit index register
  DT: u8;       // 8-bit delay timer
  ST: u8;       // 8-bit sound timer
  PC: u12;      // 12-bit program counter
  SP: u8;       // 8-bit stack pointer
  stack: Uint16Array; // 16×16-bit stack

  constructor() {
    this.V = new Uint8Array(16);
    this.I = 0;
    this.DT = 0;
    this.ST = 0;
    this.PC = 0x200; // Chip-8 programs start at 0x200
    this.SP = 0;
    this.stack = new Uint16Array(16);
  }

  reset(): void {
    this.V.fill(0);
    this.I = 0;
    this.DT = 0;
    this.ST = 0;
    this.PC = 0x200;
    this.SP = 0;
    this.stack.fill(0);
  }

  pushStack(addr: u12): void {
    if (this.SP >= 16) throw new Error('Stack overflow');
    this.stack[this.SP] = addr;
    this.SP++;
  }

  popStack(): u12 {
    if (this.SP === 0) throw new Error('Stack underflow');
    this.SP--;
    return this.stack[this.SP] & 0xFFF;
  }
}
