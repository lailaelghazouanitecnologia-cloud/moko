import { TLBEntry } from './tlb-entry';

export class TLB {
  private entries: TLBEntry[];
  private size: number;
  private replacementPolicy: string;
  private hits: number;
  private misses: number;

  constructor() {
    this.entries = [];
    this.size = 64;
    this.replacementPolicy = 'LRU';
    this.hits = 0;
    this.misses = 0;
  }

  lookup(linear: number): number | undefined {
    const pageNumber = linear >>> 12;
    
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (entry.pageNumber === pageNumber && this.isEntryValid(entry)) {
        this.hits++;
        entry.lastAccess = Date.now();
        return entry.physicalAddress;
      }
    }
    
    this.misses++;
    return undefined;
  }

  insert(linear: number, physical: number, flags: number): void {
    const pageNumber = linear >>> 12;
    
    const existingIndex = this.entries.findIndex(e => e.pageNumber === pageNumber);
    if (existingIndex !== -1) {
      this.entries[existingIndex].physicalAddress = physical;
      this.entries[existingIndex].flags = flags;
      this.entries[existingIndex].lastAccess = Date.now();
      return;
    }
    
    if (this.entries.length >= this.size) {
      this.evictEntry();
    }
    
    const newEntry: TLBEntry = {
      pageNumber,
      physicalAddress: physical,
      flags,
      lastAccess: Date.now()
    };
    
    this.entries.push(newEntry);
  }

  invalidate(linear: number): void {
    const pageNumber = linear >>> 12;
    const index = this.entries.findIndex(e => e.pageNumber === pageNumber);
    if (index !== -1) {
      this.entries.splice(index, 1);
    }
  }

  invalidateAll(): void {
    this.entries = [];
  }

  flush(): void {
    this.entries = [];
    this.hits = 0;
    this.misses = 0;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  getMissRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.misses / total;
  }

  setReplacementPolicy(policy: string): void {
    if (policy === 'LRU' || policy === 'FIFO') {
      this.replacementPolicy = policy;
    }
  }

  isEntryValid(entry: TLBEntry): boolean {
    return (entry.flags & 0x1) !== 0;
  }

  evictEntry(): void {
    if (this.entries.length === 0) return;
    
    if (this.replacementPolicy === 'LRU') {
      let oldestIndex = 0;
      let oldestTime = this.entries[0].lastAccess;
      
      for (let i = 1; i < this.entries.length; i++) {
        if (this.entries[i].lastAccess < oldestTime) {
          oldestTime = this.entries[i].lastAccess;
          oldestIndex = i;
        }
      }
      
      this.entries.splice(oldestIndex, 1);
    } else if (this.replacementPolicy === 'FIFO') {
      this.entries.shift();
    }
  }
}
