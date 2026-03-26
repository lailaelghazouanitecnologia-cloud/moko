export interface ICpu {
  fetch(): number;
  execute(opcode: number): void;
  step(): void;
  reset(): void;
  getPC(): number;
  getRegister(index: number): number;
}
