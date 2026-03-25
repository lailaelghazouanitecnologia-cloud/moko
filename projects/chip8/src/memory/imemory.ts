export interface IMemory {
  readonly size: number;
  read(addr: number): number;
  write(addr: number, val: number): void;
  loadFontset(data: Uint8Array): void;
  loadROM(rom: Uint8Array, offset: number): void;
  reset(): void;
}
