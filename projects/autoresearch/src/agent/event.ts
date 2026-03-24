/**
 * Log-level enumeration used by the Event interface.
 */
export enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO  = 'INFO',
  WARN  = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

/**
 * Single logged event.
 */
export interface Event {
  /**
   * Exact moment the event was created.
   */
  timestamp: Date;

  /**
   * Severity / verbosity level.
   */
  level: LogLevel;

  /**
   * Human-readable description.
   */
  message: string;

  /**
   * Optional contextual data (primitive, object, array, etc.).
   */
  data?: any;
}

/**
 * Factory and utility helpers for Event objects.
 */
export class EventFactory {
  /**
   * Creates a new Event instance with the current timestamp.
   *
   * @param level   - Log level
   * @param message - Message text
   * @param data    - Optional contextual data
   * @returns A valid Event object
   * @throws {TypeError} When level or message are invalid
   */
  static create(level: LogLevel, message: string, data?: any): Event {
    EventFactory.validateLevel(level);
    EventFactory.validateMessage(message);

    return {
      timestamp: new Date(),
      level,
      message,
      data
    };
  }

  /**
   * Re-creates an Event from a plain object (e.g. obtained via JSON.parse).
   *
   * @param input - Plain object to convert
   * @returns A validated Event instance
   * @throws {TypeError} When the input is malformed
   */
  static from(input: any): Event {
    if (!input || typeof input !== 'object') {
      throw new TypeError('Input must be a non-null object');
    }

    const { timestamp, level, message, data } = input;

    if (!(timestamp instanceof Date) && typeof timestamp !== 'string') {
      throw new TypeError('timestamp must be a Date or ISO date string');
    }

    const parsedTs = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (Number.isNaN(parsedTs.getTime())) {
      throw new TypeError('Invalid timestamp value');
    }

    EventFactory.validateLevel(level);
    EventFactory.validateMessage(message);

    return {
      timestamp: parsedTs,
      level,
      message,
      data
    };
  }

  /**
   * Converts an Event to a compact, JSON-friendly representation.
   *
   * @param event - Event to serialize
   * @returns Plain object ready for JSON.stringify
   * @throws {TypeError} When event is invalid
   */
  static toJSON(event: Event): Record<string, any> {
    if (!event || typeof event !== 'object') {
      throw new TypeError('Event must be a non-null object');
    }

    EventFactory.validateLevel(event.level);
    EventFactory.validateMessage(event.message);

    return {
      timestamp: event.timestamp.toISOString(),
      level: event.level,
      message: event.message,
      ...(event.data !== undefined && { data: event.data })
    };
  }

  /**
   * Validates the log level.
   *
   * @param level - Value to check
   * @throws {TypeError} When validation fails
   */
  private static validateLevel(level: any): asserts level is LogLevel {
    if (!Object.values(LogLevel).includes(level)) {
      throw new TypeError(`Invalid LogLevel: ${level}`);
    }
  }

  /**
   * Validates the message string.
   *
   * @param message - Value to check
   * @throws {TypeError} When validation fails
   */
  private static validateMessage(message: any): asserts message is string {
    if (typeof message !== 'string' || message.length === 0) {
      throw new TypeError('message must be a non-empty string');
    }
  }
}
