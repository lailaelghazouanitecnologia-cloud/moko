private mod: number = 0;
    private reg: number = 0;
    private rm: number = 0;
    private hasSIB: boolean = false;
    private displacementSize: number = 0;

    parseModRM(byte: number): ModRMInfo {
        this.mod = (byte >> 6) & 0x03;
        this.reg = (byte >> 3) & 0x07;
        this.rm = byte & 0x07;
        
        return {
            mod: this.mod,
            reg: this.reg,
            rm: this.rm,
            hasSIB: this.needsSIB(this.mod, this.rm),
            displacementSize: this.getDisplacementSize(this.mod, this.rm, true)
        };
    }

    parseSIB(byte: number): SIBInfo {
        const scale = (byte >> 6) & 0x03;
        const index = (byte >> 3) & 0x07;
        const base = byte & 0x07;
        
        return {
            scale,
            index,
            base,
            scaleFactor: this.getScaleFactor(scale)
        };
    }

    needsSIB(mod: number, rm: number): boolean {
        return rm === 4 && mod !== 3;
    }

    getDisplacementSize(mod: number, rm: number, is32Bit: boolean): 0 | 1 | 4 {
        if (mod === 0) {
            if (rm === 5) return 4;
            return 0;
        } else if (mod === 1) {
            return 1;
        } else if (mod === 2) {
            return is32Bit ? 4 : 2;
        }
        return 0;
    }

    decodeRegister(reg: number, is32Bit: boolean, isSegment: boolean): Register {
        if (isSegment) {
            const segmentRegs = [Register.ES, Register.CS, Register.SS, Register.DS, Register.FS, Register.GS, Register.ES, Register.ES];
            return segmentRegs[reg & 0x07];
        }
        
        if (is32Bit) {
            const regs32 = [Register.EAX, Register.ECX, Register.EDX, Register.EBX, Register.ESP, Register.EBP, Register.ESI, Register.EDI];
            return regs32[reg & 0x07];
        } else {
            const regs16 = [Register.AX, Register.CX, Register.DX, Register.BX, Register.SP, Register.BP, Register.SI, Register.DI];
            return regs16[reg & 0x07];
        }
    }

    decodeRMRegister(rm: number, is32Bit: boolean): Register {
        return this.decodeRegister(rm, is32Bit, false);
    }

    calculateMemoryAddress(modrm: ModRMInfo, sib?: SIBInfo, displacement: number = 0, segment: Segment = Segment.DS): number {
        let address = 0;
        
        if (modrm.mod === 3) {
            return 0;
        }
        
        if (sib) {
            let base = 0;
            if (sib.base !== 5 || modrm.mod !== 0) {
                const baseRegister = this.getBaseRegister(sib.base, modrm.mod);
                if (baseRegister !== null) {
                    address += this.getRegisterValue(baseRegister);
                }
            }
            
            if (sib.index !== 4) {
                const indexRegister = this.getIndexRegister(sib);
                if (indexRegister !== null) {
                    address += this.getRegisterValue(indexRegister) * sib.scaleFactor;
                }
            }
        } else {
            if (modrm.rm !== 5 || modrm.mod !== 0) {
                const baseRegister = this.getBaseRegister(modrm.rm, modrm.mod);
                if (baseRegister !== null) {
                    address += this.getRegisterValue(baseRegister);
                }
            }
        }
        
        address += displacement;
        
        return address;
    }

    getBaseRegister(rm: number, mod: number): Register | null {
        if (mod === 3) return null;
        
        if (rm === 5 && mod === 0) {
            return null;
        }
        
        const baseRegs = [Register.EAX, Register.ECX, Register.EDX, Register.EBX, Register.ESP, Register.EBP, Register.ESI, Register.EDI];
        return baseRegs[rm & 0x07];
    }

    getIndexRegister(sib: SIBInfo): Register | null {
        if (sib.index === 4) return null;
        
        const indexRegs = [Register.EAX, Register.ECX, Register.EDX, Register.EBX, Register.ESP, Register.EBP, Register.ESI, Register.EDI];
        return indexRegs[sib.index & 0x07];
    }

    getScaleFactor(scale: number): 1 | 2 | 4 | 8 {
        const factors = [1, 2, 4, 8] as const;
        return factors[scale & 0x03];
    }

    isValidCombination(modrm: ModRMInfo, sib?: SIB): boolean {
        if (modrm.mod === 3) return true;
        
        if (sib) {
            if (sib.base === 5 && modrm.mod === 0) {
                return true;
            }
            if (sib.index === 4 && modrm.rm === 4) {
                return true;
            }
        }
        
        if (modrm.rm === 5 && modrm.mod === 0) {
            return true;
        }
        
        return true;
    }

    getSegmentOverride(modrm: ModRMInfo, defaultSegment: Segment): Segment {
        return defaultSegment;
    }

    parseAddressingMode(modrm: ModRMInfo, sib?: SIBInfo): AddressingMode {
        if (modrm.mod === 3) {
            return AddressingMode.Register;
        }
        return AddressingMode.Memory;
    }

    getRegisterList(modrm: ModRegister): Register[] {
        const registers: Register[] = [];
        
        const regRegister = this.decodeRegister(modrm.reg, true, false);
        registers.push(regRegister);
        
        if (modrm.mod === 3) {
            const rmRegister = this.decodeRMRegister(modrm.rm, true);
            registers.push(rmRegister);
        }
        
        return registers;
    }

    dump(info: ModRMInfo): string {
        return `MOD: ${info.mod}, REG: ${info.reg}, RM: ${info.rm}, SIB: ${info.hasSIB}, DISP: ${info.displacementSize}`;
    }

    private getRegisterValue(reg: Register): number {
        return 0;
    }
}
