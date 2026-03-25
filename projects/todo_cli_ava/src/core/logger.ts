import { Constants } from './constants';

/**
 * Logging utility that provides leveled logging with singleton pattern.
 * Supports info, warn, error, and debug log levels.
 */
export class Logger {
  private static _instance: Logger;
  private _level: string;

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the default log level to 'info'.
   */
  private constructor() {
    this._level = 'info';
  }

  /**
   * Singleton instance accessor.
   * @returns The singleton instance of Logger.
   */
  static get INSTANCE(): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger();
    }
    return Logger._instance;
  }

  /**
   * Gets the current log level.
   * @returns The current log level as a string.
   */
  get level(): string {
    return this._level;
  }

  /**
   * Logs an informational message.
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  info(message: string, ...args: unknown[]): void {
    this.validateMessage(message);
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Logs an error message.
   * @param message - The message to log.
   * @param error - Optional error object to log.
   */
  error(message: string, error?: Error): void {
    this.validateMessage(message);
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error);
    }
  }

  /**
   * Logs a debug message.
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  debug(message: string, ...args: unknown[]): void {
    this.validateMessage(message);
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Logs a warning message.
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  warn(message: string, ...args: unknown[]): void {
    this.validateMessage(message);
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Sets the logging level.
   * @param level - The desired log level.
   * @throws Error if the provided level is invalid.
   */
  setLevel(level: string): void {
    if (typeof level !== 'string') {
      throw new Error('Log level must be a string');
    }
    if (!Constants.isValidLogLevel(level)) {
      throw new Error(`Invalid log level: ${level}`);
    }
    this._level = level;
  }

  /**
   * Determines if a message of the given level should be logged
   * based on the current log level.
   * @param level - The level to check.
   * @returns True if the message should be logged, false otherwise.
   */
  private shouldLog(level: string): boolean {
    const levels = Constants.LOG_LEVELS;
    const currentIndex = levels.indexOf(this._level);
    const targetIndex = levels.indexOf(level);
    if (currentIndex === -1 || targetIndex === -1) {
      return false;
    }
    return targetIndex >= currentIndex;
  }

  /**
   * Validates that the provided message is a non-empty string.
   * @param message - The message to validate.
   * @throws Error if the message is invalid.
   */
  private validateMessage(message: string): void {
    if (typeof message !== 'string') {
      throw new Error('Message must be a string');
    }
    if (message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }
  }
}
