/**
 * Timeout event callback
 */
export type TimeoutCallback = () => void;

/**
 * Validates that the provided value is a valid TimeoutCallback.
 * @param value - The value to validate.
 * @returns True if the value is a valid TimeoutCallback, false otherwise.
 */
export function isTimeoutCallback(value: unknown): value is TimeoutCallback {
  return typeof value === 'function';
}

/**
 * Asserts that the provided value is a valid TimeoutCallback.
 * @param value - The value to assert.
 * @param message - Optional error message.
 * @throws {TypeError} If the value is not a valid TimeoutCallback.
 */
export function assertTimeoutCallback(value: unknown, message?: string): asserts value is TimeoutCallback {
  if (!isTimeoutCallback(value)) {
    throw new TypeError(message ?? 'Expected a TimeoutCallback function');
  }
}

/**
 * Wraps a TimeoutCallback with error handling.
 * @param callback - The original callback.
 * @param onError - Optional error handler.
 * @returns A new TimeoutCallback that catches and handles errors.
 */
export function wrapTimeoutCallback(
  callback: TimeoutCallback,
  onError?: (error: unknown) => void
): TimeoutCallback {
  assertTimeoutCallback(callback, 'Invalid callback provided to wrapTimeoutCallback');

  return () => {
    try {
      callback();
    } catch (error) {
      if (onError) {
        try {
          onError(error);
        } catch (handlerError) {
          // Prevent unhandled rejection by silently swallowing handler errors
        }
      }
    }
  };
}

/**
 * Creates a TimeoutCallback that can only be called once.
 * @param callback - The original callback.
 * @returns A new TimeoutCallback that ignores subsequent calls.
 */
export function onceTimeoutCallback(callback: TimeoutCallback): TimeoutCallback {
  assertTimeoutCallback(callback, 'Invalid callback provided to onceTimeoutCallback');

  let called = false;

  return () => {
    if (called) return;
    called = true;
    callback();
  };
}

/**
 * Chains multiple TimeoutCallbacks into a single callback.
 * @param callbacks - Array of callbacks to chain.
 * @returns A new TimeoutCallback that executes all callbacks in order.
 * @throws {TypeError} If any callback is invalid.
 */
export function chainTimeoutCallbacks(...callbacks: TimeoutCallback[]): TimeoutCallback {
  if (callbacks.length === 0) {
    throw new TypeError('At least one callback must be provided');
  }

  callbacks.forEach((cb, idx) => {
    assertTimeoutCallback(cb, `Invalid callback at index ${idx}`);
  });

  return () => {
    for (const cb of callbacks) {
      cb();
    }
  };
}
