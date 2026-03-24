export enum OpcodeType {
    SYS = 'SYS',
    CLS = 'CLS',
    RET = 'RET',
    JP = 'JP',
    CALL = 'CALL',
    SE = 'SE',
    SNE = 'SNE',
    LD = 'LD',
    ADD = 'ADD',
    OR = 'OR',
    AND = 'AND',
    XOR = 'XOR',
    SUB = 'SUB',
    SHR = 'SHR',
    SUBN = 'SUBN',
    SHL = 'SHL',
    RND = 'RND',
    DRW = 'DRW',
    SKP = 'SKP',
    SKNP = 'SKNP'
}

export class Opcode {
    raw: number;
    instruction: string;
    x: number;
    y: number;
    n: number;
    nn: number;
    nnn: number;

    constructor(opcode: number) {
        this.raw = opcode & 0xFFFF;
        this.x = (opcode >> 8) & 0xF;
        this.y = (opcode >> 4) & 0xF;
        this.n = opcode & 0xF;
        this.nn = opcode & 0xFF;
        this.nnn = opcode & 0xFFF;

        const nibbles = [
            (opcode >> 12) & 0xF,
            (opcode >> 8) & 0xF,
            (opcode >> 4) & 0xF,
            opcode & 0xF
        ];

        switch (nibbles[0]) {
            case 0x0:
                if (this.raw === 0x00E0) {
                    this.instruction = 'CLS';
                } else if (this.raw === 0x00EE) {
                    this.instruction = 'RET';
                } else {
                    this.instruction = 'SYS';
                }
                break;
            case 0x1:
                this.instruction = 'JP';
                break;
            case 0x2:
                this.instruction = 'CALL';
                break;
            case 0x3:
                this.instruction = 'SE';
                break;
            case 0x4:
                this.instruction = 'SNE';
                break;
            case 0x5:
                this.instruction = nibbles[3] === 0 ? 'SE' : 'UNKNOWN';
                break;
            case 0x6:
                this.instruction = 'LD';
                break;
            case 0x7:
                this.instruction = 'ADD';
                break;
            case 0x8:
                switch (nibbles[3]) {
                    case 0x0: this.instruction = 'LD'; break;
                    case 0x1: this.instruction = 'OR'; break;
                    case 0x2: this.instruction = 'AND'; break;
                    case 0x3: this.instruction = 'XOR'; break;
                    case 0x4: this.instruction = 'ADD'; break;
                    case 0x5: this.instruction = 'SUB'; break;
                    case 0x6: this.instruction = 'SHR'; break;
                    case 0x7: this.instruction = 'SUBN'; break;
                    case 0xE: this.instruction = 'SHL'; break;
                    default: this.instruction = 'UNKNOWN';
                }
                break;
            case 0x9:
                this.instruction = nibbles[3] === 0 ? 'SNE' : 'UNKNOWN';
                break;
            case 0xA:
                this.instruction = 'LD';
                break;
            case 0xB:
                this.instruction = 'JP';
                break;
            case 0xC:
                this.instruction = 'RND';
                break;
            case 0xD:
                this.instruction = 'DRW';
                break;
            case 0xE:
                this.instruction = this.nn === 0x9E ? 'SKP' : (this.nn === 0xA1 ? 'SKNP' : 'UNKNOWN');
                break;
            case 0xF:
                switch (this.nn) {
                    case 0x07: case 0x0A: case 0x15: case 0x18: case 0x1E: case 0x29: case 0x33:
                        this.instruction = 'LD';
                        break;
                    case 0x55: case 0x65:
                        this.instruction = 'LD';
                        break;
                    default:
                        this.instruction = 'UNKNOWN';
                }
                break;
            default:
                this.instruction = 'UNKNOWN';
        }
    }

    toString(): string {
        return `0x${this.raw.toString(16).toUpperCase().padStart(4, '0')}`;
    }

    getType(): OpcodeType {
        if (this.instruction === 'UNKNOWN') {
            throw new Error(`Unknown opcode: ${this.toString()}`);
        }
        return OpcodeType[this.instruction as keyof typeof OpcodeType];
    }

    matches(pattern: string): boolean {
        const p = pattern.toUpperCase();
        const hex = this.raw.toString(16).toUpperCase().padStart(4, '0');
        for (let i = 0; i < 4; i++) {
            const c = p[i];
            if (c === 'X') continue;
            if (c !== hex[i]) return false;
        }
        return true;
    }

    extract(mask: number): number {
        return this.raw & mask;
    }
}
