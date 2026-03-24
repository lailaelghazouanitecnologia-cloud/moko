import { Memory } from './memory';
import { createHash } from 'crypto';

export class Rom extends Memory {
    private buffer: Uint8Array;
    private size: number;

    constructor(data: Uint8Array) {
        super();
        this.buffer = new Uint8Array(data);
        this.size = this.buffer.length;
    }

    read(address: number): number {
        this.validateAddress(address);
        return this.buffer[address];
    }

    write(address: number, value: number): void {
        throw new Error('ROM is read-only');
    }

    readWord(address: number): number {
        this.validateAddress(address);
        this.validateAddress(address + 1);
        return (this.buffer[address] << 8) | this.buffer[address + 1];
    }

    writeWord(address: number, value: number): void {
        throw new Error('ROM is read-only');
    }

    readRange(start: number, length: number): Uint8Array {
        this.validateAddress(start);
        this.validateAddress(start + length - 1);
        return this.buffer.subarray(start, start + length);
    }

    writeRange(address: number, data: Uint8Array): void {
        throw new Error('ROM is read-only');
    }

    getSize(): number {
        return this.size;
    }

    isReadable(address: number): boolean {
        return address >= 0 && address < this.size;
    }

    isWritable(address: number): boolean {
        return false;
    }

    clear(start?: number, end?: number): void {
        throw new Error('ROM is read-only');
    }

    copy(dest: number, src: number, length: number): void {
        throw new Error('ROM is read-only');
    }

    validateAddress(address: number): void {
        if (address < 0 || address >= this.size) {
            throw new Error(`Address out of bounds: ${address}`);
        }
    }

    getHash(): string {
        const hash = createHash('sha256');
        hash.update(this.buffer);
        return hash.digest('hex');
    }

    getHexDump(start: number, length: number): string {
        this.validateAddress(start);
        this.validateAddress(start + length - 1);
        const slice = this.buffer.subarray(start, start + length);
        let hex = '';
        for (let i = 0; i < slice.length; i++) {
            if (i > 0) hex += ' ';
            hex += slice[i].toString(16).padStart(2, '0');
        }
        return hex;
    }
}
