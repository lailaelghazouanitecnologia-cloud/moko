private runtime: VMRuntime;
  private currentInstruction: Instruction;
  private cycleCount: number;

  constructor(runtime: VMRuntime) {
    this.runtime = runtime;
    this.currentInstruction = {} as Instruction;
    this.cycleCount = 0;
  }

  execute(instruction: Instruction): void {
    this.currentInstruction = instruction;
    this.cycleCount++;

    const opcode = instruction.opcode;
    const operands = instruction.operands || [];

    switch (instruction.type) {
      case 'arithmetic':
        this.executeArithmetic(opcode, operands);
        break;
      case 'logical':
        this.executeLogical(opcode, operands);
        break;
      case 'control':
        this.executeControl(opcode, operands);
        break;
      case 'memory':
        this.executeMemory(opcode, operands);
        break;
      case 'io':
        this.executeIO(opcode, operands);
        break;
      default:
        throw new Error(`Unknown instruction type: ${instruction.type}`);
    }
  }

  executeArithmetic(opcode: number, operands: Operand[]): void {
    const alu = this.runtime.alu;
    const regBank = this.runtime.cpu;

    switch (opcode) {
      case 0x00: // ADD
        if (operands.length === 2) {
          const src = this.resolveOperand(operands[0]);
          const dst = this.resolveOperand(operands[1]);
          const result = alu.add(src, dst);
          this.writeOperand(operands[1], result);
          this.updateFlags(result, 0);
        }
        break;
      case 0x01: // SUB
        if (operands.length === 2) {
          const src = this.resolveOperand(operands[0]);
          const dst = this.resolveOperand(operands[1]);
          const result = alu.sub(dst, src);
          this.writeOperand(operands[1], result);
          this.updateFlags(result, 0);
        }
        break;
      case 0x02: // INC
        if (operands.length === 1) {
          const value = this.resolveOperand(operands[0]);
          const result = alu.inc(value);
          this.writeOperand(operands[0], result);
          this.updateFlags(result, 0);
        }
        break;
      case 0x03: // DEC
        if (operands.length === 1) {
          const value = this.resolveOperand(operands[0]);
          const result = alu.dec(value);
          this.writeOperand(operands[0], result);
          this.updateFlags(result, 0);
        }
        break;
      default:
        throw new Error(`Unknown arithmetic opcode: 0x${opcode.toString(16)}`);
    }
  }

  executeLogical(opcode: number, operands: Operand[]): void {
    const alu = this.runtime.alu;

    switch (opcode) {
      case 0x20: // AND
        if (operands.length === 2) {
          const src = this.resolveOperand(operands[0]);
          const dst = this.resolveOperand(operands[1]);
          const result = alu.and(src, dst);
          this.writeOperand(operands[1], result);
          this.updateFlags(result, 0);
        }
        break;
      case 0x21: // OR
        if (operands.length === 2) {
          const src = this.resolveOperand(operands[0]);
          const dst = this.resolveOperand(operands[1]);
          const result = src | dst;
          this.writeOperand(operands[1], result);
          this.updateFlags(result, 0);
        }
        break;
      case 0x22: // XOR
        if (operands.length === 2) {
          const src = this.resolveOperand(operands[0]);
          const dst = this.resolveOperand(operands[1]);
          const result = src ^ dst;
          this.writeOperand(operands[1], result);
          this.updateFlags(result, 0);
        }
        break;
      case 0x23: // NOT
        if (operands.length === 1) {
          const value = this.resolveOperand(operands[0]);
          const result = ~value & 0xFFFF;
          this.writeOperand(operands[0], result);
          this.updateFlags(result, 0);
        }
        break;
      default:
        throw new Error(`Unknown logical opcode: 0x${opcode.toString(16)}`);
    }
  }

  executeControl(opcode: number, operands: Operand[]): void {
    switch (opcode) {
      case 0x40: // JMP
        if (operands.length === 1) {
          const target = this.resolveOperand(operands[0]);
          this.runtime.instructionPointer = target;
        }
        break;
      case 0x41: // JZ
        if (operands.length === 1) {
          const flags = this.runtime.cpu.getAX() >> 8;
          if (flags & 0x40) {
            const target = this.resolveOperand(operands[0]);
            this.runtime.instructionPointer = target;
          }
        }
        break;
      case 0x42: // JNZ
        if (operands.length === 1) {
          const flags = this.runtime.cpu.getAX() >> 8;
          if (!(flags & 0x40)) {
            const target = this.resolveOperand(operands[0]);
            this.runtime.instructionPointer = target;
          }
        }
        break;
      case 0x43: // CALL
        if (operands.length === 1) {
          const target = this.resolveOperand(operands[0]);
          const returnAddr = this.runtime.instructionPointer;
          this.runtime.memory.writeWord(this.runtime.cpu.getAX() - 2, returnAddr);
          this.runtime.cpu.setAX(this.runtime.cpu.getAX() - 2);
          this.runtime.instructionPointer = target;
        }
        break;
      case 0x44: // RET
        const returnAddr = this.runtime.memory.readWord(this.runtime.cpu.getAX());
        this.runtime.cpu.setAX(this.runtime.cpu.getAX() + 2);
        this.runtime.instructionPointer = returnAddr;
        break;
      default:
        throw new Error(`Unknown control opcode: 0x${opcode.toString(16)}`);
    }
  }

  executeMemory(opcode: number, operands: Operand[]): void {
    const memory = this.runtime.memory;

    switch (opcode) {
      case 0x60: // MOV
        if (operands.length === 2) {
          const src = this.resolveOperand(operands[0]);
          this.writeOperand(operands[1], src);
        }
        break;
      case 0x61: // PUSH
        if (operands.length === 1) {
          const value = this.resolveOperand(operands[0]);
          this.runtime.cpu.setAX(this.runtime.cpu.getAX() - 2);
          memory.writeWord(this.runtime.cpu.getAX(), value);
        }
        break;
      case 0x62: // POP
        if (operands.length === 1) {
          const value = memory.readWord(this.runtime.cpu.getAX());
          this.writeOperand(operands[0], value);
          this.runtime.cpu.setAX(this.runtime.cpu.getAX() + 2);
        }
        break;
      case 0x63: // LEA
        if (operands.length === 2) {
          const addr = this.calculateEffectiveAddress(operands[0]);
          this.writeOperand(operands[1], addr);
        }
        break;
      default:
        throw new Error(`Unknown memory opcode: 0x${opcode.toString(16)}`);
    }
  }

  executeIO(opcode: number, operands: Operand[]): void {
    const io = this.runtime.io;

    switch (opcode) {
      case 0x80: // IN
        if (operands.length === 2) {
          const port = this.resolveOperand(operands[0]);
          const value = io.readPort(port);
          this.writeOperand(operands[1], value);
        }
        break;
      case 0x81: // OUT
        if (operands.length === 2) {
          const port = this.resolveOperand(operands[0]);
          const value = this.resolveOperand(operands[1]);
          io.writePort(port, value);
        }
        break;
      default:
        throw new Error(`Unknown I/O opcode: 0x${opcode.toString(16)}`);
    }
  }

  updateFlags(result: number, flags: number): void {
    const regBank = this.runtime.cpu;
    const currentFlags = regBank.getAX() >> 8;
    let newFlags = currentFlags & 0xFF00;

    if (result === 0) newFlags |= 0x40;
    if (result & 0x8000) newFlags |= 0x80;
    if (result > 0xFFFF) newFlags |= 0x01;

    regBank.setAX((regBank.getAX() & 0x00FF) | (newFlags << 8));
  }

  calculateJumpTarget(offset: number): number {
    return this.runtime.instructionPointer + offset;
  }

  handleInterrupt(vector: number): void {
    const interruptAddr = vector * 4;
    const handlerAddr = this.runtime.memory.readWord(interruptAddr);
    
    this.runtime.memory.writeWord(this.runtime.cpu.getAX() - 2, this.runtime.cpu.getAX());
    this.runtime.memory.writeWord(this.runtime.cpu.getAX() - 4, this.runtime.instructionPointer);
    this.runtime.cpu.setAX(this.runtime.cpu.getAX() - 4);
    
    this.runtime.instructionPointer = handlerAddr;
  }

  private resolveOperand(operand: Operand): number {
    switch (operand.type) {
      case 'register':
        return this.runtime.cpu.getAX();
      case 'immediate':
        return operand.value;
      case 'memory':
        return this.runtime.memory.read(operand.address);
      default:
        throw new Error(`Unknown operand type: ${operand.type}`);
    }
  }

  private writeOperand(operand: Operand, value: number): void {
    switch (operand.type) {
      case 'register':
        this.runtime.cpu.setAX(value);
        break;
      case 'memory':
        this.runtime.memory.write(operand.address, value);
        break;
      default:
        throw new Error(`Cannot write to operand type: ${operand.type}`);
    }
  }

  private calculateEffectiveAddress(operand: Operand): number {
    if (operand.type === 'memory') {
      return operand.address;
    }
    throw new Error('Invalid addressing mode');
  }
}

interface Instruction {
  opcode: number;
  type: string;
  operands?: Operand[];
}

interface Operand {
  type: string;
  value?: number;
  address?: number;
}
