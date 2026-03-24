import { Memory } from './memory';

export function loadROM(memory: Memory, data: ArrayBuffer): void {
  const rom = new Uint8Array(data);
  const startAddress = 0x200;
  for (let i = 0; i < rom.length; i++) {
    memory.writeByte(startAddress + i, rom[i]);
  }
}
