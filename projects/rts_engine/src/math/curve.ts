import { Vec3 } from './vec3';

/**
 * A Non-Uniform Rational B-Spline (NURBS) curve implementation.
 * Currently supports uniform B-spline evaluation, derivatives, reparameterization, and splitting.
 */
export class Curve {
  public readonly points: Vec3[];
  public readonly knots: Float32Array;
  public readonly degree: number;

  /**
   * Creates a new Curve instance.
   * @param points Control points for the curve. Each point will be cloned.
   * @param degree Degree of the curve. Clamped between 1 and (points.length - 1).
   * @throws {Error} If degree is not a finite integer.
   */
  constructor(points: Vec3[] = [], degree: number = 3) {
    if (!Number.isFinite(degree) || !Number.isInteger(degree) || degree < 1) {
      throw new Error('Degree must be a positive integer.');
    }
    this.points = points.map(p => p?.clone?.() ?? new Vec3());
    this.degree = Math.max(1, Math.min(degree, this.points.length - 1));
    this.knots = new Float32Array(this.points.length + this.degree + 1);
    this.generateUniformKnotVector();
  }

  /**
   * Generates a uniform knot vector for the current degree and control points.
   * @private
   */
  private generateUniformKnotVector(): void {
    const n = this.points.length;
    const d = this.degree;
    const m = n + d + 1;

    for (let i = 0; i <= d; i++) {
      this.kns[i] = 0;
    }
    for (let i = d + 1; i < n; i++) {
      this.knots[i] = (i - d) / (n - d);
    }
    for (let i = n; i < m; i++) {
      this.knots[i] = 1;
    }
  }

  /**
   * Finds the knot span index for a given parameter value u.
   * @param u Parameter value in [0, 1].
   * @returns The index of the knot span.
   * @private
   */
  private findSpan(u: number): number {
    const n = this.points.length - 1;
    const d = this.degree;

    if (u >= this.knots[n + 1]) return n;
    if (u <= this.knots[d]) return d;

    let low = d;
    let high = n + 1;
    let mid = Math.floor((low + high) / 2);

    while (u < this.knots[mid] || u >= this.knots[mid + 1]) {
      if (u < this.knots[mid]) {
        high = mid;
      } else {
        low = mid;
      }
      mid = Math.floor((low + high) / 2);
    }

    return mid;
  }

  /**
   * Computes the non-zero basis functions for a given span and parameter u.
   * @param span Knot span index.
   * @param u Parameter value.
   * @returns Array of basis function values.
   * @private
   */
  private basisFunctions(span: number, u: number): Float32Array {
    const d = this.degree;
    const N = new Float32Array(d + 1);
    const left = new Float32Array(d + 1);
    const right = new Float32Array(d + 1);

    N[0] = 1;

    for (let j = 1; j <= d; j++) {
      left[j] = u - this.knots[span + 1 - j];
      right[j] = this.knots[span + j] - u;

      let saved = 0;
      for (let r = 0; r < j; r++) {
        const denom = right[r + 1] + left[j - r];
        if (Math.abs(denom) < 1e-12) {
          // Handle degenerate case by skipping contribution
          continue;
        }
        const temp = N[r] / denom;
        N[r] = saved + right[r + 1] * temp;
        saved = left[j - r] * temp;
      }
      N[j] = saved;
    }

    return N;
  }

  /**
   * Evaluates the curve at a given parameter value.
   * @param u Parameter value in [0, 1].
   * @returns The point on the curve.
   * @throws {Error} If u is not a finite number.
   */
  evaluate(u: number): Vec3 {
    if (!Number.isFinite(u)) {
      throw new Error('u must be a finite number');
    }
    if (this.points.length === 0) return new Vec3();

    const d = this.degree;
    const span = this.findSpan(u);
    const N = this.basisFunctions(span, u);

    let result = new Vec3();
    for (let i = 0; i <= d; i++) {
      const point = this.points[span - d + i];
      if (!point) continue; // Safety check
      result = result.add(point.scale(N[i]));
    }

    return result;
  }

  /**
   * Computes the derivative of the curve at a given parameter value.
   * @param u Parameter value in [0, 1].
   * @param order Order of the derivative (default: 1).
   * @returns The derivative vector.
   * @throws {Error} If u is not finite or order is invalid.
   */
  derivative(u: number, order: number = 1): Vec3 {
    if (!Number.isFinite(u)) {
      throw new Error('u must be a finite number');
    }
    if (!Number.isInteger(order) || order < 1) {
      throw new Error('order must be a positive integer');
    }
    if (this.points.length === 0 || order > this.degree) return new Vec3();

    const d = this.degree;
    const span = this.findSpan(u);
    const pk: Vec3[][] = [];

    for (let i = 0; i <= d; i++) {
      pk[i] = [this.points[span - d + i]?.clone() ?? new Vec3()];
    }

    for (let k = 1; k <= order; k++) {
      for (let j = 0; j <= d - k; j++) {
        const denom = this.knots[span + j + 1] - this.knots[span + j - d + k];
        const alpha = Math.abs(denom) < 1e-12 ? 0 : (d - k + 1) / denom;
        const p0 = pk[j + 1][k - 1] ?? new Vec3();
        const p1 = pk[j][k - 1] ?? new Vec3();
        pk[j][k] = p0.sub(p1).scale(alpha);
      }
    }

    return pk[0][order] ?? new Vec3();
  }

  /**
   * Approximates the arc length of the curve between two parameters.
   * @param start Start parameter (default: 0).
   * @param end End parameter (default: 1).
   * @param samples Number of samples for approximation (default: 100).
   * @returns The arc length.
   * @throws {Error} If parameters are invalid.
   */
  length(start: number = 0, end: number = 1, samples: number = 100): number {
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(samples)) {
      throw new Error('start, end, and samples must be finite numbers');
    }
    if (samples <= 0) return 0;
    if (this.points.length === 0) return 0;

    let length = 0;
    let prev = this.evaluate(start);

    for (let i = 1; i <= samples; i++) {
      const t = start + (i / samples) * (end - start);
      const curr = this.evaluate(t);
      length += prev.distance(curr);
      prev = curr;
    }

    return length;
  }

  /**
   * Maps a normalized arc length parameter to a curve parameter.
   * Reparameterizes the curve by arc length.
   * @param u Normalized arc length parameter in [0, 1].
   * @returns The corresponding curve parameter.
   * @throws {Error} If u is not finite.
   */
  reparam(u: number): number {
    if (!Number.isFinite(u)) {
      throw new Error('u must be a finite number');
    }
    if (this.points.length === 0) return 0;

    const totalLength = this.length();
    if (totalLength === 0) return u;

    const targetLength = Math.max(0, Math.min(1, u)) * totalLength;
    let accumulatedLength = 0;
    let prev = this.evaluate(0);

    const steps = 1000;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const curr = this.evaluate(t);
      const segmentLength = prev.distance(curr);

      if (accumulatedLength + segmentLength >= targetLength) {
        const tPrev = (i - 1) / steps;
        const tCurr = i / steps;
        const ratio = Math.abs(segmentLength) < 1e-12 ? 0 : (targetLength - accumulatedLength) / segmentLength;
        return Math.max(0, Math.min(1, tPrev + ratio * (tCurr - tPrev)));
      }

      accumulatedLength += segmentLength;
      prev = curr;
    }

    return 1;
  }

  /**
   * Samples the curve at evenly spaced parameter values.
   * @param count Number of samples (must be >= 2).
   * @returns Array of sampled points.
   * @throws {Error} If count is invalid.
   */
  sample(count: number): Vec3[] {
    if (!Number.isInteger(count) || count < 2) {
      throw new Error('count must be an integer >= 2');
    }
    if (this.points.length === 0) return [];

    const samples: Vec3[] = [];
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1);
      samples.push(this.evaluate(u));
    }
    return samples;
  }

  /**
   * Splits the curve into two curves at a given parameter value.
   * @param u Parameter value in [0, 1].
   * @returns A tuple of two new curves: [left, right].
   * @throws {Error} If u is not finite.
   */
  split(u: number): [Curve, Curve] {
    if (!Number.isFinite(u)) {
      throw new Error('u must be a finite number');
    }
    if (this.points.length === 0) {
      return [new Curve([], this.degree), new Curve([], this.degree)];
    }

    const d = this.degree;
    const n = this.points.length;
    const k = this.findSpan(u);

    const leftPoints: Vec3[] = [];
    const rightPoints: Vec3[] = [];

    const tempPoints = this.points.map(p => p?.clone?.() ?? new Vec3());

    for (let i = 0; i <= k - d; i++) {
      leftPoints.push(tempPoints[i]?.clone?.() ?? new Vec3());
    }

    for (let r = 1; r <= d; r++) {
      for (let i = k - d + r; i <= k; i++) {
        const denom = this.knots[i + d - r + 1] - this.knots[i];
        const alpha = Math.abs(denom) < 1e-12 ? 0 : (u - this.knots[i]) / denom;
        const prev = tempPoints[i - 1] ?? new Vec3();
        const curr = tempPoints[i] ?? new Vec3();
        tempPoints[i] = prev.scale(1 - alpha).add(curr.scale(alpha));
      }
      leftPoints.push(tempPoints[k]?.clone?.() ?? new Vec3());
    }

    rightPoints.push(tempPoints[k]?.clone?.() ?? new Vec3());
    for (let i = k + 1; i < n; i++) {
      rightPoints.push(tempPoints[i]?.clone?.() ?? new Vec3());
    }

    return [new Curve(leftPoints, d), new Curve(rightPoints, d)];
  }
}
