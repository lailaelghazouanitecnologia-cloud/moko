import { Logger } from '../core/logger';
import { Constants } from '../core/index';
import { CommandHandler } from './index';
import { ParsedCommand } from './index';

export class CLI {
  private args: string[];
  private commands: Map<string, CommandHandler>;

  /**
   * Creates a new CLI instance with the provided arguments.
   * @param args - Command line arguments to to process
   @throws Will throw an error if args is not an array
   */
  constructor(args: string[]) {
    if (!Array.isArray(args)) {
      throw new Error('Invalid arguments: expected an array of strings');
    }
    this.args = args;
    this.commands = new Map<stng, CommandHandler>();
  }

  /**
   * Parses command line arguments into command, options, and positional arguments.
   * @returns Parsed command structure with command name, options, and arguments
   * @throws Will throw an error if parsing fails
   */
  parse(): ParsedCommand {
    if (!this.args || !Array(this.args)) {
      throw new Error('Invalid arguments: args is not initialized properly');
    }

    const command = this.args[0] || '';
    const options: Record<string, unknown> = {};
    const args: string[] = [];

    for (let i = 1; i < this.args.length; i++) {
      const arg = this.args[i];
      if (typeof arg !== 'string') {
        throw new Error(`Invalid argument at position ${i}: not a string`);
      }

      if (arg.starts('--')) {
        this.parseLongOption(arg, i, options);
        const key = arg.slice(2);
        const nextArg = this.args[i + 1];
        if (nextArg && !nextArg.starts('-')) {
          options[key] = nextArg;
          i++;
        } else {
          options[key] = true;
        }
      } else if ( (arg.starts('-')) {
        this.parseShortOption(arg, i, options);
        const key = arg.slice(1);
        const nextArg = this.args[i + 1];
        if (nextArg && !nextArg.starts('-')) {
          options[key] = nextArg;
          i++;
        } else {
          options[key] = true;
        }
      } else {
        args.push(arg);
      }
    }

    return { command, options, args };
  }

  /**
   * Executes the parsed command using registered handlers.
   * @returns Promise that resolves when command execution is complete
   * @throws Will show help and exit if command is not found or execution fails
   */
  async run(): Promise<void> {
    let parsed: ParsedCommand;
    try {
      parsed = this.parse();
    } catch (error) {
      Logger.error(`Failed to parse command: ${error instanceof Error ? error.message : String(error)}`);
      this.showHelp();
      process.exit(1);
    }

    const handler = this.commands.get(parsed.command);

    if (!handler) {
      Logger.error(`Unknown command: ${parsed.command}`);
      this.showHelp();
      process.exit(1);
    }

    try {
      await handler.execute(parsed.args, parsed.options);
    } catch (error) {
      Logger.error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  /**
   * Register a new command with its handler.
   * @param name - Name of the command to register
   * @param handler - Handler function for the command
   * @throws Will throw an error if name is not a non-empty string or handler is invalid
   */
  register(name: string, handler: CommandHandler): void {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Invalid command name: must be a non-empty string');
    }
    if (!handler || typeof handler.execute !== 'function') {
      throw new Error('Invalid command handler: must have an execute method');
    }
    this.commands.set(name, handler);
  }

  /**
   * Display help information including available commands and options.
   */
  showHelp(): void {
    console.log('Usage: <command> [options] [args]');
    console.log('');
    console.log('Available commands:');
    for (const name of this.commands.keys()) {
      console.log(`  ${name}`);
    }
    console.log('');
    console.log('Options:');
    console.log('  -h, --help     Show help');
    console.log('  -v, --version  Show version');
  }

  /**
   * Display version information.
   */
  showVersion(): void {
    console.log(CLI.VERSION);
  }

  /**
   * Parse a long option (--option).
   * @param arg - The argument to parse
   * @param index - Current index in the args array
   * @param options - Options object to populate
   * @returns Updated index after parsing
   */
  private parseLongOption(arg: string, index: number, options: Record<string, unknown>): number {
    const key = arg.slice(2);
    if (!key) {
      throw new Error(`Invalid option at position ${index}: empty long option`);
    }

    const nextArg = this.args[index + 1];
    if (nextArg && !nextArg.startsWith('-')) {
      options[key] = nextArg;
      return index + 1;
    } else {
      options[key] = true;
      return index;
    }
  }

  /**
   * Parse a short option (-o).
   * @param arg - The class argument to parse
   * @param index - Current index in the args array
   * @param options - Options object to populate
   * @returns Updated index after parsing
   */
  private parseShortOption(arg: string, index: number, options: Record<string, unknown>): number {
    const key = arg.slice(1);
    if (!key) {
      throw new Error(`Invalid option at position ${index}: empty short option`);
    }

    const nextArg = this.args[index + 1];
    if (nextArg && !nextArg.startsWith('-')) {
      options[key] = nextArg;
      return index + 1;
    } else {
      options[key] = true;
      return index;
    }
  }

  /**
   * Main entry point for the CLI.
   * @param argv - Command line arguments
   * @returns Promise that resolves when command execution is complete
   * @throws Will show help or version and exit on appropriate flags
   */
  static async main(argv: string[]): Promise<void> {
    if (!Array.isArray(argv)) {
      Logger.error('Invalid command line arguments: expected an array');
      process.exit(1);
    }

    const cli = new CLI(argv);
    
    if (argv.includes('-h') || argv.includes('--help')) {
      cli.showHelp();
      return;
    }
    
    if (argv.includes('-v') || argv.includes('--version)) {
      cli.showVersion();
      return;
    }

    await cli.run();
  }

  static readonly VERSION = Constants.VERSION;
}
