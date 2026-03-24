import { ValidationError } from './validation-error';

/**
 * Defines validation rules for data parsing
 */
export interface ValidationRule {
  /**
   * Validates the provided data against this rule
   * @param data - The data to validate
   * @returns true if data is valid, false otherwise
   * @throws {ValidationError} If validation fails due to invalid input
   */
  validate(data: any): boolean;

  /**
   * Gets a human-readable error message describing why the last validation failed
   * @returns The error message
   */
  getErrorMessage(): string;
}
