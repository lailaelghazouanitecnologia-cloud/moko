private entries: PageEntry[];
  private cr3: number;

  constructor() {
    this.entries = [];
    this.cr3 = 0;
  }

  setCR3(value: number): void {
    this.cr3 = value;
  }

  getCR3(): number {
    return this.cr3;
  }

  mapPage(virtual: number, physical: number, flags: number): void {
    const index = this.getPageIndex(virtual);
    const entry: PageEntry = {
      present: true,
      physicalAddress: physical,
      flags: flags
    };
    this.entries[index] = entry;
  }

  unmapPage(virtual: number): void {
    const index = this.getPageIndex(virtual);
    if (this.entries[index]) {
      this.entries[index].present = false;
    }
  }

  getPhysicalAddress(virtual: number): number {
    const index = this.getPageIndex(virtual);
    const entry = this.entries[index];
    if (!entry || !entry.present) {
      throw new Error(`Page not present for virtual address 0x${virtual.toString(16)}`);
    }
    const offset = virtual & 0xFFF;
    return entry.physicalAddress + offset;
  }

  isPresent(virtual: number): boolean {
    const index = this.getPageIndex(virtual);
    const entry = this.entries[index];
    return entry !== undefined && entry.present;
  }

  getPageFlags(virtual: number): number {
    const index = this.getPageIndex(virtual);
    const entry = this.entries[index];
    if (!entry) {
      return 0;
    }
    return entry.flags;
  }

  setPageFlags(virtual: number, flags: number): void {
    const index = this.getPageIndex(virtual);
    if (this.entries[index]) {
      this.entries[index].flags = flags;
    }
  }

  invalidateTLB(address: number): void {
    // Simulate TLB invalidation
    // In real hardware, this would invalidate the TLB entry for the specific address
  }

  invalidateAll(): void {
    // Simulate full TLB flush
    // In real hardware, this would invalidate all TLB entries
  }

  walkPageTable(virtual: number): PageWalkResult {
    const index = this.getPageIndex(virtual);
    const entry = this.entries[index];
    return {
      found: entry !== undefined && entry.present,
      entry: entry || null,
      level: 0
    };
  }

  private getPageIndex(virtual: number): number {
    // Extract page index from virtual address (4KB pages, 4GB address space)
    return (virtual >>> 12) & 0xFFFFF;
  }
}
