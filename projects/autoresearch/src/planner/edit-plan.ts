/**
 * @fileoverview Defines the EditPlan interface and related utilities.
 * Represents a plan for code modifications with validation results.
 */

// UNRESOLVED: import { FileTarget } from './file-target';
// UNRESOLVED: import { Change } from './change';
import { ValidationResult } from './hypothesis';

/**
 * Planned code modifications for a specific file.
 */
export interface EditPlan {
  /**
   * The file target for this edit plan.
   */
  target: FileTarget;

  /**
   * An ordered list of changes to apply to the target file.
   */
  changes: Change[];

  /**
   * Validation results for this edit plan.
   */
  validation: ValidationResult;
}

/**
 * Validates an EditPlan instance.
 * @param plan The EditPlan to validate.
 * @throws {TypeError} If the plan is invalid.
 */
export function validateEditPlan(plan: unknown): asserts plan is EditPlan {
  if (typeof plan !== 'object' || plan === null) {
    throw new TypeError('EditPlan must be an object');
  }

  const p = plan as Partial<EditPlan>;

  if (!p.target) {
    throw new TypeError('EditPlan.target is required');
  }
  if (!p.changes) {
    throw new TypeError('EditPlan.changes is required');
  }
  if (!p.validation) {
    throw new TypeError('EditPlan.validation is required');
  }

  if (!Array.isArray(p.changes)) {
    throw new TypeError('EditPlan.changes must be an array');
  }
}

/**
 * Creates a new EditPlan with default validation.
 * @param target The file target.
 * @param changes The list of changes.
 * @returns A new EditPlan instance.
 */
export function createEditPlan(
  target: FileTarget,
  changes: Change[]
): EditPlan {
  return {
    target,
    changes,
    validation: { valid: true, errors: [] },
  };
}