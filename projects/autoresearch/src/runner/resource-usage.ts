/**
 * Process resource metrics.
 */
export interface ResourceUsage {
  /**
   * CPU usage as a percentage (0-100).
   */
  cpuPercent: number;

  /**
   * Memory usage as a percentage (0-100).
   */
  memoryPercent: number;

  /**
   * Memory usage in megabytes.
   */
  memoryMB: number;
}

/**
 * Utility class for validating and manipulating ResourceUsage objects.
 */
export class ResourceUsageValidator {
  /**
   * Validates that a ResourceUsage object contains sensible values.
   * @param usage The ResourceUsage object to validate.
   * @throws {TypeError} If any field is not a finite number.
   * @throws {RangeError} If any percentage is outside 0-100 or memoryMB is negative.
   */
  public static validate(usage: ResourceUsage): void {
    if (typeof usage !== 'object' || usage === null) {
      throw new TypeError('ResourceUsage must be an object');
    }

    const { cpuPercent, memoryPercent, memoryMB } = usage;

    [cpuPercent, memoryPercent, memoryMB].forEach((value, idx) => {
      const name = ['cpuPercent', 'memoryPercent', 'memoryMB'][idx];
      if (!Number.isFinite(value)) {
        throw new TypeError(`${name} must be a finite number`);
      }
    });

    if (cpuPercent < 0 || cpuPercent > 100) {
      throw new RangeError('cpuPercent must be between 0 and 100');
    }

    if (memoryPercent < 0 || memoryPercent > 100) {
      throw new RangeError('memoryPercent must be between 0 and 100');
    }

    if (memoryMB < 0) {
      throw new RangeError('memoryMB must be non-negative');
    }
  }

  /**
   * Creates a ResourceUsage object from raw numeric inputs with validation.
   * @param cpuPercent CPU usage percentage.
   * @param memoryPercent Memory usage percentage.
   * @param memoryMB Memory usage in MB.
   * @returns A validated ResourceUsage instance.
   * @throws {TypeError|RangeError} If inputs are invalid.
   */
  public static create(cpuPercent: number, memoryPercent: number, memoryMB: number): ResourceUsage {
    const usage: ResourceUsage = { cpuPercent, memoryPercent, memoryMB };
    this.validate(usage);
    return usage;
  }

  /**
   * Clones a ResourceUsage object.
   * @param usage The ResourceUsage to clone.
   * @returns A new ResourceUsage instance with the same values.
   * @throws {TypeError} If the input is invalid.
   */
  public static clone(usage: ResourceUsage): ResourceUsage {
    this.validate(usage);
    return { ...usage };
  }

  /**
   * Checks if two ResourceUsage objects are equal.
   * @param a First ResourceUsage.
   * @param b Second ResourceUsage.
   * @returns True if all fields are strictly equal.
   */
  public static equals(a: ResourceUsage, b: ResourceUsage): boolean {
    this.validate(a);
    this.validate(b);
    return a.cpuPercent === b.cpuPercent &&
           a.memoryPercent === b.memoryPercent &&
           a.memoryMB === b.memoryMB;
  }

  /**
   * Returns a summary string for logging or display.
   * @param usage The ResourceUsage to summarize.
   * @returns Formatted string.
   */
  public static summarize(usage: ResourceUsage): string {
    this.validate(usage);
    return `CPU: ${usage.cpuPercent.toFixed(2)}%, Memory: ${usage.memoryPercent.toFixed(2)}% (${usage.memoryMB.toFixed(2)} MB)`;
  }
}
