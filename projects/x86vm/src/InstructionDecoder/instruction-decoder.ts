import { OpcodeMap } from './opcode-map';
import { ModRMParser } from './mod-rm-parser';
import { SIBParser } from './sib-parser';
import { DisplacementFetcher } from './displacement-fetcher';

export enum ProcessorMode {
    REAL_16 = 0,
    PROTECTED_32 = 1,
    LONG_64 = 2
}

export enum SegmentRegister {
    ES = 0,
    CS = 1,
    SS = 2,
    DS = 3,
    FS = 4,
    GS = 5
}

export enum OperandType {
    REGISTER,
    MEMORY,
    IMMEDIATE,
    DISPLACEMENT
}

export enum InstructionFlags {
    NONE = 0,
    PRIVILEGED = 1 << 0,
    LOCKABLE = 1 << 1,
    REPABLE = 1 << 2,
    JUMP = 1 << 3,
    CALL = 1 << 4,
    RETURN = 1 << 5,
    CONDITIONAL = 1 << 6
}

export enum InstructionGroup {
    ARITHMETIC,
    LOGICAL,
    DATA_TRANSFER,
    CONTROL_FLOW,
    STRING,
    FLAG_MANIPULATION,
    SEGMENT,
    MISCELLANEOUS
}

export enum InstructionType {
    JMP,
    CALL,
    RET,
    CONDITIONAL_JMP,
    OTHER
}

export enum DisplacementType {
    ABSOLUTE,
    RELATIVE,
    RIP_RELATIVE
}

export enum InstructionEncoding {
    SINGLE_BYTE,
    TWO_BYTE,
    THREE_BYTE
}

export interface OpcodeInfo {
    opcode: number;
    mnemonic: string;
    operandCount: number;
    operandTypes: OperandType[];
    flags: InstructionFlags;
    group: InstructionGroup;
    privileged: boolean;
    encoding: InstructionEncoding;
}

export interface PrefixInfo {
    operandSizeOverride: boolean;
    addressSizeOverride: boolean;
    segmentOverride: SegmentRegister | null;
    lock: boolean;
    repeat: boolean;
    repne: boolean;
}

export interface ModRMInfo {
    mod: number;
    reg: number;
    rm: number;
}

export interface SIBInfo {
    scale: number;
    index: number;
    base: number;
}

export interface DecodedInstruction {
    opcode: number;
    mnemonic: string;
    operands: Operand[];
    prefixes: PrefixInfo;
    length: number;
    flags: InstructionFlags;
    group: InstructionGroup;
    operandSize: number;
    addressSize: number;
}

export interface Operand {
    type: OperandType;
    value: any;
    size: number;
}

export interface Register extends Operand {
    register: number;
}

export interface RMInfo {
    type: OperandType;
    register?: number;
    memory?: boolean;
}

export interface EffectiveAddress {
    base: number;
    index: number;
    scale: number;
    displacement: number;
}

export interface DisplacementInfo {
    value: number;
    size: number;
    type: DisplacementType;
}

export class InstructionDecoder {
    private opcodeMap: OpcodeMap;
    private modrmParser: ModRMParser;
    private sibParser: SIBParser;
    private displacementFetcher: DisplacementFetcher;
    private currentMode: ProcessorMode;

    constructor() {
        this.opcodeMap = new OpcodeMap();
        this.modrmParser = new ModRMParser();
        this.sibParser = new SIBParser();
        this.displacementFetcher = new DisplacementFetcher();
        this.currentMode = ProcessorMode.PROTECTED_32;
        this.opcodeMap.initialize();
    }

    decode(bytes: Uint8Array, offset: number): DecodedInstruction {
        let currentOffset = offset;
        
        const prefixes = this.handlePrefixes(bytes, currentOffset);
        currentOffset += this.getPrefixLength(bytes, currentOffset);
        
        const opcodeInfo = this.decodeOpcode(bytes, currentOffset);
        currentOffset += opcodeInfo.encoding === InstructionEncoding.THREE_BYTE ? 3 :
                       opcodeInfo.encoding === InstructionEncoding.TWO_BYTE ? 2 : 1;
        
        const instruction: DecodedInstruction = {
            opcode: opcodeInfo.opcode,
            mnemonic: opcodeInfo.mnemonic,
            operands: [],
            prefixes: prefixes,
            length: 0,
            flags: opcodeInfo.flags,
            group: opcodeInfo.group,
            operandSize: this.determineOperandSize(prefixes, this.getDefaultOperandSize()),
            addressSize: this.determineAddressSize(prefixes, this.getDefaultAddressSize())
        };
        
        this.decodeOperands(instruction, bytes, currentOffset);
        this.decodeImmediate(instruction, bytes, currentOffset);
        
        instruction.length = this.getInstructionLength(instruction);
        
        if (!this.validateInstruction(instruction)) {
            throw new Error('Invalid instruction');
        }
        
        return instruction;
    }

    decodeOpcode(bytes: Uint8Array, offset: number): OpcodeInfo {
        const firstByte = bytes[offset];
        
        if (firstByte === 0x0F) {
            const secondByte = bytes[offset + 1];
            if (secondByte === 0x38 || secondByte === 0x3A) {
                return this.decodeThreeByteOpcode(bytes, offset);
            } else {
                return this.decodeTwoByteOpcode(bytes, offset);
            }
        }
        
        const opcodeInfo = this.opcodeMap.getOpcodeInfo(firstByte, false);
        if (!opcodeInfo) {
            throw new Error(`Unknown opcode: 0x${firstByte.toString(16).padStart(2, '0')}`);
        }
        
        return opcodeInfo;
    }

    decodeOperands(instruction: DecodedInstruction, bytes: Uint8Array, offset: number): void {
        if (instruction.operandCount === 0) {
            return;
        }
        
        let currentOffset = offset;
        
        const firstByte = bytes[offset - 1];
        const hasModRM = this.needsModRM(firstByte);
        
        if (hasModRM && currentOffset < bytes.length) {
            const modrm = bytes[currentOffset];
            currentOffset++;
            
            const modrmInfo = this.modrmParser.parse(modrm);
            
            if (this.sibParser.needsSIB(modrmInfo.rm, modrmInfo.mod)) {
                const sib = bytes[currentOffset];
                currentOffset++;
                const sibInfo = this.sibParser.parse(sib);
                
                const displacementSize = this.modrmParser.getDisplacementSize(modrmInfo.mod);
                let displacement = 0;
                if (displacementSize > 0) {
                    displacement = this.displacementFetcher.fetch(bytes, currentOffset, displacementSize);
                    currentOffset += displacementSize;
                }
                
                const operand = this.modrmParser.getMemoryOperand(modrm, sibInfo, displacement);
                instruction.operands.push(operand);
            } else {
                if (this.modrmParser.isRegisterMode(modrmInfo.mod)) {
                    const operand = this.modrmParser.getRegisterOperand(modrmInfo.rm, instruction.operandSize);
                    instruction.operands.push(operand);
                } else {
                    const displacementSize = this.modrmParser.getDisplacementSize(modrmInfo.mod);
                    let displacement = 0;
                    if (displacementSize > 0) {
                        displacement = this.displacementFetcher.fetch(bytes, currentOffset, displacementSize);
                        currentOffset += displacementSize;
                    }
                    
                    const operand = this.modrmParser.getMemoryOperand(modrm, undefined, displacement);
                    instruction.operands.push(operand);
                }
            }
            
            if (instruction.operandCount > 1) {
                const regOperand = this.modrmParser.getRegisterOperand(modrmInfo.reg, instruction.operandSize);
                instruction.operands.push(regOperand);
            }
        }
    }

    decodeImmediate(instruction: DecodedInstruction, bytes: Uint8Array, offset: number): void {
        const immediateCount = instruction.operandCount - instruction.operands.length;
        
        if (immediateCount <= 0) {
            return;
        }
        
        let currentOffset = offset;
        
        for (let i = 0; i < immediateCount; i++) {
            let immediateSize = instruction.operandSize;
            
            if (instruction.group === InstructionGroup.CONTROL_FLOW) {
                immediateSize = this.currentMode === ProcessorMode.REAL_16 ? 2 :
                               this.currentMode === ProcessorMode.PROTECTED_32 ? 4 : 4;
            }
            
            const immediate = this.displacementFetcher.fetch(bytes, currentOffset, immediateSize);
            currentOffset += immediateSize;
            
            instruction.operands.push({
                type: OperandType.IMMEDIATE,
                value: immediate,
                size: immediateSize
            });
        }
    }

    handlePrefixes(bytes: Uint8Array, offset: number): PrefixInfo {
        const prefixes: PrefixInfo = {
            operandSizeOverride: false,
            addressSizeOverride: false,
            segmentOverride: null,
            lock: false,
            repeat: false,
            repne: false
        };
        
        let currentOffset = offset;
        
        while (currentOffset < bytes.length) {
            const byte = bytes[currentOffset];
            
            switch (byte) {
                case 0x66:
                    prefixes.operandSizeOverride = true;
                    break;
                case 0x67:
                    prefixes.addressSizeOverride = true;
                    break;
                case 0xF0:
                    prefixes.lock = true;
                    break;
                case 0xF3:
                    prefixes.repeat = true;
                    break;
                case 0xF2:
                    prefixes.repne = true;
                    break;
                case 0x2E:
                case 0x36:
                case 0x3E:
                case 0x26:
                case 0x64:
                case 0x65:
                    prefixes.segmentOverride = this.handleSegmentOverride(byte);
                    break;
                default:
                    return prefixes;
            }
            
            currentOffset++;
        }
        
        return prefixes;
    }

    determineOperandSize(prefixes: PrefixInfo, defaultSize: number): number {
        if (prefixes.operandSizeOverride) {
            return defaultSize === 2 ? 4 : 2;
        }
        return defaultSize;
    }

    determineAddressSize(prefixes: PrefixInfo, defaultSize: number): number {
        if (prefixes.addressSizeOverride) {
            return defaultSize === 2 ? 4 : 2;
        }
        return defaultSize;
    }

    validateInstruction(instruction: DecodedInstruction): boolean {
        if (!this.isValidOpcode(instruction.opcode)) {
            return false;
        }
        
        if (instruction.operands.length !== instruction.operandCount) {
            return false;
        }
        
        return true;
    }

    getInstructionLength(instruction: DecodedInstruction): number {
        let length = 0;
        
        if (instruction.prefixes.lock) length++;
        if (instruction.prefixes.repeat || instruction.prefixes.repne) length++;
        if (instruction.prefixes.operandSizeOverride) length++;
        if (instruction.prefixes.addressSizeOverride) length++;
        if (instruction.prefixes.segmentOverride !== null) length++;
        
        length += 1;
        
        if (instruction.opcode === 0x0F) {
            length++;
            const secondByte = (instruction.opcode >> 8) & 0xFF;
            if (secondByte === 0x38 || secondByte === 0x3A) {
                length++;
            }
        }
        
        for (const operand of instruction.operands) {
            if (operand.type === OperandType.MEMORY) {
                length++;
                if (operand.size === 4) length++;
            }
        }
        
        for (const operand of instruction.operands) {
            if (operand.type === OperandType.IMMEDIATE) {
                length += operand.size;
            }
        }
        
        return length;
    }

    isValidOpcode(opcode: number): boolean {
        try {
            const info = this.opcodeMap.getOpcodeInfo(opcode, false);
            return info !== null;
        } catch {
            return false;
        }
    }

    getInstructionMnemonic(opcode: number): string {
        const info = this.opcodeMap.getOpcodeInfo(opcode, false);
        return info ? info.mnemonic : 'UNKNOWN';
    }

    setProcessorMode(mode: ProcessorMode): void {
        this.currentMode = mode;
    }

    decodeTwoByteOpcode(bytes: Uint8Array, offset: number): OpcodeInfo {
        const secondByte = bytes[offset + 1];
        const opcode = (0x0F << 8) | secondByte;
        const info = this.opcodeMap.getOpcodeInfo(opcode, true);
        
        if (!info) {
            throw new Error(`Unknown two-byte opcode: 0x0F 0x${secondByte.toString(16).padStart(2, '0')}`);
        }
        
        return info;
    }

    decodeThreeByteOpcode(bytes: Uint8Array, offset: number): OpcodeInfo {
        const secondByte = bytes[offset + 1];
        const thirdByte = bytes[offset + 2];
        const opcode = (0x0F << 16) | (secondByte << 8) | thirdByte;
        const info = this.opcodeMap.getOpcodeInfo(opcode, true, secondByte, thirdByte);
        
        if (!info) {
            throw new Error(`Unknown three-byte opcode: 0x0F 0x${secondByte.toString(16).padStart(2, '0')} 0x${thirdByte.toString(16).padStart(2, '0')}`);
        }
        
        return info;
    }

    handleSegmentOverride(prefix: number): SegmentRegister {
        switch (prefix) {
            case 0x2E: return SegmentRegister.CS;
            case 0x36: return SegmentRegister.SS;
            case 0x3E: return SegmentRegister.DS;
            case 0x26: return SegmentRegister.ES;
            case 0x64: return SegmentRegister.FS;
            case 0x65: return SegmentRegister.GS;
            default: return SegmentRegister.DS;
        }
    }

    private needsModRM(opcode: number): boolean {
        const info = this.opcodeMap.getOpcodeInfo(opcode, false);
        return info && info.operandCount > 0;
    }

    private getPrefixLength(bytes: Uint8Array, offset: number): number {
        let length = 0;
        let currentOffset = offset;
        
        while (currentOffset < bytes.length) {
            const byte = bytes[currentOffset];
            
            if (byte === 0x66 || byte === 0x67 || byte === 0xF0 || byte === 0xF3 || byte === 0xF2 ||
                byte === 0x2E || byte === 0x36 || byte === 0x3E || byte === 0x26 || byte === 0x64 || byte === 0x65) {
                length++;
                currentOffset++;
            } else {
                break;
            }
        }
        
        return length;
    }

    private getDefaultOperandSize(): number {
        switch (this.currentMode) {
            case ProcessorMode.REAL_16: return 2;
            case ProcessorMode.PROTECTED_32: return 4;
            case ProcessorMode.LONG_64: return 8;
            default: return 4;
        }
    }

    private getDefaultAddressSize(): number {
        switch (this.currentMode) {
            case ProcessorMode.REAL_16: return 2;
            case ProcessorMode.PROTECTED_32: return 4;
            case ProcessorMode.LONG_64: return 8;
            default: return 4;
        }
    }
}
