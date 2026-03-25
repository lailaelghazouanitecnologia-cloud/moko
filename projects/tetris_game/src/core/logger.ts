import { Config } from './config';
import { EventType } from './event-type';
import { Event } from '../../../event'; // assuming the event file is in the parent directory of the parent directory

/**
 * Logging utility class.
 */
export class Logger {
  private config: Config;
  private event: Event;

  /**
   * Creates a new instance of the Logger class.
   * 
   * @param config - The configuration object.
   * @param event - The event object.
   */
  constructor(config: Config, event: Event) {
    if (!(config instanceof Config)) {
      throw new Error('Invalid config object');
    }
    if (!(event instanceof Event)) {
      throw new Error('Invalid event object');
    }
    this.config = config;
    this.event = event;
  }

  /**
   * Logs a message to the console.
   * 
   * @param message - The message to log.
   */
  log(message: string): void {
    if (typeof message !== 'string') {
      throw new Error('Message must be a string');
    }
    console.log(`INFO: ${message}`);
  }

  /**
   * Logs an error message to the console and emits a STOP event.
   * 
   * @param message - The error message to log.
   */
  error(message: string): void {
    if (typeof message !== 'string') {
      throw new Error('Message must be a string');
    }
    console.error(`ERROR: ${message}`);
    try {
      this.event.emit(EventType.STOP, message);
    } catch (error) {
      console.error('Failed to emit STOP event:', error);
    }
  }

  /**
   * Logs a warning message to the console.
   * 
   * @param message - The warning message to log.
   */
  warn(message: string): void {
    if (typeof message !== 'string') {
      throw new Error('Message must be a string');
    }
    console.warn(`WARNING: ${message}`);
  }

  /**
   * Private helper method to validate the input message.
   * 
   * @param message - The message to validate.
   * @returns {boolean} True if the message is valid, false otherwise.
   */
  private isValidMessage(message: string): boolean {
    return typeof message === 'string' && message.trim() !== '';
  }

  /**
   * Private helper method to handle logging errors.
   * 
   * @param error - The error to handle.
   */
  private handleError(error: Error): void {
    console.error('Logging error:', error);
  }
}
