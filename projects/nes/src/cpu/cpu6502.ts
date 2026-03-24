import { Registers } from './registers';
import { Flags } from './flags';
import { MemoryBus } from './memory-bus';

export class CPU6502 {
  registers: Registers = new Registers();
  memory: MemoryBus | null = null;
  cycles: number = 0;
  totalCycles: number = 0;
  stalled: number = 0;

  reset(): void {
    this.registers.PC = this.load(0xFFFC) | (this.load(0xFFFD) << 8);
    this.registers.SP = 0xFD;
    this.registers.P = Flags.I | Flags.U;
    this.cycles = 8;
  }

  irq(): void {
    if (this.registers.P & Flags.I) return;
    this.push16(this.registers.PC);
    this.push(this.registers.P & ~Flags.B);
    this.registers.P |= Flags.I;
    this.registers.PC = this.load(0xFFFE) | (this.load(0xFFFF) << 8);
    this.cycles += 7;
  }

  nmi(): void {
    this.push16(this.registers.PC);
    this.push(this.registers.P & ~Flags.B);
    this.registers.P |= Flags.I;
    this.registers.PC = this.load(0xFFFA) | (this.load(0xFFFB) << 8);
    this.cycles += 7;
  }

  step(): number {
    if (this.stalled > 0) {
      this.stalled--;
      return 1;
    }
    const opcode = this.fetch();
    this.execute(opcode);
    return this.cycles;
  }

  fetch(): number {
    const value = this.load(this.registers.PC);
    this.registers.PC = (this.registers.PC + 1) & 0xFFFF;
    return value;
  }

  fetch16(): number {
    const lo = this.fetch();
    const hi = this.fetch();
    return lo | (hi << 8);
  }

  push(value: number): void {
    this.store(0x100 | this.registers.SP, value);
    this.registers.SP = (this.registers.SP - 1) & 0xFF;
  }

  pull(): number {
    this.registers.SP = (this.registers.SP + 1) & 0xFF;
    return this.load(0x100 | this.registers.SP);
  }

  push16(value: number): void {
    this.push((value >> 8) & 0xFF);
    this.push(value & 0xFF);
  }

  pull16(): number {
    const lo = this.pull();
    const hi = this.pull();
    return lo | (hi << 8);
  }

  setFlags(value: number): void {
    this.setZN(value);
  }

  setZN(value: number): void {
    this.registers.P = (this.registers.P & ~(Flags.Z | Flags.N)) |
      (value === 0 ? Flags.Z : 0) |
      (value & 0x80);
  }

  pageCrossed(a: number, b: number): boolean {
    return (a & 0xFF00) !== (b & 0xFF00);
  }

  branch(offset: number): void {
    const oldPC = this.registers.PC;
    this.registers.PC = (this.registers.PC + (offset < 128 ? offset : offset - 256)) & 0xFFFF;
    if (this.pageCrossed(oldPC, this.registers.PC)) {
      this.cycles++;
    }
    this.cycles++;
  }

  compare(a: number, b: number): void {
    const result = a - b;
    this.registers.P = (this.registers.P & ~(Flags.C | Flags.Z | Flags.N)) |
      (a >= b ? Flags.C : 0) |
      (result === 0 ? Flags.Z : 0) |
      (result & 0x80);
  }

  adc(operand: number): number {
    const sum = this.registers.A + operand + (this.registers.P & Flags.C ? 1 : 0);
    this.registers.P = (this.registers.P & ~(Flags.C | Flags.Z | Flags.V | Flags.N)) |
      (sum > 0xFF ? Flags.C : 0) |
      ((sum & 0xFF) === 0 ? Flags.Z : 0) |
      (((this.registers.A ^ sum) & (operand ^ sum) & 0x80) ? Flags.V : 0) |
      (sum & 0x80);
    return sum & 0xFF;
  }

  sbc(operand: number): number {
    const diff = this.registers.A - operand - (this.registers.P & Flags.C ? 0 : 1);
    this.registers.P = (this.registers.P & ~(Flags.C | Flags.Z | Flags.V | Flags.N)) |
      (diff >= 0 ? Flags.C : 0) |
      ((diff & 0xFF) === 0 ? Flags.Z : 0) |
      (((this.registers.A ^ diff) & ((this.registers.A ^ operand) & 0x80)) ? Flags.V : 0) |
      (diff & 0x80);
    return diff & 0xFF;
  }

  asl(value: number): number {
    this.registers.P = (this.registers.P & ~Flags.C) | ((value >> 7) & 1);
    const result = (value << 1) & 0xFF;
    this.setZN(result);
    return result;
  }

  lsr(value: number): number {
    this.registers.P = (this.registers.P & ~Flags.C) | (value & 1);
    const result = value >> 1;
    this.setZN(result);
    return result;
  }

  rol(value: number): number {
    const carry = this.registers.P & Flags.C ? 1 : 0;
    this.registers.P = (this.registers.P & ~Flags.C) | ((value >> 7) & 1);
    const result = ((value << 1) | carry) & 0xFF;
    this.setZN(result);
    return result;
  }

  ror(value: number): number {
    const carry = this.registers.P & Flags.C ? 0x80 : 0;
    this.registers.P = (this.registers.P & ~Flags.C) | (value & 1);
    const result = (value >> 1) | carry;
    this.setZN(result);
    return result;
  }

  bit(value: number): void {
    this.registers.P = (this.registers.P & ~(Flags.Z | Flags.V | Flags.N)) |
      ((this.registers.A & value) === 0 ? Flags.Z : 0) |
      (value & Flags.V) |
      (value & Flags.N);
  }

  load(addr: number): number {
    return this.memory ? this.memory.read(addr) : 0;
  }

  store(addr: number, value: number): void {
    if (this.memory) this.memory.write(addr, value);
  }

  private execute(opcode: number): void {
    // Minimal decode stub; full decode table would go here
    switch (opcode) {
      case 0x00: // BRK
        this.push16(this.registers.PC);
        this.push(this.registers.P | Flags.B);
        this.registers.P |= Flags.I;
        this.registers.PC = this.load(0xFFFE) | (this.load(0xFFFF) << 8);
        this.cycles += 7;
        break;
      default:
        this.cycles += 2;
    }
  }
}
