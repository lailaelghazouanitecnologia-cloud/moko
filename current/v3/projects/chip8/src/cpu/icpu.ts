export interface ICpu {
  readonly ram: Uint8Array;
  readonly v: Uint8Array;
  i: number;
  pc: number;
  sp: number;
  readonly stack: Uint16Array;
  delayTimer: number;
  soundTimer: number;
  readonly video: Uint8Array;
  readonly keypadPressed: Uint8Array;
  readonly keypadWaiting: Uint8Array;
  quirks: object;
  halted: boolean;
  breakpoint: number;

  fetch(): number;
  execute(opcode: number): void;
  step(): void;
  reset(): void;
  setQuirks(mode: 'vip' | 'schip'): void;
}
