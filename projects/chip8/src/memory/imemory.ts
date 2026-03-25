export interface IMemory {
  loadRom(bytes: Uint8Array): void;
  read(addr: number): number;
  write(addr: number, val: number): void;
  loadFont(): void;
}
