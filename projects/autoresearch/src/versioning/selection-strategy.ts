/**
 * Version selection strategy.
 *
 * This enum defines the available strategies for selecting a version from a list
 * of candidates. Each strategy applies a different set of rules to determine
 * the “best” version according to the caller’s intent.
 *
 * @enum {string}
 * @public
 */
export enum SelectionStrategy {
  /**
   * Select the chronologically latest version, regardless of stability.
   */
  LATEST = 'LATEST',

  /**
   * Select the latest version that is considered stable (non-prerelease).
   */
  LATEST_STABLE = 'LATEST_STABLE',

  /**
   * Select the version whose publication date is closest to a supplied date.
   * Requires an additional `targetDate` parameter.
   */
  BY_DATE = 'BY_DATE',

  /**
   * Select the version that exactly matches a supplied tag.
   * Requires an additional `tag` parameter.
   */
  BY_TAG = 'BY_TAG',

  /**
   * Select the latest version that is **strictly lower** than a supplied
   * version. Requires an additional `baseVersion` parameter.
   */
  BEFORE_VERSION = 'BEFORE_VERSION',

  /**
   * Select the earliest version that is **strictly higher** than a supplied
   * version. Requires an additional `baseVersion` parameter.
   */
  AFTER_VERSION = 'AFTER_VERSION',

  /**
   * Select the version that was most recently published (identical to `LATEST`
   * but kept for backward compatibility).
   */
  MOST_RECENT = 'MOST_RECENT',

  /**
   * Select the version with the fewest changes relative to a supplied base.
   * Requires an additional `baseVersion` parameter.
   */
  MINIMUM_CHANGES = 'MINIMUM_CHANGES',

  /**
   * Select the version with the most changes relative to a supplied base.
   * Requires an additional `baseVersion` parameter.
   */
  MAXIMUM_CHANGES = 'MAXIMUM_CHANGES',

  /**
   * Delegate selection to a caller-supplied predicate function.
   * Requires an additional `predicate` parameter.
   */
  CUSTOM = 'CUSTOM'
}

/**
 * Utility namespace for `SelectionStrategy`.
 *
 * Provides helpers to validate and work with selection strategies.
 *
 * @public
 */
export namespace SelectionStrategy {
  /**
   * All enum values as a readonly array.
   */
  export const VALUES: readonly SelectionStrategy[] = Object.values(
    SelectionStrategy
  ) as readonly SelectionStrategy[];

  /**
   * Returns `true` if the supplied value is a valid `SelectionStrategy`.
   *
   * @param value - Value to test.
   */
  export function isValid(value: unknown): value is SelectionStrategy {
    return (
      typeof value === 'string' &&
      VALUES.includes(value as SelectionStrategy)
    );
  }

  /**
   * Asserts that the supplied value is a valid `SelectionStrategy`.
   *
   * @param value - Value to test.
   * @param name  - Variable name to print in the error message.
   *
   * @throws {TypeError} If the value is not a valid strategy.
   */
  export function assertValid(value: unknown, name = 'strategy'): void {
    if (!isValid(value)) {
      throw new TypeError(
        `${name} must be one of ${VALUES.join(', ')}; received ${String(
          value
        )}`
      );
    }
  }
}
