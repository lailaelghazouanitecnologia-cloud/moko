private entries: Uint32Array = new Uint32Array(1024);

    getEntry(index: number): number {
        return this.entries[index];
    }

    setEntry(index: number, entry: number): void {
        this.entries[index] = entry;
    }

    isPresent(index: number): boolean {
        return (this.entries[index] & 0x1) !== 0;
    }

    isWritable(index: number): boolean {
        return (this.entries[index] & 0x2) !== 0;
    }

    isUser(index: number): boolean {
        return (this.entries[index] & 0x4) !== 0;
    }

    isAccessed(index: number): boolean {
        return (this.entries[index] & 0x20) !== 0;
    }

    isDirty(index: number): boolean {
        return (this.entries[index] & 0x40) !== 0;
    }

    getPhysicalAddress(index: number): number {
        return (this.entries[index] & 0xFFFFF000) >>> 0;
    }

    getPhysicalAddr(index: number): number {
        return this.getPhysicalAddress(index);
    }

    setPhysicalAddress(index: number, addr: number): void {
        const entry = this.entries[index] & 0xFFF;
        this.entries[index] = (addr & 0xFFFFF000) | entry;
    }

    setPresent(index: number, present: boolean): void {
        if (present) {
            this.entries[index] |= 0x1;
        } else {
            this.entries[index] &= ~0x1;
        }
    }

    setWritable(index: number, writable: boolean): void {
        if (writable) {
            this.entries[index] |= 0x2;
        } else {
            this.entries[index] &= ~0x2;
        }
    }

    setUser(index: number, user: boolean): void {
        if (user) {
            this.entries[index] |= 0x4;
        } else {
            this.entries[index] &= ~0x4;
        }
    }

    setAccessed(index: number, accessed: boolean): void {
        if (accessed) {
            this.entries[index] |= 0x20;
        } else {
            this.entries[index] &= ~0x20;
        }
    }

    setDirty(index: number, dirty: boolean): void {
        if (dirty) {
            this.entries[index] |= 0x40;
        } else {
            this.entries[index] &= ~0x40;
        }
    }

    setGlobal(index: number, global: boolean): void {
        if (global) {
            this.entries[index] |= 0x100;
        } else {
            this.entries[index] &= ~0x100;
        }
    }

    isGlobal(index: number): boolean {
        return (this.entries[index] & 0x100) !== 0;
    }

    getPageTable(cr3: number, index: number): PageTable {
        const memoryManager = new MemoryManager();
        const pageDirEntry = memoryManager.pageTables.get(cr3)?.getEntry(index) ?? 0;
        
        if ((pageDirEntry & 0x1) === 0) {
            const newTable = new PageTable();
            memoryManager.pageTables.set(cr3 + index * 0x1000, newTable);
            return newTable;
        }
        
        const tableAddr = pageDirEntry & 0xFFFFF000;
        const existingTable = memoryManager.pageTables.get(tableAddr);
        if (existingTable) {
            return existingTable;
        }
        
        const newTable = new PageTable();
        memoryManager.pageTables.set(tableAddr, newTable);
        return newTable;
    }

    invalidateEntry(index: number): void {
        this.entries[index] = 0;
    }
}
