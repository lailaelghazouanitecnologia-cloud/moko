import { Memory } from './memory';
import { Registers } from './registers';
import { Stack } from './stack';
import { Keyboard } from './keyboard';
import { Display } from './display';
import { Instruction, decode } from './instruction';

export type u8 = number;
export type u12 = number;
export type u16 = number;
export type Word = u16;

export class CPU {
  private memory: Memory;
  private registers: Registers;
  private stack: Stack;
  private keyboard: Keyboard;
  private display: Display;
  private halted: boolean = false;

  constructor(memory: Memory, registers: Registers, stack: Stack, keyboard: Keyboard, display: Display) {
    this.memory = memory;
    this.registers = registers;
    this.stack = stack;
    this.keyboard = keyboard;
    this.display = display;
  }

  public reset(): void {
    this.halted = false;
    this.registers.PC = 0x200;
    this.registers.SP = 0;
    this.registers.I = 0;
    this.registers.DT = 0;
    this.registers.ST = 0;
  }

  public tick(): void {
    if (this.halted) return;

    const opcode = this.fetch();
    const instruction = decode(opcode);
    this.execute(instruction);

    if (this.registers.DT > 0) {
      this.registers.DT--;
    }

    if (this.registers.ST > 0) {
      this.registers.ST--;
    }
  }

  private fetch(): Word {
    const pc = this.registers.PC;
    const high = this.memory.read(pc);
    const low = this.memory.read(pc + 1);
    this.registers.PC += 2;
    return (high << 8) | low;
  }

  private execute(instruction: Instruction): void {
    switch (instruction.type) {
      case 'CLS':
        this.display.clear();
        break;

      case 'RET':
        this.registers.PC = this.stack.pop();
        break;

      case 'SYS':
        break;

      case 'JP_ADDR':
        this.registers.PC = instruction.addr;
        break;

      case 'CALL_ADDR':
        this.stack.push(this.registers.PC);
        this.registers.PC = instruction.addr;
        break;

      case 'SE_VX_BYTE':
        if (this.registers.V[instruction.x] === instruction.byte) {
          this.registers.PC += 2;
        }
        break;

      case 'SNE_VX_BYTE':
        if (this.registers.V[instruction.x] !== instruction.byte) {
          this.registers.PC += 2;
        }
        break;

      case 'SE_VX_VY':
        if (this.registers.V[instruction.x] === this.registers.V[instruction.y]) {
          this.registers.PC += 2;
        }
        break;

      case 'LD_VX_BYTE':
        this.registers.V[instruction.x] = instruction.byte;
        break;

      case 'ADD_VX_BYTE':
        this.registers.V[instruction.x] += instruction.byte;
        break;

      case 'LD_VX_VY':
        this.registers.V[instruction.x] = this.registers.V[instruction.y];
        break;

      case 'OR_VX_VY':
        this.registers.V[instruction.x] |= this.registers.V[instruction.y];
        break;

      case 'AND_VX_VY':
        this.registers.V[instruction.x] &= this.registers.V[instruction.y];
        break;

      case 'XOR_VX_VY':
        this.registers.V[instruction.x] ^= this.registers.V[instruction.y];
        break;

      case 'ADD_VX_VY':
        const sum = this.registers.V[instruction.x] + this.registers.V[instruction.y];
        this.registers.V[0xF] = sum > 0xFF ? 1 : 0;
        this.registers.V[instruction.x] = sum & 0xFF;
        break;

      case 'SUB_VX_VY':
        this.registers.V[0xF] = this.registers.V[instruction.x] > this.registers.V[instruction.y] ? 1 : 0;
        this.registers.V[instruction.x] -= this.registers.V[instruction.y];
        break;

      case 'SHR_VX':
        this.registers.V[0xF] = this.registers.V[instruction.x] & 0x1;
        this.registers.V[instruction.x] >>= 1;
        break;

      case 'SUBN_VX_VY':
        this.registers.V[0xF] = this.registers.V[instruction.y] > this.registers.V[instruction.x] ? 1 : 0;
        this.registers.V[instruction.x] = this.registers.V[instruction.y] - this.registers.V[instruction.x];
        break;

      case 'SHL_VX':
        this.registers.V[0xF] = (this.registers.V[instruction.x] >> 7) & 0x1;
        this.registers.V[instruction.x] = (this.registers.V[instruction.x] << 1) & 0xFF;
        break;

      case 'SNE_VX_VY':
        if (this.registers.V[instruction.x] !== this.registers.V[instruction.y]) {
          this.registers.PC += 2;
        }
        break;

      case 'LD_I_ADDR':
        this.registers.I = instruction.addr;
        break;

      case 'JP_V0_ADDR':
        this.registers.PC = instruction.addr + this.registers.V[0];
        break;

      case 'RND_VX_BYTE':
        this.registers.V[instruction.x] = Math.floor(Math.random() * 0x100) & instruction.byte;
        break;

      case 'DRW_VX_VY_NIBBLE':
        const x = this.registers.V[instruction.x] % this.display.width;
        const y = this.registers.V[instruction.y] % this.display.height;
        const sprite = new Uint8Array(instruction.nibble);
        for (let i = 0; i < instruction.nibble; i++) {
          sprite[i] = this.memory.read(this.registers.I + i);
        }
        this.registers.V[0xF] = this.display.draw(x, y, sprite) ? 1 : 0;
        break;

      case 'SKP_VX':
        if (this.keyboard.isKeyPressed(this.registers.V[instruction.x])) {
          this.registers.PC += 2;
        }
        break;

      case 'SKNP_VX':
        if (!this.keyboard.isKeyPressed(this.registers.V[instruction.x])) {
          this.registers.PC += 2;
        }
        break;

      case 'LD_VX_DT':
        this.registers.V[instruction.x] = this.registers.DT;
        break;

      case 'LD_VX_K':
        const key = this.keyboard.waitForKey();
        if (key === null) {
          this.registers.PC -= 2;
        } else {
          this.registers.V[instruction.x] = key;
        }
        break;

      case 'LD_DT_VX':
        this.registers.DT = this.registers.V[instruction.x];
        break;

      case 'LD_ST_VX':
        this.registers.ST = this.registers.V[instruction.x];
        break;

      case 'ADD_I_VX':
        this.registers.I += this.registers.V[instruction.x];
        break;

      case 'LD_F_VX':
        this.registers.I = this.registers.V[instruction.x] * 5;
        break;

      case 'LD_B_VX':
        const val = this.registers.V[instruction.x];
        this.memory.write(this.registers.I, Math.floor(val / 100));
        this.memory.write(this.registers.I + 1, Math.floor((val % 100) / 10));
        this.memory.write(this.registers.I + 2, val % 10);
        break;

      case 'LD_I_VX':
        for (let i = 0; i <= instruction.x; i++) {
          this.memory.write(this.registers.I + i, this.registers.V[i]);
        }
        break;

      case 'LD_VX_I':
        for (let i = 0; i <= instruction.x; i++) {
          this.registers.V[i] = this.memory.read(this.registers.I + i);
        }
        break;

      default:
        throw new Error(`Unknown instruction: ${instruction.type}`);
    }
  }

  public isHalted(): boolean {
    return this.halted;
  }

  public halt(): void {
    this.halted = true;
  }

  public resume(): void {
    this.halted = false;
  }
}
