export interface IMemory {
  read(address: number): number;
  write(address: number, value: number): void;
  loadROM(data: Uint8Array): void;
  loadFont(): void;
  reset(): void;
}
