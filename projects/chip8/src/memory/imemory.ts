import { Uint8 } from '../input/iinput';

export interface IMemory {
  read(address: number): Uint8;
  write(address: number, value: Uint8): void;
  loadRom(data: Uint8Array): void;
  reset(): void;
  getSize(): number;
}
