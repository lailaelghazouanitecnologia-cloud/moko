/**
 * Represents a numeric interval with inclusive lower and exclusive upper bounds.
 */
export interface Range {
  /**
   * The inclusive lower bound of the range.
   * @type {number}
   */
  lower: number;

  /**
   * The exclusive upper bound of the range.
   * @type {number}
   */
  upper: number;
}

/**
 * Utility class for operations on `Range` objects.
 */
export class RangeUtils {
  /**
   * Validates that a value is a finite number.
   * @param value - The value to check.
   * @param name - The name of the parameter for error messages.
   * @throws {TypeError} If the value is not a finite number.
   */
  private static validateNumber(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite number`);
    }
    return value;
  }

  /**
   * Validates that a value is a valid Range object.
   * @param range - The value to check.
   * @throws {TypeError} If the value is not a valid Range.
   */
  private static validateRange(range: unknown): Range {
    if (range === null || typeof range !== 'object') {
      throw new TypeError('Range must be an object');
    }
    const { lower, upper } = range as Range;
    RangeUtils.validateNumber(lower, 'lower');
    RangeUtils.validateNumber(upper, 'upper');
    if (lower >= upper) {
      throw new RangeError('lower must be less than upper');
    }
    return range as Range;
  }

  /**
   * Creates a new Range instance.
   * @param lower - The inclusive lower bound.
   * @param upper - The exclusive upper bound.
   * @returns A new Range object.
   * @throws {TypeError} If either argument is not a finite number.
   * @throws {RangeError} If lower is not less than upper.
   */
  static create(lower: number, upper: number): Range {
    RangeUtils.validateNumber(lower, 'lower');
    RangeUtils.validateNumber(upper, 'upper');
    if (lower >= upper) {
      throw new RangeError('lower must be less than upper');
    }
    return { lower, upper };
  }

  /**
   * Checks if a number falls within the range.
   * @param range - The range to check against.
   * @param value - The number to test.
   * @returns True if the value is within the range, else false.
   * @throws {TypeError} If range is invalid.
   */
  static contains(range: Range, value: number): boolean {
    RangeUtils.validateRange(range);
    const v = RangeUtils.validateNumber(value, 'value');
    return range.lower <= v && v < range.upper;
  }

  /**
   * Calculates the size of the range.
   * @param range - The range to measure.
   * @returns The difference between upper and lower.
   * @throws {TypeError} If range is invalid.
   */
  static size(range: Range): number {
    RangeUtils.validateRange(range);
    return range.upper - range.lower;
  }

  /**
   * Clamps a number to the nearest value within the range.
   * @param range - The range to clamp to.
   * - Values below the range return the lower bound.
   * - Values at or above the upper bound return the lower bound (since upper is exclusive).
   * @param value - The number to clamp.
   * @returns The clamped value.
   * @throws {TypeError} If range is invalid.
   */
  static clamp(range: Range, value: number): number {
    RangeUtils.validateRange(range);
    const v = RangeUtils.validateNumber(value, 'value');
    if (v < range.lower) return range.lower;
    if (v >= range.upper) return range.lower;
    return v;
  }

  /**
   * Checks if two ranges overlap.
   * @param a - First range.
   * @param b - Second range.
   * @returns True if the ranges share any values, else false.
   * @throws {TypeError} If either range is invalid.
   */
  static overlaps(a: Range, b: Range): boolean {
    RangeUtils.validateRange(a);
    RangeUtils.validateRange(b);
    return a.lower < b.upper && b.lower < a.upper;
  }

  /**
   * Checks if two ranges are equal.
   * @param a - First range.
   * @param b - Second range.
   * @returns True if both bounds are exactly equal, else false.
   * @throws {TypeError} If either range is invalid.
   */
  static equals(a: Range, b: Range): boolean {
    RangeUtils.validateRange(a);
    RangeUtils.validateRange(b);
    return a.lower === b.lower && a.upper === b.upper;
  }

  /**
   * Converts a range to a string representation.
   * @param range - The range to convert.
   * @returns A string in the format "[lower, upper)".
   * @throws {TypeError} If range is invalid.
   */
  static toString(range: Range): string {
    RangeUtils.validateRange(range);
    return `[${range.lower}, ${range.upper})`;
  }
}
