
import { MiddlewareFn } from './middleware';

export function createLogger<T>(label: string): MiddlewareFn<T> {
  return (value: T, next: (v: T) => void) => {
    console.log('[' + label + ']', value);
    next(value);
  };
}
