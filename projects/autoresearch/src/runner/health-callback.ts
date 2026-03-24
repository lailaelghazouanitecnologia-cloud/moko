/**
 * Health status enumeration used by the {@link HealthCallback}.
 */
export enum HealthStatus {
  /**
   * The resource is completely healthy.
   */
  Healthy = 'HEALTHY',
  /**
   * The resource is partially functional but degraded.
   */
  Degraded = 'DEGRADED',
  /**
   * The resource is completely unavailable.
   */
  Unhealthy = 'UNHEALTHY',
}

/**
 * Signature for a callback that is invoked every time the health status
 * of a monitored resource changes.
 *
 * @param status - The new health status.
 */
export type HealthCallback = (status: HealthStatus) => void;

/**
 * Helper utilities for validating and invoking {@link HealthCallback} functions.
 */
export class HealthCallbackHelpers {
  /**
   * Validates that the provided value is a valid {@link HealthStatus}.
   *
   * @param value - The value to validate.
   * @returns `true` if the value is a valid {@link HealthStatus}; otherwise, `false`.
   */
  private static isValidHealthStatus(value: unknown): value is HealthStatus {
    return (
      value === HealthStatus.Healthy ||
      value === HealthStatus.Degraded ||
      value === HealthStatus.Unhealthy
    );
  }

  /**
   * Safely invokes a {@link HealthCallback} with the given status.
   *
   * @param callback - The callback to invoke.
   *   If `undefined`, the function returns immediately without error.
   * @param status - The health status to pass to the callback.
   * @throws {TypeError} If `status` is not a valid {@link HealthStatus}.
   */
  public static safeInvoke(
    callback: HealthCallback | undefined,
    status: HealthStatus,
  ): void {
    if (!this.isValidHealthStatus(status)) {
      throw new TypeError(
        `Invalid health status provided: expected one of ${Object.values(
          HealthStatus,
        ).join(', ')}, but received ${String(status)}`,
      );
    }

    if (typeof callback !== 'function') {
      // Silently ignore non-function callbacks to avoid breaking the caller.
      return;
    }

    try {
      callback(status);
    } catch (err) {
      // Log the error without re-throwing to prevent disrupting the caller.
      // In a production environment, replace this with your logging framework.
      console.error('HealthCallback threw an error:', err);
    }
  }

  /**
   * Creates a new {@link HealthCallback} that validates the status before
   * delegating to the underlying callback.
   *
   * @param callback - The underlying callback to wrap.
   * @returns A new callback that validates the status before invocation.
   * @throws {TypeError} If `callback` is not a function.
   */
  public static wrapWithValidation(
    callback: HealthCallback,
  ): HealthCallback {
    if (typeof callback !== 'function') {
      throw new TypeError(
        `Expected a function, but received ${typeof callback}`,
      );
    }

    return (status: HealthStatus): void => {
      if (!this.isValidHealthStatus(status)) {
        throw new TypeError(
          `Invalid health status provided: expected one of ${Object.values(
            HealthStatus,
          ).join(', ')}, but received ${String(status)}`,
        );
      }
      callback(status);
    };
  }
}
