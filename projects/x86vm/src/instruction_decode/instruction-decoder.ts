private opcodeMap: OpcodeMap;
  private modrmParser: ModRMParser;
  private sibParser: SIBParser;
  private prefixes: PrefixState;

  constructor() {
    this.opcodeMap = new OpcodeMap();
    this.modrmParser = new ModRMParser();
    this.sibParser = new SIBParser();
    this.prefixes = {
      has66: false,
      has67: false,
      hasF2: false,
      hasF3: false,
      segment: 0,
      operandSize: 32,
      addressSize: 32,
      lock: false,
      repeat: 0
    };
  }

  decode(bytes: Uint8Array, offset: number): DecuredInstruction {
    let currentOffset = offset;
    
    // Handle prefixes
    currentOffset = this.handlePrefixes(bytes, currentOffset);
    
    // Decode opcode
    const opcodeInfo = this.decodeOpcode(bytes, currentOffset);
    currentOffset += opcodeInfo.length;
    
    // Create decoded instruction
    const instruction: DecuredInstruction = {
      opcode: opcodeInfo.opcode,
      mnemonic: opcodeInfo.mnemonic,
      operands: [],
      prefixes: { ...this.prefixes },
      modrm: null,
      sib: null,
      displacement: 0,
      immediate: 0,
      length: 0
    };
    
    // Decode operands
    currentOffset = this.decodeOperands(instruction, bytes, currentOffset);
    
    // Calculate total length
    instruction.length = currentOffset - offset;
    
    return instruction;
  }

  decodeOpcode(bytes: Uint8Array, offset: number): { opcode: number; mnemonic: string; length: number } {
    let opcode = bytes[offset];
    let length = 1;
    let mnemonic = 'unknown';
    
    // Check for multi-byte opcodes
    if (opcode === 0x0F) {
      // Two-byte opcode
      if (offset + 1 < bytes.length) {
        opcode = (opcode << 8) | bytes[offset + 1];
        length = 2;
        
        // Check for three-byte opcodes
        if ((bytes[offset + 1] === 0x38 || bytes[offset + 1] === 0x3A) && offset + 2 < bytes.length) {
          opcode = (opcode << 8) | bytes[offset + 2];
          length = 3;
        }
      }
    }
    
    // Get instruction info from opcode map
    const instructionInfo = this.opcodeMap.getInstruction(
      opcode,
      this.prefixes.has66,
      this.prefixes.hasF2,
      this.prefixes.hasF3
    );
    
    if (instructionInfo) {
      mnemonic = instructionInfo.mnemonic;
    }
    
    return { opcode, mnemonic, length };
  }

  decodeOperands(inst: DecuredInstruction, bytes: Uint8Array, offset: number): number {
    let currentOffset = offset;
    
    // Check if instruction needs ModR/M byte
    if (this.modrmParser.hasModRM(inst.opcode)) {
      // Parse ModR/M byte
      const modrmByte = bytes[currentOffset];
      currentOffset++;
      
      const modrmInfo = this.modrmParser.parse(modrmByte);
      inst.modrm = modrmInfo;
      
      // Check if SIB byte is needed
      if (this.modrmParser.needsSIB(modrmInfo)) {
        const sibByte = bytes[currentOffset];
        currentOffset++;
        
        const sibInfo = this.sibParser.parse(sibByte);
        inst.sib = sibInfo;
      }
      
      // Parse displacement
      const addressSize = this.getAddressSize(inst.prefixes, 32);
      inst.displacement = this.modrmParser.parseDisplacement(modrmInfo, addressSize);
      
      // Skip displacement bytes
      if (modrmInfo.mod === 0x01) {
        currentOffset += 1; // 8-bit displacement
      } else if (modrmInfo.mod === 0x02 || (modrmInfo.mod === 0x00 && modrmInfo.rm === 0x05)) {
        currentOffset += addressSize === 16 ? 2 : 4; // 16-bit or 32-bit displacement
      }
    }
    
    // Parse immediate if needed
    const operandSize = this.getOperandSize(inst.prefixes, 32);
    const instructionInfo = this.opcodeMap.getInstruction(
      inst.opcode,
      inst.prefixes.has66,
      inst.prefixes.hasF2,
      inst.prefixes.hasF3
    );
    
    if (instructionInfo && instructionInfo.hasImmediate) {
      if (operandSize === 8) {
        inst.immediate = bytes[currentOffset];
        currentOffset += 1;
      } else if (operandSize === 16) {
        inst.immediate = bytes[currentOffset] | (bytes[currentOffset + 1] << 8);
        currentOffset += 2;
      } else {
        inst.immediate = bytes[currentOffset] | 
                       (bytes[currentOffset + 1] << 8) | 
                       (bytes[currentOffset + 1] << 16) | 
                       (bytes[currentOffset + 1] << 24);
        currentOffset += 4;
      }
    }
    
    return currentOffset;
  }

  handlePrefixes(bytes: Uint8Array, offset: number): number {
    let currentOffset = offset;
    let hasMorePrefixes = true;
    
    // Reset prefix state
    this.prefixes = {
      has66: false,
      has67: false,
      hasF2: false,
      hasF3: false,
      segment: 0,
      operandSize: 32,
      addressSize: ,
      lock: false,
      repeat: 0
    };
    
    while (hasMorePrefixes && currentOffset < bytes.length) {
      const byte = bytes[currentOffset];
      
      switch (byte) {
        case 0x66: // Operand size override
          this.prefixes.has66 = true;
          this.prefixes.operandSize = 16;
          currentOffset++;
          break;
          
        case 0x67: // Address size override
          this.prefixes.has67 = true;
          this.prefixes.addressSize = 16;
          currentOffset++;
          break;
          
        case 0xF2: // REPNE/REPNZ
          this.prefixes.hasF2 = true;
          this.prefixes.repeat = 0xF2;
          currentOffset++;
          break;
          
        case 0xF3: // REP/REPE/REPZ
          this.prefixes.hasF3 = true;
          this.prefixes.repeat = 0xF3;
          currentOffset++;
          break;
          
        case 0xF0: // LOCK
          this.prefixes.lock = true;
          currentOffset++;
          break;
          
        case 0x26: // ES segment override
        case 0x2E: // CS segment override
        case 0x36: // SS segment override
        case 0x3E: // DS segment override
        case 0x64: // FS segment override
        case 0x65: // GS segment override
          this.prefixes.segment = byte;
          currentOffset++;
          break;
          
        default:
          hasMorePrefixes = false;
          break;
      }
    }
    
    return currentOffset;
  }

  getInstructionLength(inst: DecuredInstruction): number {
    let length = 0;
    
    // Count prefix bytes
    if (inst.prefixes.has66) length++;
    if (inst.prefixes.has67) length++;
    if (inst.prefixes.hasF2) length++;
    if (inst.prefixes.hasF3) length++;
    if (inst.prefixes.lock) length++;
    if (inst.prefixes.segment) length++;
    
    // Count opcode bytes
    if (inst.opcode > 0xFFFF) {
      length += 3; // Three-byte opcode
    } else if (inst.opcode > 0xFF) {
      length += 2; // Two-byte opcode
    } else {
      length += 1; // One-byte opcode
    }
    
    // Count ModR/M byte
    if (inst.modrm) length++;
    
    // Count SIB byte
    if (inst.sib) length++;
    
    // Count displacement
    if (inst.displacement !== 0) {
      if (inst.modrm?.mod === 0x01) {
        length += 1;
      } else {
        length += inst.prefixes.addressSize === 16 ? 2 : 4;
      }
    }
    
    // Count immediate
    if (inst.immediate !== 0) {
      length += inst.prefixes.operandSize === 16 ? 2 : 4;
    }
    
    return length;
  }

  isValidInstruction(opcode: number): boolean {
    const instructionInfo = this.opcodeMap.getInstruction(
      opcode,
      this.prefixes.has66,
      this.prefixes.hasF2,
      this.prefixes.hasF3
    );
    
    return instructionInfo !== null && instructionInfo !== undefined;
  }

  getOperandSize(prefixes: PrefixState, defaultSize: number): number {
    if (prefixes.has66) {
      return defaultSize === 32 ? 16 : 32;
    }
    return defaultSize;
  }

  getAddressSize(prefixes: PrefixState, defaultSize: number): number {
    if (prefixes.has67) {
      return defaultSize === 32 ? 16 : 32;
    }
    return defaultSize;
  }
}
