/**
 * Represents the result of a version comparison operation.
 * Contains statistics about additions, deletions, and changes,
 * along with the actual diff output.
 */
export interface DiffResult {
  /**
   * Number of lines added in the new version.
   * Must be a non-negative integer.
   */
  additions: number;

  /**
   * Number of lines removed from the old version.
   * Must be a non-negative integer.
   */
  deletions: number;

  /**
   * Number of lines that were modified.
   * Must be a non-negative integer.
   */
  changes: number;

  /**
   * The actual diff output as a string.
   * May be empty if there are no differences.
   */
  diff: string;
}

/**
 * Utility class for validating and manipulating DiffResult objects.
 */
export class DiffResultValidator {
  /**
   * Validates that a DiffResult object conforms to expected constraints.
   * @param result The DiffResult to validate
   * @throws {TypeError} If the result is null, undefined, or not an object
   * @throws {RangeError} If any numeric field is negative or not an integer
   * @throws {TypeError} If any field has an incorrect type
   */
  static validate(result: DiffResult): void {
    if (result === null || result === undefined) {
      throw new TypeError('DiffResult cannot be null or undefined');
    }

    if (typeof result !== 'object') {
      throw new TypeError('DiffResult must be an object');
    }

    this.validateNumberField(result, 'additions');
    this.validateNumberField(result, 'deletions');
    this.validateNumberField(result, 'changes');

    if (typeof result.diff !== 'string') {
      throw new TypeError('DiffResult.diff must be a string');
    }
  }

  /**
   * Creates a deep copy of a DiffResult object.
   * @param source The DiffResult to clone
   * @returns A new DiffResult with the same values
   * @throws {TypeError} If source is invalid
   */
  static clone(source: DiffResult): DiffResult {
    this.validate(source);
    return {
      additions: source.additions,
      deletions: source.deletions,
      changes: source.changes,
      diff: source.diff
    };
  }

  /**
   * Calculates the total number of affected lines.
   * @param result The DiffResult to analyze
   * @returns Sum of additions, deletions, and changes
   * @throws {TypeError} If result is invalid
   */
  static getTotalAffectedLines(result: DiffResult): number {
    this.validate(result);
    return result.additions + result.deletions + result.changes;
  }

  /**
   * Checks if the diff represents an empty change set.
   * @param result The DiffResult to check
   * @returns True if no lines were added, deleted, or changed
   * @throws {TypeError} If result is invalid
   */
  static isEmpty(result: DiffResult): boolean {
    this.validate(result);
    return result.additions === 0 && result.deletions === 0 && result.changes === 0;
  }

  /**
   * Validates a numeric field of the DiffResult.
   * @param result The DiffResult containing the field
   * @param fieldName The name of the field to validate
   * @throws {TypeError} If the field is not a number
   * @throws {RangeError} If the field is negative or not an integer
   */
  private static validateNumberField(result: DiffResult, fieldName: keyof Pick<DiffResult, 'additions' | 'deletions' | 'changes'>): void {
    const value = result[fieldName];
    
    if (typeof value !== 'number') {
      throw new TypeError(`DiffResult.${fieldName} must be a number`);
    }

    if (!Number.isInteger(value)) {
      throw new RangeError(`DiffResult.${fieldName} must be an integer`);
    }

    if (value < 0) {
      throw new RangeError(`DiffResult.${fieldName} cannot be negative`);
    }
  }
}
