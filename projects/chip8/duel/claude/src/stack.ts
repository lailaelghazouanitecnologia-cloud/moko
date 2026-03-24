import { Uint16 } from "./types";

export class Stack {
  private readonly data: Uint16Array;
  private pointer: number;

  constructor() {
    this.data = new Uint16Array(16);
    this.pointer = 0;
  }

  push(value: Uint16): void {
    if (this.pointer >= 16) {
      throw new Error("Stack overflow");
    }
    this.data[this.pointer] = value;
    this.pointer++;
  }

  pop(): Uint16 {
    if (this.pointer === 0) {
      throw new Error("Stack underflow");
    }
    this.pointer--;
    return this.data[this.pointer];
  }

  reset(): void {
    this.pointer = 0;
  }

  get depth(): number {
    return this.pointer;
  }
}
