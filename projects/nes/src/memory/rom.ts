import { MemoryBus } from './memory-bus';
import { Cartridge } from './cartridge';
import { Mapper } from './mapper';
import { RAM } from './ram';

export class ROM {
    private data: Uint8Array;
    private size: number;

    constructor(data: Uint8Array) {
        this.data = data;
        this.size = data.length;
    }

    read(address: number): number {
        const addr = address % this.size;
        return this.data[addr];
    }

    read16(address: number): number {
        const addr = address % this.size;
        const lo = this.data[addr];
        const hi = this.data[(addr + 1) % this.size];
        return lo | (hi << 8);
    }

    getSize(): number {
        return this.size;
    }

    getData(): Uint8Array {
        return new Uint8Array(this.data);
    }

    slice(start: number, end: number): Uint8Array {
        const clampedStart = Math.max(0, Math.min(start, this.size));
        const clampedEnd = Math.max(clampedStart, Math.min(end, this.size));
        return this.data.slice(clampedStart, clampedEnd);
    }
}
