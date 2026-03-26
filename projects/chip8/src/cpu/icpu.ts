import { Uint8 } from '../input/iinput';

export interface ICpu {
  readonly registers: Uint8Array;
  I: number;
  PC: number;
  SP: Uint8;
  readonly stack: Uint16Array;
  delayTimer: Uint8;
  soundTimer: Uint8;

  fetch(): number;
  decode(opcode: number): { instruction: string; args: unknown[] };
  execute(opcode: number): void;
  step(): boolean;
  reset(): void;
  getRegister(index: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15): Uint8;
  setRegister(index: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15, value: Uint8): void;
  getI(): number;
  setI(value: number): void;
  getPC(): number;
}
