import { Cpu } from './cpu';
import { RegisterBank } from './register-bank';
import { Stack } from './stack';

export class InstructionDecoder {
    static getNibble(opcode: number, pos: number): number {
        return (opcode >> (4 * pos)) & 0xF;
    }

    static getX(opcode: number): number {
        return (opcode >> 8) & 0xF;
    }

    static getY(opcode: number): number {
        return (opcode >> 4) & 0xF;
    }

    static getN(opcode: number): number {
        return opcode & 0xF;
    }

    static getNN(opcode: number): number {
        return opcode & 0xFF;
    }

    static getNNN(opcode: number): number {
        return opcode & 0xFFF;
    }

    static getType(opcode: number): string {
        const first = (opcode >> 12) & 0xF;
        const last = opcode & 0xF;

        if (opcode === 0x00E0) return 'CLS';
        if (opcode === 0x00EE) return 'RET';
        if (first === 0x0) return 'SYS';
        if (first === 0x1) return 'JP';
        if (first === 0x2) return 'CALL';
        if (first === 0x3) return 'SE';
        if (first === 0x4) return 'SNE';
        if (first === 0x5) return 'SE';
        if (first === 0x6) return 'LD';
        if (first === 0x7) return 'ADD';
        if (first === 0x8) {
            if (last === 0x0) return 'LD';
            if (last === 0x1) return 'OR';
            if (last === 0x2) return 'AND';
            if (last === 0x3) return 'XOR';
            if (last === 0x4) return 'ADD';
            if (last === 0x5) return 'SUB';
            if (last === 0x6) return 'SHR';
            if (last === 0x7) return 'SUBN';
            if (last === 0xE) return 'SHL';
        }
        if (first === 0x9) return 'SNE';
        if (first === 0xA) return 'LD';
        if (first === 0xB) return 'JP';
        if (first === 0xC) return 'RND';
        if (first === 0xD) return 'DRW';
        if (first === 0xE) {
            const low = opcode & 0xFF;
            if (low === 0x9E) return 'SKP';
            if (low === 0xA1) return 'SKNP';
        }
        if (first === 0xF) {
            const low = opcode & 0xFF;
            if (low === 0x07) return 'LD';
            if (low === 0x0A) return 'LD';
            if (low === 0x15) return 'LD';
            if (low === 0x18) return 'LD';
            if (low === 0x1E) return 'ADD';
            if (low === 0x29) return 'LD';
            if (low === 0x33) return 'LD';
            if (low === 0x55) return 'LD';
            if (low === 0x65) return 'LD';
        }
        return 'UNKNOWN';
    }

    static isValid(opcode: number): boolean {
        const type = this.getType(opcode);
        return type !== 'UNKNOWN';
    }

    static disassemble(opcode: number): string {
        const type = this.getType(opcode);
        const x = this.getX(opcode);
        const y = this.getY(opcode);
        const n = this.getN(opcode);
        const nn = this.getNN(opcode);
        const nnn = this.getNNN(opcode);

        switch (type) {
            case 'CLS': return 'CLS';
            case 'RET': return 'RET';
            case 'SYS': return `SYS ${nnn.toString(16).toUpperCase().padStart(3, '0')}`;
            case 'JP':
                if ((opcode >> 12) === 0xB) return `JP V0,${nnn.toString(16).toUpperCase().padStart(3, '0')}`;
                return `JP ${nnn.toString(16).toUpperCase().padStart(3, '0')}`;
            case 'CALL': return `CALL ${nnn.toString(16).toUpperCase().padStart(3, '0')}`;
            case 'SE':
                if ((opcode >> 12) === 0x3) return `SE V${x.toString(16).toUpperCase()},${nn.toString(16).toUpperCase().padStart(2, '0')}`;
                if ((opcode >> 12) === 0x5) return `SE V${x.toString(16).toUpperCase()},V${y.toString(16).toUpperCase()}`;
                return 'UNKNOWN';
            case 'SNE':
                if ((opcode >> 12) === 0x4) return `SNE V${x.toString(16).toUpperCase()},${nn.toString(16).toUpperCase().padStart(2, '0')}`;
                if ((opcode >> 12) === 0x9) return `SNE V${x.toString(16).toUpperCase()},V${y.toString(16).toUpperCase()}`;
                return 'UNKNOWN';
            case 'LD':
                if ((opcode >> 12) === 0x6) return `LD V${x.toString(16).toUpperCase()},${nn.toString(16).toUpperCase().padStart(2, '0')}`;
                if ((opcode >> 12) === 0x8 && n === 0x0) return `LD V${x.toString(16).toUpperCase()},V${y.toString(16).toUpperCase()}`;
                if ((opcode >> 12) === 0xA) return `LD I,${nnn.toString(16).toUpperCase().padStart(3, '0')}`;
                if ((opcode >> 12) === 0xF) {
                    const low = opcode & 0xFF;
                    if (low === 0x07) return `LD V${x.toString(16).toUpperCase()},DT`;
                    if (low === 0x0A) return `LD V${x.toString(16).toUpperCase()},K`;
                    if (low === 0x15) return `LD DT,V${x.toString(16).toUpperCase()}`;
                    if (low === 0x18) return `LD ST,V${x.toString(16).toUpperCase()}`;
                    if (low === 0x29) return `LD F,V${x.toString(16).toUpperCase()}`;
                    if (low === 0x33) return `LD B,V${x.toString(16).toUpperCase()}`;
                    if (low === 0x55) return `LD [I],V${x.toString(16).toUpperCase()}`;
                    if (low === 0x65) return `LD V${x.toString(16).toUpperCase()},[I]`;
                }
                return 'UNKNOWN';
            case 'ADD':
                if ((opcode >> 12) === 0x7) return `ADD V${x.toString(16).toUpperCase()},${nn.toString(16).toUpperCase().padStart(2, '0')}`;
                if ((opcode >> 12) === 0x8 && n === 0x4) return `ADD V${x.toString(16).toUpperCase()},V${y.toString(16).toUpperCase()}`;
                if ((opcode >> 12) === 0xF && (opcode & 0xFF) === 0x1E) return `ADD I,V${x.toString(16).toUpperCase()}`;
                return 'UNKNOWN';
            case 'OR':
                if ((opcode >> 12) === 0x8 && n === 0x1) return `OR V${x.toString(16).toUpperCase()},V${y.toString(16).toUpperCase()}`;
                return 'UNKNOWN';
            case 'AND':
                if ((opcode >> 12) === 0x8 && n === 0x2) return `AND V${x.toString(16).toUpperCase()},V${y.toString(16).toUpperCase()}`;
                return 'UNKNOWN';
            case 'XOR':
                if ((opcode >> 12) === 0x8 && n === 0x3) return `XOR V${x.toString(16).toUpperCase()},V${y.toString(16).toUpperCase()}`;
                return 'UNKNOWN';
            case 'SUB':
                if ((opcode >> 12) === 0x8 && n === 0x5) return `SUB V${x.toString(16).toUpperCase()},V${y.toString(16).toUpperCase()}`;
                return 'UNKNOWN';
            case 'SHR':
                if ((opcode >> 12) === 0x8 && n === 0x6) return `SHR V${x.toString(16).toUpperCase()},{V${y.toString(16).toUpperCase()}}`;
                return 'UNKNOWN';
            case 'SUBN':
                if ((opcode >> 12) === 0x8 && n === 0x7) return `SUBN V${x.toString(16).toUpperCase()},V${y.toString(16).toUpperCase()}`;
                return 'UNKNOWN';
            case 'SHL':
                if ((opcode >> 12) === 0x8 && n === 0xE) return `SHL V${x.toString(16).toUpperCase()},{V${y.toString(16).toUpperCase()}}`;
                return 'UNKNOWN';
            case 'RND': return `RND V${x.toString(16).toUpperCase()},${nn.toString(16).toUpperCase().padStart(2, '0')}`;
            case 'DRW': return `DRW V${x.toString(16).toUpperCase()},V${y.toString(16).toUpperCase()},${n}`;
            case 'SKP':
                if ((opcode >> 12) === 0xE && (opcode & 0xFF) === 0x9E) return `SKP V${x.toString(16).toUpperCase()}`;
                return 'UNKNOWN';
            case 'SKNP':
                if ((opcode >> 12) === 0xE && (opcode & 0xFF) === 0xA1) return `SKNP V${x.toString(16).toUpperCase()}`;
                return 'UNKNOWN';
            default: return 'UNKNOWN';
        }
    }

    static extractPattern(opcode: number): string {
        const type = this.getType(opcode);
        const first = (opcode >> 12) & 0xF;
        const last = opcode & 0xF;

        if (opcode === 0x00E0) return '00E0';
        if (opcode === 0x00EE) return '00EE';
        if (first === 0x0) return '0NNN';
        if (first === 0x1) return '1NNN';
        if (first === 0x2) return '2NNN';
        if (first === 0x3) return '3XNN';
        if (first === 0x4) return '4XNN';
        if (first === 0x5) return '5XY0';
        if (first === 0x6) return '6XNN';
        if (first === 0x7) return '7XNN';
        if (first === 0x8) {
            if (last === 0x0) return '8XY0';
            if (last === 0x1) return '8XY1';
            if (last === 0x2) return '8XY2';
            if (last === 0x3) return '8XY3';
            if (last === 0x4) return '8XY4';
            if (last === 0x5) return '8XY5';
            if (last === 0x6) return '8XY6';
            if (last === 0x7) return '8XY7';
            if (last === 0xE) return '8XYE';
        }
        if (first === 0x9) return '9XY0';
        if (first === 0xA) return 'ANNN';
        if (first === 0xB) return 'BNNN';
        if (first === 0xC) return 'CXNN';
        if (first === 0xD) return 'DXYN';
        if (first === 0xE) {
            const low = opcode & 0xFF;
            if (low === 0x9E) return 'EX9E';
            if (low === 0xA1) return 'EXA1';
        }
        if (first === 0xF) {
            const low = opcode & 0xFF;
            if (low === 0x07) return 'FX07';
            if (low === 0x0A) return 'FX0A';
            if (low === 0x15) return 'FX15';
            if (low === 0x18) return 'FX18';
            if (low === 0x1E) return 'FX1E';
            if (low === 0x29) return 'FX29';
            if (low === 0x33) return 'FX33';
            if (low === 0x55) return 'FX55';
            if (low === 0x65) return 'FX65';
        }
        return 'UNKNOWN';
    }
}
