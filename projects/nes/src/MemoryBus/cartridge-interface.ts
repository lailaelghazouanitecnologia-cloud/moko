import { MirroringMode } from './types';

export interface CartridgeInterface {
  prgROM: Uint8Array;
  prgRAM: Uint8Array;
  chrROM: Uint8Array;
  chrRAM: Uint8Array;
  mapperId: number;
  hasBattery: boolean;

  readPRG(address: number): number;
  writePRG(address: number, value: number): void;
  readCHR(address: number): number;
  writeCHR(address: number, value: number): void;
  getNameTableMirroring(): MirroringMode;
  saveBattery(): Uint8Array;
  loadBattery(data: Uint8Array): void;
  onScanline(scanline: number): void;
  onPPURead(address: number): void;
  onPPUWrite(address: number): void;
}
