import { PhysicalMemory } from './physical-memory';
import { VirtualMemory } from './virtual-memory';
import { TLB } from './tlb';

export interface MemoryInfo {
  linear: number;
  physical: number;
  size: number;
  flags: number;
  present: boolean;
  writable: boolean;
  user: boolean;
}

export class MemoryMapper {
  private physicalMemory: PhysicalMemory | null = null;
  private virtualMemory: VirtualMemory | null = null;
  private tlb: TLB | null = null;

  constructor(physicalMemory: PhysicalMemory, virtualMemory: VirtualMemory, tlb: TLB) {
    this.physicalMemory = physicalMemory;
    this.virtualMemory = virtualMemory;
    this.tlb = tlb;
  }

  mapMemory(linear: number, physical: number, size: number, flags: number): void {
    if (!this.virtualMemory || !this.physicalMemory) {
      throw new Error('Memory systems not initialized');
    }

    const pageSize = 4096;
    const startPage = linear & ~(pageSize - 1);
    const endPage = (linear + size + pageSize - 1) & ~(pageSize - 1);

    for (let page = startPage; page < endPage; page += pageSize) {
      const offset = page - linear;
      const physPage = (physical + offset) & ~(pageSize - 1);
      
      this.virtualMemory.setPageTableEntry(page, (physPage & 0xFFFFF000) | (flags & 0xFFF) | 0x1);
      this.tlb?.invalidate(page);
    }
  }

  unmapMemory(linear: number, size: number): void {
    if (!this.virtualMemory) {
      throw new Error('Virtual memory not initialized');
    }

    const pageSize = 4096;
    const startPage = linear & ~(pageSize - 1);
    const endPage = (linear + size + pageSize - 1) & ~(pageSize - 1);

    for (let page = startPage; page < endPage; page += pageSize) {
      this.virtualMemory.setPageTableEntry(page, 0);
      this.tlb?.invalidate(page);
    }
  }

  readMemory(linear: number, size: number): number {
    if (!this.virtualMemory || !this.physicalMemory) {
      throw new Error('Memory systems not initialized');
    }

    let value = 0;
    const physical = this.translateAddress(linear);
    
    switch (size) {
      case 1:
        value = this.physicalMemory.read8(physical);
        break;
      case 2:
        value = this.physicalMemory.read16(physical);
        break;
      case 4:
        value = this.physicalMemory.read32(physical);
        break;
      default:
        throw new Error(`Invalid read size: ${size}`);
    }
    
    return value;
  }

  writeMemory(linear: number, value: number, size: number): void {
    if (!this.virtualMemory || !this.physicalMemory) {
      throw new Error('Memory systems not initialized');
    }

    const physical = this.translateAddress(linear);
    
    switch (size) {
      case 1:
        this.physicalMemory.write8(physical, value & 0xFF);
        break;
      case 2:
        this.physicalMemory.write16(physical, value & 0xFFFF);
        break;
      case 4:
        this.physicalMemory.write32(physical, value & 0xFFFFFFFF);
        break;
      default:
        throw new Error(`Invalid write size: ${size}`);
    }
  }

  protectMemory(linear: number, size: number, flags: number): void {
    if (!this.virtualMemory) {
      throw new Error('Virtual memory not initialized');
    }

    const pageSize = 4096;
    const startPage = linear & ~(pageSize - 1);
    const endPage = (linear + size + pageSize - 1) & ~(pageSize - 1);

    for (let page = startPage; page < endPage; page += pageSize) {
      const entry = this.virtualMemory.getPageTableEntry(page);
      if (entry & 0x1) {
        const physical = entry & 0xFFFFF000;
        this.virtualMemory.setPageTableEntry(page, physical | (flags & 0xFFF) | 0x1);
        this.tlb?.invalidate(page);
      }
    }
  }

  allocatePages(linear: number, count: number, flags: number): void {
    if (!this.virtualMemory || !this.physicalMemory) {
      throw new Error('Memory systems not initialized');
    }

    const pageSize = 4096;
    let currentLinear = linear & ~(pageSize - 1);
    
    for (let i = 0; i < count; i++) {
      const physical = this.findFreePhysicalPage();
      if (physical === -1) {
        throw new Error('Out of physical memory');
      }
      
      this.virtualMemory.setPageTableEntry(currentLinear, (physical & 0xFFFFF000) | (flags & 0xFFF) | 0x1);
      this.tlb?.invalidate(currentLinear);
      currentLinear += pageSize;
    }
  }

  freePages(linear: number, count: number): void {
    if (!this.virtualMemory) {
      throw new Error('Virtual memory not initialized');
    }

    const pageSize = 4096;
    let currentLinear = linear & ~(pageSize - 1);
    
    for (let i = 0; i < count; i++) {
      this.virtualMemory.setPageTableEntry(currentLinear, 0);
      this.tlb?.invalidate(currentLinear);
      currentLinear += pageSize;
    }
  }

  handleTLBMiss(linear: number): number {
    if (!this.virtualMemory || !this.tlb) {
      throw new Error('Memory systems not initialized');
    }

    const physical = this.virtualMemory.translateAddress(linear);
    const entry = this.virtualMemory.getPageTableEntry(linear);
    const flags = entry & 0xFFF;
    
    this.tlb.insert(linear, physical, flags);
    return physical;
  }

  switchAddressSpace(cr3: number): void {
    if (!this.virtualMemory) {
      throw new Error('Virtual memory not initialized');
    }

    this.virtualMemory.enable(0x80000001, cr3);
    this.tlb?.invalidateAll();
  }

  getMemoryInfo(linear: number): MemoryInfo {
    if (!this.virtualMemory) {
      throw new Error('Virtual memory not initialized');
    }

    const entry = this.virtualMemory.getPageTableEntry(linear);
    const physical = this.virtualMemory.translateAddress(linear);
    
    return {
      linear: linear & ~0xFFF,
      physical: physical & ~0xFFF,
      size: 4096,
      flags: entry & 0xFFF,
      present: (entry & 0x1) !== 0,
      writable: (entry & 0x2) !== 0,
      user: (entry & 0x4) !== 0
    };
  }

  private translateAddress(linear: number): number {
    if (!this.tlb || !this.virtualMemory) {
      throw new Error('Memory systems not initialized');
    }

    const tlbResult = this.tlb.lookup(linear);
    if (tlbResult !== undefined) {
      return tlbResult + (linear & 0xFFF);
    }

    if (this.virtualMemory.isPagingEnabled()) {
      return this.virtualMemory.translateAddress(linear);
    }

    return linear;
  }

  private findFreePhysicalPage(): number {
    if (!this.physicalMemory) {
      throw new Error('Physical memory not initialized');
    }

    const pageSize = 4096;
    const maxPages = this.physicalMemory.size / pageSize;
    
    for (let i = 0; i < maxPages; i++) {
      const physical = i * pageSize;
      let used = false;
      
      for (let j = 0; j < 1024; j++) {
        if (this.virtualMemory) {
          const entry = this.virtualMemory.getPageTableEntry(j * pageSize);
          if ((entry & 0xFFFFF000) === physical) {
            used = true;
            break;
          }
        }
      }
      
      if (!used) {
        return physical;
      }
    }
    
    return -1;
  }
}
