export class Registers {
  private v: Uint8Array;

  constructor() {
    this.v = new Uint8Array(16);
  }

  get(index: number): number {
    if (index < 0 || index > 15) {
      throw new Error(`Register index out of range: ${index}`);
    }
    return this.v[index];
  }

  set(index: number, value: number): void {
    if (index < 0 || index > 15) {
      throw new Error(`Register index out of range: ${index}`);
    }
    this.v[index] = value & 0xFF;
  }

  getVf(): number {
    return this.v[0xF];
  }

  setVf(value: number): void {
    this.v[0xF] = value & 0xFF;
  }

  clear(): void {
    this.v.fill(0);
  }

  dump(): number[] {
    return Array.from(this.v);
  }

  load(values: number[]): void {
    if (values.length !== 16) {
      throw new Error(`Expected 16 values, got ${values.length}`);
    }
    for (let i = 0; i < 16; i++) {
      this.v[i] = values[i] & 0xFF;
    }
  }
}
