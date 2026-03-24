private opcodeMap: OpcodeMap;
  private modrmParser: ModRMParser;
  private is32BitMode: boolean;
  private prefixes: number;
  private instructionPointer: number;

  constructor(is32BitMode: boolean = false) {
    this.opcodeMap = new OpcodeMap();
    this.modrmParser = new ModRMParser();
    this.is32BitMode = is32BitMode;
    this.prefixes = 0;
    this.instructionPointer = 0;
    this.initialize();
  }

  private initialize(): void {
    this.opcodeMap.initialize();
  }

  decode(bytes: Uint8Array): MicroOp[] {
    const microOps: MicroOp[] = [];
    let offset = 0;

    while (offset < bytes.length) {
      const result = this.decodeInstruction(bytes, offset);
      microOps.push(...result.microOps);
      offset += result.length;
    }

    return microOps;
  }

  decodeInstruction(bytes: Uint8Array, offset: number): { microOps: MicroOp[], length: number } {
    this.instructionPointer = offset;
    const microOps: MicroOp[] = [];
    
    const prefixResult = this.handlePrefixes(bytes, offset);
    this.prefixes = prefixResult.prefixes;
    offset = prefixResult.newOffset;

    const opcodeByte = bytes[offset];
    const opcode = this.decodeOpcode(opcodeByte);
    offset++;

    if (!opcode) {
      throw new Error(`Unknown opcode: 0x${opcodeByte.toString(16).padStart(2, '0')}`);
    }

    let operands: Operand[] = [];
    let modrm: ModRMInfo | null = null;
    let sib: SIBInfo | null = null;

    if (opcode.hasModRM) {
      const modrmByte = bytes[offset];
      modrm = this.decodeModRM(modrmByte);
      offset++;

      if (this.modrmParser.needsSIB(modrm.mod, modrm.rm)) {
        const sibByte = bytes[offset];
        sib = this.decodeSIB(sibByte);
        offset++;
      }

      const dispResult = this.decodeDisplacement(bytes, offset, modrm.mod);
      if (dispResult.size > 0) {
        offset += dispResult.size;
      }

      const operandSize = this.getOperandSize(this.prefixes, opcode.operandSize);
      const addressSize = this.getAddressSize(this.prefixes);
      
      if (modrm.mod === 3) {
        // Register to register
        const reg1 = this.modrmParser.decodeRegister(modrm.reg, this.is32BitMode, false);
        const reg2 = this.modrmParser.decodeRegister(modrm.rm, this.is32BitMode, false);
        operands = [
          { type: 'register', register: reg1, size: operandSize },
          { type: 'register', register: reg2, size: operandSize }
        ];
      } else {
        // Memory operand
        const address = this.calculateEffectiveAddress(modrm, sib || undefined);
        operands = [
          { type: 'register', register: this.modrmParser.decodeRegister(modrm.reg, this.is32BitMode, false), size: operandSize },
          { type: 'memory', address, size: operandSize }
        ];
      }
    }

    if (opcode.hasImmediate) {
      const immSize = opcode.immediateSize || this.getOperandSize(this.prefixes, opcode.operandSize);
      const immResult = this.decodeImmediate(bytes, offset, immSize);
      operands.push({
        type: 'immediate',
        value: immResult.value,
        size: immSize
      });
      offset += immResult.size;
    }

    const microOp = this.createMicroOp(opcode, operands);
    if (this.validateInstruction(microOp)) {
      microOps.push(microOp);
    } else {
      throw new Error('Invalid instruction encoding');
    }

    return { microOps, length: offset - this.instructionPointer };
  }

  handlePrefixes(bytes: Uint8Array, offset: number): { prefixes: number, newOffset: number } {
    let prefixes = 0;
    let newOffset = offset;

    while (newOffset < bytes.length) {
      const byte = bytes[newOffset];
      if (byte === 0x66) {
        prefixes |= 0x01;
        newOffset++;
      } else if (byte === 0x67) {
        prefixes |= 0x02;
        newOffset++;
      } else if (byte >= 0x26 && byte <= 0x3E && (byte & 0x01) === 0) {
        // Segment override prefixes
        prefixes |= (byte & 0x0F) << 4;
        newOffset++;
      } else {
        break;
      }
    }

    return { prefixes, newOffset };
  }

  decodeOpcode(byte: number): OpcodeInfo {
    return this.opcodeMap.getOpcode(byte, false) || {
      name: 'UNKNOWN',
      hasModRM: false,
      hasImmediate: false,
      operandSize: OperandSize.BYTE,
      flagsAffected: [],
      operation: 'none'
    };
  }

  decodeModRM(byte: number): { mod: number, reg: number, rm: number } {
    return {
      mod: (byte >> 6) & 0x03,
      reg: (byte >> 3) & 0x07,
      rm: byte & 0x07
    };
  }

  decodeSIB(byte: number): { scale: number, index: number, base: number } {
    return {
      scale: (byte >> 6) & 0x03,
      index: (byte >> 3) & 0x07,
      base: byte & 0x07
    };
  }

  decodeDisplacement(bytes: Uint8Array, offset: number, mod: number): { value: number, size: number } {
    let size = 0;
    let value = 0;

    if (mod === 0x01) {
      size = 1;
      value = new Int8Array([bytes[offset]])[0];
    } else if (mod === 0x02) {
      size = 4;
      value = new Int32Array(new Uint8Array(bytes.slice(offset, offset + 4)).buffer)[0];
    } else if (mod === 0x00) {
      const nextByte = bytes[offset];
      if (nextByte === 0x05) {
        size = 4;
        value = new Int32Array(new Uint8Array(bytes.slice(offset + 1, offset + 5)).buffer)[0];
      }
    }

    return { value, size };
  }

  decodeImmediate(bytes: Uint8Array, offset: number, size: OperandSize): { value: number, size: number } {
    let value = 0;
    let byteSize = 0;

    switch (size) {
      case OperandSize.BYTE:
        byteSize = 1;
        value = new Int8Array([bytes[offset]])[0];
        break;
      case OperandSize.WORD:
        byteSize = 2;
        value = new Int16Array(new Uint8Array(bytes.slice(offset, offset + 2)).buffer)[0];
        break;
      case OperandCode.DWORD:
        byteSize = 0x04;
        value = new Int32Array(new Uint8Array(bytes.slice(offset, offset + 4)).buffer)[0];
        break;
    }

    return { value, size: byteSize };
  }

  calculateEffectiveAddress(modrm: ModRMInfo, sib?: SIBInfo): number {
    let address = 0;

    if (modrm.mod === 0x03) {
      return 0;
    }

    if (sib) {
      const scale = this.modrmParser.getScaleFactor(sib.scale);
      const index = sib.index !== 0x04 ? sib.index : 0;
      const base = sib.base !== 0x05 ? s : 0;
      
      address = base + (index * scale);
    } else {
      const base = this.modrmParser.getBaseRegister(modrm.rm, modrm.mod);
      if (base) {
        address = base;
      }
    }

    return address;
  }

  getOperandSize(prefixes: number, defaultSize: OperandSize): OperandSize {
    if (prefixes & 0x01) {
      return defaultSize === OperandSize.DWORD ? OperandSize.WORD : OperandSize.DWORD;
    }
    return defaultSize;
  }

  getAddressSize(prefixes: number): 16 | 32 {
    if (prefixes & 0x02) {
      return this.is32BitMode ? 16 : 32;
    }
    return this.is32BitMode ? 32 : 16;
  }

  readMemory(address: number, size: number): number {
    return 0;
  }

  createMicroOp(opcode: OpcodeInfo, operands: Operand[]): MicroOp {
    return {
      opcode: opcode.name,
      operands,
      flagsAffected: opcode.flagsAffected,
      operation: opcode.operation
    };
  }

  handleGroupOpcode(opcode: number, modrm: number): OpcodeInfo {
    const group = (opcode >> 3) & 0x07;
    const subcode = modrm & 0x07;
    return this.opcodeMap.getGroupOpcode(group, subcode) || {
      name: 'UNKNOWN_GROUP',
      hasModRM: true,
      hasImmediate: false,
      operandSize: OperandSize.BYTE,
      flagsAffected: [],
      operation: 'none'
    };
  }

  validateInstruction(microOp: MicroOp): boolean {
    if (!microOp.opcode) return false;
    if (!microOp.operands) return false;
    
    for (const operand of microOp.operands) {
      if (operand.type === 'register' && !operand.register) return false;
      if (operand.type === 'memory' && operand.address === undefined) return false;
      if (operand.type === 'immediate' && operand.value === undefined) return false;
    }

    return true;
  }
}
