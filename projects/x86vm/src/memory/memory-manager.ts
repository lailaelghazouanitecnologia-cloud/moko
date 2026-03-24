private pageTable: PageTable;
  private physicalMemory: PhysicalMemory;
  private protection: MemoryProtection;

  constructor(pageTable: PageTable, physicalMemory: PhysicalMemory, protection: MemoryProtection) {
    this.pageTable = pageTable;
    this.physicalMemory = physicalMemory;
    this.protection = protection;
  }

  allocate(size: number, flags: number): number {
    const pageSize = 4096;
    const numPages = Math.ceil(size / pageSize);
    
    for (let i = 0; i < 0x100000; i += pageSize) {
      let canAllocate = true;
      for (let j = 0; j < numPages; j++) {
        if (this.pageTable.isPresent(i + j * pageSize)) {
          canAllocate = false;
          break;
        }
      }
      
      if (canAllocate) {
        const virtualAddress = i;
        for (let j = 0; j < numPages; j++) {
          const physicalAddress = this.physicalMemory.allocateBlock(pageSize);
          if (physicalAddress === -1) {
            for (let k = 0; k < j; k++) {
              this.pageTable.unmapPage(virtualAddress + k * pageSize);
              this.physicalMemory.freeBlock(this.pageTable.getPhysicalAddress(virtualAddress + k * pageSize));
            }
            return -1;
          }
          this.pageTable.mapPage(virtualAddress + j * pageSize, physicalAddress, flags);
        }
        return virtualAddress;
      }
    }
    
    return -1;
  }

  free(address: number): void {
    const pageSize = 4096;
    let currentAddress = address;
    
    while (this.pageTable.isPresent(currentAddress)) {
      const physicalAddress = this.pageTable.getPhysicalAddress(currentAddress);
      this.physicalMemory.freeBlock(physicalAddress);
      this.pageTable.unmapPage(currentAddress);
      currentAddress += pageSize;
    }
  }

  read(address: number): number {
    if (!this.checkAccess(address, 1)) {
      this.handlePageFault(address);
      return 0;
    }
    
    const physicalAddress = this.translateAddress(address);
    if (physicalAddress === -1) {
      this.handlePageFault(address);
      return 0;
    }
    
    return this.physicalMemory.read(physicalAddress);
  }

  write(address: number, value: number): void {
    if (!this.checkAccess(address, 2)) {
      this.handlePageFault(address);
      return;
    }
    
    const physicalAddress = this.translateAddress(address);
    if (physicalAddress === -1) {
      this.handlePageFault(address);
      return;
    }
    
    this.physicalMemory.write(physicalAddress, value & 0xFF);
  }

  readWord(address: number): number {
    if (!this.checkAccess(address, 1)) {
      this.handlePageFault(address);
      return 0;
    }
    
    const physicalAddress = this.translateAddress(address);
    if (physicalAddress === -1) {
      this.handlePageFault(address);
      return 0;
    }
    
    return this.physicalMemory.readWord(physicalAddress);
  }

  writeWord(address: number, value: number): void {
    if (!this.checkAccess(address, 2)) {
      this.handlePageFault(address);
      return;
    }
    
    const physicalAddress = this.translateAddress(address);
    if (physicalAddress === -1) {
      this.handlePageFault(address);
      return;
    }
    
    this.physicalMemory.writeWord(physicalAddress, value & 0xFFFF);
  }

  readDWord(address: number): number {
    if (!this.checkAccess(address, 1)) {
      this.handlePageFault(address);
      return 0;
    }
    
    const physicalAddress = this.translateAddress(address);
    if (physicalAddress === -1) {
      this.handlePageFault(address);
      return 0;
    }
    
    return this.physicalMemory.readDWord(physicalAddress);
  }

  writeDWord(address: number, value: number): void {
    if (!this.checkAccess(address, 2)) {
      this.handlePageFault(address);
      return;
    }
    
    const physicalAddress = this.translateAddress(address);
    if (physicalAddress === -1) {
      this.handlePageFault(address);
      return;
    }
    
    this.physicalMemory.writeDWord(physicalAddress, value >>> 0);
  }

  translateAddress(virtual: number): number {
    if (!this.pageTable.isPresent(virtual)) {
      return -1;
    }
    
    const pageOffset = virtual & 0xFFF;
    const physicalPage = this.pageTable.getPhysicalAddress(virtual);
    
    if (physicalPage === -1) {
      return -1;
    }
    
    return physicalPage + pageOffset;
  }

  checkAccess(address: number, access: number): boolean {
    if (!this.pageTable.isPresent(address)) {
      return false;
    }
    
    const flags = this.pageTable.getPageFlags(address);
    
    if (access === 1) {
      return this.protection.checkReadAccess(address) && (flags & 0x1) !== 0;
    } else if (access === 2) {
      return this.protection.checkWriteAccess(address) && (flags & 0x2) !== 0;
    } else if (access === 4) {
      return (flags & 0x4) !== 0;
    }
    
    return false;
  }

  handlePageFault(address: number): void {
    const present = this.pageTable.isPresent(address);
    this.protection.raisePageFault(address, present);
  }

  getPageInfo(address: number): PageInfo {
    const physicalAddress = this.translateAddress(address);
    const flags = this.pageTable.getPageFlags(address);
    
    return {
      virtualAddress: address & ~0xFFF,
      physicalAddress: physicalAddress !== -1 ? physicalAddress & ~0xFFF : -1,
      size: 4096,
      flags: flags
    };
  }
}
