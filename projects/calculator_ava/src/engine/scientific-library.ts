export class ScientificLibrary {
  private readonly constants: Map<string, number>;

  constructor() {
    this.constants = new Map<string, number>([
      ['pi', Math.PI],
      ['e', Math.E],
      ['phi', 1.618033988749895],
      ['sqrt2', Math.SQRT2],
      ['ln2', 0.6931471805599453],
      ['ln10', 2.302585092994046],
    ]);
  }

  sin(angle: number): number {
    return Math.sin(angle);
  }

  cos(angle: number): number {
    return Math.cos(angle);
  }

  tan(angle: number): number {
    return Math.tan(angle);
  }

  asin(value: number): number {
    return Math.asin(value);
  }

  atan(value: number): number {
    return Math.atan(value);
  }

  sqrt(value: number): number {
    return Math.sqrt(value);
  }

  pow(base: number, exponent: number): number {
    return Math.pow(base, exponent);
  }

  ln(value: number): number {
    return Math.log(value);
  }

  log(value: number): number {
    return Math.log10(value);
  }

  exp(value: number): number {
    return Math.exp(value);
  }
}
