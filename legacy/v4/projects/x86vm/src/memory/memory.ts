import { IMemory } from './imemory';

type PageEntryState = 
  | { readonly present: true; readonly address: number }
  | { readonly present: false };

/**
 * x86 memory management with segmentation and paging support.
 * Provides 4GB of addressable memory with optional virtual memory translation.
 */
export class Memory implements IMemory {
  private readonly memory: Uint8Array;
  public pagingEnabled: boolean;
  private pageDirectory: number;

  constructor() {
    this.memory = new Uint8Array(4 * 1024 * 1024 * 1024); // 4GB
    this.pagingEnabled = false;
    this.pageDirectory = 0;
  }

  read(address: number, size: number): number {
    this.validateAddressAndSize(address, size);
    const physical = this.pagingEnabled ? this.translateAddress(address) : address;
    return this.readPhysical(physical, size);
  }

  write(address: number, value: number, size: number): void {
    this.validateAddressAndSize(address, size);
    const physical = this.pagingEnabled ? this.translateAddress(address) : address;
    this.writePhysical(physical, value, size);
  }

  readPhysical(address: number, size: number): number {
    this.validatePhysicalAddressAndSize(address, size);
    
    let result = 0;
    for (let i = 0; i < size; i++) {
      result |= this.memory[address + i] << (i * 8);
    }
    return result;
  }

  writePhysical(address: number, value: number, size: number): void {
    this.validatePhysicalAddressAndSize(address, size);
    
    for (let i = 0; i < size; i++) {
      this.memory[address + i] = (value >> (i * 8)) & 0xFF;
    }
  }

  translateAddress(linear: number): number {
    if (!this.pagingEnabled) {
      return linear;
    }

    const directoryIndex = (linear >>> 22) & 0x3FF;
    const tableIndex = (linear >>> 12) & 0x3FF;
    const offset = linear & 0xFFF;

    const pdEntry = this.readPageDirectoryEntry(directoryIndex);
    if (!pdEntry.present) {
      throw new Error(`Page directory entry not present for linear address 0x${linear.toString(16)}`);
    }

    const ptEntry = this.readPageTableEntry(pdEntry.address, tableIndex);
    if (!ptEntry.present) {
      throw new Error(`Page table entry not present for linear address 0x${linear.toString(16)}`);
    }

    const physicalPage = ptEntry.address & 0xFFFFF000;
    return physicalPage | offset;
  }

  checkSegmentAccess(segment: number, offset: number, write: boolean): void {
    // Segment validation logic would go here
    // For now, allow all access
  }

  enablePaging(): void {
    this.pagingEnabled = true;
  }

  disablePaging(): void {
    this.pagingEnabled = false;
  }

  loadPageDirectory(address: number): void {
    if (address & 0xFFF) {
      throw new RangeError('Page directory address must be 4KB aligned');
    }
    this.pageDirectory = address;
  }

  private validateAddressAndSize(address: number, size: number): void {
    if (!Number.isInteger(address) || address < 0) {
      throw new TypeError('Address must be a non-negative integer');
    }
    if (!Number.isInteger(size) || size < 1 || size > 4) {
      throw new RangeError('Size must be 1, 2, or 4 bytes');
    }
  }

  private validatePhysicalAddressAndSize(address: number, size: number): void {
    this.validateAddressAndSize(address, size);
    if (address + size > this.memory.length) {
      throw new RangeError(`Physical address 0x${address.toString(16)} out of bounds`);
    }
  }

  private readPageDirectoryEntry(index: number): PageEntryState {
    const pdAddress = this.pageDirectory + index * 4;
    const entry = this.readPhysical(pdAddress, 4);
    
    if ((entry & 1) === 0) {
      return { present: false };
    }
    return { present: true, address: entry & 0xFFFFF000 };
  }

  private readPageTableEntry(ptBase: number, index: number): PageEntryState {
    const ptAddress = ptBase + index * 4;
    const entry = this.readPhysical(ptAddress, 4);
    
    if ((entry & 1) === 0) {
      return { present: false };
    }
    return { present: true, address: entry & 0xFFFFF000 };
  }
}
