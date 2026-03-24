/**
 * @fileoverview Version selection parameters interface.
 */

/**
 * Version selection strategy enumeration.
 */
export enum SelectionStrategy {
  /** Select the latest version. */
  LATEST = 'latest',
  /** Select the version by exact date. */
  BY_DATE = 'by-date',
  /** Select the version by tag. */
  BY_TAG = 'by-tag',
  /** Select the version by exact version identifier. */
  BY_VERSION_ID = 'by-version-id',
}

/**
 * Version selection parameters.
 */
export interface SelectionCriteria {
  /** The strategy to use for selecting a version. */
  strategy: SelectionStrategy;
  /** The date to select a version by (required when strategy is BY_DATE). */
  date?: Date;
  /** The tag to select a version by (required when strategy is BY_TAG). */
  tag?: string;
  /** The version identifier to select by (required when strategy is BY_VERSION_ID). */
  versionId?: string;
}

/**
 * Validates a SelectionCriteria object.
 * @param criteria - The selection criteria to validate.
 * @throws {Error} If the criteria are invalid.
 */
export function validateSelectionCriteria(criteria: SelectionCriteria): void {
  if (!criteria) {
    throw new Error('SelectionCriteria is required');
  }
  if (!criteria.strategy) {
    throw new Error('strategy is required');
  }

  switch (criteria.strategy) {
    case SelectionStrategy.BY_DATE:
      if (!criteria.date) {
        throw new Error('date is required when strategy is BY_DATE');
      }
      if (!(criteria.date instanceof Date) || isNaN(criteria.date.getTime())) {
        throw new Error('date must be a valid Date object');
      }
      break;
    case SelectionStrategy.BY_TAG:
      if (typeof criteria.tag !== 'string' || criteria.tag.trim() === '') {
        throw new Error('tag is required and must be a non-empty string when strategy is BY_TAG');
      }
      break;
    case SelectionStrategy.BY_VERSION_ID:
      if (typeof criteria.versionId !== 'string' || criteria.versionId.trim() === '') {
        throw new Error('versionId is required and must be a non-empty string when strategy is BY_VERSION_ID');
      }
      break;
    case SelectionStrategy.LATEST:
      // No additional fields required
      break;
    default:
      throw new Error(`Invalid strategy: ${criteria.strategy}`);
  }
}

/**
 * Creates a SelectionCriteria object with default values.
 * @param defaults - Partial criteria to merge with defaults.
 * @returns A new SelectionCriteria instance.
 */
export function createSelectionCriteria(defaults?: Partial<SelectionCriteria>): SelectionCriteria {
  const base: SelectionCriteria = {
    strategy: SelectionStrategy.LATEST,
  };
  return { ...base, ...defaults };
}
