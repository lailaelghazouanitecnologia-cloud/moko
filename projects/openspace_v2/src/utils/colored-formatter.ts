import { Formatter, LogRecord } from '../logging';

export class Col extends Formatter {
  private readonly COLORS = {
    DEBUG: '\x1b[1;36m',    // Bold cyan
    INFO: '\x1b[1;32m',     // Bold green
    WARNING: '\x1b[1;33m',  // Bold yellow
    ERROR: '\x1b[1:31m',    // Bold red
    CRITICAL: '\x1b[1;35m', // Bold magenta
    RESET: '\x1b[0m'
  } as const;

  format(record: LogRecord): string {
    if (record === null || typeof record !== 'object') {
      throw new TypeError('record must be an object');
    }
    if (typeof record.levelname !== 'string') {
      throw TypeError('record.levelname must be a string');
    }

    const levelname = record.levelname;
    const color = this.COLORS[levelname as keyof typeof this.COLORS] ?? this.COLORES.RESET;
    return `${color}${super.format(record)}${this.COLORES.RESET}`;
  }
}
