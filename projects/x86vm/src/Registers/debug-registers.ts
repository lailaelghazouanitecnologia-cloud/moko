export class DebugRegisters {
    private dr: number[];

    constructor() {
        this.dr = new Array(8).fill(0);
    }

    getDR0(): number {
        return this.dr[0];
    }

    setDR0(value: number): void {
        this.dr[0] = value;
    }

    getDR1(): number {
        return this.dr[1];
    }

    setDR1(value: number): void {
        this.dr[1] = value;
    }

    getDR2(): number {
        return this.dr[2];
    }

    setDR2(value: number): void {
        this.dr[2] = value;
    }

    getDR3(): number {
        return this.dr[3];
    }

    setDR3(value: number): void {
        this.dr[3] = value;
    }

    getDR6(): number {
        return this.dr[6];
    }

    setDR6(value: number): void {
        this.dr[6] = value;
    }

    getDR7(): number {
        return this.dr[7];
    }

    setDR7(value: number): void {
        this.dr[7] = value;
    }

    isBreakpointEnabled(index: number): boolean {
        if (index < 0 || index > 3) {
            throw new Error('Breakpoint index must be 0-3');
        }
        const mask = 1 << (index * 2);
        return (this.dr[7] & mask) !== 0;
    }

    getBreakpointCondition(index: number): number {
        if (index < 0 || index > 3) {
            throw new Error('Breakpoint index must be 0-3');
        }
        const shift = 16 + (index * 4);
        return (this.dr[7] >> shift) & 0x3;
    }

    getBreakpointLength(index: number): number {
        if (index < 0 || index > 3) {
            throw new Error('Breakpoint index must be 0-3');
        }
        const shift = 18 + (index * 4);
        return (this.dr[7] >> shift) & 0x3;
    }
}
