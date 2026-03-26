import { Config, Result, ValidationError } from '../core';
import { CommandExecutor, CommandParser } from '../commands';
import { Formatter } from './formatter';

export type ParsedArgs = Map<string, unknown>;

export class CLI {
  private readonly argv: string[];
  private readonly formatter: Formatter;

  constructor(argv: string[], formatter: Formatter) {
    if (!Array.isArray(argv)) {
      throw new TypeError('argv must be an array of strings');
    }
    if (!formatter || typeof formatter !== 'object') {
      throw new TypeError('formatter must be a valid Formatter instance');
    }

    this.argv = argv;
    this.formatter = formatter;
  }

  /**
   * Parse raw command-line arguments into a key-value map.
   * Supports both long (`--key`) and short (`-k`) flags.
   * @param argv - Array of raw CLI arguments
   * @returns Map of parsed flags and positional arguments
   */
  parseArgs(argv: string[]): ParsedArgs {
    if (!Array.isArray(argv)) {
      throw new TypeError('argv must be an array of strings');
    }

    const parsed = new Map<string, unknown>();
    let i = 0;

    while (i < argv.length) {
      const arg = argv[i];

      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const next = argv[i + 1];

        if (next && !next.startsWith('-')) {
          parsed.set(key, next);
          i += 2;
        } else {
          parsed.set(key, true);
          i += 1;
        }
      } else if (arg.startsWith('-')) {
        const key = arg.slice(1);
        const next = argv[i + 1];

        if (next && !next.startsWith('-')) {
          parsed.set(key, next);
          i += 2;
        } else {
          parsed.set(key, true);
          i += 1;
        }
      } else {
        parsed.set(`arg${i}`, arg);
        i += 1;
      }
    }

    return parsed;
  }

  validateArgs(parsed: ParsedArgs): boolean {

    const requiredFlags = ['command'];

    for (const flag of requiredFlags) {
      if (!parsed.has(flag)) {
        return false;
      }
    }

    return true;
  }

  showHelp(): void {
    const helpText = `
${this.formatter.bold('USAGE')}
  $ cli [OPTIONS] <command>

${this.formatter.bold('OPTIONS')}
  ${this.formatter.dim('--help, -h')}     Show this help message
  ${this.formatter.dim('--version, -v')}  Show version information
  ${this.formatter.dim('--debug, -d')}   Enable debug mode

${this.formatter.bold('COMMANDS')}
  ${this.formatter.green('run')}         Execute a command
  ${this.formatter.green('list')}        List available commands
  ${this.formatter.green('help')}        Show help for a specific command

${this.formatter.bold('EXAMPLES')}
  $ cli run build --target=production
  $ cli list
  $ cli help deploy
`;

    console.log(helpText);
  }

  showVersion(): void {
    const version = '1.0.0';
    console.log(this.formatter.bold(`CLI v${version}`));
  }

  /**
   * Main entry point for the CLI.
   * Parses arguments, validates, and executes the requested command.
   * @param argv - Raw CLI arguments
   * @returns Exit code (0 for success, non-zero for failure)
   */
  async run(argv: string[]): Promise<number> {
    if (!Array.isArray(argv)) {
      throw new TypeError('argv must be an array of strings');
    }

    const parsed = this.parseArgs(argv);

    if (parsed.has('help') || parsed.has('h')) {
      this.showHelp();
      return 0;
    }

    if (parsed.has('version') || parsed.has('v')) {
      this.showVersion();
      return 0;
    }

    if (!this.validateArgs(parsed)) {
      console.error(this.formatter.red('Error: Missing required arguments'));
      this.showHelp();
      return 1;
    }

    const command = parsed.get('command');

    console.log(this.formatter.green(`Executing command: ${command}`));
    return 0;
  }

  exit(code: number): void {
    if (!Number.isInteger(code)) {
      throw new RangeError('code must be an integer');
    }

    (globalThis as any).process.exit(code);
  }
}
