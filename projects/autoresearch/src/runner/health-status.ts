/**
 * Process health states.
 * 
 * @enum {string}
 */
export enum HealthStatus {
  /**
   * The process is operating normally.
   */
  HEALTHY = 'HEALTHY',

  /**
   * The process is experiencing minor issues but is still functional.
   */
  DEGRADED = 'DEGRADED',

  /**
   * The process is experiencing major issues and may not be fully functional.
   */
  CRITICAL = 'CRITICAL',

  /**
   * The process is not responding or has terminated unexpectedly.
   */
  DEAD = 'DEAD'
}

/**
 * Utility functions for working with HealthStatus values.
 */
export namespace HealthStatusUtil {
  /**
   * All possible HealthStatus values.
   */
  export const ALL: readonly HealthStatus[] = [
    HealthStatus.HEALTHY,
    HealthStatus.DEGRADED,
    HealthStatus.CRITICAL,
    HealthStatus.DEAD
  ];

  /**
   * Parse a string into a HealthStatus value.
   * 
   * @param value - The string to parse.
   * @returns The corresponding HealthStatus value.
   * @throws {TypeError} If the value is not a valid HealthStatus.
   */
  export function parse(value: string): HealthStatus {
    if (typeof value !== 'string') {
      throw new TypeError('HealthStatus value must be a string');
    }

    const upper = value.toUpperCase();
    if (upper in HealthStatus) {
      return HealthStatus[upper as keyof typeof HealthStatus];
    }

    throw new TypeError(`Invalid HealthStatus value: ${value}`);
  }

  /**
   * Safely parse a string into a HealthStatus value.
   * 
   * @param value - The string to parse.
   * @param defaultValue - The default value to return if parsing fails.
   * @returns The parsed HealthStatus or the default value.
   */
  export function safeParse(value: string, defaultValue: HealthStatus = HealthStatus.HEALTHY): HealthStatus {
    try {
      return parse(value);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Check if a value is a valid HealthStatus.
   * 
   * @param value - The value to check.
   * @returns True if the value is a valid HealthStatus, false otherwise.
   */
  export function isValid(value: unknown): value is HealthStatus {
    return typeof value === 'string' && ALL.includes(value as HealthStatus);
  }

  /**
   * Compare two HealthStatus values to determine which is more severe.
   * 
   * @param a - The first HealthStatus.
   * @param b - The second HealthStatus.
   * @returns Negative if a is less severe than b, positive if more severe, zero if equal.
   */
  export function compareSeverity(a: HealthStatus, b: HealthStatus): number {
    const severityOrder: Record<HealthStatus, number> = {
      [HealthStatus.HEALTHY]: 0,
      [HealthStatus.DEGRADED]: 1,
      [HealthStatus.CRITICAL]: 2,
      [HealthStatus.DEAD]: 3
    };

    return severityOrder[a] - severityOrder[b];
  }

  /**
   * Get the most severe HealthStatus from a list.
   * 
   * @param statuses - The HealthStatus values to evaluate.
   * @returns The most severe HealthStatus, or HEALTHY if the list is empty.
   * @throws {TypeError} If any item in the list is not a valid HealthStatus.
   */
  export function mostSevere(...statuses: HealthStatus[]): HealthStatus {
    if (statuses.length === 0) {
      return HealthStatus.HEALTHY;
    }

    let result = statuses[0];
    for (const status of statuses) {
      if (!isValid(status)) {
        throw new TypeError(`Invalid HealthStatus: ${status}`);
      }
      if (compareSeverity(status, result) > 0) {
        result = status;
      }
    }
    return result;
  }

  /**
   * Get the least severe HealthStatus from a list.
   * 
   * @param statuses - The HealthStatus values to evaluate.
   * @returns The least severe HealthStatus, or DEAD if the list is empty.
   * @throws {TypeError} If any item in the list is not a valid HealthStatus.
   */
  export function leastSevere(...statuses: HealthStatus[]): HealthStatus {
    if (statuses.length === 0) {
      return HealthStatus.DEAD;
    }

    let result = statuses[0];
    for (const status of statuses) {
      if (!isValid(status)) {
        throw new TypeError(`Invalid HealthStatus: ${status}`);
      }
      if (compareSeverity(status, result) < 0) {
        result = status;
      }
    }
    return result;
  }

  /**
   * Get a human-readable description of a HealthStatus.
   * 
   * @param status - The HealthStatus to describe.
   * @returns A human-readable description.
   */
  export function describe(status: HealthStatus): string {
    const descriptions: Record<HealthStatus, string> = {
      [HealthStatus.HEALTHY]: 'The process is operating normally.',
      [HealthStatus.DEGRADED]: 'The process is experiencing minor issues but is still functional.',
      [HealthStatus.CRITICAL]: 'The process is experiencing major issues and may not be fully functional.',
      [HealthStatus.DEAD]: 'The process is not responding or has terminated unexpectedly.'
    };

    return descriptions[status];
  }

  /**
   * Check if a HealthStatus indicates the process is operational (not DEAD).
   * 
   * @param status - The HealthStatus to check.
   * @returns True if the process is operational, false otherwise.
   */
  export function isOperational(status: HealthStatus): boolean {
    return status !== HealthStatus.DEAD;
  }

  /**
   * Check if a HealthStatus indicates the process is healthy (HEALTHY or DEGRADED).
   * 
   * @param status - The HealthStatus to check.
   * @returns True if the process is healthy, false otherwise.
   */
  export function isHealthy(status: HealthStatus): boolean {
    return status === HealthStatus.HEALTHY || status === HealthStatus.DEGRADED;
  }
}
