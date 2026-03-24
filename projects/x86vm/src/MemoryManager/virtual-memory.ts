import { PhysicalMemory } from './physical-memory';

export class VirtualMemory {
    private pageDirectory: Uint32Array = new Uint32Array(1024);
    private pageTables: Map<number, Uint32Array> = new Map();
    private isEnabled: boolean = false;
    private physicalMemory: PhysicalMemory | null = null;

    constructor(physicalMemory: PhysicalMemory) {
        this.physicalMemory = physicalMemory;
    }

    enable(cr0: number, cr3: number): void {
        if ((cr0 & 0x80000000) === 0) {
            throw new Error('Paging bit not set in CR0');
        }
        
        this.isEnabled = true;
        
        const pageDirPhys = cr3 & 0xFFFFF000;
        if (!this.physicalMemory) {
            throw new Error('Physical memory not initialized');
        }
        
        for (let i = 0; i < 1024; i++) {
            const entryAddr = pageDirPhys + (i * 4);
            const entry = this.physicalMemory.read32(entryAddr);
            this.pageDirectory[i] = entry;
            
            if ((entry & 0x1) !== 0) {
                const tablePhys = entry & 0xFFFFF000;
                const table = new Uint32Array(1024);
                
                for (let j = 0; j < 1024; j++) {
                    const tableEntryAddr = tablePhys + (j * 4);
                    table[j] = this.physicalMemory.read32(tableEntryAddr);
                }
                
                this.pageTables.set(i, table);
            }
        }
    }

    disable(): void {
        this.isEnabled = false;
        this.pageTables.clear();
        this.pageDirectory.fill(0);
    }

    isPagingEnabled(): boolean {
        return this.isEnabled;
    }

    translateAddress(linear: number): number {
        if (!this.isEnabled) {
            return linear;
        }

        const dirIndex = (linear >>> 22) & 0x3FF;
        const tableIndex = (linear >>> 12) & 0x3FF;
        const offset = linear & 0xFFF;

        const dirEntry = this.pageDirectory[dirIndex];
        if ((dirEntry & 0x1) === 0) {
            throw new Error(`Page directory entry not present for linear address 0x${linear.toString(16)}`);
        }

        const table = this.pageTables.get(dirIndex);
        if (!table) {
            throw new Error(`Page table not loaded for directory index ${dirIndex}`);
        }

        const tableEntry = table[tableIndex];
        if ((tableEntry & 0x1) === 0) {
            throw new Error(`Page table entry not present for linear address 0x${linear.toString(16)}`);
        }

        const physicalPage = tableEntry & 0xFFFFF000;
        return physicalPage | offset;
    }

    read8(linear: number): number {
        if (!this.physicalMemory) {
            throw new Error('Physical memory not initialized');
        }

        const physical = this.isEnabled ? this.translateAddress(linear) : linear;
        return this.physicalMemory.read8(physical);
    }

    read16(linear: number): number {
        if (!this.physicalMemory) {
            throw new Error('Physical memory not initialized');
        }

        const physical = this.isEnabled ? this.translateAddress(linear) : linear;
        return this.physicalMemory.read16(physical);
    }

    read32(linear: number): number {
        if (!this.physicalMemory) {
            throw new Error('Physical memory not initialized');
        }

        const physical = this.isEnabled ? this.translateAddress(linear) : linear;
        return this.physicalMemory.read32(physical);
    }

    write8(linear: number, value: number): void {
        if (!this.physicalMemory) {
            throw new Error('Physical memory not initialized');
        }

        const physical = this.isEnabled ? this.translateAddress(linear) : linear;
        this.physicalMemory.write8(physical, value);
    }

    write16(linear: number, value: number): void {
        if (!this.physicalMemory) {
            throw new Error('Physical memory not initialized');
        }

        const physical = this.isEnabled ? this.translateAddress(linear) : linear;
        this.physicalMemory.write16(physical, value);
    }

    write32(linear: number, value: number): void {
        if (!this.physicalMemory) {
            throw new Error('Physical memory not initialized');
        }

        const physical = this.isEnabled ? this.translateAddress(linear) : linear;
        this.physicalMemory.write32(physical, value);
    }

    setPageTableEntry(linear: number, entry: number): void {
        const dirIndex = (linear >>> 22) & 0x3FF;
        const tableIndex = (linear >>> 12) & 0x3FF;

        let table = this.pageTables.get(dirIndex);
        if (!table) {
            table = new Uint32Array(1024);
            this.pageTables.set(dirIndex, table);
        }

        table[tableIndex] = entry;
    }

    getPageTableEntry(linear: number): number {
        const dirIndex = (linear >>> 22) & 0x3FF;
        const tableIndex = (linear >>> 12) & 0x3FF;

        const table = this.pageTables.get(dirIndex);
        if (!table) {
            return 0;
        }

        return table[tableIndex];
    }

    invalidatePage(linear: number): void {
        // TLB invalidation would be handled by MemoryMapper
        // This is a placeholder for page invalidation logic
    }

    invalidateTLB(): void {
        // TLB invalidation would be handled by MemoryMapper
        // This is a placeholder for TLB invalidation logic
    }

    handlePageFault(linear: number, isWrite: boolean): void {
        const dirIndex = (linear >>> 22) & 0x3FF;
        const tableIndex = (linear >>> 12) & 0x3FF;

        const dirEntry = this.pageDirectory[dirIndex];
        if ((dirEntry & 0x1) === 0) {
            throw new Error(`Page directory not present for fault at 0x${linear.toString(16)}`);
        }

        const table = this.pageTables.get(dirIndex);
        if (!table) {
            throw new Error(`Page table not present for fault at 0x${linear.toString(16)}`);
        }

        const tableEntry = table[tableIndex];
        if ((tableEntry & 0x1) === 0) {
            throw new Error(`Page not present for fault at 0x${linear.toString(16)}`);
        }

        if (isWrite && ((tableEntry & 0x2) === 0)) {
            throw new Error(`Write protection fault at 0x${linear.toString(16)}`);
        }
    }
}
