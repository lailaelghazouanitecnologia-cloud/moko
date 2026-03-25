import { ASTNode } from '../parser';

export class ConstantRegistry {
  private readonly constants: Map<string, number>;

  constructor() {
    this.constants = new Map<string, number>([
      ['pi', Math.PI],
      ['e', Math.E],
      ['phi', 1.618033988749895],
      ['sqrt2', Math.SQRT2],
      ['ln2', 0.6931471805599453],
      ['ln10', 2.302585092994046],
      ['log2e', 1.4426950408889634],
      ['log10e', 0.4342944819032518],
      ['pi_2', Math.PI / 2],
      ['pi_4', Math.PI / 4],
      ['1_pi', 1 / Math.PI],
      ['2_pi', 2 / Math.PI],
      ['2_sqrtpi', 2 / Math.sqrt(Math.PI)],
      ['sqrtpi', Math.sqrt(Math.PI)],
      ['sqrt1_2', Math.SQRT1_2],
      ['deg2rad', Math.PI / 180],
      ['rad2deg', 180 / Math.PI]
    ]);
  }

  register(name: string, value: number): void {
    this.constants.set(name.toLowerCase(), value);
  }

  get(name: string): number | undefined {
    return this.constants.get(name.toLowerCase());
  }

  has(name: string): boolean {
    return this.constants.has(name.toLowerCase());
  }

  remove(name: string): boolean {
    return this.constants.delete(name.toLowerCase());
  }

  clear(): void {
    this.constants.clear();
  }

  list(): ReadonlyArray<string> {
    return Array.from(this.constants.keys()).sort();
  }

  getAll(): ReadonlyMap<string, number> {
    return new Map(this.constants);
  }
}
