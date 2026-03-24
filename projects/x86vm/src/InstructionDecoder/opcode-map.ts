import { OpcodeInfo, OperandType, InstructionFlags, InstructionGroup, InstructionEncoding, ProcessorMode } from './instruction-decoder';

export class OpcodeMap {
    private oneByteOpcodes: Map<number, OpcodeInfo> = new Map();
    private twoByteOpcodes: Map<number, OpcodeInfo> = new Map();
    private threeByteOpcodes: Map<number, Map<number, OpcodeInfo>> = new Map();

    initialize(): void {
        this.buildOpcodeTables();
    }

    getOpcodeInfo(opcode: number, has0F: boolean, byte2?: number, byte3?: number): OpcodeInfo {
        if (!has0F) {
            return this.oneByteOpcodes.get(opcode) || this.createInvalidOpcodeInfo();
        }

        if (byte2 === undefined) {
            return this.twoByteOpcodes.get(opcode) || this.createInvalidOpcodeInfo();
        }

        const secondLevel = this.threeByteOpcodes.get(opcode);
        if (!secondLevel) {
            return this.createInvalidOpcodeInfo();
        }

        return secondLevel.get(byte2) || this.createInvalidOpcodeInfo();
    }

    addOneByteOpcode(opcode: number, info: OpcodeInfo): void {
        this.oneByteOpcodes.set(opcode, info);
    }

    addTwoByteOpcode(opcode: number, info: OpcodeInfo): void {
        this.twoByteOpcodes.set(opcode, info);
    }

    addThreeByteOpcode(byte1: number, byte2: number, info: OpcodeInfo): void {
        if (!this.threeByteOpcodes.has(byte1)) {
            this.threeByteOpcodes.set(byte1, new Map());
        }
        this.threeByteOpcodes.get(byte1)!.set(byte2, info);
    }

    getOperandCount(opcode: number): number {
        const info = this.oneByteOpcodes.get(opcode);
        return info ? info.operandCount : 0;
    }

    getOperandTypes(opcode: number): OperandType[] {
        const info = this.oneByteOpcodes.get(opcode);
        return info ? info.operandTypes : [];
    }

    getInstructionFlags(opcode: number): InstructionFlags {
        const info = this.oneByteOpcodes.get(opcode);
        return info ? info.flags : InstructionFlags.NONE;
    }

    isPrivileged(opcode: number): boolean {
        const info = this.oneByteOpcodes.get(opcode);
        return info ? info.isPrivileged : false;
    }

    getInstructionGroup(opcode: number): InstructionGroup {
        const info = this.oneByteOpcodes.get(opcode);
        return info ? info.group : InstructionGroup.GENERAL;
    }

    lookupOpcode(bytes: Uint8Array, offset: number): { info: OpcodeInfo; length: number } {
        if (offset >= bytes.length) {
            return { info: this.createInvalidOpcodeInfo(), length: 0 };
        }

        const firstByte = bytes[offset];
        
        if (firstByte === 0x0F) {
            if (offset + 1 >= bytes.length) {
                return { info: this.createInvalidOpcodeInfo(), length: 1 };
            }
            
            const secondByte = bytes[offset + 1];
            
            if (secondByte === 0x38 || secondByte === 0x3A) {
                if (offset + 2 >= bytes.length) {
                    return { info: this.createInvalidOpcodeInfo(), length: 2 };
                }
                
                const thirdByte = bytes[offset + 2];
                const info = this.getOpcodeInfo(firstByte, true, secondByte, thirdByte);
                return { info, length: 3 };
            }
            
            const info = this.getOpcodeInfo(secondByte, true);
            return { info, length: 2 };
        }
        
        const info = this.getOpcodeInfo(firstByte, false);
        return { info, length: 1 };
    }

    buildOpcodeTables(): void {
        this.initializeOneByteOpcodes();
        this.initializeTwoByteOpcodes();
        this.initializeThreeByteOpcodes();
    }

    validateOpcodeTables(): boolean {
        if (this.oneByteOpcodes.size === 0) {
            return false;
        }
        
        if (this.twoByteOpcodes.size === 0) {
            return false;
        }
        
        for (const [firstByte, secondLevel] of this.threeByteOpcodes) {
            if (secondLevel.size === 0) {
                return false;
            }
        }
        
        return true;
    }

    getOpcodeLength(opcode: number): number {
        const info = this.oneByteOpcodes.get(opcode);
        if (info) {
            return info.length || 1;
        }
        
        const twoByteInfo = this.twoByteOpcodes.get(opcode);
        if (twoByteInfo) {
            return twoByteInfo.length || 2;
        }
        
        return 1;
    }

    isValidInMode(opcode: number, mode: ProcessorMode): boolean {
        const info = this.oneByteOpcodes.get(opcode);
        if (!info) {
            const twoByteInfo = this.twoByteOpcodes.get(opcode);
            if (!twoByteInfo) {
                return false;
            }
            return this.isModeCompatible(twoByteInfo, mode);
        }
        
        return this.isModeCompatible(info, mode);
    }

    getInstructionEncoding(opcode: number): InstructionEncoding {
        const info = this.oneByteOpcodes.get(opcode);
        if (info) {
            return info.encoding || InstructionEncoding.LEGACY;
        }
        
        const twoByteInfo = this.twoByteOpcodes.get(opcode);
        if (twoByteInfo) {
            return twoByteInfo.encoding || InstructionEncoding.LEGACY;
        }
        
        return InstructionEncoding.LEGACY;
    }

    private createInvalidOpcodeInfo(): OpcodeInfo {
        return {
            mnemonic: 'INVALID',
            opcode: 0,
            operandCount: 0,
            operandTypes: [],
            flags: InstructionFlags.NONE,
            isPrivileged: false,
            group: InstructionGroup.GENERAL,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        };
    }

    private isModeCompatible(info: OpcodeInfo, mode: ProcessorMode): boolean {
        switch (mode) {
            case ProcessorMode.REAL_16:
                return info.flags & InstructionFlags.MODE_16;
            case ProcessorMode.PROTECTED_32:
                return info.flags & InstructionFlags.MODE_32;
            case ProcessorMode.LONG_64:
                return info.flags & InstructionFlags.MODE_64;
            default:
                return true;
        }
    }

    private initializeOneByteOpcodes(): void {
        this.addOneByteOpcode(0x00, {
            mnemonic: 'ADD',
            opcode: 0x00,
            operandCount: 2,
            operandTypes: [OperandType.REGISTER, OperandType.REGISTER],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.ARITHMETIC,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });

        this.addOneByteOpcode(0x01, {
            mnemonic: 'ADD',
            opcode: 0x01,
            operandCount: 2,
            operandTypes: [OperandType.REGISTER, OperandType.MEMORY],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.ARITHMETIC,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });

        this.addOneByteOpcode(0x02, {
            mnemonic: 'ADD',
            opcode: 0x02,
            operandCount: 2,
            operandTypes: [OperandType.MEMORY, OperandType.REGISTER],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.ARITHMETIC,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });

        this.addOneByteOpcode(0x03, {
            mnemonic: 'ADD',
            opcode: 0x03,
            operandCount: 2,
            operandTypes: [OperandType.REGISTER, OperandType.REGISTER],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.ARITHMETIC,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });

        this.addOneByteOpcode(0x50, {
            mnemonic: 'PUSH',
            opcode: 0x50,
            operandCount: 1,
            operandTypes: [OperandType.REGISTER],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.STACK,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });

        this.addOneByteOpcode(0x58, {
            mnemonic: 'POP',
            opcode: 0x58,
            operandCount: 1,
            operandTypes: [OperandType.REGISTER],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.STACK,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });

        this.addOneByteOpcode(0x90, {
            mnemonic: 'NOP',
            opcode: 0x90,
            operandCount: 0,
            operandTypes: [],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.GENERAL,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });

        this.addOneByteOpcode(0xC3, {
            mnemonic: 'RET',
            opcode: 0xC3,
            operandCount: 0,
            operandTypes: [],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.CONTROL,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });

        this.addOneByteOpcode(0xC9, {
            mnemonic: 'LEAVE',
            opcode: 0xC9,
            operandCount: 0,
            operandTypes: [],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.STACK,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });

        this.addOneByteOpcode(0xE8, {
            mnemonic: 'CALL',
            opcode: 0xE8,
            operandCount: 1,
            operandTypes: [OperandType.IMMEDIATE],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.CONTROL,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });

        this.addOneByteOpcode(0xEB, {
            mnemonic: 'JMP',
            opcode: 0xEB,
            operandCount: 1,
            operandTypes: [OperandType.IMMEDIATE],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.CONTROL,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });

        this.addOneByteOpcode(0xF4, {
            mnemonic: 'HLT',
            opcode: 0xF4,
            operandCount: 0,
            operandTypes: [],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: true,
            group: InstructionGroup.SYSTEM,
            encoding: InstructionEncoding.LEGACY,
            length: 1
        });
    }

    private initializeTwoByteOpcodes(): void {
        this.addTwoByteOpcode(0x05, {
            mnemonic: 'SYSCALL',
            opcode: 0x05,
            operandCount: 0,
            operandTypes: [],
            flags: InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.SYSTEM,
            encoding: InstructionEncoding.LEGACY,
            length: 2
        });

        this.addTwoByteOpcode(0x80, {
            mnemonic: 'JO',
            opcode: 0x80,
            operandCount: 1,
            operandTypes: [OperandType.IMMEDIATE],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.CONTROL,
            encoding: InstructionEncoding.LEGACY,
            length: 2
        });

        this.addTwoByteOpcode(0x84, {
            mnemonic: 'JZ',
            opcode: 0x84,
            operandCount: 1,
            operandTypes: [OperandType.IMMEDIATE],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.CONTROL,
            encoding: InstructionEncoding.LEGACY,
            length: 2
        });

        this.addTwoByteOpcode(0xA2, {
            mnemonic: 'CPUID',
            opcode: 0xA2,
            operandCount: 0,
            operandTypes: [],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.SYSTEM,
            encoding: InstructionEncoding.LEGACY,
            length: 2
        });

        this.addTwoByteOpcode(0xAE, {
            mnemonic: 'FXSAVE',
            opcode: 0xAE,
            operandCount: 1,
            operandTypes: [OperandType.MEMORY],
            flags: InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.FPU,
            encoding: InstructionEncoding.LEGACY,
            length: 2
        });

        this.addTwoByteOpcode(0xAF, {
            mnemonic: 'IMUL',
            opcode: 0xAF,
            operandCount: 2,
            operandTypes: [OperandType.REGISTER, OperandType.MEMORY],
            flags: InstructionFlags.MODE_16 | InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.ARITHMETIC,
            encoding: InstructionEncoding.LEGACY,
            length: 2
        });
    }

    private initializeThreeByteOpcodes(): void {
        this.addThreeByteOpcode(0x38, 0x00, {
            mnemonic: 'PSHUFB',
            opcode: 0x00,
            operandCount: 2,
            operandTypes: [OperandType.REGISTER, OperandType.REGISTER],
            flags: InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.SIMD,
            encoding: InstructionEncoding.SSE,
            length: 3
        });

        this.addThreeByteOpcode(0x38, 0xF0, {
            mnemonic: 'MOVBE',
            opcode: 0xF0,
            operandCount: 2,
            operandTypes: [OperandType.REGISTER, OperandType.MEMORY],
            flags: InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.GENERAL,
            encoding: InstructionEncoding.LEGACY,
            length: 3
        });

        this.addThreeByteOpcode(0x3A, 0x0F, {
            mnemonic: 'PALIGNR',
            opcode: 0x0F,
            operandCount: 3,
            operandTypes: [OperandType.REGISTER, OperandType.REGISTER, OperandType.IMMEDIATE],
            flags: InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.SIMD,
            encoding: InstructionEncoding.SSE,
            length: 3
        });

        this.addThreeByteOpcode(0x3A, 0x20, {
            mnemonic: 'PINSRB',
            opcode: 0x20,
            operandCount: 3,
            operandTypes: [OperandType.REGISTER, OperandType.REGISTER, OperandType.IMMEDIATE],
            flags: InstructionFlags.MODE_32 | InstructionFlags.MODE_64,
            isPrivileged: false,
            group: InstructionGroup.SIMD,
            encoding: InstructionEncoding.SSE,
            length: 3
        });
    }
}
