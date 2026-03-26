import { Config } from './config';
import { Result } from './result';

/**
 * Represents a validation failure with field-specific details.
 * Immutable after construction.
 */
export class ValidationError {
  public readonly field: string;
  public readonly message: string;
  public readonly code: string;

  constructor(field: string, message: string, code: string) {
    if (field.length === 0) {
      throw new RangeError('field cannot be empty');
    }
    if (message.length === 0) {
      throw new RangeError('message cannot be empty');
    }
    if (code.length === 0) {
      throw new RangeError('code cannot be empty');
    }

    this.field = field;
    this.message = message;
    this.code = code;
  }

  toString(): string {
    return `[${this.code}] ${this.field}: ${this.message}`;
  }

  toJSON(): object {
    return {
      field: this.field,
      message: this.message,
      code: this.code
    };
  }

  isCritical(): boolean {
    return this.code.startsWith('CRITICAL_');
  }

  getPath(): string {
    return this.field;
  }

  /**
   * Merges this error with another validation error.
   * @param other - The error to merge with
   * @returns A new ValidationError combining both errors
   * @throws {TypeError} If other is not a ValidationError instance
   */
  merge(other: ValidationError): ValidationError {

    const combinedField = this.field === other.field ? this.field : `${this.field}.${other.field}`;
    const combinedMessage = `${this.message}; ${other.message}`;
    const combinedCode = this.code === other.code ? this.code : 'MERGED_ERROR';
    
    return new ValidationError(combinedField, combinedMessage, combinedCode);
  }
}
