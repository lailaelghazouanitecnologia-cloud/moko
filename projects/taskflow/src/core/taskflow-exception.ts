import { isPlainObject } from '../utils/type-guards.js';

/**
 * Base exception for all Taskflow-related errors.
 * Provides a structured way to represent errors with a code and additional details.
 */
export class TaskflowException extends Error {
  public readonly code: string;
  public readonly details: Record<string, any>;

  /**
   * Creates a new TaskflowException.
   * @param message - Human-readable description of the error.
   * @param code - Machine-readable error code. Defaults to 'TASKFLOW_ERROR'.
   * @param details - Arbitrary additional context for the error. Defaults to {}.
   * @throws {TypeError} If message is not a non-empty string.
   */
  constructor(message: string, code?: string, details?: Record<string, any>) {
    TaskflowException.validateMessage(message);
    super(message);
    this.name = 'TaskflowException';
    this.code = TaskflowException.sanitizeCode(code);
    this.details = TaskflowException.sanitizeDetails(details);
    Object.setPrototypeOf(this, TaskflowException.prototype); // restore prototype chain for instanceof
  }

  /**
   * Serializes the exception to a plain object.
   * @returns Object containing message, code, and details.
   */
  toJSON(): { message: string; code: string; details: Record<string, any> } {
    return {
      message: this.message,
      code: this.code,
      details: this.cloneDetails(),
    };
  }

  /**
   * Wraps an unknown value into a TaskflowException.
   * @param error - The value to wrap.
   * @returns A TaskflowException instance.
   */
  static from(error: unknown): TaskflowException {
    if (error instanceof TaskflowException) {
      return error;
    }

    if (error instanceof Error) {
      return new TaskflowException(
        error.message || 'Unspecified error',
        'ERROR_WRAPPED',
        { originalError: error.name, stack: error.stack }
      );
    }

    if (typeof error === 'string') {
      return new TaskflowException(error, 'STRING_ERROR');
    }

    if (typeof error === 'object' && error !== null) {
      try {
        const str = JSON.stringify(error);
        return new TaskflowException('Unknown error object', 'UNKNOWN_ERROR', { original: str });
      } catch {
        return new TaskflowException('Unknown error object', 'UNKNOWN_ERROR');
      }
    }

    return new TaskflowException('Unknown error', 'UNKNOWN_ERROR', { original: error });
  }

  /* ------------------------------------------------------------------ */
  /* Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  private static validateMessage(message: unknown): asserts message is string {
    if (typeof message !== 'string' || message.trim().length === 0) {
      throw new TypeError('TaskflowException message must be a non-empty string');
    }
  }

  private static sanitizeCode(code: unknown): string {
    if (typeof code === 'string' && code.trim().length > 0) {
      return code.trim();
    }
    return 'TASKFLOW_ERROR';
  }

  private static sanitizeDetails(details: unknown): Record<string, any> {
    if (isPlainObject(details)) {
      return { ...(details as Record<string, any>) };
    }
    return {};
  }

  private cloneDetails(): Record<string, any> {
    try {
      return JSON.parse(JSON.stringify(this.details));
    } catch {
      return { unserializable: true };
    }
  }
}
