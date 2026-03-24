import { ExportFormat, Event } from './index';

/**
 * Logs all agent events and activities with configurable retention and export capabilities.
 */
export class EventLogger {
  private events: Event[] = [];
  private maxEvents: number;

  /**
   * Creates an instance of EventLogger.
   * @param maxEvents Maximum number of events to retain in memory (default: 10000)
   * @throws {Error} If maxEvents is not a positive integer
   */
  constructor(maxEvents: number = 10000) {
    if (!Number.isInteger(maxEvents) || maxEvents <= 0) {
      throw new Error('maxEvents must be a positive integer');
    }
    this.maxEvents = maxEvents;
  }

  /**
   * Log an event with the specified level.
   * @param level The severity level of the log entry
   * @param message The log message
   * @param data Optional additional data to log
   * @throws {Error} If level is invalid or message is empty
   */
  log(level: LogLevel, message: string, data?: any): void {
    if (!Object.values(LogLevel).includes(level)) {
      throw new Error(`Invalid log level: ${level}`);
    }
    if (typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Message must be a non-empty string');
    }

    const event: Event = {
      timestamp: new Date(),
      level,
      message: message.trim(),
      data: this.serializeData(data)
    };

    this.events.push(event);

    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    this.writeToConsole(event);
  }

  /**
   * Log an informational message.
   * @param message The info message
   * @param data Optional additional data
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message.
   * @param message The warning message
   * @param data Optional additional data
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message.
   * @param message The error message
   * @param error Optional Error object or additional data
   */
  error(message: string, error?: Error | any): void {
    this.log(LogLevel.ERROR, message, error);
  }

  /**
   * Log a debug message.
   * @param message The debug message
   * @param data Optional additional data
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Retrieve stored events, optionally filtered by level.
   * @param filter Optional LogLevel to filter results
   * @returns Array of Event objects
   */
  getEvents(filter?: LogLevel): Event[] {
    if (filter !== undefined && !Object.values(LogLevel).includes(filter)) {
      throw new Error(`Invalid filter level: ${filter}`);
    }
    const events = filter === undefined
      ? this.events
      : this.events.filter(event => event.level === filter);
    return events.map(e => ({ ...e }));
  }

  /**
   * Clear all stored events.
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Export stored events in the specified format.
   * @param format The export format (JSON, CSV, or TEXT)
   * @returns Formatted string of events
   * @throws {Error} If format is invalid
   */
  export(format: ExportFormat): string {
    if (!Object.values(ExportFormat).includes(format)) {
      throw new Error(`Invalid export format: ${format}`);
    }
    const events = this.getEvents();
    switch (format) {
      case ExportFormat.JSON:
        return this.exportAsJson(events);
      case ExportFormat.CSV:
        return this.exportAsCsv(events);
      case ExportFormat.TEXT:
      default:
        return this.exportAsText(events);
    }
  }

  /**
   * Serialize data safely for storage.
   * @param data Raw data object
   * @returns Serialized data
   */
  private serializeData(data: any): any {
    if (data === null || data === undefined) return undefined;
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return String(data);
    }
  }

  /**
   * Write event to console with appropriate method.
   * @param event The event to log
   */
  private writeToConsole(event: Event): void {
    const timestamp = event.timestamp.toISOString();
    const logMessage = `[${timestamp}] [${event.level}] ${event.message}`;
    const dataSuffix = event.data !== undefined ? ` ${JSON.stringify(event.data)}` : '';

    switch (event.level) {
      case LogLevel.ERROR:
        console.error(logMessage, dataSuffix);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, dataSuffix);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage, dataSuffix);
        break;
      default:
        console.log(logMessage, dataSuffix);
    }
  }

  /**
   * Export events as formatted JSON string.
   * @param events Array of events
   * @returns JSON string
   */
  private exportAsJson(events: Event[]): string {
    return JSON.stringify(events, null, 2);
  }

  /**
   * Export events as CSV string.
   * @param events Array of events
   * @returns CSV string
   */
  private exportAsCsv(events: Event[]): string {
    const headers = 'timestamp,level,message,data';
    const rows = events.map(event => {
      const dataStr = event.data ? JSON.stringify(event.data).replace(/"/g, '""') : '';
      const message = event.message.replace(/"/g, '""');
      return `"${event.timestamp.toISOString()}","${event.level}","${message}","${dataStr}"`;
    });
    return [headers, ...rows].join('\n');
  }

  /**
   * Export events as plain text.
   * @param events Array of events
   * @returns Text string
   */
  private exportAsText(events: Event[]): string {
    return events.map(event => {
      const timestamp = event.timestamp.toISOString();
      const dataStr = event.data ? JSON.stringify(event.data) : '';
      return `[${timestamp}] ${event.level}: ${event.message}${dataStr ? ' ' + dataStr : ''}`;
    }).join('\n');
  }
}