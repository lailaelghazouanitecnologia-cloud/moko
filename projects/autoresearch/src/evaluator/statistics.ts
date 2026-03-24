/**
 * Statistical summary of a numeric data set.
 */
export interface Statistics {
  /** Arithmetic mean of the data set. */
  mean: number;
  /** Standard deviation (population or sample, depending on context). */
  std: number;
  /** Smallest value in the data set. */
  min: number;
  /** Largest value in the data set. */
  max: number;
  /** Median (50th percentile) of the data set. */
  median: number;
}

/**
 * Utility class for computing and validating statistical summaries.
 */
export class StatisticsUtil {
  /**
   * Validates that the provided object conforms to the Statistics interface.
   * @param stats Object to validate.
   * @throws {TypeError} If any field is missing or not a finite number.
   */
  public static validate(stats: unknown): asserts stats is Statistics {
    if (typeof stats !== 'object' || stats === null) {
      throw new TypeError('Statistics must be a non-null object');
    }

    const s = stats as Record<string, unknown>;

    const required: (keyof Statistics)[] = ['mean', 'std', 'min', 'max', 'median'];
    for (const key of required) {
      const value = s[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError(`Statistics.${key} must be a finite number`);
      }
    }
  }

  /**
   * Creates a new Statistics instance with all fields rounded to a fixed number of decimals.
   * @param stats Original statistics object.
   * @param decimals Number of decimal places (default: 6).
   * @returns New Statistics object with rounded values.
   * @throws {TypeError} If validation fails.
   */
  public static round(stats: Statistics, decimals = 6): Statistics {
    StatisticsUtil.validate(stats);
    const factor = 10 ** decimals;
    const round = (n: number) => Math.round(n * factor) / factor;
    return {
      mean: round(stats.mean),
      std: round(stats.std),
      min: round(stats.min),
      max: round(stats.max),
      median: round(stats.median),
    };
  }

  /**
   * Computes a Statistics summary from an array of numeric samples.
   * @param samples Array of numeric samples.
   * @returns Statistics object.
   * @throws {Error} If the array is empty or contains non-finite values.
   */
  public static fromSamples(samples: number[]): Statistics {
    if (!Array.isArray(samples) || samples.length === 0) {
      throw new Error('samples must be a non-empty array');
    }

    const valid = samples.every(n => Number.isFinite(n));
    if (!valid) {
      throw new Error('samples must contain only finite numbers');
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const n = samples.length;
    const mean = sorted.reduce((sum, val) => sum + val, 0) / n;
    const variance = sorted.reduce((sum, val) => sum + (val - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    const min = sorted[0];
    const max = sorted[n - 1];
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    return { mean, std, min, max, median };
  }
}
