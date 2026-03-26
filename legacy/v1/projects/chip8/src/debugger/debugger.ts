import { Cpu, ICpu } from '../cpu';
import { IMemory, Memory } from '../memory';
import { IDebugger } from './idebugger';

type Uint8 = number;
type Uint16 = number;

export class Debugger implements IDebugger {
  private readonly cpu: ICpu;
  private readonly memory: IMemory;
  private breakpoint: Uint16 | null = null;

  constructor(cpu: ICpu, memory: IMemory) {
    this.cpu = cpu;
    this.memory = memory;
  }

  step(): void {
    this.cpu.step();
  }

  setBreakpoint(addr: number): void {
    this.breakpoint = addr;
  }

  clearBreakpoint(): void {
    this.breakpoint = null;
  }

  getState(): object {
    return {
      v: this.cpu.v,
      i: this.cpu.i,
      pc: this.cpu.pc,
      sp: this.cpu.sp,
      stack: this.cpu.stack
    };
  }

  disassemble(opcode: number): string {
    const nibble = (opcode & 0xF000) >> 12;
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    const n = opcode & 0x000F;
    const nn = opcode & 0x00FF;
    const nnn = opcode & 0x0FFF;

    switch (nibble) {
      case 0x0:
        return nn === 0xE0 ? 'CLS' : nn === 0xEE ? 'RET' : `SYS ${nnn.toString(16).toUpperCase()}`;
      case 0x1:
        return `JP ${nnn.toString(16).toUpperCase()}`;
      case 0x2:
        return `CALL ${nnn.toString(16).toUpperCase()}`;
      case 0x3:
        return `SE V${x.toString(16).toUpperCase()}, ${nn}`;
      case 0x4:
        return `SNE V${x.toString(16).toUpperCase()}, ${nn}`;
      case 0x5:
        return `SE V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`;
      case 0x6:
        return `LD V${x.toString(16).toUpperCase()}, ${nn}`;
      case 0x7:
        return `ADD V${x.toString(16).toUpperCase()}, ${nn}`;
      case 0x8:
        switch (n) {
          case 0x0: return `LD V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`;
          case 0x1: return `OR V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`;
          case 0x2: return `AND V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`;
          case 0x3: return `XOR V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`;
          case 0x4: return `ADD V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`;
          case 0x5: return `SUB V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`;
          case 0x6: return `SHR V${x.toString(16).toUpperCase()}`;
          case 0x7: return `SUBN V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`;
          case 0xE: return `SHL V${x.toString(16).toUpperCase()}`;
        }
        break;
      case 0x9:
        return `SNE V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`;
      case 0xA:
        return `LD I, ${nnn.toString(16).toUpperCase()}`;
      case 0xB:
        return `JP V0, ${nnn.toString(16).toUpperCase()}`;
      case 0xC:
        return `RND V${x.toString(16).toUpperCase()}, ${nn}`;
      case 0xD:
        return `DRW V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}, ${n}`;
      case 0xE:
        return nn === 0x9E ? `SKP V${x.toString(16).toUpperCase()}` : `SKNP V${x.toString(16).toUpperCase()}`;
      case 0xF:
        switch (nn) {
          case 0x07: return `LD V${x.toString(16).toUpperCase()}, DT`;
          case 0x0A: return `LD V${x.toString(16).toUpperCase()}, K`;
          case 0x15: return `LD DT, V${x.toString(16).toUpperCase()}`;
          case 0x18: return `LD ST, V${x.toString(16).toUpperCase()}`;
          case 0x1E: return `ADD I, V${x.toString(16).toUpperCase()}`;
          case 0x29: return `LD F, V${x.toString(16).toUpperCase()}`;
          case 0x33: return `LD B, V${x.toString(16).toUpperCase()}`;
          case 0x55: return `LD [I], V${x.toString(16).toUpperCase()}`;
          case 0x65: return `LD V${x.toString(16).toUpperCase()}, [I]`;
        }
    }
    return `UNK ${opcode.toString(16).toUpperCase()}`;
  }

  getMemory(start: number, length: number): Uint8Array {
    return this.memory.ram.slice(start, start + length);
  }

  getStack(): Uint16Array {
    return this.cpu.stack.slice(0, this.cpu.sp + 1);
  }

  getTimers(): { delay: Uint8; sound: Uint8 } {
    return { delay: 0, sound: 0 };
  }
}
