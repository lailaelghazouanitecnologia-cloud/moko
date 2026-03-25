import { IMemory, Memory } from '../memory';
import { Display, IDisplay } from '../display';
import { IKeyboard, Keyboard } from '../keyboard';
import { ITimers, Timers } from '../timers';
import { ICPU, IFlags } from './icpu';

type Instruction = {
  readonly opcode: number;
  readonly mnemonic: string;
  readonly operand?: number;
};

export class CPU implements ICPU {
  readonly registers: Map<string, number>;
  readonly flags: IFlags;
  readonly memory: IMemory;
  pc: number;
  sp: number;
  halted: boolean;
  private readonly internalMemory: Uint8Array;
  private readonly internalRegisters: Uint8Array;
  cycles: number;

  constructor(memory: IMemory) {
    this.registers = new Map<string, number>();
    this.flags = { z: false, n: false, h: false, c: false };
    this.memory = memory;
    this.pc = 0x200;
    this.sp = 0;
    this.halted = false;
    this.cycles = 0;
    this.internalMemory = new Uint8Array(4096);
    this.internalRegisters = new Uint8Array(16);
  }

  fetch(): number {
      try {
        const byte = this.internalMemory[this.pc];
        this.pc = (this.pc + 1) & 0xFFF;
        return byte;
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to fetch: ${message}`);
      }
  }

  decode(opcode: number): Instruction {
      try {
        const high = opcode >> 12;
        const low = opcode & 0x0FFF;
    
        switch (high) {
          case 0x0:
            return low === 0x00E0
              ? { opcode, mnemonic: 'CLS' }
              : low === 0x00EE
              ? { opcode, mnemonic: 'RET' }
              : { opcode, mnemonic: 'SYS', operand: low };
          case 0x1:
            return { opcode, mnemonic: 'JP', operand: low };
          case 0x2:
            return { opcode, mnemonic: 'CALL', operand: low };
          case 0x3:
            return { opcode, mnemonic: 'SE', operand: low & 0x00FF };
          case 0x4:
            return { opcode, mnemonic: 'SNE', operand: low & 0x00FF };
          case 0x5:
            return { opcode, mnemonic: 'SE' };
          case 0x6:
            return { opcode, mnemonic: 'LD', operand: low & 0x00FF };
          case 0x7:
            return { opcode, mnemonic: 'ADD', operand: low & 0x00FF };
          case 0x8:
            return { opcode, mnemonic: 'LOGIC' };
          case 0x9:
            return { opcode, mnemonic: 'SNE' };
          case 0xA:
            return { opcode, mnemonic: 'LD', operand: low };
          case 0xB:
            return { opcode, mnemonic: 'JP', operand: low };
          case 0xC:
            return { opcode, mnemonic: 'RND', operand: low & 0x00FF };
          case 0xD:
            return { opcode, mnemonic: 'DRW', operand: low & 0x000F };
          case 0xE:
            return (low & 0x00FF) === 0x009E
              ? { opcode, mnemonic: 'SKP' }
              : { opcode, mnemonic: 'SKNP' };
          case 0xF:
            return (low & 0x00FF) === 0x0007
              ? { opcode, mnemonic: 'LD' }
              : (low & 0x00FF) === 0x000A
              ? { opcode, mnemonic: 'LD' }
              : (low & 0x00FF) === 0x0015
              ? { opcode, mnemonic: 'LD' }
              : (low & 0x00FF) === 0x0018
              ? { opcode, mnemonic: 'LD' }
              : (low & 0x00FF) === 0x001E
              ? { opcode, mnemonic: 'ADD' }
              : (low & 0x00FF) === 0x0029
              ? { opcode, mnemonic: 'LD' }
              : (low & 0x00FF) === 0x0033
              ? { opcode, mnemonic: 'LD' }
              : (low & 0x00FF) === 0x0055
              ? { opcode, mnemonic: 'LD' }
              : { opcode, mnemonic: 'LD' };
          default:
            return { opcode, mnemonic: 'UNK' };
        }
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to decode: ${message}`);
      }
  }

  execute(inst: Instruction): void {
    switch (inst.mnemonic) {
      case 'CLS':
        this.cycles += 1;
        break;
      case 'RET':
        this.sp--;
        this.pc = this.internalMemory[0x100 + this.sp] << 8 | this.internalMemory[0x100 + this.sp + 1];
        this.cycles += 2;
        break;
      case 'JP':
        this.pc = inst.operand ?? this.pc;
        this.cycles += 1;
        break;
      case 'CALL':
        this.internalMemory[0x100 + this.sp] = (this.pc >> 8) & 0xFF;
        this.internalMemory[0x100 + this.sp + 1] = this.pc & 0xFF;
        this.sp += 2;
        this.pc = inst.operand ?? this.pc;
        this.cycles += 2;
        break;
      case 'SE':
        this.cycles += 1;
        break;
      case 'SNE':
        this.cycles += 1;
        break;
      case 'LD':
        this.cycles += 1;
        break;
      case 'ADD':
        this.cycles += 1;
        break;
      case 'LOGIC':
        this.cycles += 1;
        break;
      case 'DRW':
        this.cycles += 1;
        break;
      case 'SKP':
        this.cycles += 1;
        break;
      case 'SKNP':
        this.cycles += 1;
        break;
      case 'RND':
        this.cycles += 1;
        break;
      case 'SYS':
        this.cycles += 1;
        break;
      default:
        this.cycles += 1;
        break;
    }
  }

  step(): void {
    const opcode = this.fetch();
    const inst = this.decode(opcode);
    this.execute(inst);
  }

  reset(): void {
    this.pc = 0x200;
    this.sp = 0;
    this.halted = false;
    this.cycles = 0;
    this.internalRegisters.fill(0);
    this.registers.clear();
  }

  interrupt(vector: number): void {
    this.internalMemory[0x100 + this.sp] = (this.pc >> 8) & 0xFF;
    this.internalMemory[0x100 + this.sp + 1] = this.pc & 0xFF;
    this.sp += 2;
    this.pc = vector;
  }

  getRegister(reg: number): number {
    return this.internalRegisters[reg & 0xF];
  }

  setRegister(reg: number, val: number): void {
    this.internalRegisters[reg & 0xF] = val & 0xFF;
  }
}
