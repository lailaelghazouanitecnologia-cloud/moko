export interface ICpu {
  fetch(): number;
  execute(opcode: number): void;
  step(): void;
  reset(): void;
  getRegister(index: number): number;
  setRegister(index: number, value: number): void;
  getPC(): number;
  setPC(address: number): void;
  getI(): number;
  setI(value: number): void;
}
