import { Memory } from './memory';
import { Rom } from './rom';
import { Font } from './font';

export class Ram extends Memory {
    buffer: Uint8Array;
    size: number;

    constructor() {
        super();
        this.buffer = new Uint8Array(4096);
        this.size = 4096;
    }

    read(address: number): number {
        this.validateAddress(address);
        return this.buffer[address];
    }

    write(address: number, value: number): void {
        this.validateAddress(address);
        this.buffer[address] = value & 0xFF;
    }

    readWord(address: number): number {
        this.validateAddress(address);
        this.validateAddress(address + 1);
        return (this.buffer[address] << 8) | this.buffer[address + 1];
    }

    writeWord(address: number, value: number): void {
        this.validateAddress(address);
        this.validateAddress(address + 1);
        this.buffer[address] = (value >> 8) & 0xFF;
        this.buffer[address + 1] = value & 0xFF;
    }

    readRange(start: number, length: number): Uint8Array {
        this.validateAddress(start);
        this.validateAddress(start + length - 1);
        return this.buffer.subarray(start, start + length);
    }

    writeRange(address: number, data: Uint8Array): void {
        this.validateAddress(address);
        this.validateAddress(address + data.length - 1);
        this.buffer.set(data, address);
    }

    getSize(): number {
        return this.size;
    }

    isReadable(address: number): boolean {
        return true;
    }

    isWritable(address: number): boolean {
        return true;
    }

    clear(start?: number, end?: number): void {
        if (start === undefined) start = 0;
        if (end === undefined) end = this.size;
        this.buffer.fill(0, start, end);
    }

    copy(dest: number, src: number, length: number): void {
        this.validateAddress(dest);
        this.validateAddress(dest + length - 1);
        this.validateAddress(src);
        this.validateAddress(src + length - 1);
        this.buffer.copyWithin(dest, src, src + length);
    }

    validateAddress(address: number): void {
        if (address < 0 || address >= this.size) {
            throw new Error(`Address out of bounds: ${address}`);
        }
    }

    loadFromRom(rom: Rom, offset?: number): void {
        if (offset === undefined) offset = 0;
        const romData = rom.readRange(offset, rom.getSize() - offset);
        this.writeRange(0, romData);
    }

    loadFromFont(font: Font): void {
        const fontData = font.readRange(0, font.getSize());
        this.writeRange(0, fontData);
    }

    getHexDump(start: number, length: number): string {
        this.validateAddress(start);
        this.validateAddress(start + length - 1);
        const end = start + length;
        const lines: string[] = [];
        for (let i = start; i < end; i += 16) {
            const lineBytes = [];
            for (let j = 0; j < 16 && i + j < end; j++) {
                lineBytes.push(this.buffer[i + j].toString(16).padStart(2, '0'));
            }
            lines.push(lineBytes.join(' '));
        }
        return lines.join('\n');
    }
}
