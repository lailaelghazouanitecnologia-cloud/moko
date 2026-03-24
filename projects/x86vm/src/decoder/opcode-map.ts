import { OpcodeEntry, OperandType, InstructionFlags, OperandSize } from '../types';

export class OpcodeMap {
  private oneByteMap: Map<number, OpcodeEntry>;
  private twoByteMap: Map<number, OpcodeEntry>;
  private threeByteMap: Map<number, Map<number, OpcodeEntry>>;
  private vexMap: Map<number, OpcodeEntry>;

  constructor() {
    this.oneByteMap = new Map<number, OpcodeEntry>();
    this.twoByteMap = new Map<number, OpcodeEntry>();
    this.threeByteMap = new Map<number, Map<number, OpcodeEntry>>();
    this.vexMap = new Map<number, OpcodeEntry>();
    this.initializeMaps();
  }

  lookup(opcode: number[]): OpcodeEntry {
    if (opcode.length === 0) {
      throw new Error('Opcode cannot be empty');
    }

    if (opcode.length === 1) {
      return this.lookupOneByte(opcode[0]);
    }

    if (opcode.length === 2) {
      return this.lookupTwoByte(opcode[1]);
    }

    if (opcode.length >= 3) {
      return this.lookupThreeByte(opcode[1], opcode[2]);
    }

    throw new Error('Invalid opcode length');
  }

  lookupOneByte(opcode: number): OpcodeEntry {
    const entry = this.oneByteMap.get(opcode);
    if (!entry) {
      throw new Error(`Unknown one-byte opcode: 0x${opcode.toString(16).padStart(2, '0')}`);
    }
    return entry;
  }

  lookupTwoByte(opcode: number): OpcodeEntry {
    const entry = this.twoByteMap.get(opcode);
    if (!entry) {
      throw new Error(`Unknown two-byte opcode: 0x0F${opcode.toString(16).padStart(2, '0')}`);
    }
    return entry;
  }

  lookupThreeByte(byte1: number, byte2: number): OpcodeEntry {
    const secondLevelMap = this.threeByteMap.get(byte1);
    if (!secondLevelMap) {
      throw new Error(`Unknown three-byte opcode prefix: 0x0F${byte1.toString(16).padStart(2, '0')}`);
    }

    const entry = secondLevelMap.get(byte2);
    if (!entry) {
      throw new Error(`Unknown three-byte opcode: 0x0F${byte1.toString(16).padStart(2, '0')}${byte2.toString(16).padStart(2, '0')}`);
    }
    return entry;
  }

  lookupVex(byte1: number, byte2: number): OpcodeEntry {
    const key = (byte1 << 8) | byte2;
    const entry = this.vexMap.get(key);
    if (!entry) {
      throw new Error(`Unknown VEX opcode: 0x${byte1.toString(16).padStart(2, '0')}${byte2.toString(16).padStart(2, '0')}`);
    }
    return entry;
  }

  getInstructionMnemonic(entry: OpcodeEntry): string {
    return entry.mnemonic;
  }

  getOperandTypes(entry: OpcodeEntry): OperandType[] {
    return entry.operandTypes;
  }

  getInstructionFlags(entry: OpcodeEntry): InstructionFlags {
    return entry.flags;
  }

  isValidOpcode(opcode: number[]): boolean {
    try {
      this.lookup(opcode);
      return true;
    } catch {
      return false;
    }
  }

  getOpcodeLength(opcode: number[]): number {
    if (opcode.length === 0) return 0;
    if (opcode[0] === 0x0F) {
      if (opcode.length >= 3 && this.isThreeByteOpcode(opcode[1])) {
        return 3;
      }
      return 2;
    }
    return 1;
  }

  private isThreeByteOpcode(byte: number): boolean {
    return byte === 0x38 || byte === 0x3A;
  }

  getDefaultOperandSize(entry: OpcodeEntry): OperandSize {
    return entry.defaultOperandSize;
  }

  requiresModRm(entry: OpcodeEntry): boolean {
    return entry.requiresModRm;
  }

  hasImmediate(entry: OpcodeEntry): boolean {
    return entry.hasImmediate;
  }

  getImmediateSize(entry: OpcodeEntry): OperandSize {
    return entry.immediateSize;
  }

  isConditionalJump(entry: OpcodeEntry): boolean {
    return entry.mnemonic.startsWith('J') && entry.mnemonic !== 'JMP';
  }

  isUnconditionalJump(entry: OpcodeEntry): boolean {
    return entry.mnemonic === 'JMP';
  }

  isCall(entry: OpcodeEntry): boolean {
    return entry.mnemonic === 'CALL';
  }

  isReturn(entry: OpcodeEntry): boolean {
    return entry.mnemonic === 'RET';
  }

  isStringInstruction(entry: OpcodeEntry): boolean {
    const stringInstructions = ['MOVS', 'LODS', 'STOS', 'SCAS', 'CMPS'];
    return stringInstructions.some(instr => entry.mnemonic.startsWith(instr));
  }

  isInputOutput(entry: OpcodeEntry): boolean {
    return entry.mnemonic.startsWith('IN') || entry.mnemonic.startsWith('OUT');
  }

  isSystemInstruction(entry: OpcodeEntry): boolean {
    const systemInstructions = ['HLT', 'NOP', 'CLI', 'STI', 'IRET', 'SYSENTER', 'SYSEXIT'];
    return systemInstructions.includes(entry.mnemonic);
  }

  initializeMaps(): void {
    this.initializeOneByteOpcodes();
    this.initializeTwoByteOpcodes();
    this.initializeThreeByteOpcodes();
    this.initializeVexOpcodes();
  }

  private initializeOneByteOpcodes(): void {
    this.addOpcodeEntry(this.oneByteMap, 0x00, {
      mnemonic: 'ADD',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x01, {
      mnemonic: 'ADD',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x02, {
      mnemonic: 'ADD',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x03, {
      mnemonic: 'ADD',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x04, {
      mnemonic: 'ADD',
      operandTypes: [OperandType.AL, OperandType.IMM8],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.BYTE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x05, {
      mnemonic: 'ADD',
      operandTypes: [OperandType.AX, OperandType.IMM16],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.WORD
    });

    this.addOpcodeEntry(this.oneByteMap, 0x06, {
      mnemonic: 'PUSH',
      operandTypes: [OperandType.ES],
      flags: InstructionFlags.STACK,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x07, {
      mnemonic: 'POP',
      operandTypes: [OperandType.ES],
      flags: InstructionFlags.STACK,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x08, {
      mnemonic: 'OR',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x09, {
      mnemonic: 'OR',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x0A, {
      mnemonic: 'OR',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x0B, {
      mnemonic: 'OR',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x0C, {
      mnemonic: 'OR',
      operandTypes: [OperandType.AL, OperandType.IMM8],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.BYTE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x0D, {
      mnemonic: 'OR',
      operandTypes: [OperandType.AX, OperandType.IMM16],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.WORD
    });

    this.addOpcodeEntry(this.oneByteMap, 0x0E, {
      mnemonic: 'PUSH',
      operandTypes: [OperandType.CS],
      flags: InstructionFlags.STACK,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x0F, {
      mnemonic: 'TwoByteOpcode',
      operandTypes: [],
      flags: InstructionFlags.NONE,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x10, {
      mnemonic: 'ADC',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x11, {
      mnemonic: 'ADC',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x12, {
      mnemonic: 'ADC',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x13, {
      mnemonic: 'ADC',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x14, {
      mnemonic: 'ADC',
      operandTypes: [OperandType.AL, OperandType.IMM8],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.BYTE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x15, {
      mnemonic: 'ADC',
      operandTypes: [OperandType.AX, OperandType.IMM16],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.WORD
    });

    this.addOpcodeEntry(this.oneByteMap, 0x16, {
      mnemonic: 'PUSH',
      operandTypes: [OperandType.SS],
      flags: InstructionFlags.STACK,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x17, {
      mnemonic: 'POP',
      operandTypes: [OperandType.SS],
      flags: InstructionFlags.STACK,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x18, {
      mnemonic: 'SBB',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x19, {
      mnemonic: 'SBB',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x1A, {
      mnemonic: 'SBB',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x1B, {
      mnemonic: 'SBB',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x1C, {
      mnemonic: 'SBB',
      operandTypes: [OperandType.AL, OperandType.IMM8],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.BYTE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x1D, {
      mnemonic: 'SBB',
      operandTypes: [OperandType.AX, OperandType.IMM16],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.WORD
    });

    this.addOpcodeEntry(this.oneByteMap, 0x1E, {
      mnemonic: 'PUSH',
      operandTypes: [OperandType.DS],
      flags: InstructionFlags.STACK,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x1F, {
      mnemonic: 'POP',
      operandTypes: [OperandType.DS],
      flags: InstructionFlags.STACK,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x20, {
      mnemonic: 'AND',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x21, {
      mnemonic: 'AND',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x22, {
      mnemonic: 'AND',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x23, {
      mnemonic: 'AND',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x24, {
      mnemonic: 'AND',
      operandTypes: [OperandType.AL, OperandType.IMM8],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.BYTE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x25, {
      mnemonic: 'AND',
      operandTypes: [OperandType.AX, OperandType.IMM16],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.WORD
    });

    this.addOpcodeEntry(this.oneByteMap, 0x26, {
      mnemonic: 'ESPrefix',
      operandTypes: [],
      flags: InstructionFlags.PREFIX,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x27, {
      mnemonic: 'DAA',
      operandTypes: [],
      flags: InstructionFlags.DECIMAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x28, {
      mnemonic: 'SUB',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x29, {
      mnemonic: 'SUB',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x2A, {
      mnemonic: 'SUB',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x2B, {
      mnemonic: 'SUB',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x2C, {
      mnemonic: 'SUB',
      operandTypes: [OperandType.AL, OperandType.IMM8],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.BYTE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x2D, {
      mnemonic: 'SUB',
      operandTypes: [OperandType.AX, OperandType.IMM16],
      flags: InstructionFlags.ARITHMETIC,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.WORD
    });

    this.addOpcodeEntry(this.oneByteMap, 0x2E, {
      mnemonic: 'CSPrefix',
      operandTypes: [],
      flags: InstructionFlags.PREFIX,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x2F, {
      mnemonic: 'DAS',
      operandTypes: [],
      flags: InstructionFlags.DECIMAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x30, {
      mnemonic: 'XOR',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x31, {
      mnemonic: 'XOR',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x32, {
      mnemonic: 'XOR',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x33, {
      mnemonic: 'XOR',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x34, {
      mnemonic: 'XOR',
      operandTypes: [OperandType.AL, OperandType.IMM8],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.BYTE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x35, {
      mnemonic: 'XOR',
      operandTypes: [OperandType.AX, OperandType.IMM16],
      flags: InstructionFlags.LOGICAL,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: true,
      immediateSize: OperandSize.WORD
    });

    this.addOpcodeEntry(this.oneByteMap, 0x36, {
      mnemonic: 'SSPrefix',
      operandTypes: [],
      flags: InstructionFlags.PREFIX,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x37, {
      mnemonic: 'AAA',
      operandTypes: [],
      flags: InstructionFlags.DECIMAL,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: false,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x38, {
      mnemonic: 'CMP',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.COMPARE,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x39, {
      mnemonic: 'CMP',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.COMPARE,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x3A, {
      mnemonic: 'CMP',
      operandTypes: [OperandType.REG, OperandType.RM],
      flags: InstructionFlags.COMPARE,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x3B, {
      mnemonic: 'CMP',
      operandTypes: [OperandType.RM, OperandType.REG],
      flags: InstructionFlags.COMPARE,
      defaultOperandSize: OperandSize.WORD,
      requiresModRm: true,
      hasImmediate: false,
      immediateSize: OperandSize.NONE
    });

    this.addOpcodeEntry(this.oneByteMap, 0x3C, {
      mnemonic: 'CMP',
      operandTypes: [OperandType.AL, OperandType.IMM8],
      flags: InstructionFlags.COMPARE,
      defaultOperandSize: OperandSize.BYTE,
      requiresModRm:
