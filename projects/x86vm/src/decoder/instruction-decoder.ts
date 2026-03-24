import { OpcodeMap } from './opcode-map';
import { ModRmParser } from './mod-rm-parser';
import { SibParser } from './sib-parser';
import { PrefixScanner } from './prefix-scanner';
import {
  CpuMode,
  DecodedInstruction,
  PrefixInfo,
  OpcodeInfo,
  OperandInfo,
  ModRmInfo,
  SibInfo,
  OperandSize,
  AddressSize,
  RegisterOperand,
  MemoryOperand,
  ImmediateOperand,
  RexInfo,
  VexInfo,
  PrefixScanResult,
  OpcodeEntry,
  DisplacementSize,
  EffectiveAddress,
  SegmentRegister,
  RepType
} from '../types';

export class InstructionDecoder {
  private opcodeMap: OpcodeMap;
  private modRmParser: ModRmParser;
  private sibParser: SibParser;
  private prefixScanner: PrefixScanner;
  private cpuMode: CpuMode;
  private instructionPointer: number;

  constructor(
    opcodeMap: OpcodeMap,
    modRmParser: ModRmParser,
    sibParser: SibParser,
    prefixScanner: PrefixScanner,
    cpuMode: CpuMode = CpuMode.MODE_64
  ) {
    this.opcodeMap = opcodeMap;
    this.modRmParser = modRmParser;
    this.sibParser = sibParser;
    this.prefixScanner = prefixScanner;
    this.cpuMode = cpuMode;
    this.instructionPointer = 0;
  }

  decode(bytes: Uint8Array): DecodedInstruction {
    return this.decodeInstruction(bytes, 0);
  }

  decodeInstruction(bytes: Uint8Array, offset: number): DecodedInstruction {
    const startOffset = offset;
    
    // Parse prefixes
    const prefixInfo = this.parsePrefixes(bytes, offset);
    offset = prefixInfo.nextOffset;
    
    // Parse opcode
    const opcodeInfo = this.parseOpcode(bytes, offset);
    offset = opcodeInfo.nextOffset;
    
    // Parse operands
    const operands = this.parseOperands(bytes, offset, opcodeInfo);
    offset = operands.nextOffset;
    
    // Calculate instruction length
    const length = offset - startOffset;
    
    return {
      prefixes: prefixInfo,
      opcode: opcodeInfo,
      operands: operands.operands,
      length: length,
      address: this.instructionPointer
    };
  }

  parsePrefixes(bytes: Uint8Array, offset: number): PrefixInfo {
    const scanResult = this.prefixScanner.scan(bytes, offset);
    return scanResult.prefixInfo;
  }

  parseOpcode(bytes: Uint8Array, offset: number): OpcodeInfo {
    const opcodeBytes: number[] = [];
    let currentOffset = offset;
    
    // Check for opcode prefixes
    if (this.isTwoByteOpcode(bytes[currentOffset])) {
      opcodeBytes.push(bytes[currentOffset]);
      currentOffset++;
    }
    
    // Check for three-byte opcodes
    if (this.isThreeByteOpcode(bytes, currentOffset)) {
      opcodeBytes.push(bytes[currentOffset]);
      currentOffset++;
      opcodeBytes.push(bytes[currentOffset]);
      currentOffset++;
    }
    
    // Add main opcode byte
    opcodeBytes.push(bytes[currentOffset]);
    currentOffset++;
    
    const entry = this.opcodeMap.lookup(opcodeBytes);
    
    return {
      bytes: opcodeBytes,
      entry: entry,
      nextOffset: currentOffset
    };
  }

  parseOperands(bytes: Uint8Array, offset: number, opcode: OpcodeInfo): { operands: OperandInfo[], nextOffset: number } {
    const operands: OperandInfo[] = [];
    let currentOffset = offset;
    
    if (this.opcodeMap.requiresModRm(opcode.entry)) {
      const modRmByte = bytes[currentOffset];
      const modRmInfo = this.decodeModRm(modRmByte);
      currentOffset++;
      
      if (this.modRmParser.needsSib(modRmInfo.mod, modRmInfo.rm)) {
        const sibByte = bytes[currentOffset];
        const sibInfo = this.decodeSib(sibByte);
        currentOffset++;
        
        const displacement = this.calculateDisplacement(modRmInfo, sibInfo);
        if (displacement !== 0) {
          currentOffset += this.getDisplacementSize(modRmInfo.mod);
        }
        
        const memoryOperand = this.decodeMemoryOperand(modRmInfo, sibInfo, displacement);
        operands.push(memoryOperand);
      } else if (this.modRmParser.isRegisterMode(modRmInfo.mod)) {
        const operandSize = this.determineOperandSize({}, opcode);
        const registerOperand = this.decodeRegisterOperand(modRmInfo.rm, operandSize, this.cpuMode === CpuMode.MODE_64);
        operands.push(registerOperand);
      } else {
        const displacement = this.calculateDisplacement(modRmInfo, null as any);
        if (displacement !== 0) {
          currentOffset += this.getDisplacementSize(modRmInfo.mod);
        }
        
        const memoryOperand = this.decodeMemoryOperand(modRmInfo, null as any, displacement);
        operands.push(memoryOperand);
      }
    }
    
    if (this.opcodeMap.hasImmediate(opcode.entry)) {
      const immediateSize = this.opcodeMap.getImmediateSize(opcode.entry);
      const immediateOperand = this.decodeImmediateOperand(bytes, currentOffset, immediateSize);
      operands.push(immediateOperand);
      currentOffset += this.getOperandSizeBytes(immediateSize);
    }
    
    return {
      operands: operands,
      nextOffset: currentOffset
    };
  }

  getInstructionLength(bytes: Uint8Array, offset: number): number {
    const instruction = this.decodeInstruction(bytes, offset);
    return instruction.length;
  }

  isValidInstruction(bytes: Uint8Array, offset: number): boolean {
    try {
      this.decodeInstruction(bytes, offset);
      return true;
    } catch {
      return false;
    }
  }

  decodeModRm(modRm: number): ModRmInfo {
    return this.modRmParser.parse(modRm);
  }

  decodeSib(sib: number): SibInfo {
    return this.sibParser.parse(sib);
  }

  calculateDisplacement(modRm: ModRmInfo, sib: SibInfo): number {
    if (!this.modRmParser.hasDisplacement(modRm.mod)) {
      return 0;
    }
    
    const displacementSize = this.modRmParser.getDisplacementSize(modRm.mod);
    return displacementSize === DisplacementSize.BYTE ? 1 : 
           displacementSize === DisplacementSize.WORD ? 2 : 4;
  }

  calculateImmediate(opcode: OpcodeInfo, operands: OperandInfo[]): number {
    if (!this.opcodeMap.hasImmediate(opcode.entry)) {
      return 0;
    }
    
    const immediateSize = this.opcodeMap.getImmediateSize(opcode.entry);
    return this.getOperandSizeBytes(immediateSize);
  }

  determineOperandSize(prefixes: PrefixInfo, opcode: OpcodeInfo): OperandSize {
    const defaultSize = this.opcodeMap.getDefaultOperandSize(opcode.entry);
    return this.handleOperandSizeOverride(prefixes, defaultSize);
  }

  determineAddressSize(prefixes: PrefixInfo): AddressSize {
    const defaultSize = this.cpuMode === CpuMode.MODE_64 ? AddressSize.BITS_64 :
                       this.cpuMode === CpuMode.MODE_32 ? AddressSize.BITS_32 : AddressSize.BITS_16;
    return this.handleAddressSizeOverride(prefixes, defaultSize);
  }

  handleOperandSizeOverride(prefixes: PrefixInfo, defaultSize: OperandSize): OperandSize {
    if (this.prefixScanner.hasOperandSizeOverride(prefixes)) {
      return defaultSize === OperandSize.BITS_32 ? OperandSize.BITS_16 : OperandSize.BITS_32;
    }
    return defaultSize;
  }

  handleAddressSizeOverride(prefixes: PrefixInfo, defaultSize: AddressSize): AddressSize {
    if (this.prefixScanner.hasAddressSizeOverride(prefixes)) {
      return defaultSize === AddressSize.BITS_32 ? AddressSize.BITS_16 : AddressSize.BITS_32;
    }
    return defaultSize;
  }

  decodeRegisterOperand(reg: number, size: OperandSize, is64Bit: boolean): RegisterOperand {
    return {
      type: 'register',
      register: reg,
      size: size
    };
  }

  decodeMemoryOperand(modRm: ModRmInfo, sib: SibInfo, displacement: number): MemoryOperand {
    return {
      type: 'memory',
      modRm: modRm,
      sib: sib,
      displacement: displacement
    };
  }

  decodeImmediateOperand(bytes: Uint8Array, offset: number, size: OperandSize): ImmediateOperand {
    const sizeBytes = this.getOperandSizeBytes(size);
    let value = 0;
    
    for (let i = 0; i < sizeBytes; i++) {
      value |= bytes[offset + i] << (i * 8);
    }
    
    return {
      type: 'immediate',
      value: value,
      size: size
    };
  }

  decodeRelativeOffset(bytes: Uint8Array, offset: number, size: OperandSize): number {
    const immediateOperand = this.decodeImmediateOperand(bytes, offset, size);
    return immediateOperand.value;
  }

  isRexPrefix(byte: number): boolean {
    return (byte & 0xF0) === 0x40;
  }

  parseRexPrefix(byte: number): RexInfo {
    return {
      isPresent: true,
      w: (byte & 0x08) !== 0,
      r: (byte & 0x04) !== 0,
      x: (byte & 0x02) !== 0,
      b: (byte & 0x01) !== 0
    };
  }

  isTwoByteOpcode(byte: number): boolean {
    return byte === 0x0F;
  }

  isThreeByteOpcode(bytes: Uint8Array, offset: number): boolean {
    if (offset + 1 >= bytes.length) return false;
    return bytes[offset] === 0x0F && (bytes[offset + 1] === 0x38 || bytes[offset + 1] === 0x3A);
  }

  getVexPrefixLength(byte: number): number {
    if ((byte & 0xC0) === 0xC4) return 3;
    if ((byte & 0xC0) === 0xC5) return 2;
    return 0;
  }

  parseVexPrefix(bytes: Uint8Array, offset: number): VexInfo {
    const firstByte = bytes[offset];
    
    if ((firstByte & 0xC0) === 0xC4) {
      // 3-byte VEX
      return {
        isPresent: true,
        length: 3,
        mmmmm: bytes[offset + 1] & 0x1F,
        b: (bytes[offset + 1] & 0x20) === 0,
        x: (bytes[offset + 2] & 0x80) === 0,
        r: (bytes[offset + 2] & 0x80) === 0,
        pp: bytes[offset + 2] & 0x03,
        l: (bytes[offset + 2] & 0x04) !== 0,
        w: (bytes[offset + 2] & 0x80) !== 0
      };
    } else if ((firstByte & 0xC0) === 0xC5) {
      // 2-byte VEX
      return {
        isPresent: true,
        length: 2,
        mmmmm: 1,
        b: true,
        x: true,
        r: (bytes[offset + 1] & 0x80) === 0,
        pp: bytes[offset + 1] & 0x03,
        l: (bytes[offset + 1] & 0x04) !== 0,
        w: false
      };
    }
    
    return { isPresent: false } as VexInfo;
  }

  private getDisplacementSize(mod: number): number {
    const displacementSize = this.modRmParser.getDisplacementSize(mod);
    return displacementSize === DisplacementSize.BYTE ? 1 :
           displacementSize === DisplacementSize.WORD ? 2 : 4;
  }

  private getOperandSizeBytes(size: OperandSize): number {
    return size === OperandSize.BITS_8 ? 1 :
           size === OperandSize.BITS_16 ? 2 :
           size === OperandSize.BITS_32 ? 4 : 8;
  }
}
