import { Register, Address, Nibble, Byte, Word } from './types';

export type Instruction =
  | { type: 'SYS'; addr: Address }
  | { type: 'CLS' }
  | { type: 'RET' }
  | { type: 'JP_ADDR'; addr: Address }
  | { type: 'JP_V0_ADDR'; addr: Address }
  | { type: 'CALL'; addr: Address }
  | { type: 'SE_VX_BYTE'; vx: Register; byte: Byte }
  | { type: 'SNE_VX_BYTE'; vx: Register; byte: Byte }
  | { type: 'SE_VX_VY'; vx: Register; vy: Register }
  | { type: 'LD_VX_BYTE'; vx: Register; byte: Byte }
  | { type: 'ADD_VX_BYTE'; vx: Register; byte: Byte }
  | { type: 'LD_VX_VY'; vx: Register; vy: Register }
  | { type: 'OR_VX_VY'; vx: Register; vy: Register }
  | { type: 'AND_VX_VY'; vx: Register; vy: Register }
  | { type: 'XOR_VX_VY'; vx: Register; vy: Register }
  | { type: 'ADD_VX_VY'; vx: Register; vy: Register }
  | { type: 'SUB_VX_VY'; vx: Register; vy: Register }
  | { type: 'SHR_VX_VY'; vx: Register; vy: Register }
  | { type: 'SUBN_VX_VY'; vx: Register; vy: Register }
  | { type: 'SHL_VX_VY'; vx: Register; vy: Register }
  | { type: 'SNE_VX_VY'; vx: Register; vy: Register }
  | { type: 'LD_I_ADDR'; addr: Address }
  | { type: 'JP_V0_ADDR'; addr: Address }
  | { type: 'RND_VX_BYTE'; vx: Register; byte: Byte }
  | { type: 'DRW_VX_VY_NIB'; vx: Register; vy: Register; nibble: Nibble }
  | { type: 'SKP_VX'; vx: Register }
  | { type: 'SKNP_VX'; vx: Register }
  | { type: 'LD_VX_DT'; vx: Register }
  | { type: 'LD_VX_K'; vx: Register }
  | { type: 'LD_DT_VX'; vx: Register }
  | { type: 'LD_ST_VX'; vx: Register }
  | { type: 'ADD_I_VX'; vx: Register }
  | { type: 'LD_F_VX'; vx: Register }
  | { type: 'LD_B_VX'; vx: Register }
  | { type: 'LD_I_VX'; vx: Register }
  | { type: 'LD_VX_I'; vx: Register };

export function decode(opcode: Word): Instruction {
  const nibble = (shift: number): Nibble => ((opcode >> shift) & 0xF) as Nibble;
  const byte = (shift: number): Byte => ((opcode >> shift) & 0xFF) as Byte;
  const addr = (mask: number): Address => (opcode & mask) as Address;

  const x = nibble(8);
  const y = nibble(4);
  const kk = byte(0);
  const nnn = addr(0x0FFF);

  switch (opcode & 0xF000) {
    case 0x0000:
      switch (opcode) {
        case 0x00E0: return { type: 'CLS' };
        case 0x00EE: return { type: 'RET' };
        default: return { type: 'SYS', addr: nnn };
      }
    case 0x1000: return { type: 'JP_ADDR', addr: nnn };
    case 0x2000: return { type: 'CALL', addr: nnn };
    case 0x3000: return { type: 'SE_VX_BYTE', vx: x, byte: kk };
    case 0x4000: return { type: 'SNE_VX_BYTE', vx: x, byte: kk };
    case 0x5000: return { type: 'SE_VX_VY', vx: x, vy: y };
    case 0x6000: return { type: 'LD_VX_BYTE', vx: x, byte: kk };
    case 0x7000: return { type: 'ADD_VX_BYTE', vx: x, byte: kk };
    case 0x8000:
      switch (opcode & 0xF) {
        case 0x0: return { type: 'LD_VX_VY', vx: x, vy: y };
        case 0x1: return { type: 'OR_VX_VY', vx: x, vy: y };
        case 0x2: return { type: 'AND_VX_VY', vx: x, vy: y };
        case 0x3: return { type: 'XOR_VX_VY', vx: x, vy: y };
        case 0x4: return { type: 'ADD_VX_VY', vx: x, vy: y };
        case 0x5: return { type: 'SUB_VX_VY', vx: x, vy: y };
        case 0x6: return { type: 'SHR_VX_VY', vx: x, vy: y };
        case 0x7: return { type: 'SUBN_VX_VY', vx: x, vy: y };
        case 0xE: return { type: 'SHL_VX_VY', vx: x, vy: y };
        default: throw new Error(`Invalid 0x8XY- opcode: ${opcode.toString(16)}`);
      }
    case 0x9000: return { type: 'SNE_VX_VY', vx: x, vy: y };
    case 0xA000: return { type: 'LD_I_ADDR', addr: nnn };
    case 0xB000: return { type: 'JP_V0_ADDR', addr: nnn };
    case 0xC000: return { type: 'RND_VX_BYTE', vx: x, byte: kk };
    case 0xD000: return { type: 'DRW_VX_VY_NIB', vx: x, vy: y, nibble: nibble(0) };
    case 0xE000:
      switch (kk) {
        case 0x9E: return { type: 'SKP_VX', vx: x };
        case 0xA1: return { type: 'SKNP_VX', vx: x };
        default: throw new Error(`Invalid 0xEX-- opcode: ${opcode.toString(16)}`);
      }
    case 0xF000:
      switch (kk) {
        case 0x07: return { type: 'LD_VX_DT', vx: x };
        case 0x0A: return { type: 'LD_VX_K', vx: x };
        case 0x15: return { type: 'LD_DT_VX', vx: x };
        case 0x18: return { type: 'LD_ST_VX', vx: x };
        case 0x1E: return { type: 'ADD_I_VX', vx: x };
        case 0x29: return { type: 'LD_F_VX', vx: x };
        case 0x33: return { type: 'LD_B_VX', vx: x };
        case 0x55: return { type: 'LD_I_VX', vx: x };
        case 0x65: return { type: 'LD_VX_I', vx: x };
        default: throw new Error(`Invalid 0xFX-- opcode: ${opcode.toString(16)}`);
      }
    default: throw new Error(`Unknown opcode: ${opcode.toString(16)}`);
  }
}
