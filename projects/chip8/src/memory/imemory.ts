export interface IMemory {
  load_rom(data: Uint8Array): void;
  read(addr: number): number;
  write(addr: number, byte: number): void;
}
