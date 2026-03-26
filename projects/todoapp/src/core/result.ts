import { ValidationError } from './validation-error';

export type Result<T = unknown> = {
  readonly success: boolean;
  readonly data: T;
  readonly error: ValidationError | null;
  isOk(): boolean;
  isErr(): boolean;
  unwrap(): T;
  unwrapErr(): ValidationError;
  map<U>(fn: (value: T) => U): Result<U>;
};

export const Result = {
  ok<T>(value: T): Result<T> {
    return {
      success: true,
      data: value,
      error: null,
      isOk: () => true,
      isErr: () => false,
      unwrap: () => value,
      unwrapErr: () => { throw new Error('Cannot unwrap error from Ok result'); },
      map: <U>(fn: (value: T) => U): Result<U> => Result.ok(fn(value))
    };
  },

  err<T>(error: ValidationError): Result<T> {
    return {
      success: false,
      data: undefined as unknown as T,
      error,
      isOk: () => false,
      isErr: () => true,
      unwrap: () => { throw error; },
      unwrapErr: () => error,
      map: () => Result.err(error)
    };
  }
} as const;
