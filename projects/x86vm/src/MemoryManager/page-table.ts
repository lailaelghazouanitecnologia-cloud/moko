export class PageTable {
    entries: Uint32Array;
    level: number;

    constructor(level: number = 0) {
        this.entries = new Uint32Array(1024);
        this.level = level;
    }

    getEntry(index: number): number {
        if (index < 0 || index >= 1024) {
            throw new RangeError('Page table index out of range');
        }
        return this.entries[index];
    }

    setEntry(index: number, entry: number): void {
        if (index < 0 || index >= 1024) {
            throw new RangeError('Page table index out of range');
        }
        this.entries[index] = entry >>> 0;
    }

    isPresent(index: number): boolean {
        if (index < 0 || index >= 1024) {
            throw new RangeError('Page table index out of range');
        }
        return (this.entries[index] & 0x1) !== 0;
    }

    isWritable(index: number): boolean {
        if (index < 0 || index >= 1024) {
            throw new RangeError('Page table index out of range');
        }
        return (this.entries[index] & 0x2) !== 0;
    }

    isUser(index: number): boolean {
        if (index < 0 || index >= 1024) {
            throw new RangeError('Page table index out of range');
        }
        return (this.entries[index] & 0x4) !== 0;
    }

    isAccessed(index: number): boolean {
        if (index < 0 || index >= 1024) {
            throw new RangeError('Page table index out of range');
        }
        return (this.entries[index] & 0x20) !== 0;
    }

    isDirty(index: number): boolean {
        if (index < 0 || index >= 1024) {
            throw new RangeError('Page table index out of range');
        }
        return (this.entries[index] & 0x40) !== 0;
    }

    getPhysicalAddress(index: number): number {
        if (index < 0 || index >= 1024) {
            throw new RangeError('Page table index out of range');
        }
        return (this.entries[index] & 0xFFFFF000) >>> 0;
    }

    setPhysicalAddress(index: number, addr: number): void {
        if (index < 0 || index >= 1024) {
            throw new RangeError('Page table index out of range');
        }
        if ((addr & 0xFFF) !== 0) {
            throw new Error('Physical address must be 4KB aligned');
        }
        const flags = this.entries[index] & 0xFFF;
        this.entries[index] = (addr & 0xFFFFF000) | flags;
    }

    getFlags(index: number): number {
        if (index < 0 || index >= 1024) {
            throw new RangeError('Page table index out of range');
        }
        return this.entries[index] & 0xFFF;
    }

    setFlags(index: number, flags: number): void {
        if (index < 0 || index >= 1024) {
            throw new RangeError('Page table index out of range');
        }
        const addr = this.entries[index] & 0xFFFFF000;
        this.entries[index] = addr | (flags & 0xFFF);
    }

    clear(): void {
        this.entries.fill(0);
    }

    clone(): PageTable {
        const cloned = new PageTable(this.level);
        cloned.entries.set(this.entries);
        return cloned;
    }
}
