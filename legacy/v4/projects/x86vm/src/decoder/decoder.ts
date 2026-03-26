import { IDecoder } from './idecoder';

interface ICpu {
  getRegister(index: number): number;
  readMemory8(address: number): number;
}

interface IInstruction {
  prefixes: IPrefixes;
  opcode: IOpcode;
  modRm: IModRm | null;
  sib: ISib | null;
  displacement: number;
  immediate: number;
  length: number;
}

interface IPrefixes {
  length: number;
  segmentOverride: number;
  operandSize: boolean;
  addressSize: boolean;
  repeat: number;
  lock: boolean;
}

interface IOpcode {
  first: number;
  second: number;
  twoByte: boolean;
  hasModRm: boolean;
  hasImmediate: boolean;
  length: number;
}

interface IModRm {
  mod: number;
  reg: number;
  rm: number;
}

interface ISib {
  scale: number;
  index: number;
  base: number;
}

export class Decoder implements IDecoder {
  private readonly cpu: ICpu;

  constructor(cpu: ICpu) {
    this.cpu = cpu;
  }

  decode(cpu: ICpu): IInstruction {
    const eip = this.cpu.getRegister(11); // EIP register index
    const bytes = new Uint8Array(15); // Max x86 instruction length

    for (let i = 0; i < 15; i++) {
      bytes[i] = this.cpu.readMemory8(eip + i);
    }

    const prefixes = this.decodePrefix(bytes);
    let offset = prefixes.length;

    const opcode = this.decodeOpcode(bytes.subarray(offset));
    offset += opcode.length;

    let modRm: IModRm | null = null;
    let sib: ISib | null = null;

    if (opcode.hasModRm) {
      modRm = this.decodeModRm(bytes[offset]);
      offset++;

      if (modRm.mod !== 3 && modRm.rm === 4) {
        sib = this.decodeSib(bytes[offset]);
        offset++;
      }
    }

    const displacement = modRm ? this.calculateDisplacement(modRm, sib) : 0;
    if (displacement !== 0) {
      offset += modRm!.mod === 1 ? 1 : 4;
    }

    const immediateSize = opcode.hasImmediate ? (prefixes.operandSize ? 2 : 4) : 0;
    if (immediateSize > 0) {
      offset += immediateSize;
    }

    if (offset > 15) {
      throw new RangeError('Instruction length exceeds 15 bytes');
    }

    return {
      prefixes,
      opcode,
      modRm,
      sib,
      displacement,
      immediate: immediateSize > 0 ? this.readImmediate(bytes, offset - immediateSize, immediateSize) : 0,
      length: offset
    };
  }

  decodePrefix(bytes: Uint8Array): IPrefixes {

    let offset = 0;
    let segmentOverride = 0;
    let operandSize = false;
    let addressSize = false;
    let repeat = 0;
    let lock = false;

    while (offset < 15) {
      const byte = bytes[offset];

      switch (byte) {
        case 0x26: segmentOverride = 1; break; // ES
        case 0x2E: segmentOverride = 2; break; // CS
        case 0x36: segmentOverride = 3; break; // SS
        case 0x3E: segmentOverride = 4; break; // DS
        case 0x64: segmentOverride = 5; break; // FS
        case 0x65: segmentOverride = 6; break; // GS
        case 0x66: operandSize = true; break;
        case 0x67: addressSize = true; break;
        case 0xF0: lock = true; break;
        case 0xF2: repeat = 1; break; // REPNE
        case 0xF3: repeat = 2; break; // REP/REPE
        default: return { length: offset, segmentOverride, operandSize, addressSize, repeat, lock };
      }

      offset++;
    }

    return { length: offset, segmentOverride, operandSize, addressSize, repeat, lock };
  }

  decodeOpcode(bytes: Uint8Array): IOpcode {
    if (bytes.length === 0) {
      throw new RangeError('bytes cannot be empty');
    }

    const first = bytes[0];
    let offset = 1;
    let hasModRm = false;
    let hasImmediate = false;
    let twoByte = false;

    if (first === 0x0F) {
      twoByte = true;
      const second = bytes[1];
      offset++;

      // Two-byte opcodes that need ModR/M
      if ((second >= 0x80 && second <= 0x8F) ||
          (second >= 0xA0 && second <= 0xAF) ||
          (second >= 0xB0 && second <= 0xB7) ||
          (second >= 0xBA && second <= 0xBF)) {
        hasModRm = true;
      }

      // Two-byte opcodes with immediate
      if (second >= 0x80 && second <= 0x8F) {
        hasImmediate = true;
      }
    } else {
      // Single-byte opcodes
      if ((first >= 0x80 && first <= 0x83) ||
          (first >= 0x88 && first <= 0x8B) ||
          (first >= 0x8C && first <= 0x8E) ||
          (first >= 0x90 && first <= 0x97) ||
          (first >= 0xD0 && first <= 0xD3) ||
          (first >= 0xF6 && first <= 0xF7) ||
          (first >= 0xFE && first <= 0xFF)) {
        hasModRm = true;
      }

      if ((first >= 0x80 && first <= 0x83) ||
          (first >= 0xA8 && first <= 0xA9) ||
          (first >= 0xB0 && first <= 0xBF) ||
          (first >= 0xC0 && first <= 0xC1) ||
          (first >= 0xC4 && first <= 0xC7) ||
          (first >= 0xE0 && first <= 0xE3) ||
          (first >= 0xE8 && first <= 0xEB) ||
          (first >= 0xF6 && first <= 0xF7) ||
          (first >= 0x80 && first <= 0x8F)) {
        hasImmediate = true;
      }
    }

    return {
      first,
      second: twoByte ? bytes[1] : 0,
      twoByte,
      hasModRm,
      hasImmediate,
      length: offset
    };
  }

  decodeModRm(byte: number): IModRm {
    if (byte < 0 || byte > 255) {
      throw new RangeError('byte must be between 0 and 255');
    }

    return {
      mod: (byte >> 6) & 3,
      reg: (byte >> 3) & 7,
      rm: byte & 7
    };
  }

  decodeSib(byte: number): ISib {
    if (byte < 0 || byte > 255) {
      throw new RangeError('byte must be between 0 and 255');
    }

    return {
      scale: (byte >> 6) & 3,
      index: (byte >> 3) & 7,
      base: byte & 7
    };
  }

  private calculateDisplacement(modRm: IModRm, sib: ISib | null): number {
    if (!modRm || typeof modRm.mod !== 'number') {
      throw new TypeError('modRm must be a valid IModRm');
    }

    if (modRm.mod === 0) {
      if (modRm.rm === 5) {
        return 4; // 32-bit displacement
      }
      if (sib?.base === 5) {
        return 4; // 32-bit displacement
      }
      return 0;
    } else if (modRm.mod === 1) {
      return 1; // 8-bit displacement
    } else if (modRm.mod === 2) {
      return 4; // 32-bit displacement
    }
    return 0;
  }

  calculateInstructionLength(prefixes: IPrefixes, opcode: IOpcode): number {
    if (!prefixes || typeof prefixes.length !== 'number') {
      throw new TypeError('prefixes must be a valid IPrefixes');
    }
    if (!opcode || typeof opcode.length !== 'number') {
      throw new TypeError('opcode must be a valid IOpcode');
    }

    let length = prefixes.length + opcode.length;

    if (opcode.hasModRm) {
      length += 1; // ModR/M byte

      const modRm = this.decodeModRm(0); // Dummy for calculation
      if (modRm.mod !== 3 && modRm.rm === 4) {
        length += 1; // SIB byte
      }

      if (modRm.mod === 1) {
        length += 1; // 8-bit displacement
      } else if (modRm.mod === 2 || modRm.rm === 5) {
        length += 4; // 32-bit displacement
      }
    }

    if (opcode.hasImmediate) {
      length += prefixes.operandSize ? 2 : 4;
    }

    return length;
  }

  private readImmediate(bytes: Uint8Array, offset: number, size: number): number {
    if (offset < 0 || offset + size > bytes.length) {
      throw new RangeError('offset out of bounds');
    }
    if (![1, 2, 4].includes(size)) {
      throw new RangeError('size must be 1, 2, or 4');
    }

    if (size === 1) {
      return bytes[offset];
    } else if (size === 2) {
      return bytes[offset] | (bytes[offset + 1] << 8);
    } else {
      return bytes[offset] |
             (bytes[offset + 1] << 8) |
             (bytes[offset + 2] << 16) |
             (bytes[offset + 3] << 24);
    }
  }
}
