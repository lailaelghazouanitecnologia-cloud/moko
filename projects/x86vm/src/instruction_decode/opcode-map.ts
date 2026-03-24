private oneByteOpcodes: Map<number, InstructionInfo>;
    private twoByteOpcocs: Map<number, InstructionInfo>;
    private threeByteOpcodes: Map<number, InstructionInfo>;

    constructor() {
        this.oneByteOpcodes = new Map<number, InstructionInfo>();
        this.twoByteOpcocs = new Map<number, InstructionInfo>();
        this.threeByteOpcodes = new Map<number, InstructionInfo>();
    }

    getInstruction(opcode: number, has66: boolean, hasF2: boolean, hasF3: boolean): InstructionInfo {
        let info = this.oneByteOpcodes.get(opcode);
        if (info) return info;
        
        const adjustedOpcode = has66 ? opcode | 0x100 : hasF2 ? opcode | 0x200 : hasF3 ? opcode | 0x300 : opcode;
        
        info = this.twoByteOpcocs.get(adjustedOpcode);
        if (info) return info;
        
        return this.threeByteOpcodes.get(adjustedOpcode) || null;
    }

    addOpcode(opcode: number, info: InstructionInfo): void {
        if (opcode > 0xFFFF) {
            this.threeByteOpcodes.set(opcode, info);
        } else if (opcode > 0xFF) {
            this.twoByteOpcocs.set(opcode, info);
        } else {
            this.oneByteOpcodes.set(opcode, info);
        }
    }

    isTwoByteOpcode(firstByte: number): boolean {
        return firstByte === 0x0F;
    }

    isThreeByteOpcode(firstBytes: Uint8Array): boolean {
        if (firstBytes.length < 2) return false;
        return firstBytes[0] === 0x0F && (firstBytes[1] === 0x38 || firstBytes[1] === 0x3A);
    }

    getOperandCount(opcode: number): number {
        const info = this.getInstruction(opcode, false, false, false);
        return info ? info.operands.length : 0;
    }

    getOperandTypes(opcode: number): OperandType[] {
        const info = this.getInstruction(opcode, false, false, false);
        return info ? info.operands.map(op => op.type) : [];
    }

    getInstructionMnemonic(opcode: number): string {
        const info = this.getInstruction(opcode, false, false, false);
        return info ? info.mnemonic : '';
    }
}
