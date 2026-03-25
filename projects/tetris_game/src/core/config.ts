import { Logger } from './logger';
import { EventType } from './event-type';

// Define the Event type
interface Event {
  emit(type: EventType, message: string): void;
}

export class Config {
  private port: number;
  private host: string;
  private logger: Logger;
  private event: Event;

  constructor(port: number, host: string, logger: Logger, event: Event) {
    this.port = port;
    this.host = host;
    this.logger = logger;
    this.event = event;
  }

  public load(): void {
    this.logger.log('Loading config...');
    // Load config from a file or database
    // For demonstration purposes, we'll just set some default values
    this.port = 8080;
    this.host = 'localhost';
    this.logger.log('Config loaded.');
    this.event.emit(EventType.START, 'Config loaded');
  }

  public save(): void {
    this.logger.log('Saving config...');
    // Save config to a file or database
    // For demonstration purposes, we'll just log the values
    this.logger.log(`Config saved: port=${this.port}, host=${this.host}`);
    this.event.emit(EventType.STOP, 'Config saved');
  }
}
