import { CPU6502 } from '../cpu';
import { PPU2C02 } from '../ppu';

export class RAM {
    private data: Uint8Array;
    private size: number;

    constructor(size: number) {
        this.size = size;
        this.data = new Uint8Array(size);
    }

    read(address: number): number {
        return this.data[address & (this.size - 1)];
    }

    write(address: number, data: number): void {
        this.data[address & (this.size - 1)] = data & 0xFF;
    }

    read16(address: number): number {
        const addr = address & (this.size - 1);
        const low = this.data[addr];
        const high = this.data[(addr + 1) & (this.size - 1)];
        return low | (high << 8);
    }

    write16(address: number, data: number): void {
        const addr = address & (this.size - 1);
        this.data[addr] = data & 0xFF;
        this.data[(addr + 1) & (this.size - 1)] = (data >> 8) & 0xFF;
    }

    fill(value: number): void {
        this.data.fill(value & 0xFF);
    }

    copy(): Uint8Array {
        return new Uint8Array(this.data);
    }

    load(data: Uint8Array): void {
        const len = Math.min(data.length, this.size);
        this.data.set(data.subarray(0, len));
    }

    getSize(): number {
        return this.size;
    }
}
