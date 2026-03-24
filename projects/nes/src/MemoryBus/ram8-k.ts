export class Ram8K {
    private ram: Uint8Array;

    constructor() {
        this.ram = new Uint8Array(0x2000);
    }

    read(address: number): number {
        const mirroredAddress = address & 0x7FF;
        return this.ram[mirroredAddress];
    }

    write(address: number, value: number): void {
        const mirroredAddress = address & 0x7FF;
        this.ram[mirroredAddress] = value & 0xFF;
    }

    reset(): void {
        this.ram.fill(0);
    }

    loadState(state: Uint8Array): void {
        if (state.length !== 0x2000) {
            throw new Error('Invalid RAM state size');
        }
        this.ram.set(state);
    }

    saveState(): Uint8Array {
        return new Uint8Array(this.ram);
    }
}
