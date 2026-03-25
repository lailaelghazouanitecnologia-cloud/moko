import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import { Col } from './colored-formatter';
import { FlushFileHandler } from './flush-file-handler';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level?: LogLevel;
  format?: string;
  logToConsole?: boolean;
  logToFile?: string | 'auto';
  useColors?: boolean;
  forceColor?: boolean;
  force?: boolean;
  attachToRoot?: boolean;
}

export class Logger {
  private static instance: Logger;
  private static config: LoggerConfig = {
    level: 'info',
    logToConsole: true,
    logToFile: 'auto',
    useColors: true,
    forceColor: false,
    force: false,
    attachToRoot: false
  };
  private static loggers: Map<string, WinstonLogger> = new Map();
  private static handlersConfigured = false;

  private constructor() {}

  static get_logger(name?: string): WinstonLogger {
    const loggerName = name ?? 'default';
    
    if (!this.handlersConfigured) {
      this.configure();
    }

    if (this.loggers.has(loggerName)) {
      return this.loggers.get(loggerName)!;
    }

    const logger = createLogger({
      level: this.config.level,
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        this.config.useColors ? format.colorize() : format.uncolorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${util.inspect(meta, { colors: this.config.useColors })}` : '';
          return `${timestamp} [${loggerName}] ${level}: ${message}${metaStr}`;
        })
      ),
      transports: []
    });

    if (this.config.logToConsole) {
      logger.add(new transports.Console());
    }

    if (this.config.logToFile && this.config.logToFile !== 'auto') {
      logger.add(new FlushFileHandler({ filename: this.config.logToFile }));
    } else if (this.config.logToFile === 'auto') {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      logger.add(new FlushFileHandler({ filename: path.join(logDir, `${loggerName}.log`) }));
    }

    this.loggers.set(loggerName, logger);
    return logger;
  }

  static configure(config: Partial<LoggerConfig> = {}): void {
    if (this.handlersConfigured && !config.force) {
      return;
    }

    this.config = { ...this.config, ...config };
    this.handlersConfigured = true;

    // Reconfigure existing loggers
    for (const [name, logger] of this.loggers) {
      logger.level = this.config.level ?? 'info';
      logger.format = format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        this.config.useColors ? format.colorize() : format.uncolorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${util.inspect(meta, { colors: this.config.useColors })}` : '';
          return `${timestamp} [${name}] ${level}: ${message}${metaStr}`;
        })
      );
    }
  }

  static set_debug(debugLevel: number = 2): void {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const level = levels[Math.min(debugLevel, levels.length - 1)] ?? 'debug';
    this.configure({ level, force: true });
  }

  static add_file_handler(filepath: string, loggerName?: string): void {
    const name = loggerName ?? 'default';
    const logger = this.get_logger(name);
    
    const fileHandler = new FlushFileHandler({ filename: filepath });
    logger.add(fileHandler);
  }

  static reset_configuration(): void {
    this.handlersConfigured = false;
    this.config = {
      level: 'info',
      logToConsole: true,
      logToFile: 'auto',
      useColors: true,
      forceColor: false,
      force: false,
      attachToRoot: false
    };
    
    // Clear all loggers
    for (const logger of this.loggers.values()) {
      logger.close();
    }
    this.loggers.clear();
  }
}