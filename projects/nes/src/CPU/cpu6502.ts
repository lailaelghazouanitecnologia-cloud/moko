import { InstructionDecoder } from './instruction-decoder';
import { AddressingMode } from './addressing-mode';
import { RegisterFile } from './register-file';

export class Cpu6502 {
  registers: RegisterFile;
  decoder: InstructionDecoder;
  memory: MemoryBus;
  cycles: number;
  interruptFlags: number;

  constructor(memory: MemoryBus) {
    this.registers = new RegisterFile();
    this.decoder = new InstructionDecoder();
    this.memory = memory;
    this.cycles = 0;
    this.interruptFlags = 0;
  }

  reset(): void {
    this.registers.setPC(this.read(0xFFFC) | (this.read(0xFFFD) << 8));
    this.registers.setSP(0xFD);
    this.registers.setP(0x24);
    this.cycles = 0;
    this.interruptFlags = 0;
  }

  step(): number {
    const opcode = this.fetch();
    const instruction = this.decoder.decode(opcode);
    const addressingMode = this.decoder.getAddressingMode(opcode);
    const baseCycles = this.decoder.getCycles(opcode);
    
    let operand = 0;
    let address = 0;
    
    switch (addressingMode) {
      case AddressingMode.IMMEDIATE:
        operand = this.fetch();
        break;
      case AddressingMode.ZERO_PAGE:
        address = this.fetch();
        operand = this.read(address);
        break;
      case AddressingMode.ZERO_PAGE_X:
        address = (this.fetch() + this.registers.getX()) & 0xFF;
        operand = this.read(address);
        break;
      case AddressingMode.ABSOLUTE:
        address = this.fetchWord();
        operand = this.read(address);
        break;
      case AddressingMode.ABSOLUTE_X:
        address = this.fetchWord() + this.registers.getX();
        operand = this.read(address);
        break;
      case AddressingMode.ABSOLUTE_Y:
        address = this.fetchWord() + this.registers.getY();
        operand = this.read(address);
        break;
      case AddressingMode.INDIRECT_X:
        address = this.read((this.fetch() + this.registers.getX()) & 0xFF);
        break;
      case AddressingMode.INDIRECT_Y:
        address = this.read(this.fetch()) + this.registers.getY();
        operand = this.read(address);
        break;
      case AddressingMode.RELATIVE:
        const offset = this.fetch();
        if (offset & 0x80) {
          address = this.registers.getPC() + offset - 256;
        } else {
          address = this.registers.getPC() + offset;
        }
        break;
    }
    
    this.executeInstruction(instruction, operand, address);
    
    return baseCycles;
  }

  irq(): void {
    if (!this.registers.getInterrupt()) {
      this.pushWord(this.registers.getPC());
      this.push(this.registers.getP() & ~0x10);
      this.registers.setInterrupt(true);
      this.registers.setPC(this.read(0xFFFE) | (this.read(0xFFFF) << 8));
      this.cycles += 7;
    }
  }

  nmi(): void {
    this.pushWord(this.registers.getPC());
    this.push(this.registers.getP() & ~0x10);
    this.registers.setInterrupt(true);
    this.registers.setPC(this.read(0xFFFA) | (this.read(0xFFFB) << 8));
    this.cycles += 7;
  }

  fetch(): number {
    const value = this.read(this.registers.getPC());
    this.registers.incrementPC();
    return value;
  }

  fetchWord(): number {
    const low = this.fetch();
    const high = this.fetch();
    return low | (high << 8);
  }

  push(value: number): void {
    this.write(0x100 + this.registers.getSP(), value);
    this.registers.setSP((this.registers.getSP() - 1) & 0xFF);
  }

  pull(): number {
    this.registers.setSP((this.registers.getSP() + 1) & 0xFF);
    return this.read(0x100 + this.registers.getSP());
  }

  pushWord(value: number): void {
    this.push((value >> 8) & 0xFF);
    this.push(value & 0xFF);
  }

  pullWord(): number {
    const low = this.pull();
    const high = this.pull();
    return low | (high << 8);
  }

  setFlags(value: number): void {
    this.setZero(value === 0);
    this.setNegative((value & 0x80) !== 0);
  }

  setCarry(carry: boolean): void {
    this.registers.setCarry(carry);
  }

  setZero(zero: boolean): void {
    this.registers.setZero(zero);
  }

  setInterrupt(disable: boolean): void {
    this.registers.setInterrupt(disable);
  }

  setDecimal(decimal: boolean): void {
    this.registers.setDecimal(decimal);
  }

  setOverflow(overflow: boolean): void {
    this.registers.setOverflow(overflow);
  }

  setNegative(negative: boolean): void {
    this.registers.setNegative(negative);
  }

  getCarry(): boolean {
    return this.registers.getCarry();
  }

  getZero(): boolean {
    return this.registers.getZero();
  }

  adc(operand: number): void {
    const a = this.registers.getA();
    const carry = this.getCarry() ? 1 : 0;
    const result = a + operand + carry;
    
    this.setCarry(result > 0xFF);
    this.setOverflow(((a ^ result) & (operand ^ result) & 0x80) !== 0);
    this.registers.setA(result & 0xFF);
    this.setFlags(this.registers.getA());
  }

  sbc(operand: number): void {
    const a = this.registers.getA();
    const carry = this.getCarry() ? 0 : 1;
    const result = a - operand - carry;
    
    this.setCarry(result >= 0);
    this.setOverflow(((a ^ result) & ((a ^ operand) & 0x80)) !== 0);
    this.registers.setA(result & 0xFF);
    this.setFlags(this.registers.getA());
  }

  cmp(register: number, operand: number): void {
    const result = register - operand;
    this.setCarry(register >= operand);
    this.setFlags(result & 0xFF);
  }

  branch(condition: boolean): void {
    if (condition) {
      const offset = this.fetch();
      const oldPC = this.registers.getPC();
      if (offset & 0x80) {
        this.registers.setPC(oldPC + offset - 256);
      } else {
        this.registers.setPC(oldPC + offset);
      }
      if ((oldPC & 0xFF00) !== (this.registers.getPC() & 0xFF00)) {
        this.cycles++;
      }
      this.cycles++;
    }
  }

  jump(address: number): void {
    this.registers.setPC(address);
  }

  read(address: number): number {
    return this.memory.read(address);
  }

  write(address: number, value: number): void {
    this.memory.write(address, value);
  }

  private executeInstruction(instruction: Instruction, operand: number, address: number): void {
    switch (instruction) {
      case Instruction.ADC:
        this.adc(operand);
        break;
      case Instruction.SBC:
        this.sbc(operand);
        break;
      case Instruction.CMP:
        this.cmp(this.registers.getA(), operand);
        break;
      case Instruction.CPX:
        this.cmp(this.registers.getX(), operand);
        break;
      case Instruction.CPY:
        this.cmp(this.registers.getY(), operand);
        break;
      case Instruction.BCC:
        this.branch(!this.getCarry());
        break;
      case Instruction.BCS:
        this.branch(this.getCarry());
        break;
      case Instruction.BEQ:
        this.branch(this.getZero());
        break;
      case Instruction.BNE:
        this.branch(!this.getZero());
        break;
      case Instruction.BMI:
        this.branch(this.registers.getNegative());
        break;
      case Instruction.BPL:
        this.branch(!this.registers.getNegative());
        break;
      case Instruction.BVC:
        this.branch(!this.registers.getOverflow());
        break;
      case Instruction.BVS:
        this.branch(this.registers.getOverflow());
        break;
      case Instruction.JMP:
        this.jump(address);
        break;
      case Instruction.LDA:
        this.registers.setA(operand);
        this.setFlags(this.registers.getA());
        break;
      case Instruction.LDX:
        this.registers.setX(operand);
        this.setFlags(this.registers.getX());
        break;
      case Instruction.LDY:
        this.registers.setY(operand);
        this.setFlags(this.registers.getY());
        break;
      case Instruction.STA:
        this.write(address, this.registers.getA());
        break;
      case Instruction.STX:
        this.write(address, this.registers.getX());
        break;
      case Instruction.STY:
        this.write(address, this.registers.getY());
        break;
      case Instruction.TAX:
        this.registers.setX(this.registers.getA());
        this.setFlags(this.registers.getX());
        break;
      case Instruction.TAY:
        this.registers.setY(this.registers.getA());
        this.setFlags(this.registers.getY());
        break;
      case Instruction.TXA:
        this.registers.setA(this.registers.getX());
        this.setFlags(this.registers.getA());
        break;
      case Instruction.TYA:
        this.registers.setA(this.registers.getY());
        this.setFlags(this.registers.getA());
        break;
      case Instruction.TSX:
        this.registers.setX(this.registers.getSP());
        this.setFlags(this.registers.getX());
        break;
      case Instruction.TXS:
        this.registers.setSP(this.registers.getX());
        break;
      case Instruction.INX:
        this.registers.setX((this.registers.getX() + 1) & 0xFF);
        this.setFlags(this.registers.getX());
        break;
      case Instruction.INY:
        this.registers.setY((this.registers.getY() + 1) & 0xFF);
        this.setFlags(this.registers.getY());
        break;
      case Instruction.DEX:
        this.registers.setX((this.registers.getX() - 1) & 0xFF);
        this.setFlags(this.registers.getX());
        break;
      case Instruction.DEY:
        this.registers.setY((this.registers.getY() - 1) & 0xFF);
        this.setFlags(this.registers.getY());
        break;
      case Instruction.CLC:
        this.setCarry(false);
        break;
      case Instruction.CLD:
        this.setDecimal(false);
        break;
      case Instruction.CLI:
        this.setInterrupt(false);
        break;
      case Instruction.CLV:
        this.setOverflow(false);
        break;
      case Instruction.SEC:
        this.setCarry(true);
        break;
      case Instruction.SED:
        this.setDecimal(true);
        break;
      case Instruction.SEI:
        this.setInterrupt(true);
        break;
      case Instruction.PHA:
        this.push(this.registers.getA());
        break;
      case Instruction.PHP:
        this.push(this.registers.getP() | 0x30);
        break;
      case Instruction.PLA:
        this.registers.setA(this.pull());
        this.setFlags(this.registers.getA());
        break;
      case Instruction.PLP:
        this.registers.setP(this.pull());
        break;
      case Instruction.NOP:
        break;
    }
  }
}

enum Instruction {
  ADC, SBC, CMP, CPX, CPY, BCC, BCS, BEQ, BNE, BMI, BPL, BVC, BVS,
  JMP, LDA, LDX, LDY, STA, STX, STY, TAX, TAY, TXA, TYA, TSX, TXS,
  INX, INY, DEX, DEY, CLC, CLD, CLI, CLV, SEC, SED, SEI,
  PHA, PHP, PLA, PLP, NOP
}

interface MemoryBus {
  read(address: number): number;
  write(address: number, value: number): void;
}
