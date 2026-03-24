import { SegmentDescriptor } from './segment-descriptor';

export type SegmentRegister = number;

export class SegmentRegisters {
  private selectors: Uint16Array = new Uint16Array(6);
  private descriptors: SegmentDescriptor[] = new Array(6);

  static readonly COUNT = 6;
  static readonly INDEX_ES = 0;
  static readonly INDEX_CS = 1;
  static readonly INDEX_SS = 2;
  static readonly INDEX_DS = 3;
  static readonly INDEX_FS = 4;
  static readonly INDEX_GS = 5;

  getSelector(reg: SegmentRegister): number {
    return this.selectors[reg];
  }

  setSelector(reg: SegmentRegister, selector: number): void {
    this.selectors[reg] = selector & 0xFFFF;
    this.loadDescriptor(reg);
  }

  getBase(reg: SegmentRegister): number {
    const desc = this.descriptors[reg];
    return desc ? desc.base : 0;
  }

  getLimit(reg: SegmentRegister): number {
    const desc = this.descriptors[reg];
    return desc ? desc.limit : 0xFFFFFFFF;
  }

  getAccess(reg: SegmentRegister): number {
    const desc = this.descriptors[reg];
    return desc ? desc.access : 0;
  }

  loadDescriptor(reg: SegmentRegister): void {
    const selector = this.selectors[reg];
    const ti = (selector >> 2) & 1;
    const index = (selector >> 3) & 0x1FFF;
    
    // Simplified descriptor loading - in real implementation would fetch from GDT/LDT
    this.descriptors[reg] = new SegmentDescriptor();
    this.descriptors[reg].base = 0;
    this.descriptors[reg].limit = 0xFFFFFFFF;
    this.descriptors[reg].access = 0x93; // Present, ring 0, data segment
  }

  checkAccess(reg: SegmentRegister, offset: number, size: number, write: boolean): boolean {
    const desc = this.descriptors[reg];
    if (!desc) return false;
    
    const limit = desc.limit;
    const access = desc.access;
    
    // Check present bit
    if ((access & 0x80) === 0) return false;
    
    // Check if segment is valid for access type
    if (write && (access & 0x2) === 0) return false;
    
    // Check bounds
    if (limit < 0xFFFFF) {
      // Byte granular
      if (offset + size > limit + 1) return false;
    } else {
      // Page granular
      if (offset + size > ((limit & 0xFFFFF) + 1) * 4096) return false;
    }
    
    return true;
  }

  getEffectiveAddress(reg: SegmentRegister, offset: number): number {
    const base = this.getBase(reg);
    return base + offset;
  }

  reset(): void {
    this.selectors.fill(0);
    this.descriptors.fill(null);
  }

  clone(): SegmentRegisters {
    const cloned = new SegmentRegisters();
    cloned.selectors = new Uint16Array(this.selectors);
    cloned.descriptors = this.descriptors.map(d => d ? d.clone() : null);
    return cloned;
  }
}
