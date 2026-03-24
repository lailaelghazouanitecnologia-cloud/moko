export class Clock {
    private frequency: number;
    private lastTick: number;
    private accumulatedTime: number;
    private cyclesPerSecond: number;

    constructor() {
        this.frequency = 500;
        this.lastTick = 0;
        this.accumulatedTime = 0;
        this.cyclesPerSecond = 500;
    }

    setFrequency(hz: number): void {
        this.frequency = hz;
        this.cyclesPerSecond = hz;
    }

    getFrequency(): number {
        return this.frequency;
    }

    tick(currentTime: number): number {
        const deltaTime = currentTime - this.lastTick;
        this.lastTick = currentTime;
        
        this.accumulatedTime += deltaTime;
        
        const cyclesToRun = Math.floor((this.accumulatedTime / 1000) * this.cyclesPerSecond);
        this.accumulatedTime -= (cyclesToRun / this.cyclesPerSecond) * 1000;
        
        return cyclesToRun;
    }

    reset(): void {
        this.accumulatedTime = 0;
        this.lastTick = 0;
    }

    setCyclesPerSecond(cycles: number): void {
        this.cyclesPerSecond = cycles;
    }

    getCyclesPerSecond(): number {
        return this.cyclesPerSecond;
    }

    getElapsedTime(): number {
        return this.accumulatedTime;
    }

    shouldTick(currentTime: number): boolean {
        const deltaTime = currentTime - this.lastTick;
        const timePerCycle = 1000 / this.cyclesPerSecond;
        return deltaTime >= timePerCycle;
    }
}
