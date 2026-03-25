import { ValidationError } from './validation-error';

/**
 * Encapsulates the outcome of an operation that can either succeed with a value
 * or fail with a ValidationError.
 *
 * @template T The type of the success value.
 */
export class Result<T> {
  private readonly success: boolean;
  private readonly data: T | undefined;
  private readonly error: ValidationError | undefined;

  private constructor(success: boolean, data?: T, error?: ValidationError) {
    this.success = success;
    this.data = data;
    this.error = error;
  }

  /**
   * Checks if the result represents a successful operation.
   *
   * @returns `true` if the operation succeeded, `false` otherwise.
   */
  isOk(): boolean {
    return this.success;
  }

  /**
   * Checks if the result represents a failed operation.
   *
   * @returns `true` if the operation failed, `false` otherwise.
   */
  isErr(): boolean {
    return !this.success;
  }

  /**
   * Retrieves the success payload.
   *
   * @throws {Error} If the result is not successful or data is undefined.
   * @returns The success value of type `T`.
   */
  getData(): T {
    if (!this.success || this.data === undefined) {
      throw new Error('Cannot get data from error result');
    }
    return this.data;
  }

  /**
   * Retrieves the ValidationError.
   *
   * @throws {Error} If the result is successful or error is undefined.
   * @returns The ValidationError instance.
   */
  getError(): ValidationError {
    if (this.success || this.error === undefined) {
      throw new Error('Cannot get error from success result');
    }
    return this.error;
  }

  /**
   * Transforms the success value using the provided function.
   * If the result is an error, the same error is propagated unchanged.
   *
   * @template U The type of the transformed value.
   * @param fn A function to apply to the success value.
   * @returns A new Result with the transformed value or the original error.
   */
  map<U>(fn: (x: T) => U): Result<U> {
    if (this.success) {
      return Result.ok(fn(this.data as T));
    } else {
      return Result.err(this.error as ValidationError);
    }
  }

  /**
   * Chains operations that return Results.
   * If the current result is successful, applies the given function to the value.
   * Otherwise, propagates the error unchanged.
   *
   * @template U The type of the success value of the returned Result.
   * @param fn A function that takes the success value and returns a Result<U>.
   * @returns The Result produced by `fn` or the current error Result.
   */
  flatMap<U>(fn: (x: T) => Result<U>): Result<U> {
    if (this.success) {
      return fn(this.data as T);
    } else {
      return Result.err(this.error as ValidationError);
    }
  }

  /**
   * Creates a successful Result containing the provided data.
   *
   * @template U The type of the success value.
   * @param data The success value.
   * @returns A Result<U> representing success.
   */
  static ok<U>(data: U): Result<U> {
    return new Result<U>(true, data);
  }

  /**
   * Creates a failed Result containing the provided ValidationError.
   *
   * @template U The type placeholder for the success value (unused in error case).
   * @param error The ValidationError describing the failure.
   * @returns A Result<U> representing failure.
   */
  static err<U>(error: ValidationError): Result<U> {
    return new Result<U>(false, undefined, error);
  }
}
