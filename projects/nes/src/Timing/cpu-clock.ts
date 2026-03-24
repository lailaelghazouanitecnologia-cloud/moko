export class CpuClock {
    private cycles: number = 0;
    private stallCycles: number = 0;
    private dmaCycles: number = 0;

    reset(): void {
        this.cycles = 0;
        this.stallCycles = 0;
        this.dmaCycles = 0;
    }

    addCycles(n: number): void {
        this.cycles += n;
    }

    addStall(n: number): void {
        this.stallCycles += n;
    }

    addDma(n: number): void {
        this.dmaCycles += n;
    }

    getTotal(): number {
        return this.cycles;
    }

    getStall(): number {
        return this.stallCycles;
    }

    getDma(): number {
        return this.dmaCycles;
    }

    isStalled(): boolean {
        return this.stallCycles > 0;
    }

    step(): void {
        this.cycles++;
    }
}
