import { Instruction, InstructionType } from './instruction';

export class Decoder {
    private decodeTable: Map<number, InstructionType> = new Map();

    constructor() {
        this.buildDecodeTable();
    }

    decode(opcode: number): Instruction {
        const type = this.getInstructionType(opcode);
        const mask = this.getOperandMask(type);
        const nibbles = this.extractNibbles(opcode);
        const bytes = this.extractBytes(opcode);
        
        return new Instruction(
            type,
            opcode,
            nibbles,
            bytes,
            mask,
            this.getInstructionLength(type),
            this.getInstructionCycles(type),
            this.isExtended(opcode)
        );
    }

    decode0NNN(opcode: number): InstructionType {
        const nnn = opcode & 0x0FFF;
        const n = opcode & 0x000F;
        
        if (nnn === 0x0E0) return InstructionType.CLS;
        if (nnn === 0x0EE) return InstructionType.RET;
        if (n === 0) return InstructionType.SYS;
        return InstructionType.ILL;
    }

    decode8XY(opcode: number): InstructionType {
        const n = opcode & 0x000F;
        switch (n) {
            case 0x0: return InstructionType.LD_VX_VY;
            case 0x1: return InstructionType.OR_VX_VY;
            case 0x2: return InstructionType.AND_VX_VY;
            case 0x3: return InstructionType.XOR_VX_VY;
            case 0x4: return InstructionType.ADD_VX_VY;
            case 0x5: return InstructionType.SUB_VX_VY;
            case 0x6: return InstructionType.SHR_VX_VY;
            case 0x7: return InstructionType.SUBN_VX_VY;
            case 0xE: return InstructionType.SHL_VX_VY;
            default: return InstructionType.ILL;
        }
    }

    decodeEX(opcode: number): InstructionType {
        const nn = (opcode >> 4) & 0xFF;
        const n = opcode & 0x000F;
        
        if (nn === 0x9E && n === 0) return InstructionType.SKP_VX;
        if (nn === 0xA1 && n === 0) return InstructionType.SKNP_VX;
        return InstructionType.ILL;
    }

    decodeFX(opcode: number): InstructionType {
        const nn = (opcode >> 4) & 0xFF;
        const n = opcode & 0x000F;
        
        switch (nn) {
            case 0x07: return InstructionType.LD_VX_DT;
            case 0x0A: return InstructionType.LD_VX_K;
            case 0x15: return InstructionType.LD_DT_VX;
            case 0x18: return InstructionType.LD_ST_VX;
            case 0x1E: return InstructionType.ADD_I_VX;
            case 0x29: return InstructionType.LD_F_VX;
            case 0x33: return InstructionType.LD_B_VX;
            case 0x55: return InstructionType.LD_I_VX;
            case 0x65: return InstructionType.LD_VX_I;
            case 0x30: return InstructionType.LD_HF_VX;
            case 0x75: return InstructionType.LD_R_VX;
            case 0x85: return InstructionType.LD_VX_R;
            default:
                if (nn === 0x18 && n === 5) return InstructionType.LD_ST_VX;
                return InstructionType.ILL;
        }
    }

    buildDecodeTable(): void {
        this.decodeTable.set(0x00E0, InstructionType.CLS);
        this.decodeTable.set(0x00EE, InstructionType.RET);
        this.decodeTable.set(0x1000, InstructionType.JP);
        this.decodeTable.set(0x2000, InstructionType.CALL);
        this.decodeTable.set(0x3000, InstructionType.SE_VX_KK);
        this.decodeTable.set(0x4000, InstructionType.SNE_VX_KK);
        this.decodeTable.set(0x5000, InstructionType.SE_VX_VY);
        this.decodeTable.set(0x6000, InstructionType.LD_VX_KK);
        this.decodeTable.set(0x7000, InstructionType.ADD_VX_KK);
        this.decodeTable.set(0x8000, InstructionType.LD_VX_VY);
        this.decodeTable.set(0x8001, InstructionType.OR_VX_VY);
        this.decodeTable.set(0x8002, InstructionType.AND_VX_VY);
        this.decodeTable.set(0x8003, InstructionType.XOR_VX_VY);
        this.decodeTable.set(0x8004, InstructionType.ADD_VX_VY);
        this.decodeTable.set(0x8005, InstructionType.SUB_VX_VY);
        this.decodeTable.set(0x8006, InstructionType.SHR_VX_VY);
        this.decodeTable.set(0x8007, InstructionType.SUBN_VX_VY);
        this.decodeTable.set(0x800E, InstructionType.SHL_VX_VY);
        this.decodeTable.set(0x9000, InstructionType.SNE_VX_VY);
        this.decodeTable.set(0xA000, InstructionType.LD_I_NNN);
        this.decodeTable.set(0xB000, InstructionType.JP_V0_NNN);
        this.decodeTable.set(0xC000, InstructionType.RND_VX_KK);
        this.decodeTable.set(0xD000, InstructionType.DRW_VX_VY_N);
        this.decodeTable.set(0xE09E, InstructionType.SKP_VX);
        this.decodeTable.set(0xE0A1, InstructionType.SKNP_VX);
        this.decodeTable.set(0xF007, InstructionType.LD_VX_DT);
        this.decodeTable.set(0xF00A, InstructionType.LD_VX_K);
        this.decodeTable.set(0xF015, InstructionType.LD_DT_VX);
        this.decodeTable.set(0xF018, InstructionType.LD_ST_VX);
        this.decodeTable.set(0xF01E, InstructionType.ADD_I_VX);
        this.decodeTable.set(0xF029, InstructionType.LD_F_VX);
        this.decodeTable.set(0xF033, InstructionType.LD_B_VX);
        this.decodeTable.set(0xF055, InstructionType.LD_I_VX);
        this.decodeTable.set(0xF065, InstructionType.LD_VX_I);
    }

    getInstructionType(opcode: number): InstructionType {
        const first = (opcode >> 12) & 0xF;
        
        switch (first) {
            case 0x0:
                return this.decode0NNN(opcode);
            case 0x8:
                return this.decode8XY(opcode);
            case 0xE:
                return this.decodeEX(opcode);
            case 0xF:
                return this.decodeFX(opcode);
            default:
                const masked = opcode & 0xF000;
                const type = this.decodeTable.get(masked);
                return type !== undefined ? type : InstructionType.ILL;
        }
    }

    validateOpcode(opcode: number): boolean {
        const type = this.getInstructionType(opcode);
        return type !== InstructionType.ILL;
    }

    disassemble(instruction: Instruction): string {
        const type = instruction.type;
        const nibbles = instruction.nibbles;
        const bytes = instruction.bytes;
        
        switch (type) {
            case InstructionType.CLS: return 'CLS';
            case InstructionType.RET: return 'RET';
            case InstructionType.SYS: return `SYS ${nibbles[1].toString(16).padStart(3, '0')}`;
            case InstructionType.JP: return `JP ${nibbles[1].toString(16).padStart(3, '0')}`;
            case InstructionType.CALL: return `CALL ${nibbles[1].toString(16).padStart(3, '0')}`;
            case InstructionType.SE_VX_KK: return `SE V${nibbles[1].toString(16)}, ${bytes[1].toString(16).padStart(2, '0')}`;
            case InstructionType.SNE_VX_KK: return `SNE V${nibbles[1].toString(16)}, ${bytes[1].toString(16).padStart(2, '0')}`;
            case InstructionType.SE_VX_VY: return `SE V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}`;
            case InstructionType.LD_VX_KK: return `LD V${nibbles[1].toString(16)}, ${bytes[1].toString(16).padStart(2, '0')}`;
            case InstructionType.ADD_VX_KK: return `ADD V${nibbles[1].toString(16)}, ${bytes[1].toString(16).padStart(2, '0')}`;
            case InstructionType.LD_VX_VY: return `LD V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}`;
            case InstructionType.OR_VX_VY: return `OR V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}`;
            case InstructionType.AND_VX_VY: return `AND V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}`;
            case InstructionType.XOR_VX_VY: return `XOR V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}`;
            case InstructionType.ADD_VX_VY: return `ADD V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}`;
            case InstructionType.SUB_VX_VY: return `SUB V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}`;
            case InstructionType.SHR_VX_VY: return `SHR V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}`;
            case InstructionType.SUBN_VX_VY: return `SUBN V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}`;
            case InstructionType.SHL_VX_VY: return `SHL V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}`;
            case InstructionType.SNE_VX_VY: return `SNE V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}`;
            case InstructionType.LD_I_NNN: return `LD I, ${nibbles[1].toString(16).padStart(3, '0')}`;
            case InstructionType.JP_V0_NNN: return `JP V0, ${nibbles[1].toString(16).padStart(3, '0')}`;
            case InstructionType.RND_VX_KK: return `RND V${nibbles[1].toString(16)}, ${bytes[1].toString(16).padStart(2, '0')}`;
            case InstructionType.DRW_VX_VY_N: return `DRW V${nibbles[1].toString(16)}, V${nibbles[2].toString(16)}, ${nibbles[3].toString(16)}`;
            case InstructionType.SKP_VX: return `SKP V${nibbles[1].toString(16)}`;
            case InstructionType.SKNP_VX: return `SKNP V${nibbles[1].toString(16)}`;
            case InstructionType.LD_VX_DT: return `LD V${nibbles[1].toString(16)}, DT`;
            case InstructionType.LD_VX_K: return `LD V${nibbles[1].toString(16)}, K`;
            case InstructionType.LD_DT_VX: return `LD DT, V${nibbles[1].toString(16)}`;
            case InstructionType.LD_ST_VX: return `LD ST, V${nibbles[1].toString(16)}`;
            case InstructionType.ADD_I_VX: return `ADD I, V${nibbles[1].toString(16)}`;
            case InstructionType.LD_F_VX: return `LD F, V${nibbles[1].toString(16)}`;
            case InstructionType.LD_B_VX: return `LD B, V${nibbles[1].toString(16)}`;
            case InstructionType.LD_I_VX: return `LD [I], V${nibbles[1].toString(16)}`;
            case InstructionType.LD_VX_I: return `LD V${nibbles[1].toString(16)}, [I]`;
            case InstructionType.LD_HF_VX: return `LD HF, V${nibbles[1].toString(16)}`;
            case InstructionType.LD_R_VX: return `LD R, V${nibbles[1].toString(16)}`;
            case InstructionType.LD_VX_R: return `LD V${nibbles[1].toString(16)}, R`;
            default: return 'ILL';
        }
    }

    getOperandMask(type: InstructionType): number {
        switch (type) {
            case InstructionType.CLS:
            case InstructionType.RET:
                return 0x0000;
            case InstructionType.JP:
            case InstructionType.CALL:
            case InstructionType.LD_I_NNN:
            case InstructionType.JP_V0_NNN:
                return 0x0FFF;
            case InstructionType.SE_VX_KK:
            case InstructionType.SNE_VX_KK:
            case InstructionType.LD_VX_KK:
            case InstructionType.ADD_VX_KK:
            case InstructionType.RND_VX_KK:
                return 0x00FF;
            case InstructionType.SE_VX_VY:
            case InstructionType.LD_VX_VY:
            case InstructionType.OR_VX_VY:
            case InstructionType.AND_VX_VY:
            case InstructionType.XOR_VX_VY:
            case InstructionType.ADD_VX_VY:
            case InstructionType.SUB_VX_VY:
            case InstructionType.SHR_VX_VY:
            case InstructionType.SUBN_VX_VY:
            case InstructionType.SHL_VX_VY:
            case InstructionType.SNE_VX_VY:
            case InstructionType.DRW_VX_VY_N:
                return 0x0F00;
            case InstructionType.SKP_VX:
            case InstructionType.SKNP_VX:
            case InstructionType.LD_VX_DT:
            case InstructionType.LD_VX_K:
            case InstructionType.LD_DT_VX:
            case InstructionType.LD_ST_VX:
            case InstructionType.ADD_I_VX:
            case InstructionType.LD_F_VX:
            case InstructionType.LD_B_VX:
            case InstructionType.LD_I_VX:
            case InstructionType.LD_VX_I:
            case InstructionType.LD_HF_VX:
            case InstructionType.LD_R_VX:
            case InstructionType.LD_VX_R:
                return 0x0F00;
            default:
                return 0x0000;
        }
    }

    extractNibbles(opcode: number): number[] {
        return [
            (opcode >> 12) & 0xF,
            (opcode >> 8) & 0xF,
            (opcode >> 4) & 0xF,
            opcode & 0xF
        ];
    }

    extractBytes(opcode: number): number[] {
        return [
            (opcode >> 8) & 0xFF,
            opcode & 0xFF
        ];
    }

    isExtended(opcode: number): boolean {
        const type = this.getInstructionType(opcode);
        return type === InstructionType.LD_HF_VX ||
               type === InstructionType.LD_R_VX ||
               type === InstructionType.LD_VX_R;
    }

    getInstructionLength(type: InstructionType): number {
        return 2;
    }

    getInstructionCycles(type: InstructionType): number {
        switch (type) {
            case InstructionType.DRW_VX_VY_N:
                return 5;
            case InstructionType.LD_VX_K:
                return 0;
            case InstructionType.SKP_VX:
            case InstructionType.SKNP_VX:
                return 2;
            default:
                return 1;
        }
    }

    getInstructionName(type: InstructionType): string {
        return InstructionType[type];
    }
}
