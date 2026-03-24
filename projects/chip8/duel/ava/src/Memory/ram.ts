export class Ram {
    private data: Uint8Array;
    private size: number;

    constructor() {
        this.size = 4096;
        this.data = new Uint8Array(this.size);
    }

    read(address: number): number {
        if (!this.isValidAddress(address)) {
            throw new Error(`Invalid memory address: 0x${address.toString(16).padStart(3, '0')}`);
        }
        return this.data[address];
    }

    write(address: number, value: number): void {
        if (!this.isValidAddress(address)) {
            throw new Error(`Invalid memory address: 0x${address.toString(16).padStart(3, '0')}`);
        }
        if (value < 0 || value > 255) {
            throw new Error(`Value out of range: ${value}`);
        }
        this.data[address] = value;
    }

    readWord(address: number): number {
        if (!this.isValidAddress(address) || !this.isValidAddress(address + 1)) {
            throw new Error(`Invalid memory address for word read: 0x${address.toString(16).padStart(3, '0')}`);
        }
        const high = this.data[address] << 8;
        const low = this.data[address + 1];
        return high | low;
    }

    writeWord(address: number, value: number): void {
        if (!this.isValidAddress(address) || !this.isValidAddress(address + 1)) {
            throw new Error(`Invalid memory address for word write: 0x${address.toString(16).padStart(3, '0')}`);
        }
        if (value < 0 || value > 65535) {
            throw new Error(`Value out of range for word: ${value}`);
        }
        this.data[address] = (value >> 8) & 0xFF;
        this.data[address + 1] = value & 0xFF;
    }

    clear(): void {
        this.data.fill(0);
    }

    copy(source: Uint8Array, offset: number): void {
        if (offset < 0 || offset + source.length > this.size) {
            throw new Error(`Copy range out of bounds: offset=${offset}, length=${source.length}`);
        }
        this.data.set(source, offset);
    }

    dump(start: number, length: number): Uint8Array {
        if (start < 0 || start + length > this.size) {
            throw new Error(`Dump range out of bounds: start=${start}, length=${length}`);
        }
        return this.data.slice(start, start + length);
    }

    load(data: Uint8Array, offset: number): void {
        if (offset < 0 || offset + data.length > this.size) {
            throw new Error(`Load range out of bounds: offset=${offset}, length=${data.length}`);
        }
        this.data.set(data, offset);
    }

    isValidAddress(address: number): boolean {
        return address >= 0 && address < this.size;
    }

    getSize(): number {
        return this.size;
    }

    reset(): void {
        this.clear();
    }
}
