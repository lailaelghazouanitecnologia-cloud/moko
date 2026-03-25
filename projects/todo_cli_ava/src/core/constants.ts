/**
 * Application-wide constants.
 * All values are read-only and should be used as the single source of truth for
 * configuration that does not change during runtime.
 */
export class Constants {
  /** Application version string (semver). */
  static readonly VERSION: string = '1.0.0';

  /** Prefix for all API routes. */
  static readonly API_PREFIX: string = '/api/v1';

  /** Maximum allowed request size in bytes (10 MB). */
  static readonly MAX_REQUEST_SIZE: number = 1024 * 1024 * 10; // 10MB

  /** Default request timeout in milliseconds (30 seconds). */
  static readonly DEFAULT_TIMEOUT: number = 30000; // 30 seconds

  /** Logging severity levels. */
  static readonly LOG_LEVELS = {
    ERROR: 'error',
    WARN:  'warn',
    INFO:  'info',
    DEBUG: 'debug',
  } as const;

  /**
   * Validates that a caller-supplied value does not exceed the maximum request size.
   * @param sizeInBytes – size to validate (must be a non-negative integer).
   * @throws {RangeError} if size is invalid or exceeds the limit.
   */
  static validateRequestSize(sizeInBytes: number): void {
    if (!Number.isInteger(sizeInBytes) || sizeInBytes < 0) {
      throw new RangeError('sizeInBytes must be a non-negative integer');
    }
    if (sizeInBytes > Constants.MAX_REQUEST_SIZE) {
      throw new RangeError(
        `Request size exceeds maximum allowed size of ${Constants.MAX_REQUEST_SIZE} bytes`
      );
    }
  }

  /**
   * Validates that a caller-supplied timeout is within the acceptable range.
   * @param timeout – timeout in milliseconds (must be a positive integer).
   * @throws {RangeError} if timeout is invalid.
   */
  static validateTimeout(timeout: number): void {
    if (!Number.isInteger(timeout) || timeout <= 0) {
      throw new RangeError('timeout must be a positive integer (ms)');
    }
  }

  /**
   * Checks whether a provided log level is one of the predefined levels.
   * @param level – log level to validate.
   * @returns true if valid, false otherwise.
   */
  static isValidLogLevel(level: string): boolean {
    return Object.values(Constants.LOG_LEVELS).includes(level as unknown);
  }

  /**
   * Returns a human-readable description of the constant group.
   * @returns formatted summary string.
   */
  static summary(): string {
    return [
      `Version: ${Constants.VERSION}`,
      `API Prefix: ${Constants.API_PREFIX}`,
      `Max Request Size: ${Constants.MAX_REQUEST_SIZE} bytes`,
      `Default Timeout: ${Constants.DEFAULT_TIMEOUT} ms`,
      `Log Levels: ${Object.values(Constants.LOG_LEVELS).join(', ')}`,
    ].join('\n');
  }

  // Prevent instantiation of this static utility class.
  private constructor() {
    throw new Error('Constants is a static utility class and cannot be instantiated');
  }
}
