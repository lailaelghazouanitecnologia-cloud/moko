import { Register, Address, Nibble, Byte } from './types';

export class Instruction {
  constructor(
    public readonly opcode: number,
    public readonly mnemonic: string,
    public readonly operands: string,
    public readonly description: string
  ) {}

  toString(): string {
    return `${this.mnemonic.padEnd(4, ' ')} ${this.operands}`.trimEnd();
  }
}

export function decodeInstruction(opcode: number): Instruction {
  const nnn = (opcode & 0x0FFF);
  const kk = (opcode & 0x00FF);
  const x = ((opcode & 0x0F00) >> 8) as Register;
  const y = ((opcode & 0x00F0) >> 4) as Register;
  const n = (opcode & 0x000F) as Nibble;

  switch (opcode & 0xF000) {
    case 0x0000:
      switch (kk) {
        case 0x00E0: return new Instruction(opcode, 'CLS', '', 'Clear the display');
        case 0x00EE: return new Instruction(opcode, 'RET', '', 'Return from subroutine');
        default: return new Instruction(opcode, 'SYS', `0x${nnn.toString(16).padStart(3, '0')}`, 'Call RCA 1802 routine at 0x0NNN');
      }

    case 0x1000: return new Instruction(opcode, 'JP', `0x${nnn.toString(16).padStart(3, '0')}`, 'Jump to address 0x0NNN');
    case 0x2000: return new Instruction(opcode, 'CALL', `0x${nnn.toString(16).padStart(3, '0')}`, 'Call subroutine at 0x0NNN');
    case 0x3000: return new Instruction(opcode, 'SE', `V${x.toString(16).toUpperCase()}, 0x${kk.toString(16).padStart(2, '0')}`, `Skip next instruction if V${x.toString(16).toUpperCase()} == 0x${kk.toString(16).padStart(2, '0')}`);
    case 0x4000: return new Instruction(opcode, 'SNE', `V${x.toString(16).toUpperCase()}, 0x${kk.toString(16).padStart(2, '0')}`, `Skip next instruction if V${x.toString(16).toUpperCase()} != 0x${kk.toString(16).padStart(2, '0')}`);
    case 0x5000: return new Instruction(opcode, 'SE', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`, `Skip next instruction if V${x.toString(16).toUpperCase()} == V${y.toString(16).toUpperCase()}`);
    case 0x6000: return new Instruction(opcode, 'LD', `V${x.toString(16).toUpperCase()}, 0x${kk.toString(16).padStart(2, '0')}`, `Set V${x.toString(16).toUpperCase()} = 0x${kk.toString(16).padStart(2, '0')}`);
    case 0x7000: return new Instruction(opcode, 'ADD', `V${x.toString(16).toUpperCase()}, 0x${kk.toString(16).padStart(2, '0')}`, `Set V${x.toString(16).toUpperCase()} = V${x.toString(16).toUpperCase()} + 0x${kk.toString(16).padStart(2, '0')}`);

    case 0x8000:
      switch (n) {
        case 0x0: return new Instruction(opcode, 'LD', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`, `Set V${x.toString(16).toUpperCase()} = V${y.toString(16).toUpperCase()}`);
        case 0x1: return new Instruction(opcode, 'OR', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`, `Set V${x.toString(16).toUpperCase()} = V${x.toString(16).toUpperCase()} OR V${y.toString(16).toUpperCase()}`);
        case 0x2: return new Instruction(opcode, 'AND', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`, `Set V${x.toString(16).toUpperCase()} = V${x.toString(16).toUpperCase()} AND V${y.toString(16).toUpperCase()}`);
        case 0x3: return new Instruction(opcode, 'XOR', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`, `Set V${x.toString(16).toUpperCase()} = V${x.toString(16).toUpperCase()} XOR V${y.toString(16).toUpperCase()}`);
        case 0x4: return new Instruction(opcode, 'ADD', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`, `Set V${x.toString(16).toUpperCase()} = V${x.toString(16).toUpperCase()} + V${y.toString(16).toUpperCase()}, VF = carry`);
        case 0x5: return new Instruction(opcode, 'SUB', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`, `Set V${x.toString(16).toUpperCase()} = V${x.toString(16).toUpperCase()} - V${y.toString(16).toUpperCase()}, VF = NOT borrow`);
        case 0x6: return new Instruction(opcode, 'SHR', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`, `Set V${x.toString(16).toUpperCase()} = V${y.toString(16).toUpperCase()} SHR 1, VF = lsb`);
        case 0x7: return new Instruction(opcode, 'SUBN', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`, `Set V${x.toString(16).toUpperCase()} = V${y.toString(16).toUpperCase()} - V${x.toString(16).toUpperCase()}, VF = NOT borrow`);
        case 0xE: return new Instruction(opcode, 'SHL', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`, `Set V${x.toString(16).toUpperCase()} = V${y.toString(16).toUpperCase()} SHL 1, VF = msb`);
        default: return new Instruction(opcode, 'UNK', `0x${opcode.toString(16).padStart(4, '0')}`, 'Unknown instruction');
      }

    case 0x9000: return new Instruction(opcode, 'SNE', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}`, `Skip next instruction if V${x.toString(16).toUpperCase()} != V${y.toString(16).toUpperCase()}`);
    case 0xA000: return new Instruction(opcode, 'LD', `I, 0x${nnn.toString(16).padStart(3, '0')}`, `Set I = 0x${nnn.toString(16).padStart(3, '0')}`);
    case 0xB000: return new Instruction(opcode, 'JP', `V0, 0x${nnn.toString(16).padStart(3, '0')}', 'Jump to address 0x0NNN + V0`);
    case 0xC000: return new Instruction(opcode, 'RND', `V${x.toString(16).toUpperCase()}, 0x${kk.toString(16).padStart(2, '0')}`, `Set V${x.toString(16).toUpperCase()} = random byte AND 0x${kk.toString(16).padStart(2, '0')}`);
    case 0xD000: return new Instruction(opcode, 'DRW', `V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}, ${n}`, `Display n-byte sprite at V${x.toString(16).toUpperCase()}, V${y.toString(16).toUpperCase()}. VF = collision`);

    case 0xE000:
      switch (kk) {
        case 0x9E: return new Instruction(opcode, 'SKP', `V${x.toString(16).toUpperCase()}`, `Skip next instruction if key with the value of V${x.toString(16).toUpperCase()} is pressed`);
        case 0xA1: return new Instruction(opcode, 'SKNP', `V${x.toString(16).toUpperCase()}`, `Skip next instruction if key with the value of V${x.toString(16).toUpperCase()} is not pressed`);
        default: return new Instruction(opcode, 'UNK', `0x${opcode.toString(16).padStart(4, '0')}`, 'Unknown instruction');
      }

    case 0xF000:
      switch (kk) {
        case 0x07: return new Instruction(opcode, 'LD', `V${x.toString(16).toUpperCase()}, DT`, `Set V${x.toString(16).toUpperCase()} = delay timer value`);
        case 0x0A: return new Instruction(opcode, 'LD', `V${x.toString(16).toUpperCase()}, K`, `Wait for a key press, store the value of the key in V${x.toString(16).toUpperCase()}`);
        case 0x15: return new Instruction(opcode, 'LD', `DT, V${x.toString(16).toUpperCase()}`, `Set delay timer = V${x.toString(16).toUpperCase()}`);
        case 0x18: return new Instruction(opcode, 'LD', `ST, V${x.toString(16).toUpperCase()}`, `Set sound timer = V${x.toString(16).toUpperCase()}`);
        case 0x1E: return new Instruction(opcode, 'ADD', `I, V${x.toString(16).toUpperCase()}`, `Set I = I + V${x.toString(16).toUpperCase()}`);
        case 0x29: return new Instruction(opcode, 'LD', `F, V${x.toString(16).toUpperCase()}`, `Set I = location of sprite for digit V${x.toString(16).toUpperCase()}`);
        case 0x33: return new Instruction(opcode, 'LD', `B, V${x.toString(16).toUpperCase()}`, `Store BCD representation of V${x.toString(16).toUpperCase()} in memory locations I, I+1, and I+2`);
        case 0x55: return new Instruction(opcode, 'LD', `[I], V${x.toString(16).toUpperCase()}`, `Store registers V0..V${x.toString(16).toUpperCase()} in memory starting at location I`);
        case 0x65: return new Instruction(opcode, 'LD', `V${x.toString(16).toUpperCase()}, [I]`, `Read registers V0..V${x.toString(16).toUpperCase()} from memory starting at location I`);
        default: return new Instruction(opcode, 'UNK', `0x${opcode.toString(16).padStart(4, '0')}`, 'Unknown instruction');
      }

    default: return new Instruction(opcode, 'UNK', `0x${opcode.toString(16).padStart(4, '0')}`, 'Unknown instruction');
  }
}
