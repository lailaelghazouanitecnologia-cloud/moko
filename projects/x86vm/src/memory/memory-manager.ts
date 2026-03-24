physicalMemory: Uint8Array = new Uint8Array(16 * 1024 * 1021024);
  pageTables: Map<number, PageTable> = new Map();
  segmentDescriptors: SegmentDescriptor[] = [];
  cr0: number = 0;
  cr3: number = 0;
  cr4: number = 0;

  read8(linearAddr: number): number {
    if (this.isProtectedMode() && this.isPagingEnabled()) {
      const physicalAddr = this.getPhysicalAddress(linearAddr);
      if (physicalAddr === -1) {
        this.handlePageFault(linearAddr, false);
        return 0;
      }
      return this.physicalMemory[physicalAddr];
    } else {
      return this.physicalMemory[linearAddr & 0xFFFFFF];
    }
  }

  read16(linearAddr: number): number {
    const low = this.read8(linearAddr);
    const high = this.read8(linearAddr + 1);
    return (high << 8) | low;
  }

  read32(linearAddr: number): number {
    const low = this.read16(linearAddr);
    const high = this.read16(linearAddr + 2);
    return (high << 16) | low;
  }

  write8(linearAddr: number, value: number): void {
    if (this.isProtectedMode() && this.isPagingEnabled()) {
      const physicalAddr = this.getPhysicalAddress(linearAddr);
      if (physicalAddr === -1) {
        this.handlePageFault(linearAddr, true);
        return;
      }
      if (!this.checkPageAccess(linearAddr, true)) {
        this.handlePageFault(linearAddr, true);
        return;
      }
      this.physicalMemory[physicalAddr] = value & 0xFF;
    } else {
      this.physicalMemory[linearAddr & 0xFFFFFF] = value & 0xFF;
    }
  }

  write16(linearAddr: number, value: number): void {
    this.write8(linearAddr, value & 0xFF);
    this.write8(linearAddr + 1, (value >> 8) & 0xFF);
  }

  write32(linearAddr: number, value: number): void {
    this.write16(linearAddr, value & 0xFFFF);
    this.write16(linearAddr + 2, (value >> 16) & 0xFFFF);
  }

  translateAddress(segment: number, offset: number): number {
    if (!this.isProtectedMode()) {
      return (segment << 4) + offset;
    }
    const selector = segment & 0xFFFC;
    const index = selector >> 3;
    const ti = (segment >> 2) & 1;
    const rpl = segment & 3;
    
    if (index >= this.segmentDescriptors.length) {
      throw new Error('Invalid selector');
    }
    
    const descriptor = this.segmentDescriptors[index];
    if (!descriptor.isPresent()) {
      throw new Error('Segment not present');
    }
    
    const base = descriptor.getBase();
    const limit = descriptor.getLimit();
    const finalAddr = base + offset;
    
    if (descriptor.getGranularity()) {
      if (finalAddr > (limit + 1) * 0x1000 - 1) {
        throw new Error('Segment limit exceeded');
      }
    } else {
      if (finalAddr > limit) {
        throw new Error('Segment limit exceeded');
      }
    }
    
    return finalAddr;
  }

  enablePaging(enable: boolean): void {
    if (enable) {
      this.cr0 |= 0x80000000;
    } else {
      this.cr0 &= ~0x80000000;
    }
  }

  isPagingEnabled(): boolean {
    return (this.cr0 & 0x80000000) !== 0;
  }

  isProtectedMode(): boolean {
    return (this.cr0 & 0x1) !== 0;
  }

  handlePageFault(linearAddr: number, isWrite: boolean): void {
    throw new Error(`Page fault at 0x${linearAddr.toString(16).padStart(8, '0')} (${isWrite ? 'write' : 'read'})`);
  }

  invalidateTLB(): void {
    // TLB flush implementation
  }

  setCR3(value: number): void {
    this.cr3 = value;
  }

  getPhysicalAddress(linearAddr: number): number {
    if (!this.isPagingEnabled()) {
      return linearAddr;
    }
    
    const pdIndex = (linearAddr >> 22) & 0x3FF;
    const ptIndex = (linearAddr >> 12) & 0x3FF;
    const offset = linearAddr & 0xFFF;
    
    const pageDir = this.pageTables.get(this.cr3);
    if (!pageDir || !pageDir.isPresent(pdIndex)) {
      return -1;
    }
    
    const pageTableAddr = pageDir.getPhysicalAddress(pdIndex);
    const pageTable = this.pageTables.get(pageTableAddr);
    if (!pageTable || !pageTable.isPresent(ptIndex)) {
      return -1;
    }
    
    const physicalPage = pageTable.getPhysicalAddress(ptIndex);
    return physicalPage + offset;
  }

  checkPageAccess(linearAddr: number, isWrite: boolean): boolean {
    const pdIndex = (linearAddr >> 22) & 0x3FF;
    const ptIndex = (linearAddr >> 12) & 0x3FF;
    
    const pageDir = this.pageTables.get(this.cr3);
    if (!pageDir || !pageDir.isPresent(pdIndex)) {
      return false;
    }
    
    const pageTableAddr = pageDir.getPhysicalAddress(pdIndex);
    const pageTable = this.pageTables.get(pageTableAddr);
    if (!pageTable || !pageTable.isPresent(ptIndex)) {
      return false;
    }
    
    if (isWrite && !pageTable.isWritable(ptIndex)) {
      return false;
    }
    
    return true;
  }

  allocatePage(linearAddr: number): void {
    const pdIndex = (linearAddr >> 22) & 0x3FF;
    const ptIndex = (linearAddr >> 12) & 0x3FF;
    
    let pageDir = this.pageTables.get(this.cr3);
    if (!pageDir) {
      pageDir = new PageTable();
      this.pageTables.set(this.cr3, pageDir);
    }
    
    if (!pageDir.isPresent(pdIndex)) {
      const pageTable = new PageTable();
      const pageTableAddr = this.cr3 + 0x1000 + (pdIndex * 0x1000);
      this.pageTables.set(pageTableAddr, pageTable);
      pageDir.setEntry(pdIndex, pageTableAddr | 0x3);
    }
    
    const pageTableAddr = pageDir.getPhysicalAddress(pdIndex);
    let pageTable = this.pageTables.get(pageTableAddr);
    if (!pageTable) {
      pageTable = new PageTable();
      this.pageTables.set(pageTableAddr, pageTable);
    }
    
    const physicalAddr = 0x100000 + (this.pageTables.size * 0x1000);
    pageTable.setEntry(ptIndex, physicalAddr | 0x3);
  }

  freePage(linearAddr: number): void {
    const pdIndex = (linearAddr >> 22) & 0x3FF;
    const ptIndex = (linearAddr >> 12) & 0x3FF;
    
    const pageDir = this.pageTables.get(this.cr3);
    if (!pageDir || !pageDir.isPresent(pdIndex)) {
      return;
    }
    
    const pageTableAddr = pageDir.getPhysicalAddress(pdIndex);
    const pageTable = this.pageTables.get(pageTableAddr);
    if (pageTable) {
      pageTable.setPresent(ptIndex, false);
    }
  }

  dumpPageTable(cr3: number): string {
    const pageDir = this.pageTables.get(cr3);
    if (!pageDir) {
      return 'No page directory found';
    }
    
    let output = 'Page Directory:\n';
    for (let i = 0; i < 1024; i++) {
      if (pageDir.isPresent(i)) {
        const pageTableAddr = pageDir.getPhysicalAddress(i);
        const pageTable = this.pageTables.get(pageTableAddr);
        if (pageTable) {
          output += `  PD[${i}] -> 0x${pageTableAddr.toString(16).padStart(8, '0')}\n`;
          for (let j = 0; j < 1024; j++) {
            if (pageTable.isPresent(j)) {
              const physAddr = pageTable.getPhysicalAddress(j);
              output += `    PT[${j}] -> 0x${physAddr.toString(16).padStart(8, '0')}\n`;
            }
          }
        }
      }
    }
    return output;
  }
}
