export interface ValidationError {
  readonly message: string;
  readonly code?: string;
  readonly details?: unknown;
}

export interface Result<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error: ValidationError | null;
  isOk(): boolean;
  isErr(): boolean;
  unwrap(): T;
  unwrapErr(): ValidationError;
  map<U>(fn: (data: T) => U): Result<U>;
}
