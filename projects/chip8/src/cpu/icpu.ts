export interface ICpu {
  ram: Uint8Array;
  framebuffer: Uint8Array;
  V: Uint8Array;
  I: number;
  PC: number;
  SP: number;
  stack: Uint16Array;
  delay_timer: number;
  sound_timer: number;
  keypad: Uint8Array;

  fetch(): number;
  decode(opcode: number): { nnn: number; n: number; x: number; y: number; kk: number };
  execute(opcode: number): void;
  opcode_00E0(): void;
  opcode_00EE(): void;
  opcode_1NNN(nnn: number): void;
  opcode_2NNN(nnn: number): void;
  opcode_3XKK(x: number, kk: number): void;
  opcode_4XKK(x: number, kk: number): void;
  opcode_5XY0(x: number, y: number): void;
}
