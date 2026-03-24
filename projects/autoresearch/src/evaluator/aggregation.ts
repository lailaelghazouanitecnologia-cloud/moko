/**
 * Represents an aggregation result with a numeric value, a method identifier,
 * and optional metadata.
 */
export interface Aggregation {
  /**
   * The aggregated numeric value.
   */
  value: number;

  /**
   * Identifier for the aggregation method used (e.g., "sum", "avg").
   */
  method: string;

  /**
   * Arbitrary metadata associated with this aggregation.
   */
  metadata: Record<string, any>;
}

/**
 * Utility functions and validators for the Aggregation interface.
 */
export class AggregationUtils {
  /**
   * Validates that the provided object conforms to the Aggregation interface.
   * @param input - The object to validate.
   * @returns True if valid, false otherwise.
   */
  static isValid(input: any): input is Aggregation {
    return (
      input !== null &&
      typeof input === 'object' &&
      typeof input.value === 'number' &&
      Number.isFinite(input.value) &&
      typeof input.method === 'string' &&
      input.method.length > 0 &&
      typeof input.metadata === 'object' &&
      input.metadata !== null
    );
  }

  /**
   * Asserts that the provided object is a valid Aggregation.
   * @param input - The object to validate.
   * @param context - Optional context string for error messages.
   * @throws {TypeError} If the object is not a valid Aggregation.
   */
  static assertValid(input: any, context?: string): asserts input is Aggregation {
    if (!this.isValid(input)) {
      throw new TypeError(
        `Invalid Aggregation${context ? ` (${context})` : ''}: ${JSON.stringify(input)}`
      );
    }
  }

  /**
   * Creates a deep clone of an Aggregation object.
   * @param agg - The Aggregation to clone.
   * @returns A new Aggregation instance.
   */
  static clone(agg: Aggregation): Aggregation {
    this.assertValid(agg, 'clone source');
    return {
      value: agg.value,
      method: agg.method,
      metadata: JSON.parse(JSON.stringify(agg.metadata)),
    };
  }

  /**
   * Merges two Aggregation objects by summing their values and combining metadata.
   * @param a - First Aggregation.
   * @param b - Second Aggregation.
   * @returns A new merged Aggregation.
   * @throws {Error} If methods differ or inputs are invalid.
   */
  static merge(a: Aggregation, b: Aggregation): Aggregation {
    this.assertValid(a, 'merge first operand');
    this.assertValid(b, 'merge second operand');

    if (a.method !== b.method) {
      throw new Error(`Cannot merge aggregations with differing methods: "${a.method}" vs "${b.method}"`);
    }

    return {
      value: a.value + b.value,
      method: a.method,
      metadata: { ...a.metadata, ...b.metadata },
    };
  }

  /**
   * Rounds the value to a specified number of decimal places.
   * @param agg - The Aggregation to round.
   * @param decimals - Number of decimal places (default 2).
   * @returns A new Aggregation with the rounded value.
   */
  static round(agg: Aggregation, decimals: number = 2): Aggregation {
    this.assertValid(agg, 'round source');
    if (!Number.isInteger(decimals) || decimals < 0) {
      throw new RangeError('decimals must be a non-negative integer');
    }
    const factor = 10 ** decimals;
    return {
      ...agg,
      value: Math.round(agg.value * factor) / factor,
    };
  }

  /**
   * Builds an Aggregation from partial data, filling in defaults.
   * @param partial - Partial Aggregation data.
   * @returns A valid Aggregation.
   * @throws {TypeError} If required fields are missing or invalid.
   */
  static build(partial: Partial<Aggregation>): Aggregation {
    const value = partial.value;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError('value must be a finite number');
    }
    const method = partial.method;
    if (typeof method !== 'string' || method.length === 0) {
      throw new TypeError('method must be a non-empty string');
    }
    const metadata = partial.metadata ?? {};
    if (typeof metadata !== 'object' || metadata === null) {
      throw new TypeError('metadata must be a plain object');
    }
    return { value, method, metadata };
  }
}
