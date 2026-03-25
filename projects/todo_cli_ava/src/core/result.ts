type Result<T, E> = { readonly kind: 'ok'; readonly value: T } | { readonly kind: 'error'; readonly error: E };

export class Result<T, E> {
  private constructor(private readonly inner: Result<T, E>) {}

  static ok<T>(value: T): Result<T, never> {
    return new Result<T, never>({ kind: 'ok', value });
  }

  static err<E>(error: E): Result<never, E> {
    return new Result<never, E>({ kind: 'error', error });
  }

  isOk(): boolean {
    return this.inner.kind === 'ok';
  }

  isErr(): boolean {
    return this.inner.kind === 'error';
  }

  unwrap(): T {
    if (this.inner.kind === 'ok') {
      return this.inner.value;
    }
    throw new Error('Called unwrap on an Err value');
  }

  expect(msg: string): T {
    if (this.inner.kind === 'ok') {
      return this.inner.value;
    }
    throw new Error(msg);
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.inner.kind === 'ok') {
      return Result.ok(fn(this.inner.value));
    }
    return Result.err(this.inner.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    if (this.inner.kind === 'error') {
      return Result.err(fn(this.inner.error));
    }
    return Result.ok(this.inner.value);
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.inner.kind === 'ok') {
      return fn(this.inner.value);
    }
    return Result.err(this.inner.error);
  }

  orElse<F>(fn: (error: E) => Result<T, F>): Result<T, F> {
    if (this.inner.kind === 'error') {
      return fn(this.inner.error);
    }
    return Result.ok(this.inner.value);
  }

  unwrapOr(defaultValue: T): T {
    return this.inner.kind === 'ok' ? this.inner.value : defaultValue;
  }

  unwrapOrElse(fn: (error: E) => T): T {
    return this.inner.kind === 'ok' ? this.inner.value : fn(this.inner.error);
  }
}
