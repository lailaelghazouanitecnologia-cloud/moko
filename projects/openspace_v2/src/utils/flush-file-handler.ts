import { FileHandler } from '../logging';

/**
 * File handler that flushes after each emit for real-time logging.
 * Guarantees that every log record is flushed to disk immediately.
 */
export class FlushFileHandler extends FileHandler {
  constructor(filename: string) {
    super(filename);
  }

  emit(record: unknown): void {
    super.emit(record);
    this.flush();
  }
}
