import { IODevice } from './index';

export class PhysicalMemory {
    private ram: Uint8Array;
    private ioRegions: Map<number, IODevice>;
    private size: number;

    constructor() {
        this.ram = new Uint8Array(0x1000000);
        this.ioRegions = new Map();
        this.size = 0x1000000;
    }

    read8(addr: number): number {
        const device = this.getIODevice(addr);
        if (device) {
            return device.read8(addr);
        }
        if (!this.isValidAddress(addr)) {
            return 0;
        }
        return this.ram[addr];
    }

    read16(addr: number): number {
        const device = this.getIODevice(addr);
        if (device) {
            return device.read16(addr);
        }
        if (!this.isValidAddress(addr) || !this.isValidAddress(addr + 1)) {
            return 0;
        }
        return this.ram[addr] | (this.ram[addr + 1] << 8);
    }

    read32(addr: number): number {
        const device = this.getIODevice(addr);
        if (device) {
            return device.read32(addr);
        }
        if (!this.isValidAddress(addr) || !this.isValidAddress(addr + 3)) {
            return 0;
        }
        return this.ram[addr] | (this.ram[addr + 1] << 8) | (this.ram[addr + 2] << 16) | (this.ram[addr + 3] << 24);
    }

    write8(addr: number, value: number): void {
        const device = this.getIODevice(addr);
        if (device) {
            device.write8(addr, value);
            return;
        }
        if (!this.isValidAddress(addr)) {
            return;
        }
        this.ram[addr] = value & 0xFF;
    }

    write16(addr: number, value: number): void {
        const device = this.getIODevice(addr);
        if (device) {
            device.write16(addr, value);
            return;
        }
        if (!this.isValidAddress(addr) || !this.isValidAddress(addr + 1)) {
            return;
        }
        this.ram[addr] = value & 0xFF;
        this.ram[addr + 1] = (value >> 8) & 0xFF;
    }

    write32(addr: number, value: number): void {
        const device = this.getIODevice(addr);
        if (device) {
            device.write32(addr, value);
            return;
        }
        if (!this.isValidAddress(addr) || !this.isValidAddress(addr + 3)) {
            return;
        }
        this.ram[addr] = value & 0xFF;
        this.ram[addr + 1] = (value >> 8) & 0xFF;
        this.ram[addr + 2] = (value >> 16) & 0xFF;
        this.ram[addr + 3] = (value >> 24) & 0xFF;
    }

    isValidAddress(addr: number): boolean {
        return addr >= 0 && addr < this.size;
    }

    mapIODevice(base: number, device: IODevice, size: number): void {
        for (let i = 0; i < size; i++) {
            this.ioRegions.set(base + i, device);
        }
    }

    unmapIODevice(base: number): void {
        const entriesToRemove: number[] = [];
        for (const [addr, device] of this.ioRegions) {
            if (addr >= base) {
                entriesToRemove.push(addr);
            }
        }
        for (const addr of entriesToRemove) {
            this.ioRegions.delete(addr);
        }
    }

    getIODevice(addr: number): IODevice | undefined {
        return this.ioRegions.get(addr);
    }

    load(data: Uint8Array, offset: number): void {
        const end = offset + data.length;
        if (end > this.ram.length) {
            throw new Error('Data exceeds physical memory bounds');
        }
        this.ram.set(data, offset);
    }

    dump(start: number, length: number): Uint8Array {
        if (!this.isValidAddress(start) || !this.isValidAddress(start + length - 1)) {
            throw new Error('Invalid memory range for dump');
        }
        return this.ram.slice(start, start + length);
    }

    clear(): void {
        this.ram.fill(0);
    }
}
