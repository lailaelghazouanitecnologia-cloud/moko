export enum AddressingMode {
    IMPLIED,
    ACCUMULATOR,
    IMMEDIATE,
    ZERO_PAGE,
    ZERO_PAGE_X,
    ZERO_PAGE_Y,
    ABSOLUTE,
    ABSOLUTE_X,
    ABSOLUTE_Y,
    INDIRECT,
    INDIRECT_X,
    INDIRECT_Y,
    RELATIVE
}

export namespace AddressingMode {
    export function getOffset(mode: AddressingMode): number {
        switch (mode) {
            case AddressingMode.IMPLIED:
            case AddressingMode.ACCUMULATOR:
                return 0;
            case AddressingMode.IMMEDIATE:
            case AddressingMode.ZERO_PAGE:
            case AddressingMode.ZERO_PAGE_X:
            case AddressingMode.ZERO_PAGE_Y:
            case AddressingMode.RELATIVE:
                return 1;
            case AddressingMode.ABSOLUTE:
            case AddressingMode.ABSOLUTE_X:
            case AddressingMode.ABSOLUTE_Y:
            case AddressingMode.INDIRECT:
            case AddressingMode.INDIRECT_X:
            case AddressingMode.INDIRECT_Y:
                return 2;
            default:
                return 0;
        }
    }

    export function hasOperand(mode: AddressingMode): boolean {
        switch (mode) {
            case AddressingMode.IMPLIED:
            case AddressingMode.ACCUMULATOR:
                return false;
            default:
                return true;
        }
    }

    export function isMemoryAccess(mode: AddressingMode): boolean {
        switch (mode) {
            case AddressingMode.IMPLIED:
            case AddressingMode.ACCUMULATOR:
            case AddressingMode.IMMEDIATE:
            case AddressingMode.RELATIVE:
                return false;
            default:
                return true;
        }
    }

    export function toString(mode: AddressingMode): string {
        switch (mode) {
            case AddressingMode.IMPLIED:
                return 'IMPLIED';
            case AddressingMode.ACCUMULATOR:
                return 'ACCUMULATOR';
            case AddressingMode.IMMEDIATE:
                return 'IMMEDIATE';
            case AddressingMode.ZERO_PAGE:
                return 'ZERO_PAGE';
            case AddressingMode.ZERO_PAGE_X:
                return 'ZERO_PAGE_X';
            case AddressingMode.ZERO_PAGE_Y:
                return 'ZERO_PAGE_Y';
            case AddressingMode.ABSOLUTE:
                return 'ABSOLUTE';
            case AddressingMode.ABSOLUTE_X:
                return 'ABSOLUTE_X';
            case AddressingMode.ABSOLUTE_Y:
                return 'ABSOLUTE_Y';
            case AddressingMode.INDIRECT:
                return 'INDIRECT';
            case AddressingMode.INDIRECT_X:
                return 'INDIRECT_X';
            case AddressingMode.INDIRECT_Y:
                return 'INDIRECT_Y';
            case AddressingMode.RELATIVE:
                return 'RELATIVE';
            default:
                return 'UNKNOWN';
        }
    }
}
