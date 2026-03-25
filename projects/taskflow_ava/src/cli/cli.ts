type ParsedArgs = {
  command: string | null;
  flags: Map<string, string | boolean>;
  positional: string[];
  raw: string[];
};

type ValidationError = {
  type: 'missing_flag' | 'invalid_flag' | 'unknown_command';
  flag?: string;
  command?: string;
  message: string;
};

interface Formatter {
  warning(message: string): void;
  color(message: string, color: string): void;
  error(message: string): void;
}

export class CLI {
  private readonly args: string[];
  private readonly formatter: Formatter;

  constructor(args: string[], formatter: Formatter) {
    this.args = args;
    this.formatter = formatter;
  }

  parse(argv: string[]): ParsedArgs {
    const result: ParsedArgs = {
      command: null,
      flags: new Map(),
      positional: [],
      raw: [...argv]
    };

    const args = [...argv];
    
    // Skip node and script name if present
    if (args.length > 0 && args[0].includes('node')) {
      args.shift();
    }
    if (args.length > 0 && (args[0].endsWith('.js') || args[0].endsWith('.ts'))) {
      args.shift();
    }

    for (let i = 0; i < args.length; ) {
      const arg = args[i];
      
      if (arg.startsWith('--')) {
        // Long flag
        const flag = arg.substring(2);
        const next = args[i + 1];
        
        if (next && !next.startsWith('-')) {
          result.flags.set(flag, next);
          i += 2;
        } else {
          result.flags.set(flag, true);
          i++;
        }
      } else if (arg.startsWith('-') && !arg.startsWith('--')) {
        // Short flag
        const flag = arg.substring(1);
        
        if (flag.length === 1) {
          // Single short flag
          const next = args[i + 1];
          if (next && !next.startsWith('-')) {
            result.flags.set(flag, next);
            i += 2;
          } else {
            result.flags.set(flag, true);
            i++;
          }
        } else {
          // Multiple short flags
          for (const char of flag) {
            result.flags.set(char, true);
          }
          i++;
        }
      } else {
        // Positional argument or command
        if (!result.command) {
          result.command = arg;
        } else {
          result.positional.push(arg);
        }
        i++;
      }
    }

    return result;
  }

  validate(args: ParsedArgs): boolean {
    if (!args.command) {
      return false;
    }

    // Check required flags for known commands
    if (args.command === 'build') {
      if (!args.flags.has('config')) {
        return false;
      }
    }

    if (args.command === 'test') {
      if (!args.flags.has('pattern')) {
        return false;
      }
    }

    return true;
  }

  async run(): Promise<void> {
    const parsed = this.parse(this.args);
    
    if (!this.validate(parsed)) {
      this.error('Invalid command or missing required flags');
      return;
    }

    if (parsed.flags.has('help') || parsed.flags.has('h')) {
      this.showHelp();
      return;
      }

    if (parsed.flags.has('version') || parsed.flags.has('v')) {
      this.showVersion();
      return;
    }

    try {
      switch (parsed.command) {
        case 'build':
          await this.executeBuild(parsed);
          break;
        case 'test':
          await this.executeTest(parsed);
          break;
        default:
          await this.executeDefault(parsed);
          break;
      }
    } catch (error) {
      this.error(`Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeBuild(args: ParsedArgs): Promise<void> {
    const config = args.flags.get('config') as string;
    this.formatter.warning(`Building with config: ${config}`);
    // Implementation would go here
  }

  private async executeTest(args: ParsedArgs): Promise<void> {
    const pattern = args.flags.get('pattern') as string;
    this.formatter.warning(`Running tests with pattern: ${pattern}`);
    // Implementation would go here
  }

  private async executeDefault(args: ParsedArgs): Promise<void> {
    this.formatter.warning(`Executing default command: ${args.command}`);
    // implementation would go here
  }

  showHelp(): void {
    const help = `
Usage: <command> [options] [args]

Commands:
  build  Build the project
  test   Run tests

Options:
  -h, --help     Show help
  -v, --version  Show version
  --config       Configuration file (required for build)
  --pattern      Test pattern (required for test)
`;
    this.formatter.color(help, 'info');
  }

  showVersion(): void {
    const version = '1.0.0';
    this.formatter.color(`version ${version}`, 'info');
  }

  error(msg: string): void {
    this.formatter.error(msg);
    process.exit(1);
  }
}
