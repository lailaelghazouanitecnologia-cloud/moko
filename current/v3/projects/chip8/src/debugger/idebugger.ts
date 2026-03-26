import { ICpu } from '../cpu';
import { IMemory } from '../memory';

export interface IDebugger {
  step(): void;
  setBreakpoint(addr: number): void;
  clearBreakpoint(): void;
  getState(): object;
  disassemble(opcode: number): string;
}
