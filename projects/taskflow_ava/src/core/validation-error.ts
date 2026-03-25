/**
 * Represents a single validation failure.
 */
export class ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
  readonly value: unknown;

  constructor(field: string, message: string, code: string, value: unknown) {
    if (typeof field !== 'string') {
      throw new TypeError('field must be a string');
    }
    if (typeof message !== 'string') {
      throw new TypeError('message must be a string');
    }
    if (typeof code !== 'string') {
      throw new TypeError('code must be a string');
    }

    this.field = field;
    this.message = message;
    this.code = code;
    this.value = value;
  }

  /**
   * Returns a human-readable summary of the error.
   */
  toString(): string {
    return `ValidationError: ${this.message} (field: ${this.field}, code: ${this.code})`;
  }

  /**
   Returns a plain object suitable for serialization.
   */
  toJSON(): object {
    return {
      field: this.field,
      message: this.message,
      code: this.code,
      value: this.value
    };
  }

  /**
   * Creates an exact duplicate of this error.
   */
  clone(): ValidationError {
    return new ValidationError(this.field, this.message, this.code, this.value);
  }

  /**
   * Creates a new ValidationError with the specified message.
   * @param msg - the new message
   * @returns a new ValidationError instance
   */
  withMessage(msg: string): ValidationError {
    if (typeof msg !== 'string') {
      throw new TypeError('msg must be a string');
    }
    return new ValidationError(this.field, msg, this.code, this.value);
  }

  /**
   * Creates a new ValidationError with the specified field.
   * @param field - the new field name
   * @returns a new ValidationError instance
   */
  withField(field: string): ValidationError {
    if (typeof field !== 'string') {
      throw new TypeError('field must be a string');
    }
    return new ValidationError(field, this.message, this.code, this.value);
  }
}
