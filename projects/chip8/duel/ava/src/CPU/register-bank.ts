export class RegisterBank {
    private v: Uint8Array;

    constructor() {
        this.v = new Uint8Array(16);
    }

    get(index: number): number {
        if (index < 0 || index >= 16) {
            throw new Error(`Register index out of bounds: ${index}`);
        }
        return this.v[index];
    }

    set(index: number, value: number): void {
        if (index < 0 || index >= 16) {
            throw new Error(`Register index out of bounds: ${index}`);
        }
        this.v[index] = value & 0xFF;
    }

    getVF(): number {
        return this.v[0xF];
    }

    setVF(value: number): void {
        this.v[0xF] = value & 0xFF;
    }

    clearAll(): void {
        this.v.fill(0);
    }

    dump(): number[] {
        return Array.from(this.v);
    }

    load(values: number[]): void {
        if (values.length !== 16) {
            throw new Error(`Expected 16 values, got ${values.length}`);
        }
        for (let i = 0; i < 16; i++) {
            this.v[i] = values[i] & 0xFF;
        }
    }
}
