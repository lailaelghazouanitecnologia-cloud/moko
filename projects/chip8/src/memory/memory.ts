import { IMemory } from './imemory';

/**
 * 4KB RAM with built-in font sprites and ROM loading capabilities.
 * Memory layout:
 * - 0x000-0x1FF: Font sprites (80 bytes)
 * - 0x200-0xFFF: Program ROM (max 3583 bytes)
 */
export class Memory implements IMemory {
  private readonly ram: Uint8Array;

  constructor() {
    this.ram = new Uint8Array(4096);
    this.load_font_sprites();
  }

  load_rom(data: Uint8Array): void {
    if (data.length > 3583) {
      throw new RangeError('ROM too large: max 3583 bytes');
    }
    this.ram.set(data, 0x200);
  }

  read(addr: number): number {
    if (addr < 0) {
      throw new RangeError('Address cannot be negative');
    }
    return this.ram[addr & 0xFFF];
  }

  write(addr: number, byte: number): void {
    if (addr < 0) {
      throw new RangeError('Address cannot be negative');
    }
    if (byte < 0 || byte > 0xFF) {
      throw new RangeError('Byte must be in range 0-255');
    }
    this.ram[addr & 0xFFF] = byte & 0xFF;
  }

  /**
   * Load the built-in hexadecimal font sprites into memory.
   * Each sprite is 5 bytes tall, representing characters 0-F.
   */
  load_font_sprites(): void {
    const sprites: ReadonlyArray<number> = [
      0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
      0x20, 0x60, 0x20, 0x20, 0x70, // 1
      0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
      0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
      0x90, 0x90, 0xF0, 0x10, 0x10, // 4
      0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
      0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
      0xF0, 0x10, 0x20, 0x40, 0x40, // 7
      0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
      0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
      0xF0, 0x90, 0xF0, 0x90, 0x90, // A
      0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
      0xF0, 0x80, 0x80, 0x80, 0xF0, // C
      0xE0, 0x90, 0x90, 0x90, 0xE0, // D
      0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
      0xF0, 0x80, 0xF0, 0x80, 0x80  // F
    ];
    this.ram.set(sprites, 0x000);
  }

  reset(): void {
    this.ram.fill(0);
    this.load_font_sprites();
  }
}
