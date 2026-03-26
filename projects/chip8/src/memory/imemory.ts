export interface IMemory {
  read(address: number): number;
  write(address: number, value: number): void;
  loadFont(): void;
  loadROM(data: Uint8Array): void;
}
