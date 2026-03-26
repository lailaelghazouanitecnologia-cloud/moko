import { Config, Result, ValidationError } from '../core';
import { Repository, Serializer, Store } from '../store';

interface CommandContext {
  readonly args: ReadonlyArray<string>;
  readonly flags: ReadonlyMap<string, string>;
  readonly userId: string;
  readonly sessionId: string;
}

interface CommandInput {
  readonly raw: string;
  readonly tokens: ReadonlyArray<string>;
}

interface CommandResult {
  readonly success: boolean;
  readonly output?: string;
  readonly error?: string;
  readonly exitCode: number;
}

type ValidationResult = 
  | { readonly kind: 'valid' }
  | { readonly kind: 'invalid'; readonly errors: ReadonlyArray<ValidationError> };

interface CommandValidator {
  validate(input: CommandInput): ValidationResult;
}

interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export class CommandExecutor {
  private readonly commandName: string;
  private readonly validator: CommandValidator;
  private readonly logger: Logger;

  constructor(commandName: string, validator: CommandValidator, logger: Logger) {
    if (!validator || typeof validator.validate !== 'function') {
      throw new TypeError('validator must implement CommandValidator');
    }
    if (!logger || 
        typeof logger.info !== 'function' ||
        typeof logger.warn !== 'function' ||
        typeof logger.error !== 'function' ||
        typeof logger.debug !== 'function') {
      throw new TypeError('logger must implement Logger');
    }

    this.commandName = commandName.trim();
    this.validator = validator;
    this.logger = logger;
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    if (!context || typeof context !== 'object') {
      throw new TypeError('context must be an object');
    }
    if (!Array.isArray(context.args)) {
      throw new TypeError('context.args must be an array');
    }
    if (!(context.flags instanceof Map)) {
      throw new TypeError('context.flags must be a Map');
    }
    if (typeof context.userId !== 'string') {
      throw new TypeError('context.userId must be a string');
    }
    if (typeof context.sessionId !== 'string') {
      throw new TypeError('context.sessionId must be a string');
    }

    this.logger.debug(`Executing command: ${this.commandName}`);
    
    if (!this.canExecute(context)) {
      return {
        success: false,
        error: 'Permission denied',
        exitCode: 1
      };
    }

    const input: CommandInput = {
      raw: context.args.join(' '),
      tokens: context.args
    };

    const validation = this.validate(input);
    if (validation.kind === 'invalid') {
      return {
        success: false,
        error: validation.errors.map(e => e.message).join(', '),
        exitCode: 2
      };
    }

    try {
      this.logger.info(`Command ${this.commandName} executed successfully`);
      return {
        success: true,
        output: `Command ${this.commandName} completed`,
        exitCode: 0
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Command ${this.commandName} failed: ${message}`);
      return {
        success: false,
        error: message,
        exitCode: 3
      };
    }
  }

  validate(input: CommandInput): ValidationResult {
    if (!input || typeof input !== 'object') {
      throw new TypeError('input must be an object');
    }
    if (typeof input.raw !== 'string') {
      throw new TypeError('input.raw must be a string');
    }
    if (!Array.isArray(input.tokens)) {
      throw new TypeError('input.tokens must be an array');
    }

    return this.validator.validate(input);
  }

  async rollback(context: CommandContext): Promise<void> {
    if (!context || typeof context !== 'object') {
      throw new TypeError('context must be an object');
    }

    this.logger.info(`Rolling back command: ${this.commandName}`);
  }

  canExecute(context: CommandContext): boolean {
    if (!context || typeof context !== 'object') {
      throw new TypeError('context must be an object');
    }

    return true;
  }

  getHelp(): string {
    return `Usage: ${this.commandName} [options] [arguments]`;
  }
}
