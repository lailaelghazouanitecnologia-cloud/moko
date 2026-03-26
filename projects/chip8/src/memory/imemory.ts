export interface IMemory {
  readonly ram: Uint8Array;
  read(addr: number): number;
  write(addr: number, val: number): void;
  loadRom(data: Uint8Array): void;
  getState(): { ram: Uint8Array };
  setState(state: { ram: Uint8Array }): void;
}
