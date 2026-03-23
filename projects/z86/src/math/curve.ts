export class Curve {
  private points: number[][];
  private domainStart: number;
  private domainEnd: number;

  constructor(points: number[][] = [], domainStart: number = 0, domainEnd: number = 1) {
    this.points = points;
    this.domainStart = domainStart;
    this.domainEnd = domainEnd;
  }

  evaluate(t: number): number {
    if (t < this.domainStart || t > this.domainEnd) {
      throw new Error(`Parameter t must be within domain [${this.domainStart}, ${this.domainEnd}]`);
    }

    if (this.points.length === 0) {
      return 0;
    }

    if (this.points.length === 1) {
      return this.points[0][1];
    }

    const n = this.points.length - 1;
    const localT = (t - this.domainStart) / (this.domainEnd - this.domainStart);

    let result = 0;
    for (let i = 0; i <= n; i++) {
      const basis = this.binomialCoefficient(n, i) * Math.pow(localT, i) * Math.pow(1 - localT, n - i);
      result += basis * this.points[i][1];
    }

    return result;
  }

  derivative(t: number): number {
    if (t < this.domainStart || t > this.domainEnd) {
      throw new Error(`Parameter t must be within domain [${this.domainStart}, ${this.domainEnd}]`);
    }

    if (this.points.length < 2) {
      return 0;
    }

    const n = this.points.length - 1;
    const localT = (t - this.domainStart) / (this.domainEnd - this.domainStart);
    const dt = this.domainEnd - this.domainStart;

    let result = 0;
    for (let i = 0; i < n; i++) {
      const basis = this.binomialCoefficient(n - 1, i) * Math.pow(localT, i) * Math.pow(1 - localT, n - 1 - i);
      result += basis * (this.points[i + 1][1] - this.points[i][1]);
    }

    return (n / dt) * result;
  }

  domain(): [number, number] {
    return [this.domainStart, this.domainEnd];
  }

  private binomialCoefficient(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;

    let result = 1;
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1);
    }
    return result;
  }
}
