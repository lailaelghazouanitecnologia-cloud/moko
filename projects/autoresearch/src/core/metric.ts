/**
 * A single metric data point.
 */
export interface Metric {
  name: string;
  value: number;
  variant: string;
  timestamp: Date;
  tags: Record<string, string>;
}

export namespace Metric {
  /**
   * Computes the arithmetic mean of the provided metrics.
   * @param metrics Array of Metric instances.
   * @returns The average value; 0 if the array is empty.
   * @throws {TypeError} If `metrics` is not an array.
   */
  export function aggregate(metrics: Metric[]): number {
    if (!Array.isArray(metrics)) {
      throw new TypeError('Expected an array of Metric instances');
    }
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => {
      if (!isValid(m)) {
        throw new RangeError('Invalid metric encountered during aggregation');
      }
      return acc + m.value;
    }, 0);
    return sum / metrics.length;
  }

  /**
   * Compares this metric with another.
   * @param a First metric.
   * @param b Second metric.
   * @returns Difference in value (a.value - b.value).
   * @throws {TypeError} If either argument is not a valid Metric.
   */
  export function compare(a: Metric, b: Metric): number {
    if (!isValid(a) || !isValid(b)) {
      throw new TypeError('Both arguments must be valid Metric instances');
    }
    return a.value - b.value;
  }

  /**
   * Validates the metric’s fields.
   * @param metric Metric to validate.
   * @returns True when all fields are within acceptable ranges.
   */
  export function isValid(metric: Metric): boolean {
    return (
      !!metric &&
      typeof metric.name === 'string' &&
      metric.name.trim().length > 0 &&
      typeof metric.value === 'number' &&
      isFinite(metric.value) &&
      typeof metric.variant === 'string' &&
      metric.variant.trim().length > 0 &&
      metric.timestamp instanceof Date &&
      !isNaN(metric.timestamp.getTime()) &&
      typeof metric.tags === 'object' &&
      metric.tags !== null &&
      !Array.isArray(metric.tags) &&
      Object.values(metric.tags).every(v => typeof v === 'string')
    );
  }

  /**
   * Creates a Metric from a plain object, validating inputs.
   * @param data Plain object matching Metric fields.
   * @returns New Metric instance.
   * @throws {TypeError} On validation failure.
   */
  export function from(data: unknown): Metric {
    if (!isPlainObject(data)) {
      throw new TypeError('Expected a plain object');
    }
    const m = data as Metric;
    if (!isValid(m)) {
      throw new TypeError('Provided object does not satisfy Metric constraints');
    }
    return {
      name: m.name.trim(),
      value: m.value,
      variant: m.variant.trim(),
      timestamp: new Date(m.timestamp.getTime()),
      tags: { ...m.tags }
    };
  }

  /**
   * Clones a metric deeply.
   * @param metric Source metric.
   * @returns New Metric instance.
   * @throws {TypeError} If input is invalid.
   */
  export function clone(metric: Metric): Metric {
    if (!isValid(metric)) {
      throw new TypeError('Cannot clone an invalid metric');
    }
    return {
      name: metric.name,
      value: metric.value,
      variant: metric.variant,
      timestamp: new Date(metric.timestamp.getTime()),
      tags: { ...metric.tags }
    };
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  /**
   * Type-guard for plain objects.
   */
  function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
    return Object.prototype.toString.call(value) === '[object Object]';
  }
}
