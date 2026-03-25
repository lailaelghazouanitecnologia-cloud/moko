export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string,
    public readonly code?: string
  ) {
      super(message);
      this.name = 'ValidationError';
  }

  toJSON(): unknown {
      return {
          name: this.name,
          field: this.field,
          message: this.message,
          code: this.code
      };
  }

  static from(error: unknown): ValidationError {
      if (error instanceof ValidationError) {
          return error;
      }
      if (error instanceof Error) {
          return new ValidationError('unknown', error.message);
      }
      if (typeof error === 'string') {
          return new ValidationError('unknown', error);
      }
      return new ValidationError('unknown', 'Validation failed');
  }
}
