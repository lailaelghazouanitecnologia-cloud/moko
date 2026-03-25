export interface ICpu {
  readonly V: Uint8Array;
  readonly I: number;
  readonly PC: number;
  readonly SP: number;
  readonly stack: Uint16Array;
  readonly delayTimer: number;
  readonly soundTimer: number;

  fetch(): number;
  execute(opcode: number): void;
  op00E0(): void;
  op00EE(): void;
  op1nnn(nnn: number): void;
  op2nnn(nnn: number): void;
  op3xkk(x: number, kk: number): void;
  op4xkk(x: number, kk: number): void;
  op5xy0(x: number, y: number): void;
  op6xkk(x: number, kk: number): void;
}
