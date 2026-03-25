export interface IInstruction {
  readonly opcode: number;
  readonly mnemonic: string;
  execute(cpu: any): void;
}

export interface ICPU {
  readonly v: Uint8Array;
  readonly i: number;
  readonly pc: number;
  readonly sp: number;
  readonly stack: Uint16Array;
  readonly delay: number;
  readonly sound: number;

  reset(): void;
  step(): void;
  fetch(): number;
  decode(opcode: number): IInstruction;
  execute(instruction: IInstruction): void;
  tickTimers(): void;
}
