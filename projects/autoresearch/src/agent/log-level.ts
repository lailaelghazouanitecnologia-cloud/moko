export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Utility class for LogLevel operations.
 * Provides methods to parse, validate, and compare log levels.
 */
export class LogLevelUtil {
  /**
   * Converts a string to a LogLevel enum value.
   * @param level - The string representation of the log level.
   * @returns The corresponding LogLevel enum value.
   * @throws {Error} If the input is not a valid log level.
   */
  public static fromString(level: string): LogLevel {
    if (!level || typeof level !== 'string') {
      throw new Error('Log level must be a non-empty string');
    }

    const upperLevel = level.toUpperCase();
    const validLevels = Object.values(LogLevel);

    if (!validLevels.includes(upperLevel as LogLevel)) {
      throw new Error(`Invalid log level: ${level}. Valid levels are: ${validLevels.join(', ')}`);
    }

    return upperLevel as LogLevel;
  }

  /**
   * Checks if a string is a valid LogLevel.
   * @param level - The string to check.
   * @returns True if the string is a valid LogLevel, false otherwise.
   */
  public static isValid(level: string): boolean {
    if (!level || typeof level !== 'string') {
      return false;
    }

    const upperLevel = level.toUpperCase();
    return Object.values(LogLevel).includes(upperLevel as LogLevel);
  }

  /**
   * Gets the severity order of a LogLevel.
   * @param level - The LogLevel to check.
   * @returns The numeric severity (0 for DEBUG, 1 for INFO, 2 for WARN, 3 for ERROR).
   * @throws {Error} If the input is not a valid LogLevel.
   */
  public static severity(level: LogLevel): number {
    if (!level || !Object.values(LogLevel).includes(level)) {
      throw new Error('Invalid LogLevel provided');
    }

    return this.getSeverityMap()[level];
  }

  /**
   * Compares two LogLevels to determine if one is more severe than the other.
   * @param level - The LogLevel to compare.
   * @param threshold - The threshold LogLevel.
   * @returns True if level is equal to or more severe than threshold.
   * @throws {Error} If either input is not a valid LogLevel.
   */
  public static isAtLeast(level: LogLevel, threshold: LogLevel): boolean {
    if (!level || !threshold) {
      throw new Error('Both level and threshold must be provided');
    }

    if (!Object.values(LogLevel).includes(level) || !Object.values(LogLevel).includes(threshold)) {
      throw new Error('Invalid LogLevel provided');
    }

    return this.severity(level) >= this.severity(threshold);
  }

  /**
   * Gets all available LogLevels as an array of strings.
   * @returns An array of LogLevel strings.
   */
  public static getAllLevels(): string[] {
    return Object.values(LogLevel);
  }

  /**
   * Gets the default LogLevel (INFO).
   * @returns The default LogLevel.
   */
  public static getDefault(): LogLevel {
    return LogLevel.INFO;
  }

  /**
   * Creates a LogLevel from an unknown input with fallback to default.
   * @param value - The value to convert to LogLevel.
   * @returns The corresponding LogLevel or the default if invalid.
   */
  public static safeFrom(value: unknown): LogLevel {
    if (typeof value === 'string' && this.isValid(value)) {
      return this.fromString(value);
    }
    return this.getDefault();
  }

  /**
   * Private helper to get the severity mapping.
   * @returns An object mapping LogLevel to numeric severity.
   */
  private static getSeverityMap(): Record<LogLevel, number> {
    return {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3
    };
  }
}
