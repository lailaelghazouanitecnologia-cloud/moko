export enum FpuTag {
  VALID = 0,
  ZERO = 1,
  SPECIAL = 2,
  EMPTY = 3
}

export enum FpuPrecision {
  SINGLE = 0,
  RESERVED = 1,
  DOUBLE = 2,
  EXTENDED = 3
}

export enum FpuRounding {
  NEAREST = 0,
  DOWN = 1,
  UP = 2,
  TRUNCATE = 3
}

export class FpuRegisters {
  stack: Float64Array = new Float64Array(8);
  tags: Uint8Array = new Uint8Array(8);
  top: number = 0;
  control: number = 0x037F;
  status: number = 0x0000;

  static readonly COUNT = 8;
  static readonly TAG_VALID = 0;
  static readonly TAG_ZERO = 1;
  static readonly TAG_SPECIAL = 2;
  static readonly TAG_EMPTY = 3;

  push(value: number): void {
    this.decTop();
    this.stack[this.top] = value;
    this.tags[this.top] = FpuRegisters.TAG_VALID;
  }

  pop(): number {
    const value = this.stack[this.top];
    this.tags[this.top] = FpuRegisters.TAG_EMPTY;
    this.incTop();
    return value;
  }

  get(index: number): number {
    const physicalIndex = (this.top + index) & 7;
    return this.stack[physicalIndex];
  }

  set(index: number, value: number): void {
    const physicalIndex = (this.top + index) & 7;
    this.stack[physicalIndex] = value;
    this.tags[physicalIndex] = FpuRegisters.TAG_VALID;
  }

  getST0(): number {
    return this.stack[this.top];
  }

  setST0(value: number): void {
    this.stack[this.top] = value;
    this.tags[this.top] = FpuRegisters.TAG_VALID;
  }

  getTag(index: number): FpuTag {
    return this.tags[index] as FpuTag;
  }

  setTag(index: number, tag: FpuTag): void {
    this.tags[index] = tag;
  }

  isEmpty(index: number): boolean {
    return this.tags[index] === FpuRegisters.TAG_EMPTY;
  }

  incTop(): void {
    this.top = (this.top + 1) & 7;
  }

  decTop(): void {
    this.top = (this.top - 1) & 7;
  }

  getControl(): number {
    return this.control;
  }

  setControl(value: number): void {
    this.control = value;
  }

  getStatus(): number {
    return this.status;
  }

  setStatus(value: number): void {
    this.status = value;
  }

  getStatusWord(): number {
    return this.status;
  }

  getControlWord(): number {
    return this.control;
  }

  clearExceptions(): void {
    this.status &= ~0x3F;
  }

  getExceptionFlags(): number {
    return this.status & 0x3F;
  }

  setPrecision(precision: FpuPrecision): void {
    this.control = (this.control & ~0x300) | (precision << 8);
  }

  getPrecision(): FpuPrecision {
    return (this.control >> 8) & 3;
  }

  setRounding(mode: FpuRounding): void {
    this.control = (this.control & ~0xC00) | (mode << 10);
  }

  getRounding(): FpuRounding {
    return (this.control >> 10) & 3;
  }

  reset(): void {
    this.stack.fill(0);
    this.tags.fill(FpuRegisters.TAG_EMPTY);
    this.top = 0;
    this.control = 0x037F;
    this.status = 0x0000;
  }

  clone(): FpuRegisters {
    const cloned = new FpuRegisters();
    cloned.stack = new Float64Array(this.stack);
    cloned.tags = new Uint8Array(this.tags);
    cloned.top = this.top;
    cloned.control = this.control;
    cloned.status = this.status;
    return cloned;
  }
}
