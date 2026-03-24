private primaryMap: Map<number, OpcodeInfo> = new Map();
    private secondaryMap: Map<number, OpcodeInfo> = new Map();
    private groupMaps: Map<number, Map<number, OpcodeInfo>> = new Map();

    static readonly OPCODE_TABLE_SIZE = 256;

    initialize(): void {
        this.populateArithmetic();
        this.populateLogical();
        this.populateShift();
        this.populateFlags();
        this.populateStack();
        this.populateJump();
        this.populateMove();
        this.populateString();
        this.populateIO();
        this.populateInterrupt();
        this.populateProtected();
    }

    addOpcode(byte: number, info: OpcodeInfo): void {
        this.primaryMap.set(byte, info);
    }

    addSecondaryOpcode(byte: number, info: OpcodeInfo): void {
        this.secondaryMap.set(byte, info);
    }

    addGroupOpcode(group: number, subcode: number, info: OpcodeInfo): void {
        if (!this.groupMaps.has(group)) {
            this.groupMaps.set(group, new Map());
        }
        this.groupMaps.get(group)!.set(subcode, info);
    }

    getOpcode(byte: number, has0F: boolean): OpcodeInfo | null {
        if (has0F) {
            return this.secondaryMap.get(byte) || null;
        }
        return this.primaryMap.get(byte) || null;
    }

    getGroupOpcode(group: number, subcode: number): OpcodeInfo | null {
        const groupMap = this.groupMaps.get(group);
        if (!groupMap) return null;
        return groupMap.get(subcode) || null;
    }

    populateArithmetic(): void {
        this.addOpcode(0x00, { mnemonic: 'ADD', operands: ['Eb', 'Gb'], flags: 'OSZAPC' });
        this.addOpcode(0x01, { mnemonic: 'ADD', operands: ['Ev', 'Gv'], flags: 'OSZAPC' });
        this.addOpcode(0x02, { mnemonic: 'ADD', operands: ['Gb', 'Eb'], flags: 'OSZAPC' });
        this.addOpcode(0x03, { mnemonic: 'ADD', operands: ['Gv', 'Ev'], flags: 'OSZAPC' });
        this.addOpcode(0x04, { mnemonic: 'ADD', operands: ['AL', 'Ib'], flags: 'OSZAPC' });
        this.addOpcode(0x05, { mnemonic: 'ADD', operands: ['AX', 'Iv'], flags: 'OSZAPC' });
        this.addOpcode(0x28, { mnemonic: 'SUB', operands: ['Eb', 'Gb'], flags: 'OSZAPC' });
        this.addOpcode(0x29, { mnemonic: 'SUB', operands: ['Ev', 'Gv'], flags: 'OSZAPC' });
        this.addOpcode(0x2A, { mnemonic: 'SUB', operands: ['Gb', 'Eb'], flags: 'OSZAPC' });
        this.addOpcode(0x2B, { mnemonic: 'SUB', operands: ['Gv', 'Ev'], flags: 'OSZAPC' });
        this.addOpcode(0x2C, { mnemonic: 'SUB', operands: ['AL', 'Ib'], flags: 'OSZAPC' });
        this.addOpcode(0x2D, { mnemonic: 'SUB', operands: ['AX', 'Iv'], flags: 'OSZAPC' });
        this.addOpcode(0xF6, { mnemonic: 'MUL', operands: ['Eb'], flags: 'OSZAPC', group: 4 });
        this.addOpcode(0xF7, { mnemonic: 'MUL', operands: ['Ev'], flags: 'OSZAPC', group: 4 });
        this.addOpcode(0xF6, { mnemonic: 'IMUL', operands: ['Eb'], flags: 'OSZAPC', group: 5 });
        this.addOpcode(0xF7, { mnemonic: 'IMUL', operands: ['Ev'], flags: 'OSZAPC', group: 5 });
        this.addOpcode(0xF6, { mnemonic: 'DIV', operands: ['Eb'], flags: 'OSZAPC', group: 6 });
        this.addOpcode(0xF7, { mnemonic: 'DIV', operands: ['Ev'], flags: 'OSZAPC', group: 6 });
        this.addOpcode(0xF6, { mnemonic: 'IDIV', operands: ['Eb'], flags: 'OSZAPC', group: 7 });
        this.addOpcode(0xF7, { mnemonic: 'IDIV', operands: ['Ev'], flags: 'OSZAPC', group: 7 });
        this.addOpcode(0x40, { mnemonic: 'INC', operands: ['AX'], flags: 'OSZAP' });
        this.addOpcode(0x41, { mnemonic: 'INC', operands: ['CX'], flags: 'OSZAP' });
        this.addOpcode(0x42, { mnemonic: 'INC', operands: ['DX'], flags: 'OSZAP' });
        this.addOpcode(0x43, { mnemonic: 'INC', operands: ['BX'], flags: 'OSZAP' });
        this.addOpcode(0x44, { mnemonic: 'INC', operands: ['SP'], flags: 'OSZAP' });
        this.addOpcode(0x45, { mnemonic: 'INC', operands: ['BP'], flags: 'OSZAP' });
        this.addOpcode(0x46, { mnemonic: 'INC', operands: ['SI'], flags: 'OSZAP' });
        this.addOpcode(0x47, { mnemonic: 'INC', operands: ['DI'], flags: 'OSZAP' });
        this.addOpcode(0x48, { mnemonic: 'DEC', operands: ['AX'], flags: 'OSZAP' });
        this.addOpcode(0x49, { mnemonic: 'DEC', operands: ['CX'], flags: 'OSZAP' });
        this.addOpcode(0x4A, { mnemonic: 'DEC', operands: ['DX'], flags: 'OSZAP' });
        this.addOpcode(0x4B, { mnemonic: 'DEC', operands: ['BX'], flags: 'OSZAP' });
        this.addOpcode(0x4C, { mnemonic: 'DEC', operands: ['SP'], flags: 'OSZAP' });
        this.addOpcode(0x4D, { mnemonic: 'DEC', operands: ['BP'], flags: 'OSZAP' });
        this.addOpcode(0x4E, { mnemonic: 'DEC', operands: ['SI'], flags: 'OSZAP' });
        this.addOpcode(0x4F, { mnemonic: 'DEC', operands: ['DI'], flags: 'OSZAP' });
        this.addOpcode(0xFE, { mnemonic: 'INC', operands: ['Eb'], flags: 'OSZAP', group: 0 });
        this.addOpcode(0xFF, { mnemonic: 'INC', operands: ['Ev'], flags: 'OSZAP', group: 0 });
        this.addOpcode(0xFE, { mnemonic: 'DEC', operands: ['Eb'], flags: 'OSZAP', group: 1 });
        this.addOpcode(0xFF, { mnemonic: 'DEC', operands: ['Ev'], flags: 'OSZAP', group: 1 });
        this.addOpcode(0x98, { mnemonic: 'CBW', operands: [], flags: 'OSZAP' });
        this.addOpcode(0x99, { mnemonic: 'CWD', operands: [], flags: 'OSZAP' });
    }

    populateLogical(): void {
        this.addOpcode(0x20, { mnemonic: 'AND', operands: ['Eb', 'Gb'], flags: 'OSZPC' });
        this.addOpcode(0x21, { mnemonic: 'AND', operands: ['Ev', 'Gv'], flags: 'OSZPC' });
        this.addOpcode(0x22, { mnemonic: 'AND', operands: ['Gb', 'Eb'], flags: 'OSZPC' });
        this.addOpcode(0x23, { mnemonic: 'AND', operands: ['Gv', 'Ev'], flags: 'OSZPC' });
        this.addOpcode(0x24, { mnemonic: 'AND', operands: ['AL', 'Ib'], flags: 'OSZPC' });
        this.addOpcode(0x25, { mnemonic: 'AND', operands: ['AX', 'Iv'], flags: 'OSZPC' });
        this.addOpcode(0x08, { mnemonic: 'OR', operands: ['Eb', 'Gb'], flags: 'OSZPC' });
        this.addOpcode(0x09, { mnemonic: 'OR', operands: ['Ev', 'Gv'], flags: 'OSZPC' });
        this.addOpcode(0x0A, { mnemonic: 'OR', operands: ['Gb', 'Eb'], flags: 'OSZPC' });
        this.addOpcode(0x0B, { mnemonic: 'OR', operands: ['Gv', 'Ev'], flags: 'OSZPC' });
        this.addOpcode(0x0C, { mnemonic: 'OR', operands: ['AL', 'Ib'], flags: 'OSZPC' });
        this.addOpcode(0x0D, { mnemonic: 'OR', operands: ['AX', 'Iv'], flags: 'OSZPC' });
        this.addOpcode(0x30, { mnemonic: 'XOR', operands: ['Eb', 'Gb'], flags: 'OSZPC' });
        this.addOpcode(0x31, { mnemonic: 'XOR', operands: ['Ev', 'Gv'], flags: 'OSZPC' });
        this.addOpcode(0x32, { mnemonic: 'XOR', operands: ['Gb', 'Eb'], flags: 'OSZPC' });
        this.addOpcode(0x33, { mnemonic: 'XOR', operands: ['Gv', 'Ev'], flags: 'OSZPC' });
        this.addOpcode(0x34, { mnemonic: 'XOR', operands: ['AL', 'Ib'], flags: 'OSZPC' });
        this.addOpcode(0x35, { mnemonic: 'XOR', operands: ['AX', 'Iv'], flags: 'OSZPC' });
        this.addOpcode(0xF6, { mnemonic: 'NOT', operands: ['Eb'], flags: 'none', group: 2 });
        this.addOpcode(0xF7, { mnemonic: 'NOT', operands: ['Ev'], flags: 'none', group: 2 });
        this.addOpcode(0xF6, { mnemonic: 'NEG', operands: ['Eb'], flags: 'OSZAPC', group: 3 });
        this.addOpcode(0xF7, { mnemonic: 'NEG', operands: ['Ev'], flags: 'OSZAPC', group: 3 });
        this.addOpcode(0x84, { mnemonic: 'TEST', operands: ['Eb', 'Gb'], flags: 'OSZPC' });
        this.addOpcode(0x85, { mnemonic: 'TEST', operands: ['Ev', 'Gv'], flags: 'OSZPC' });
        this.addOpcode(0xA8, { mnemonic: 'TEST', operands: ['AL', 'Ib'], flags: 'OSZPC' });
        this.addOpcode(0xA9, { mnemonic: 'TEST', operands: ['AX', 'Iv'], flags: 'OSZPC' });
        this.addOpcode(0xA4, { mnemonic: 'SHLD', operands: ['Ev', 'Gv', 'Ib'], flags: 'OSZPC' });
        this.addOpcode(0xA5, { mnemonic: 'SHLD', operands: ['Ev', 'Gv', 'CL'], flags: 'OSZPC' });
        this.addOpcode(0xAC, { mnemonic: 'SHRD', operands: ['Ev', 'Gv', 'Ib'], flags: 'OSZPC' });
        this.addOpcode(0xAD, { mnemonic: 'SHRD', operands: ['Ev', 'Gv', 'CL'], flags: 'OSZPC' });
    }

    populateShift(): void {
        this.addOpcode(0xD0, { mnemonic: 'SHL', operands: ['Eb', '1'], flags: 'OSZPC', group: 4 });
        this.addOpcode(0xD1, { mnemonic: 'SHL', operands: ['Ev', '1'], flags: 'OSZPC', group: 4 });
        this.addOpcode(0xD2, { mnemonic: 'SHL', operands: ['Eb', 'CL'], flags: 'OSZPC', group: 4 });
        this.addOpcode(0xD3, { mnemonic: 'SHL', operands: ['Ev', 'CL'], flags: 'OSZPC', group: 4 });
        this.addOpcode(0xD0, { mnemonic: 'SHR', operands: ['Eb', '1'], flags: 'OSZPC', group: 5 });
        this.addOpcode(0xD1, { mnemonic: 'SHR', operands: ['Ev', '1'], flags: 'OSZPC', group: 5 });
        this.addOpcode(0xD2, { mnemonic: 'SHR', operands: ['Eb', 'CL'], flags: 'OSZPC', group: 5 });
        this.addOpcode(0xD3, { mnemonic: 'SHR', operands: ['Ev', 'CL'], flags: 'OSZPC', group: 5 });
        this.addOpcode(0xD0, { mnemonic: 'SAR', operands: ['Eb', '1'], flags: 'OSZPC', group: 7 });
        this.addOpcode(0xD1, { mnemonic: 'SAR', operands: ['Ev', '1'], flags: 'OSZPC', group: 7 });
        this.addOpcode(0xD2, { mnemonic: 'SAR', operands: ['Eb', 'CL'], flags: 'OSZPC', group: 7 });
        this.addOpcode(0xD3, { mnemonic: 'SAR', operands: ['Ev', 'CL'], flags: 'OSZPC', group: 7 });
        this.addOpcode(0xC0, { mnemonic: 'SHL', operands: ['Eb', 'Ib'], flags: 'OSZPC', group: 4 });
        this.addOpcode(0xC1, { mnemonic: 'SHL', operands: ['Ev', 'Ib'], flags: 'OSZPC', group: 4 });
        this.addOpcode(0xC0, { mnemonic: 'SHR', operands: ['Eb', 'Ib'], flags: 'OSZPC', group: 5 });
        this.addOpcode(0xC1, { mnemonic: 'SHR', operands: ['Ev', 'Ib'], flags: 'OSZPC', group: 5 });
        this.addOpcode(0xC0, { mnemonic: 'SAR', operands: ['Eb', 'Ib'], flags: 'OSZPC', group: 7 });
        this.addOpcode(0xC1, { mnemonic: 'SAR', operands: ['Ev', 'Ib'], flags: 'OSZPC', group: 7 });
        this.addOpcode(0xD0, { mnemonic: 'ROL', operands: ['Eb', '1'], flags: 'OC', group: 0 });
        this.addOpcode(0xD1, { mnemonic: 'ROL', operands: ['Ev', '1'], flags: 'OC', group: 0 });
        this.addOpcode(0xD2, { mnemonic: 'ROL', operands: ['Eb', 'CL'], flags: 'OC', group: 0 });
        this.addOpcode(0xD3, { mnemonic: 'ROL', operands: ['Ev', 'CL'], flags: 'OC', group: 0 });
        this.addOpcode(0xD0, { mnemonic: 'ROR', operands: ['Eb', '1'], flags: 'OC', group: 1 });
        this.addOpcode(0xD1, { mnemonic: 'ROR', operands: ['Ev', '1'], flags: 'OC', group: 1 });
        this.addOpcode(0xD2, { mnemonic: 'ROR', operands: ['Eb', 'CL'], flags: 'OC', group: 1 });
        this.addOpcode(0xD3, { mnemonic: 'ROR', operands: ['Ev', 'CL'], flags: 'OC', group: 1 });
        this.addOpcode(0xC0, { mnemonic: 'ROL', operands: ['Eb', 'Ib'], flags: 'OC', group: 0 });
        this.addOpcode(0xC1, { mnemonic: 'ROL', operands: ['Ev', 'Ib'], flags: 'OC', group: 0 });
        this.addOpcode(0xC0, { mnemonic: 'ROR', operands: ['Eb', 'Ib'], flags: 'OC', group: 1 });
        this.addOpcode(0xC1, { mnemonic: 'ROR', operands: ['Ev', 'Ib'], flags: 'OC', group: 1 });
    }

    populateFlags(): void {
        this.addOpcode(0xF8, { mnemonic: 'CLC', operands: [], flags: 'C' });
        this.addOpcode(0xF9, { mnemonic: 'STC', operands: [], flags: 'C' });
        this.addOpcode(0xF5, { mnemonic: 'CMC', operands: [], flags: 'C' });
        this.addOpcode(0xFC, { mnemonic: 'CLD', operands: [], flags: 'D' });
        this.addOpcode(0xFD, { mnemonic: 'STD', operands: [], flags: 'D' });
        this.addOpcode(0xFA, { mnemonic: 'CLI', operands: [], flags: 'I' });
        this.addOpcode(0xFB, { mnemonic: 'STI', operands: [], flags: 'I' });
        this.addOpcode(0x9C, { mnemonic: 'PUSHF', operands: [], flags: 'none' });
        this.addOpcode(0x9D, { mnemonic: 'POPF', operands: [], flags: 'OSZAPC' });
        this.addOpcode(0x9E, { mnemonic: 'SAHF', operands: [], flags: 'OSZAPC' });
        this.addOpcode(0x9F, { mnemonic: 'LAHF', operands: [], flags: 'none' });
    }

    populateStack(): void {
        this.addOpcode(0x50, { mnemonic: 'PUSH', operands: ['AX'], flags: 'none' });
        this.addOpcode(0x51, { mnemonic: 'PUSH', operands: ['CX'], flags: 'none' });
        this.addOpcode(0x52, { mnemonic: 'PUSH', operands: ['DX'], flags: 'none' });
        this.addOpcode(0x53, { mnemonic: 'PUSH', operands: ['BX'], flags: 'none' });
        this.addOpcode(0x54, { mnemonic: 'PUSH', operands: ['SP'], flags: 'none' });
        this.addOpcode(0x55, { mnemonic: 'PUSH', operands: ['BP'], flags: 'none' });
        this.addOpcode(0x56, { mnemonic: 'PUSH', operands: ['SI'], flags: 'none' });
        this.addOpcode(0x57, { mnemonic: 'PUSH', operands: ['DI'], flags: 'none' });
        this.addOpcode(0x58, { mnemonic: 'POP', operands: ['AX'], flags: 'none' });
        this.addOpcode(0x59, { mnemonic: 'POP', operands: ['CX'], flags: 'none' });
        this.addOpcode(0x5A, { mnemonic: 'POP', operands: ['DX'], flags: 'none' });
        this.addOpcode(0x5B, { mnemonic: 'POP', operands: ['BX'], flags: 'none' });
        this.addOpcode(0x5C, { mnemonic: 'POP', operands: ['SP'], flags: 'none' });
        this.addOpcode(0x5D, { mnemonic: 'POP', operands: ['BP'], flags: 'none' });
        this.addOpcode(0x5E, { mnemonic: 'POP', operands: ['SI'], flags: 'none' });
        this.addOpcode(0x5F, { mnemonic: 'POP', operands: ['DI'], flags: 'none' });
        this.addOpcode(0xFF, { mnemonic: 'PUSH', operands: ['Ev'], flags: 'none', group: 6 });
        this.addOpcode(0x8F, { mnemonic: 'POP', operands: ['Ev'], flags: 'none', group: 0 });
        this.addOpcode(0x06, { mnemonic: 'PUSH', operands: ['ES'], flags: 'none' });
        this.addOpcode(0x07, { mnemonic: 'POP', operands: ['ES'], flags: 'none' });
        this.addOpcode(0x0E, { mnemonic: 'PUSH', operands: ['CS'], flags: 'none' });
        this.addOpcode(0x16, { mnemonic: 'PUSH', operands: ['SS'], flags: 'none' });
        this.addOpcode(0x17, { mnemonic: 'POP', operands: ['SS'], flags: 'none' });
        this.addOpcode(0x1E, { mnemonic: 'PUSH', operands: ['DS'], flags: 'none' });
        this.addOpcode(0x1F, { mnemonic: 'POP', operands: ['DS'], flags: 'none' });
        this.addOpcode(0x68, { mnemonic: 'PUSH', operands: ['Iv'], flags: 'none' });
        this.addOpcode(0x6A, { mnemonic: 'PUSH', operands: ['Ib'], flags: 'none' });
    }

    populateJump(): void {
        this.addOpcode(0xE8, { mnemonic: 'CALL', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x9A, { mnemonic: 'CALL', operands: ['Ap'], flags: 'none' });
        this.addOpcode(0xFF, { mnemonic: 'CALL', operands: ['Ev'], flags: 'none', group: 2 });
        this.addOpcode(0xE9, { mnemonic: 'JMP', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0xEB, { mnemonic: 'JMP', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0xEA, { mnemonic: 'JMP', operands: ['Ap'], flags: 'none' });
        this.addOpcode(0xFF, { mnemonic: 'JMP', operands: ['Ev'], flags: 'none', group: 4 });
        this.addOpcode(0xC2, { mnemonic: 'RET', operands: ['Iw'], flags: 'none' });
        this.addOpcode(0xC3, { mnemonic: 'RET', operands: [], flags: 'none' });
        this.addOpcode(0xCA, { mnemonic: 'RETF', operands: ['Iw'], flags: 'none' });
        this.addOpcode(0xCB, { mnemonic: 'RETF', operands: [], flags: 'none' });
        this.addOpcode(0x70, { mnemonic: 'JO', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x71, { mnemonic: 'JNO', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x72, { mnemonic: 'JB', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x73, { mnemonic: 'JNB', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x74, { mnemonic: 'JZ', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x75, { mnemonic: 'JNZ', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x76, { mnemonic: 'JBE', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x77, { mnemonic: 'JNBE', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x78, { mnemonic: 'JS', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x79, { mnemonic: 'JNS', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x7A, { mnemonic: 'JP', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x7B, { mnemonic: 'JNP', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x7C, { mnemonic: 'JL', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x7D, { mnemonic: 'JNL', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x7E, { mnemonic: 'JLE', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x7F, { mnemonic: 'JNLE', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0xE0, { mnemonic: 'LOOPNZ', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0xE1, { mnemonic: 'LOOPZ', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0xE2, { mnemonic: 'LOOP', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0xE3, { mnemonic: 'JCXZ', operands: ['Jb'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JO', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JNO', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JB', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JNB', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JZ', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JNZ', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JBE', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JNBE', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JS', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JNS', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JP', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JNP', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F, { mnemonic: 'JL', operands: ['Jv'], flags: 'none' });
        this.addOpcode(0x0F
