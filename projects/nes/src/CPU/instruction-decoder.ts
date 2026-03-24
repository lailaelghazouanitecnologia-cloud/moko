import { AddressingMode } from './addressing-mode';

interface Instruction {
    mnemonic: string;
    addressingMode: AddressingMode;
    cycles: number;
    size: number;
    isBranch: boolean;
    isJump: boolean;
    isStore: boolean;
    isLoad: boolean;
    isReadModifyWrite: boolean;
    isIllegal: boolean;
}

export class InstructionDecoder {
    private opcodes: Map<number, Instruction>;

    constructor() {
        this.opcodes = new Map<number, Instruction>();
        this.initializeOpcodes();
    }

    decode(opcode: number): Instruction {
        const instruction = this.opcodes.get(opcode);
        if (!instruction) {
            throw new Error(`Unknown opcode: 0x${opcode.toString(16).padStart(2, '0')}`);
        }
        return instruction;
    }

    getAddressingMode(opcode: number): AddressingMode {
        return this.decode(opcode).addressingMode;
    }

    getCycles(opcode: number): number {
        return this.decode(opcode).cycles;
    }

    isBranch(opcode: number): boolean {
        return this.decode(opcode).isBranch;
    }

    isJump(opcode: number): boolean {
        return this.decode(opcode).isJump;
    }

    isStore(opcode: number): boolean {
        return this.decode(opcode).isStore;
    }

    isLoad(opcode: number): boolean {
        return this.decode(opcode).isLoad;
    }

    isReadModifyWrite(opcode: number): boolean {
        return this.decode(opcode).isReadModifyWrite;
    }

    getMnemonic(opcode: number): string {
        return this.decode(opcode).mnemonic;
    }

    getSize(opcode: number): number {
        return this.decode(opcode).size;
    }

    initializeOpcodes(): void {
        this.addInstruction(0x00, {
            mnemonic: 'BRK',
            addressingMode: AddressingMode.IMPLIED,
            cycles: 7,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x01, {
            mnemonic: 'ORA',
            addressingMode: AddressingMode.INDIRECT_X,
            cycles: 6,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x05, {
            mnemonic: 'ORA',
            addressingMode: AddressingMode.ZERO_PAGE,
            cycles: 3,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x06, {
            mnemonic: 'ASL',
            addressingMode: AddressingMode.ZERO_PAGE,
            cycles: 5,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x08, {
            mnemonic: 'PHP',
            addressingMode: AddressingMode.IMPLIED,
            cycles: 3,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x09, {
            mnemonic: 'ORA',
            addressingMode: AddressingMode.IMMEDIATE,
            cycles: 2,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x0A, {
            mnemonic: 'ASL',
            addressingMode: AddressingMode.ACCUMULATOR,
            cycles: 2,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x0D, {
            mnemonic: 'ORA',
            addressingMode: AddressingMode.ABSOLUTE,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x0E, {
            mnemonic: 'ASL',
            addressingMode: AddressingMode.ABSOLUTE,
            cycles: 6,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x10, {
            mnemonic: 'BPL',
            addressingMode: AddressingMode.RELATIVE,
            cycles: 2,
            size: 2,
            isBranch: true,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x11, {
            mnemonic: 'ORA',
            addressingMode: AddressingMode.INDIRECT_Y,
            cycles: 5,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x15, {
            mnemonic: 'ORA',
            addressingMode: AddressingMode.ZERO_PAGE_X,
            cycles: 4,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x16, {
            mnemonic: 'ASL',
            addressingMode: AddressingMode.ZERO_PAGE_X,
            cycles: 6,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x18, {
            mnemonic: 'CLC',
            addressingMode: AddressingMode.IMPLIED,
            cycles: 2,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x19, {
            mnemonic: 'ORA',
            addressingMode: AddressingMode.ABSOLUTE_Y,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x1D, {
            mnemonic: 'ORA',
            addressingMode: AddressingMode.ABSOLUTE_X,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x1E, {
            mnemonic: 'ASL',
            addressingMode: AddressingMode.ABSOLUTE_X,
            cycles: 7,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x20, {
            mnemonic: 'JSR',
            addressingMode: AddressingMode.ABSOLUTE,
            cycles: 6,
            size: 3,
            isBranch: false,
            isJump: true,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x21, {
            mnemonic: 'AND',
            addressingMode: AddressingMode.INDIRECT_X,
            cycles: 6,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x24, {
            mnemonic: 'BIT',
            addressingMode: AddressingMode.ZERO_PAGE,
            cycles: 3,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x25, {
            mnemonic: 'AND',
            addressingMode: AddressingMode.ZERO_PAGE,
            cycles: 3,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x26, {
            mnemonic: 'ROL',
            addressingMode: AddressingMode.ZERO_PAGE,
            cycles: 5,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x28, {
            mnemonic: 'PLP',
            addressingMode: AddressingMode.IMPLIED,
            cycles: 4,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x29, {
            mnemonic: 'AND',
            addressingMode: AddressingMode.IMMEDIATE,
            cycles: 2,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x2A, {
            mnemonic: 'ROL',
            addressingMode: AddressingMode.ACCUMULATOR,
            cycles: 2,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x2C, {
            mnemonic: 'BIT',
            addressingMode: AddressingMode.ABSOLUTE,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x2D, {
            mnemonic: 'AND',
            addressingMode: AddressingMode.ABSOLUTE,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x2E, {
            mnemonic: 'ROL',
            addressingMode: AddressingMode.ABSOLUTE,
            cycles: 6,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x30, {
            mnemonic: 'BMI',
            addressingMode: AddressingMode.RELATIVE,
            cycles: 2,
            size: 2,
            isBranch: true,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x31, {
            mnemonic: 'AND',
            addressingMode: AddressingMode.INDIRECT_Y,
            cycles: 5,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x35, {
            mnemonic: 'AND',
            addressingMode: AddressingMode.ZERO_PAGE_X,
            cycles: 4,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x36, {
            mnemonic: 'ROL',
            addressingMode: AddressingMode.ZERO_PAGE_X,
            cycles: 6,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x38, {
            mnemonic: 'SEC',
            addressingMode: AddressingMode.IMPLIED,
            cycles: 2,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x39, {
            mnemonic: 'AND',
            addressingMode: AddressingMode.ABSOLUTE_Y,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x3D, {
            mnemonic: 'AND',
            addressingMode: AddressingMode.ABSOLUTE_X,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x3E, {
            mnemonic: 'ROL',
            addressingMode: AddressingMode.ABSOLUTE_X,
            cycles: 7,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x40, {
            mnemonic: 'RTI',
            addressingMode: AddressingMode.IMPLIED,
            cycles: 6,
            size: 1,
            isBranch: false,
            isJump: true,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x41, {
            mnemonic: 'EOR',
            addressingMode: AddressingMode.INDIRECT_X,
            cycles: 6,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x45, {
            mnemonic: 'EOR',
            addressingMode: AddressingMode.ZERO_PAGE,
            cycles: 3,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x46, {
            mnemonic: 'LSR',
            addressingMode: AddressingMode.ZERO_PAGE,
            cycles: 5,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x48, {
            mnemonic: 'PHA',
            addressingMode: AddressingMode.IMPLIED,
            cycles: 3,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x49, {
            mnemonic: 'EOR',
            addressingMode: AddressingMode.IMMEDIATE,
            cycles: 2,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x4A, {
            mnemonic: 'LSR',
            addressingMode: AddressingMode.ACCUMULATOR,
            cycles: 2,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x4C, {
            mnemonic: 'JMP',
            addressingMode: AddressingMode.ABSOLUTE,
            cycles: 3,
            size: 3,
            isBranch: false,
            isJump: true,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x4D, {
            mnemonic: 'EOR',
            addressingMode: AddressingMode.ABSOLUTE,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x4E, {
            mnemonic: 'LSR',
            addressingMode: AddressingMode.ABSOLUTE,
            cycles: 6,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x50, {
            mnemonic: 'BVC',
            addressingMode: AddressingMode.RELATIVE,
            cycles: 2,
            size: 2,
            isBranch: true,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x51, {
            mnemonic: 'EOR',
            addressingMode: AddressingMode.INDIRECT_Y,
            cycles: 5,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x55, {
            mnemonic: 'EOR',
            addressingMode: AddressingMode.ZERO_PAGE_X,
            cycles: 4,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x56, {
            mnemonic: 'LSR',
            addressingMode: AddressingMode.ZERO_PAGE_X,
            cycles: 6,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x58, {
            mnemonic: 'CLI',
            addressingMode: AddressingMode.IMPLIED,
            cycles: 2,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x59, {
            mnemonic: 'EOR',
            addressingMode: AddressingMode.ABSOLUTE_Y,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x5D, {
            mnemonic: 'EOR',
            addressingMode: AddressingMode.ABSOLUTE_X,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x5E, {
            mnemonic: 'LSR',
            addressingMode: AddressingMode.ABSOLUTE_X,
            cycles: 7,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x60, {
            mnemonic: 'RTS',
            addressingMode: AddressingMode.IMPLIED,
            cycles: 6,
            size: 1,
            isBranch: false,
            isJump: true,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x61, {
            mnemonic: 'ADC',
            addressingMode: AddressingMode.INDIRECT_X,
            cycles: 6,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x65, {
            mnemonic: 'ADC',
            addressingMode: AddressingMode.ZERO_PAGE,
            cycles: 3,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x66, {
            mnemonic: 'ROR',
            addressingMode: AddressingMode.ZERO_PAGE,
            cycles: 5,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x68, {
            mnemonic: 'PLA',
            addressingMode: AddressingMode.IMPLIED,
            cycles: 4,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: true,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x69, {
            mnemonic: 'ADC',
            addressingMode: AddressingMode.IMMEDIATE,
            cycles: 2,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x6A, {
            mnemonic: 'ROR',
            addressingMode: AddressingMode.ACCUMULATOR,
            cycles: 2,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x6C, {
            mnemonic: 'JMP',
            addressingMode: AddressingMode.INDIRECT,
            cycles: 5,
            size: 3,
            isBranch: false,
            isJump: true,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x6D, {
            mnemonic: 'ADC',
            addressingMode: AddressingMode.ABSOLUTE,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x6E, {
            mnemonic: 'ROR',
            addressingMode: AddressingMode.ABSOLUTE,
            cycles: 6,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x70, {
            mnemonic: 'BVS',
            addressingMode: AddressingMode.RELATIVE,
            cycles: 2,
            size: 2,
            isBranch: true,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x71, {
            mnemonic: 'ADC',
            addressingMode: AddressingMode.INDIRECT_Y,
            cycles: 5,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x75, {
            mnemonic: 'ADC',
            addressingMode: AddressingMode.ZERO_PAGE_X,
            cycles: 4,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x76, {
            mnemonic: 'ROR',
            addressingMode: AddressingMode.ZERO_PAGE_X,
            cycles: 6,
            size: 2,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: true,
            isIllegal: false
        });

        this.addInstruction(0x78, {
            mnemonic: 'SEI',
            addressingMode: AddressingMode.IMPLIED,
            cycles: 2,
            size: 1,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });

        this.addInstruction(0x79, {
            mnemonic: 'ADC',
            addressingMode: AddressingMode.ABSOLUTE_Y,
            cycles: 4,
            size: 3,
            isBranch: false,
            isJump: false,
            isStore: false,
            isLoad: false,
            isReadModifyWrite: false,
            isIllegal: false
        });
