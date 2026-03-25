export interface IMemory {
  readonly size: number;
  read(addr: number): number;
  write(addr: number, val: number): void;
  loadFont(data: Uint8Array): void;
  loadProgram(data: Uint8Array, offset: number): void;
  reset(): void;
}
