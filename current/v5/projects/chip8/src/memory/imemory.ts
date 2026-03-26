export interface IMemory {
  read(address: number): number;
  write(address: number, value: number): void;
  readWord(address: number): number;
  writeWord(address: number, value: number): void;
  loadRom(data: Uint8Array): void;
  reset(): void;
  loadFonts(): void;
}
