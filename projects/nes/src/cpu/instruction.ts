import { AddressingMode } from './addressing-mode';
import { Operation } from './operation';

export class Instruction {
  name: string;
  operation: Operation | null;
  mode: AddressingMode | null;
  cycles: number;
  pageCycles: number;

  constructor(
    name: string = '',
    operation: Operation | null = null,
    mode: AddressingMode | null = null,
    cycles: number = 0,
    pageCycles: number = 0
  ) {
    this.name = name;
    this.operation = operation;
    this.mode = mode;
    this.cycles = cycles;
    this.pageCycles = pageCycles;
  }

  static readonly TABLE: Instruction[] = (() => {
    const table: Instruction[] = new Array(256);
    for (let i = 0; i < 256; i++) {
      table[i] = new Instruction();
    }
    return table;
  })();
}
