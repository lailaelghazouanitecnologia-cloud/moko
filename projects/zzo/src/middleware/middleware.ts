
import { Observable } from '../core';

export type MiddlewareFn<T> = (value: T, next: (v: T) => void) => void;

export class MiddlewareChain<T> {
  private middlewares: MiddlewareFn<T>[] = [];

  use(fn: MiddlewareFn<T>): this {
    this.middlewares.push(fn);
    return this;
  }

  apply(value: T, final: (v: T) => void): void {
    const chain = [...this.middlewares];
    const run = (index: number, val: T): void => {
      if (index >= chain.length) {
        final(val);
        return;
      }
      chain[index](val, (nextVal) => run(index + 1, nextVal));
    };
    run(0, value);
  }

  clear(): void {
    this.middlewares = [];
  }
}
