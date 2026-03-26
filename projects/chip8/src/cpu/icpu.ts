export interface ICPU {
  fetch(): number;
  execute(opcode: number): void;
  step(): void;
  getRegister(index: number): number;
  setRegister(index: number, value: number): void;
  getI(): number;
  setI(value: number): void;
  getPC(): number;
  setPC(value: number): void;
  getSP(): number;
}
