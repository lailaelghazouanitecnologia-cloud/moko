import { RegisterBank } from './register-bank';
import { Stack } from './stack';
import { InstructionDecoder } from './instruction-decoder';

export class Cpu {
  private registers: RegisterBank;
  private stack: Stack;
  private decoder: InstructionDecoder;
  private memory: Uint8Array;
  private pc: number;
  private i: number;
  private delayTimer: number;
  private soundTimer: number;
  private halted: boolean;

  constructor() {
    this.registers = new RegisterBank();
    this.stack = new Stack();
    this.decoder = new InstructionDecoder();
    this.memory = new Uint8Array(4096);
    this.pc = 0x200;
    this.i = 0;
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.halted = false;
  }

  reset(): void {
    this.registers = new RegisterBank();
    this.stack = new Stack();
    this.decoder = new InstructionDecoder();
    this.memory = new Uint8Array(4096);
    this.pc = 0x200;
    this.i = 0;
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.halted = false;
  }

  cycle(): void {
    if (this.halted) return;
    
    const opcode = this.fetch();
    this.execute(opcode);
    this.updateTimers();
  }

  fetch(): number {
    const high = this.memory[this.pc] << 8;
    const low = this.memory[this.pc + 1];
    this.pc += 2;
    return high | low;
  }

  execute(opcode: number): void {
    const nibble = (opcode & 0xF000) >> 12;
    
    switch (nibble) {
      case 0x0:
        if (opcode === 0x00E0) {
          this.handleClear();
        } else if (opcode === 0x00EE) {
          this.handleReturn();
        } else {
          this.handleSys(opcode);
        }
        break;
      case 0x1:
        this.handleJump(opcode);
        break;
      case 0x2:
        this.handleCall(opcode);
        break;
      case 0x3:
        this.handleSkipEqual(opcode);
        break;
      case 0x4:
        this.handleSkipNotEqual(opcode);
        break;
      case 0x5:
        this.handleSkipRegEqual(opcode);
        break;
      case 0x6:
        this.handleLoad(opcode);
        break;
      case 0x7:
        this.handleAdd(opcode);
        break;
      case 0x8:
        const subOp = opcode & 0x000F;
        switch (subOp) {
          case 0x0:
            this.handleAssign(opcode);
            break;
          case 0x1:
            this.handleOr(opcode);
            break;
          case 0x2:
            this.handleAnd(opcode);
            break;
          case 0x3:
            this.handleXor(opcode);
            break;
          case 0x4:
            this.handleAddReg(opcode);
            break;
          case 0x5:
            this.handleSub(opcode);
            break;
          case 0x6:
            this.handleShiftRight(opcode);
            break;
          case 0x7:
            this.handleSubReverse(opcode);
            break;
          case 0xE:
            this.handleShiftLeft(opcode);
            break;
        }
        break;
      case 0x9:
        this.handleSkipRegNotEqual(opcode);
        break;
      case 0xA:
        this.handleLoadI(opcode);
        break;
      case 0xB:
        this.handleJumpOffset(opcode);
        break;
      case 0xC:
        this.handleRandom(opcode);
        break;
      case 0xD:
        this.handleDraw(opcode);
        break;
      case 0xE:
        const eSubOp = opcode & 0x00FF;
        if (eSubOp === 0x9E) {
          this.handleSkipKey(opcode);
        } else if (eSubOp === 0xA1) {
          this.handleSkipNotKey(opcode);
        }
        break;
      case 0xF:
        const fSubOp = opcode & 0x00FF;
        switch (fSubOp) {
          case 0x07:
            this.handleLoadDelay(opcode);
            break;
          case 0x0A:
            this.handleWaitKey(opcode);
            break;
          case 0x15:
            this.handleSetDelay(opcode);
            break;
          case 0x18:
            this.handleSetSound(opcode);
            break;
          case 0x1E:
            this.handleAddI(opcode);
            break;
          case 0x29:
            this.handleFont(opcode);
            break;
          case 0x33:
            this.handleBCD(opcode);
            break;
          case 0x55:
            this.handleStore(opcode);
            break;
          case 0x65:
            this.handleLoadMem(opcode);
            break;
        }
        break;
    }
  }

  updateTimers(): void {
    if (this.delayTimer > 0) {
      this.delayTimer--;
    }
    if (this.soundTimer > 0) {
      this.soundTimer--;
    }
  }

  loadProgram(data: Uint8Array, offset: number = 0x200): void {
    for (let i = 0; i < data.length; i++) {
      this.memory[offset + i] = data[i];
    }
  }

  getOpcodeName(opcode: number): string {
    const nibble = (opcode & 0xF000) >> 12;
    
    switch (nibble) {
      case 0x0:
        if (opcode === 0x00E0) return 'CLS';
        if (opcode === 0x00EE) return 'RET';
        return 'SYS';
      case 0x1:
        return 'JP';
      case 0x2:
        return 'CALL';
      case 0x3:
        return 'SE';
      case 0x4:
        return 'SNE';
      case 0x5:
        return 'SE';
      case 0x6:
        return 'LD';
      case 0x7:
        return 'ADD';
      case 0x8:
        const subOp = opcode & 0x000F;
        switch (subOp) {
          case 0x0: return 'LD';
          case 0x1: return 'OR';
          case 0x2: return 'AND';
          case 0x3: return 'XOR';
          case 0x4: return 'ADD';
          case 0x5: return 'SUB';
          case 0x6: return 'SHR';
          case 0x7: return 'SUBN';
          case 0xE: return 'SHL';
        }
        break;
      case 0x9:
        return 'SNE';
      case 0xA:
        return 'LD';
      case 0xB:
        return 'JP';
      case 0xC:
        return 'RND';
      case 0xD:
        return 'DRW';
      case 0xE:
        const eSubOp = opcode & 0x00FF;
        if (eSubOp === 0x9E) return 'SKP';
        if (eSubOp === 0xA1) return 'SKNP';
        break;
      case 0xF:
        const fSubOp = opcode & 0x00FF;
        switch (fSubOp) {
          case 0x07: return 'LD';
          case 0x0A: return 'LD';
          case 0x15: return 'LD';
          case 0x18: return 'LD';
          case 0x1E: return 'ADD';
          case 0x29: return 'LD';
          case 0x33: return 'LD';
          case 0x55: return 'LD';
          case 0x65: return 'LD';
        }
        break;
    }
    return 'UNKNOWN';
  }

  handleSys(opcode: number): void {
    // System call - not implemented in most Chip-8 interpreters
  }

  handleClear(): void {
    // Clear display - implementation depends on graphics system
  }

  handleReturn(): void {
    this.pc = this.stack.pop();
  }

  handleJump(opcode: number): void {
    const address = opcode & 0x0FFF;
    this.pc = address;
  }

  handleCall(opcode: number): void {
    const address = opcode & 0x0FFF;
    this.stack.push(this.pc);
    this.pc = address;
  }

  handleSkipEqual(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const nn = opcode & 0x00FF;
    if (this.registers.get(x) === nn) {
      this.pc += 2;
    }
  }

  handleSkipNotEqual(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const nn = opcode & 0x00FF;
    if (this.registers.get(x) !== nn) {
      this.pc += 2;
    }
  }

  handleSkipRegEqual(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    if (this.registers.get(x) === this.registers.get(y)) {
      this.pc += 2;
    }
  }

  handleLoad(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const nn = opcode & 0x00FF;
    this.registers.set(x, nn);
  }

  handleAdd(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const nn = opcode & 0x00FF;
    this.registers.set(x, (this.registers.get(x) + nn) & 0xFF);
  }

  handleAssign(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    this.registers.set(x, this.registers.get(y));
  }

  handleOr(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    this.registers.set(x, this.registers.get(x) | this.registers.get(y));
  }

  handleAnd(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    this.registers.set(x, this.registers.get(x) & this.registers.get(y));
  }

  handleXor(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    this.registers.set(x, this.registers.get(x) ^ this.registers.get(y));
  }

  handleAddReg(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    const sum = this.registers.get(x) + this.registers.get(y);
    this.registers.set(x, sum & 0xFF);
    this.registers.set(0xF, sum > 255 ? 1 : 0);
  }

  handleSub(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    const vx = this.registers.get(x);
    const vy = this.registers.get(y);
    this.registers.set(x, (vx - vy) & 0xFF);
    this.registers.set(0xF, vx > vy ? 1 : 0);
  }

  handleShiftRight(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const vx = this.registers.get(x);
    this.registers.set(x, vx >> 1);
    this.registers.set(0xF, vx & 0x1);
  }

  handleSubReverse(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    const vx = this.registers.get(x);
    const vy = this.registers.get(y);
    this.registers.set(x, (vy - vx) & 0xFF);
    this.registers.set(0xF, vy > vx ? 1 : 0);
  }

  handleShiftLeft(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const vx = this.registers.get(x);
    this.registers.set(x, (vx << 1) & 0xFF);
    this.registers.set(0xF, (vx >> 7) & 0x1);
  }

  handleSkipRegNotEqual(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    if (this.registers.get(x) !== this.registers.get(y)) {
      this.pc += 2;
    }
  }

  handleLoadI(opcode: number): void {
    this.i = opcode & 0x0FFF;
  }

  handleJumpOffset(opcode: number): void {
    const address = opcode & 0x0FFF;
    this.pc = address + this.registers.get(0);
  }

  handleRandom(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const nn = opcode & 0x00FF;
    const random = Math.floor(Math.random() * 256);
    this.registers.set(x, random & nn);
  }

  handleDraw(opcode: number): void {
    // Draw sprite - implementation depends on graphics system
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    const n = opcode & 0x000F;
    // Sprite drawing logic would go here
  }

  handleSkipKey(opcode: number): void {
    // Skip if key pressed - implementation depends on input system
    const x = (opcode & 0x0F00) >> 8;
    // Key checking logic would go here
  }

  handleSkipNotKey(opcode: number): void {
    // Skip if key not pressed - implementation depends on input system
    const x = (opcode & 0x0F00) >> 8;
    // Key checking logic would go here
  }

  handleLoadDelay(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    this.registers.set(x, this.delayTimer);
  }

  handleWaitKey(opcode: number): void {
    // Wait for key press - implementation depends on input system
    const x = (opcode & 0x0F00) >> 8;
    // Key waiting logic would go here
  }

  handleSetDelay(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    this.delayTimer = this.registers.get(x);
  }

  handleSetSound(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    this.soundTimer = this.registers.get(x);
  }

  handleAddI(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    this.i += this.registers.get(x);
  }

  handleFont(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    this.i = this.registers.get(x) * 5;
  }

  handleBCD(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    const vx = this.registers.get(x);
    this.memory[this.i] = Math.floor(vx / 100);
    this.memory[this.i + 1] = Math.floor((vx % 100) / 10);
    this.memory[this.i + 2] = vx % 10;
  }

  handleStore(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    for (let j = 0; j <= x; j++) {
      this.memory[this.i + j] = this.registers.get(j);
    }
  }

  handleLoadMem(opcode: number): void {
    const x = (opcode & 0x0F00) >> 8;
    for (let j = 0; j <= x; j++) {
      this.registers.set(j, this.memory[this.i + j]);
    }
  }
}
