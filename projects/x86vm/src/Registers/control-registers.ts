export class ControlRegisters {
    private cr0: number = 0;
    private cr2: number = 0;
    private cr3: number = 0;
    private cr4: number = 0;

    getCR0(): number {
        return this.cr0;
    }

    setCR0(value: number): void {
        this.cr0 = value;
    }

    getCR2(): number {
        return this.cr2;
    }

    setCR2(value: number): void {
        this.cr2 = value;
    }

    getCR3(): number {
        return this.cr3;
    }

    setCR3(value: number): void {
        this.cr3 = value;
    }

    getCR4(): number {
        return this.cr4;
    }

    setCR4(value: number): void {
        this.cr4 = value;
    }

    isProtectedMode(): boolean {
        return (this.cr0 & 0x00000001) !== 0;
    }

    isPagingEnabled(): boolean {
        return (this.cr0 & 0x80000000) !== 0;
    }

    getPageDirectoryBase(): number {
        return this.cr3 & 0xFFFFF000;
    }
}
