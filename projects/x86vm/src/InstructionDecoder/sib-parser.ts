import { Register, SIBInfo, Operand, ProcessorMode } from './instruction-decoder';

export interface SIBStreamInfo {
    sib: number;
    offset: number;
    nextOffset: number;
}

export class SIBParser {
    private scale: number = 0;
    private index: number = 0;
    private base: number = 0;

    parse(sib: number): SIBInfo {
        this.scale = this.getScale(sib);
        this.index = this.getIndex(sib);
        this.base = this.getBase(sib);

        return {
            scale: this.scale,
            index: this.index,
            base: this.base,
            scaleValue: this.getScaleValue(this.scale),
            isBaseESP: this.isBaseESP(this.base),
            isIndexESP: this.isIndexESP(this.index),
            hasBase: this.hasBase(this.base),
            needsDisplacement: this.needsDisplacement(this.base, 0)
        };
    }

    getScale(sib: number): number {
        return (sib >> 6) & 0x03;
    }

    getIndex(sib: number): number {
        return (sib >> 3) & 0x07;
    }

    getBase(sib: number): number {
        return sib & 0x07;
    }

    getScaleValue(scale: number): number {
        return 1 << scale;
    }

    isBaseESP(base: number): boolean {
        return base === 4;
    }

    isIndexESP(index: number): boolean {
        return index === 4;
    }

    hasBase(base: number): boolean {
        return base !== 5;
    }

    decodeBase(base: number, addressSize: number): Register {
        const baseRegisters: { [key: number]: { [key: number]: Register } } = {
            16: {
                0: { type: 'register', name: 'BX', size: 16, value: 0 },
                1: { type: 'register', name: 'BX', size: 16, value: 1 },
                2: { type: 'register', name: 'BP', size: 16, value: 2 },
                3: { type: 'register', name: 'SI', size: 16, value: 6 },
                4: { type: 'register', name: 'DI', size: 16, value: 7 },
                5: { type: 'register', name: 'BP', size: 16, value: 2 },
                6: { type: 'register', name: 'SI', size: 16, value: 6 },
                7: { type: 'register', name: 'DI', size: 16, value: 7 }
            },
            32: {
                0: { type: 'register', name: 'EAX', size: 32, value: 0 },
                1: { type: 'register', name: 'ECX', size: 32, value: 1 },
                2: { type: 'register', name: 'EDX', size: 32, value: 2 },
                3: { type: 'register', name: 'EBX', size: 32, value: 3 },
                4: { type: 'register', name: 'ESP', size: 32, value: 4 },
                5: { type: 'register', name: 'EBP', size: 32, value: 5 },
                6: { type: 'register', name: 'ESI', size: 32, value: 6 },
                7: { type: 'register', name: 'EDI', size: 32, value: 7 }
            },
            64: {
                0: { type: 'register', name: 'RAX', size: 64, value: 0 },
                1: { type: 'register', name: 'RCX', size: 64, value: 1 },
                2: { type: 'register', name: 'RDX', size: 64, value: 2 },
                3: { type: 'register', name: 'RBX', size: 64, value: 3 },
                4: { type: 'register', name: 'RSP', size: 64, value: 4 },
                5: { type: 'register', name: 'RBP', size: 64, value: 5 },
                6: { type: 'register', name: 'RSI', size: 64, value: 6 },
                7: { type: 'register', name: 'RDI', size: 64, value: 7 }
            }
        };

        return baseRegisters[addressSize][base];
    }

    decodeIndex(index: number, addressSize: number): Register {
        if (this.isIndexESP(index)) {
            return { type: 'none' };
        }

        const indexRegisters: { [key: number]: { [key: number]: Register } } = {
            16: {
                0: { type: 'register', name: 'BX', size: 16, value: 0 },
                1: { type: 'register', name: 'CX', size: 16, value: 1 },
                2: { type: 'register', name: 'DX', size: 16, value: 2 },
                3: { type: 'register', name: 'SP', size: 16, value: 4 },
                5: { type: 'register', name: 'BP', size: 16, value: 2 },
                6: { type: 'register', name: 'SI', size: 16, value: 6 },
                7: { type: 'register', name: 'DI', size: 16, value: 7 }
            },
            32: {
                0: { type: 'register', name: 'EAX', size: 32, value: 0 },
                1: { type: 'register', name: 'ECX', size: 32, value: 1 },
                2: { type: 'register', name: 'EDX', size: 32, value: 2 },
                3: { type: 'register', name: 'EBX', size: 32, value: 3 },
                5: { type: 'register', name: 'EBP', size: 32, value: 5 },
                6: { type: 'register', name: 'ESI', size: 32, value: 6 },
                7: { type: 'register', name: 'EDI', size: 32, value: 7 }
            },
            64: {
                0: { type: 'register', name: 'RAX', size: 64, value: 0 },
                1: { type: 'register', name: 'RCX', size: 64, value: 1 },
                2: { type: 'register', name: 'RDX', size: 64, value: 2 },
                3: { type: 'register', name: 'RBX', size: 64, value: 3 },
                5: { type: 'register', name: 'RBP', size: 64, value: 5 },
                6: { type: 'register', name: 'RSI', size: 64, value: 6 },
                7: { type: 'register', name: 'RDI', size: 64, value: 7 }
            }
        };

        return indexRegisters[addressSize][index];
    }

    calculateEffectiveAddress(sib: SIBInfo, displacement: number): number {
        let address = 0;

        if (sib.hasBase && !sib.isBaseESP) {
            address += sib.base;
        }

        if (!sib.isIndexESP) {
            address += sib.index * sib.scaleValue;
        }

        address += displacement;

        return address;
    }

    isScaledIndex(scale: number): boolean {
        return scale !== 0;
    }

    parseSIBFromStream(bytes: Uint8Array, offset: number): SIBStreamInfo {
        const sib = bytes[offset];
        const nextOffset = offset + 1;

        return {
            sib,
            offset,
            nextOffset
        };
    }

    validateSIB(sib: number): boolean {
        return sib >= 0 && sib <= 255;
    }

    needsDisplacement(base: number, mod: number): boolean {
        return mod === 0 && base === 5;
    }

    getSIBOperand(sib: SIBInfo, displacement: number): Operand {
        const operand: Operand = {
            type: 'memory',
            addressing: 'sib',
            base: sib.hasBase ? sib.base : undefined,
            index: !sib.isIndexESP ? sib.index : undefined,
            scale: sib.isScaledIndex(sib.scale) ? sib.scaleValue : undefined,
            displacement: displacement !== 0 ? displacement : undefined
        };

        return operand;
    }
}
