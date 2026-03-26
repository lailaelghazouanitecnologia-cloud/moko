import { CommandExecutor } from './command-executor';

/**
 * Parses raw command strings into executable command objects.
 * Supports custom delimiters and argument validation per command.
 */
export class CommandParser {
  private readonly commandMap: Map<string, CommandExecutor>;
  private delimiter: string;
  private readonly validators: Map<string, (args: string[]) => boolean>;

  constructor() {
    this.commandMap = new Map<string, CommandExecutor>();
    this.delimiter = ' ';
    this.validators = new Map<string, (args: string[]) => boolean>();
  }

  parse(input: string): CommandExecutor {

    if (!this.validateSyntax(input)) {
      throw new TypeError('Invalid command syntax');
    }

    const commandName = this.getCommandName(input);
    const executor = this.commandMap.get(commandName);

    if (!executor) {
      throw new TypeError(`Command not found: ${commandName}`);
    }

    const args = this.extractArgs(input);
    const validator = this.validators.get(commandName);

    if (validator && !validator(args)) {
      throw new TypeError(`Invalid arguments for command: ${commandName}`);
    }

    return executor;
  }

  registerCommand(name: string, executor: CommandExecutor): void {

    if (!name || name.trim().length === 0) {
      throw new TypeError('Command name cannot be empty');
    }


    this.commandMap.set(name, executor);
  }

  validateSyntax(input: string): boolean {

    if (!input || input.trim().length === 0) {
      return false;
    }

    const trimmed = input.trim();
    const tokens = trimmed.split(this.delimiter);

    return tokens.length > 0 && tokens[0].length > 0;
  }

  extractArgs(input: string): string[] {

    const trimmed = input.trim();
    const tokens = trimmed.split(this.delimiter);

    return tokens.slice(1);
  }

  getCommandName(input: string): string {

    const trimmed = input.trim();
    const tokens = trimmed.split(this.delimiter);

    return tokens[0];
  }

  setDelimiter(delimiter: string): void {

    if (!delimiter || delimiter.length === 0) {
      throw new TypeError('Delimiter cannot be empty');
    }

    this.delimiter = delimiter;
  }

  addValidator(command: string, fn: (args: string[]) => boolean): void {

    if (!command || command.trim().length === 0) {
      throw new TypeError('Command name cannot be empty');
    }

    if (!fn || typeof fn !== 'function') {
      throw new TypeError('Validator must be a function');
    }

    this.validators.set(command, fn);
  }
}
