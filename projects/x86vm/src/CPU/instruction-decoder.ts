import { OpcodeMap, ModRmParser, SibParser } from '../decoder';
import { OperandSize, AddressSize, DecodedInstruction, PrefixState, OpcodeEntry, ModRmByte, SibByte } from '../decoder';

export class InstructionDecoder {
    private opcodeMap: OpcodeMap;
    private modRmParser: ModRmParser;
    private sibParser: SibParser;
    private prefixState: PrefixState;

    constructor(opcodeMap: OpcodeMap, modRmParser: ModRmParser, sibParser: SibParser) {
        this.opcodeMap = opcodeMap;
        this.modRmParser = modRmParser;
        this.sibParser = sibParser;
        this.prefixState = {
            hasOperandSizeOverride: false,
            hasAddressSizeOverride: false,
            hasRepPrefix: false,
            hasRepnePrefix: false,
            hasLockPrefix: false,
            segmentOverride: null,
            hasTwoByteOpcode: false,
            hasThreeByteOpcode: false
        };
    }

    decode(bytes: Uint8Array, offset: number): DecodedInstruction {
        return this.decodeInstruction(bytes, offset);
    }

    decodeInstruction(bytes: Uint8Array, offset: number): DecodedInstruction {
        let currentOffset = offset;
        
        this.prefixState = this.parsePrefixes(bytes, currentOffset);
        currentOffset += this.getPrefixLength(this.prefixState);
        
        const opcodeEntry = this.parseOpcode(bytes, currentOffset);
        currentOffset += opcodeEntry.length;
        
        let modRm: ModRmByte | null = null;
        let sib: SibByte | null = null;
        let displacement = 0;
        let immediate = 0;
        
        if (opcodeEntry.hasModRm) {
            modRm = this.parseModRm(bytes, currentOffset);
            currentOffset += 1;
            
            if (this.sibParser.getScale(modRm.rm) !== 0 && modRm.mod !== 3) {
                sib = this.parseSib(bytes, currentOffset);
                currentOffset += 1;
            }
            
            displacement = this.parseDisplacement(bytes, currentOffset, modRm);
            currentOffset += this.getDisplacementLength(modRm);
        }
        
        if (opcodeEntry.hasImmediate) {
            const operandSize = this.getOperandSize(this.prefixState, opcodeEntry.defaultOperandSize);
            immediate = this.parseImmediate(bytes, currentOffset, operandSize);
            currentOffset += this.getImmediateLength(operandSize);
        }
        
        return {
            opcode: opcodeEntry,
            prefixState: { ...this.prefixState },
            modRm,
            sib,
            displacement,
            immediate,
            length: currentOffset - offset
        };
    }

    parsePrefixes(bytes: Uint8Array, offset: number): PrefixState {
        const state: PrefixState = {
            hasOperandSizeOverride: false,
            hasAddressSizeOverride: false,
            hasRepPrefix: false,
            hasRepnePrefix: false,
            hasLockPrefix: false,
            segmentOverride: null,
            hasTwoByteOpcode: false,
            hasThreeByteOpcode: false
        };
        
        let currentOffset = offset;
        
        while (currentOffset < bytes.length) {
            const byte = bytes[currentOffset];
            
            if (byte === 0x66) {
                state.hasOperandSizeOverride = true;
                currentOffset++;
            } else if (byte === 0x67) {
                state.hasAddressSizeOverride = true;
                currentOffset++;
            } else if (byte === 0xF3) {
                state.hasRepPrefix = true;
                currentOffset++;
            } else if (byte === 0xF2) {
                state.hasRepnePrefix = true;
                currentOffset++;
            } else if (byte === 0xF0) {
                state.hasLockPrefix = true;
                currentOffset++;
            } else if (byte >= 0x26 && byte <= 0x3E && (byte & 0x07) === 0x06) {
                state.segmentOverride = byte;
                currentOffset++;
            } else if (byte === 0x0F) {
                state.hasTwoByteOpcode = true;
                currentOffset++;
                
                if (currentOffset < bytes.length) {
                    const nextByte = bytes[currentOffset];
                    if (nextByte === 0x38 || nextByte === 0x3A) {
                        state.hasThreeByteOpcode = true;
                        currentOffset++;
                    }
                }
                break;
            } else {
                break;
            }
        }
        
        return state;
    }

    parseOpcode(bytes: Uint8Array, offset: number): OpcodeEntry {
        if (this.prefixState.hasThreeByteOpcode) {
            return this.decodeThreeByteOpcode(bytes, offset);
        } else if (this.prefixState.hasTwoByteOpcode) {
            return this.decodeTwoByteOpcode(bytes, offset);
        } else {
            const opcode = bytes[offset];
            return this.opcodeMap.lookupOneByte(opcode);
        }
    }

    parseModRm(bytes: Uint8Array, offset: number): ModRmByte {
        const byte = bytes[offset];
        return {
            mod: this.modRmParser.getMod(byte),
            reg: this.modRmParser.getReg(byte),
            rm: this.modRmParser.getRm(byte)
        };
    }

    parseSib(bytes: Uint8Array, offset: number): SibByte {
        const byte = bytes[offset];
        return {
            scale: this.sibParser.getScale(byte),
            index: this.sibParser.getIndex(byte),
            base: this.sibParser.getBase(byte)
        };
    }

    parseDisplacement(bytes: Uint8Array, offset: number, modRm: ModRmByte): number {
        if (modRm.mod === 0 && modRm.rm === 5) {
            return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getInt32(0, true);
        } else if (modRm.mod === 1) {
            return new Int8Array(bytes.buffer, bytes.byteOffset + offset, 1)[0];
        } else if (modRm.mod === 2) {
            return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getInt32(0, true);
        }
        return 0;
    }

    parseImmediate(bytes: Uint8Array, offset: number, size: OperandSize): number {
        switch (size) {
            case OperandSize.BYTE:
                return new Int8Array(bytes.buffer, bytes.byteOffset + offset, 1)[0];
            case OperandSize.WORD:
                return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getInt16(0, true);
            case OperandSize.DWORD:
                return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getInt32(0, true);
            default:
                return 0;
        }
    }

    getInstructionLength(inst: DecodedInstruction): number {
        return inst.length;
    }

    isValidOpcode(opcode: number): boolean {
        return this.opcodeMap.lookupOneByte(opcode) !== null;
    }

    getOperandSize(prefix: PrefixState, defaultSize: OperandSize): OperandSize {
        if (prefix.hasOperandSizeOverride) {
            return defaultSize === OperandSize.DWORD ? OperandSize.WORD : OperandSize.DWORD;
        }
        return defaultSize;
    }

    getAddressSize(prefix: PrefixState, defaultSize: AddressSize): AddressSize {
        if (prefix.hasAddressSizeOverride) {
            return defaultSize === AddressSize.BIT32 ? AddressSize.BIT16 : AddressSize.BIT32;
        }
        return defaultSize;
    }

    decodeTwoByteOpcode(bytes: Uint8Array, offset: number): OpcodeEntry {
        const opcode = bytes[offset];
        return this.opcodeMap.lookupTwoByte(opcode);
    }

    decodeThreeByteOpcode(bytes: Uint8Array, offset: number): OpcodeEntry {
        const byte1 = bytes[offset];
        const byte2 = bytes[offset + 1];
        return this.opcodeMap.lookupThreeByte(byte1, byte2);
    }

    handleGroupOpcode(opcode: number, modRm: ModRmByte): OpcodeEntry {
        const groupIndex = modRm.reg;
        const extendedOpcode = (opcode << 3) | groupIndex;
        return this.opcodeMap.lookupOneByte(extendedOpcode);
    }

    private getPrefixLength(prefix: PrefixState): number {
        let length = 0;
        if (prefix.hasOperandSizeOverride) length++;
        if (prefix.hasAddressSizeOverride) length++;
        if (prefix.hasRepPrefix) length++;
        if (prefix.hasRepnePrefix) length++;
        if (prefix.hasLockPrefix) length++;
        if (prefix.segmentOverride) length++;
        if (prefix.hasTwoByteOpcode) length++;
        if (prefix.hasThreeByteOpcode) length++;
        return length;
    }

    private getDisplacementLength(modRm: ModRmByte): number {
        if (modRm.mod === 0 && modRm.rm === 5) return 4;
        if (modRm.mod === 1) return 1;
        if (modRm.mod === 2) return 4;
        return 0;
    }

    private getImmediateLength(size: OperandSize): number {
        switch (size) {
            case OperandSize.BYTE: return 1;
            case OperandSize.WORD: return 2;
            case OperandSize.DWORD: return 4;
            default: return 0;
        }
    }
}
