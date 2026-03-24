import { InstructionType } from './instruction-type';

export class Instruction {
    opcode: number;
    type: InstructionType;
    x: number;
    y: number;
    nnn: number;
    nn: number;
    n: number;

    constructor(opcode: number) {
        this.opcode = opcode;
        this.type = InstructionType.UNKNOWN;
        this.x = 0;
        this.y = 0;
        this.nnn = 0;
        this.nn = 0;
        this.n = 0;

        this.x = (opcode >> 8) & 0xF;
        this.y = (opcode >> 4) & 0xF;
        this.nnn = opcode & 0xFFF;
        this.nn = opcode & 0xFF;
        this.n = opcode & 0xF;

        const highNibble = (opcode >> 12) & 0xF;
        const lowByte = opcode & 0xFF;
        const lowNibble = opcode & 0xF;

        if (opcode === 0x00E0) {
            this.type = InstructionType.CLS;
        } else if (opcode === 0x00EE) {
            this.type = InstructionType.RET;
        } else if (highNibble === 0x1) {
            this.type = InstructionType.JP_ADDR;
        } else if (highNibble === 0x2) {
            this.type = InstructionType.CALL_ADDR;
        } else if (highNibble === 0x3) {
            this.type = InstructionType.SE_VX_BYTE;
        } else if (highNibble === 0x4) {
            this.type = InstructionType.SNE_VX_BYTE;
        } else if (highNibble === 0x5 && lowNibble === 0x0) {
            this.type = InstructionType.SE_VX_VY;
        } else if (highNibble === 0x6) {
            this.type = InstructionType.LD_VX_BYTE;
        } else if (highNibble === 0x7) {
            this.type = InstructionType.ADD_VX_BYTE;
        } else if (highNibble === 0x8) {
            switch (lowNibble) {
                case 0x0: this.type = InstructionType.LD_VX_VY; break;
                case 0x1: this.type = InstructionType.OR_VX_VY; break;
                case 0x2: this.type = InstructionType.AND_VX_VY; break;
                case 0x3: this.type = InstructionType.XOR_VX_VY; break;
                case 0x4: this.type = InstructionType.ADD_VX_VY; break;
                case 0x5: this.type = InstructionType.SUB_VX_VY; break;
                case 0x6: this.type = InstructionType.SHR_VX_VY; break;
                case 0x7: this.type = InstructionType.SUBN_VX_VY; break;
                case 0xE: this.type = InstructionType.SHL_VX_VY; break;
            }
        } else if (highNibble === 0x9 && lowNibble === 0x0) {
            this.type = InstructionType.SNE_VX_VY;
        } else if (highNibble === 0xA) {
            this.type = InstructionType.LD_I_ADDR;
        } else if (highNibble === 0xB) {
            this.type = InstructionType.JP_V0_ADDR;
        } else if (highNibble === 0xC) {
            this.type = InstructionType.RND_VX_BYTE;
        } else if (highNibble === 0xD) {
            this.type = InstructionType.DRW_VX_VY_NIBBLE;
        } else if (highNibble === 0xE) {
            if (lowByte === 0x9E) {
                this.type = InstructionType.SKP_VX;
            } else if (lowByte === 0xA1) {
                this.type = InstructionType.SKNP_VX;
            }
        } else if (highNibble === 0xF) {
            switch (lowByte) {
                case 0x07: this.type = InstructionType.LD_VX_DT; break;
                case 0x0A: this.type = InstructionType.LD_VX_K; break;
                case 0x15: this.type = InstructionType.LD_DT_VX; break;
                case 0x18: this.type = InstructionType.LD_ST_VX; break;
                case 0x1E: this.type = InstructionType.ADD_I_VX; break;
                case 0x29: this.type = InstructionType.LD_F_VX; break;
                case 0x33: this.type = InstructionType.LD_B_VX; break;
                case 0x55: this.type = InstructionType.LD_I_VX; break;
                case 0x65: this.type = InstructionType.LD_VX_I; break;
            }
        }
    }

    toString(): string {
        const hex = (this.opcode & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
        return `0x${hex} ${this.getMnemonic()}`;
    }

    getMnemonic(): string {
        switch (this.type) {
            case InstructionType.CLS: return 'CLS';
            case InstructionType.RET: return 'RET';
            case InstructionType.JP_ADDR: return `JP ${this.nnn.toString(16).toUpperCase()}`;
            case InstructionType.CALL_ADDR: return `CALL ${this.nnn.toString(16).toUpperCase()}`;
            case InstructionType.SE_VX_BYTE: return `SE V${this.x.toString(16).toUpperCase()}, ${this.nn}`;
            case InstructionType.SNE_VX_BYTE: return `SNE V${this.x.toString(16).toUpperCase()}, ${this.nn}`;
            case InstructionType.SE_VX_VY: return `SE V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}`;
            case InstructionType.LD_VX_BYTE: return `LD V${this.x.toString(16).toUpperCase()}, ${this.nn}`;
            case InstructionType.ADD_VX_BYTE: return `ADD V${this.x.toString(16).toUpperCase()}, ${this.nn}`;
            case InstructionType.LD_VX_VY: return `LD V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}`;
            case InstructionType.OR_VX_VY: return `OR V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}`;
            case InstructionType.AND_VX_VY: return `AND V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}`;
            case InstructionType.XOR_VX_VY: return `XOR V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}`;
            case InstructionType.ADD_VX_VY: return `ADD V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}`;
            case InstructionType.SUB_VX_VY: return `SUB V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}`;
            case InstructionType.SHR_VX_VY: return `SHR V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}`;
            case InstructionType.SUBN_VX_VY: return `SUBN V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}`;
            case InstructionType.SHL_VX_VY: return `SHL V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}`;
            case InstructionType.SNE_VX_VY: return `SNE V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}`;
            case InstructionType.LD_I_ADDR: return `LD I, ${this.nnn.toString(16).toUpperCase()}`;
            case InstructionType.JP_V0_ADDR: return `JP V0, ${this.nnn.toString(16).toUpperCase()}`;
            case InstructionType.RND_VX_BYTE: return `RND V${this.x.toString(16).toUpperCase()}, ${this.nn}`;
            case InstructionType.DRW_VX_VY_NIBBLE: return `DRW V${this.x.toString(16).toUpperCase()}, V${this.y.toString(16).toUpperCase()}, ${this.n}`;
            case InstructionType.SKP_VX: return `SKP V${this.x.toString(16).toUpperCase()}`;
            case InstructionType.SKNP_VX: return `SKNP V${this.x.toString(16).toUpperCase()}`;
            case InstructionType.LD_VX_DT: return `LD V${this.x.toString(16).toUpperCase()}, DT`;
            case InstructionType.LD_VX_K: return `LD V${this.x.toString(16).toUpperCase()}, K`;
            case InstructionType.LD_DT_VX: return `LD DT, V${this.x.toString(16).toUpperCase()}`;
            case InstructionType.LD_ST_VX: return `LD ST, V${this.x.toString(16).toUpperCase()}`;
            case InstructionType.ADD_I_VX: return `ADD I, V${this.x.toString(16).toUpperCase()}`;
            case InstructionType.LD_F_VX: return `LD F, V${this.x.toString(16).toUpperCase()}`;
            case InstructionType.LD_B_VX: return `LD B, V${this.x.toString(16).toUpperCase()}`;
            case InstructionType.LD_I_VX: return `LD [I], V${this.x.toString(16).toUpperCase()}`;
            case InstructionType.LD_VX_I: return `LD V${this.x.toString(16).toUpperCase()}, [I]`;
            default: return 'UNKNOWN';
        }
    }

    isJump(): boolean {
        return this.type === InstructionType.JP_ADDR || this.type === InstructionType.JP_V0_ADDR;
    }

    isCall(): boolean {
        return this.type === InstructionType.CALL_ADDR;
    }

    isReturn(): boolean {
        return this.type === InstructionType.RET;
    }

    isSkip(): boolean {
        return [
            InstructionType.SE_VX_BYTE,
            InstructionType.SNE_VX_BYTE,
            InstructionType.SE_VX_VY,
            InstructionType.SNE_VX_VY,
            InstructionType.SKP_VX,
            InstructionType.SKNP_VX
        ].includes(this.type);
    }

    isDraw(): boolean {
        return this.type === InstructionType.DRW_VX_VY_NIBBLE;
    }

    isKeyOp(): boolean {
        return [
            InstructionType.SKP_VX,
            InstructionType.SKNP_VX,
            InstructionType.LD_VX_K
        ].includes(this.type);
    }

    isSound(): boolean {
        return this.type === InstructionType.LD_ST_VX;
    }

    isLoadStore(): boolean {
        return [
            InstructionType.LD_VX_BYTE,
            InstructionType.LD_VX_VY,
            InstructionType.LD_I_ADDR,
            InstructionType.LD_VX_DT,
            InstructionType.LD_DT_VX,
            InstructionType.LD_ST_VX,
            InstructionType.LD_F_VX,
            InstructionType.LD_B_VX,
            InstructionType.LD_I_VX,
            InstructionType.LD_VX_I
        ].includes(this.type);
    }

    isArithmetic(): boolean {
        return [
            InstructionType.ADD_VX_BYTE,
            InstructionType.ADD_VX_VY,
            InstructionType.SUB_VX_VY,
            InstructionType.SUBN_VX_VY,
            InstructionType.ADD_I_VX
        ].includes(this.type);
    }

    isLogical(): boolean {
        return [
            InstructionType.OR_VX_VY,
            InstructionType.AND_VX_VY,
            InstructionType.XOR_VX_VY,
            InstructionType.SHR_VX_VY,
            InstructionType.SHL_VX_VY
        ].includes(this.type);
    }

    affectsPC(): boolean {
        return this.isJump() || this.isCall() || this.isReturn() || this.isSkip();
    }

    affectsSP(): boolean {
        return this.isCall() || this.isReturn();
    }

    getAffectedRegisters(): number[] {
        const regs: number[] = [];
        
        switch (this.type) {
            case InstructionType.LD_VX_BYTE:
            case InstructionType.ADD_VX_BYTE:
            case InstructionType.RND_VX_BYTE:
            case InstructionType.LD_VX_DT:
            case InstructionType.LD_VX_K:
            case InstructionType.LD_VX_I:
                regs.push(this.x);
                break;
            case InstructionType.LD_VX_VY:
            case InstructionType.OR_VX_VY:
            case InstructionType.AND_VX_VY:
            case InstructionType.XOR_VX_VY:
            case InstructionType.ADD_VX_VY:
            case InstructionType.SUB_VX_VY:
            case InstructionType.SHR_VX_VY:
            case InstructionType.SUBN_VX_VY:
            case InstructionType.SHL_VX_VY:
                regs.push(this.x, this.y);
                break;
            case InstructionType.SE_VX_VY:
            case InstructionType.SNE_VX_VY:
            case InstructionType.DRW_VX_VY_NIBBLE:
                regs.push(this.x, this.y);
                break;
            case InstructionType.LD_DT_VX:
            case InstructionType.LD_ST_VX:
            case InstructionType.ADD_I_VX:
            case InstructionType.LD_F_VX:
            case InstructionType.LD_B_VX:
            case InstructionType.LD_I_VX:
                regs.push(this.x);
                break;
        }
        
        return regs;
    }

    clone(): Instruction {
        const inst = new Instruction(this.opcode);
        inst.type = this.type;
        inst.x = this.x;
        inst.y = this.y;
        inst.nnn = this.nnn;
        inst.nn = this.nn;
        inst.n = this.n;
        return inst;
    }

    static fromOpcode(opcode: number): Instruction {
        return new Instruction(opcode);
    }
}
