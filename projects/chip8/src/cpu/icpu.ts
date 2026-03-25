import { IMemory } from '../memory';

export interface IFlags {
  readonly z: boolean;
  readonly n: boolean;
  readonly h: boolean;
  readonly c: boolean;
}

export interface IInstruction {
  readonly opcode: number;
  readonly mnemonic: string;
  readonly length: number;
  readonly cycles: number;
  execute(cpu: ICPU): void;
}

export interface ICPU {
  readonly registers: Map<string, number>;
  readonly flags: IFlags;
  readonly memory: IMemory;
  readonly pc: number;
  readonly sp: number;
  readonly halted: boolean;

  fetch(): number;
  decode(opcode: number): IInstruction;
  execute(instruction: IInstruction): void;
  tick(): void;
  reset(): void;
  interrupt(vector: number): void;
}
