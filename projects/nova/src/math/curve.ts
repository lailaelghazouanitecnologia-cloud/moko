export class Curve {
  private points: number[];

  constructor(points: number[]) {
    this.points = points;
  }

  evaluate(t: number): number {
    if (this.points.length === 0) return 0;
    if (t <= 0) return this.points[0];
    if (t >= 1) return this.points[this.points.length - 1];

    const index = t * (this.points.length - 1);
    const i = Math.floor(index);
    const f = index - i;

    if (i >= this.points.length - 1) return this.points[this.points.length - 1];
    if (i < 0) return this.points[0];

    return this.points[i] * (1 - f) + this.points[i + 1] * f;
  }

  derivative(t: number): number {
    if (this.points.length < 2) return 0;
    if (t <= 0) return this.points[1] - this.points[0];
    if (t >= 1) return this.points[this.points.length - 1] - this.points[this.points.length - 2];

    const index = t * (this.points.length - 1);
    const i = Math.floor(index);
    const f = index - i;

    if (i >= this.points.length - 1) return this.points[this.points.length - 1] - this.points[this.points.length - 2];
    if (i < 0) return this.points[1] - this.points[0];

    const left = i > 0 ? this.points[i] - this.points[i - 1] : this.points[i + 1] - this.points[i];
    const right = i < this.points.length - 2 ? this.points[i + 2] - this.points[i + 1] : this.points[i + 1] - this.points[i];
    const center = this.points[i + 1] - this.points[i];

    return left * (1 - f) + center * f;
  }
}
