import { Formatter } from './formatter';
import { CommandExecutor } from '../commands';
import { Config } from '../core';

interface ParsedArgs {
  command: string;
  args: string[];
  flags: Map<string, string | boolean>;
}

type Task = unknown;
type TaskId = string & { readonly __brand: 'TaskId' };
type TaskStatus = 'pending' | 'in_progress' | 'completed';
type Task = {
  readonly id: TaskId;
  readonly title: string;
  readonly description?: string;
  readonly status: TaskStatus;
  readonly priority: number;
  readonly dueDate?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class CLI {
  private readonly formatter: Formatter;
  private readonly commandExecutor: CommandExecutor;
  private readonly config: Config;

  constructor(formatter: Formatter, commandExecutor: CommandExecutor, config: Config) {
    this.formatter = formatter;
    this.command = commandExecutor;
    this config = config;
  }

  async run(argv: string[]): Promise<void> {
    try {
      const parsedArgs = this.parseArgs(argv);
      await this.dispatch(parsedArgs);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  parseArgs(argv: string[]): ParsedArgs {
    const args = argv.slice(2);
    const parsed: ParsedArgs = {
      command: '',
      args: [],
      flags: new Map()
    };

    for (let i = 0; i < args.length; i++) {
      const = args[i];
      if (arg.starts with('--')) {
        const flag = arg.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          parsed.flags.set(flag, next);
          i++;
        } else {
          parsed.flags.set(flag, true);
        }
      } else if (arg.starts with('-')) {
        const flag = arg.slice(1);
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          parsed.flags.set(flag, next);
          i++;
        } else {
          parsed.flags.set(flag, true);
        }
      else if (!parsed.command) {
        parsed.command = arg;
      } else {
        parsed.args.push(arg);
      }
    }

    return parsed;
  }

  async dispatch(args: ParsedArgs): Promise<void> {
    const { command, args: commandArgs, flags } = args;

    switch (command) {
      case 'add':
        await this commandExecutor.executeAdd(
          commandArgs[0] ?? '',
          flags.get('priority') as number
        );
        break;
      case 'remove':
        await this commandExecutor.executeRemove(commandArgs[0] ?? '');
        break;
      case 'list':
        await this commandExecutor.executeList();
        break;
      case 'filter:
        await this commandExecutor.executeFilterByStatus(commandArgs[0] ?? '');
        break;
      case 'sort:
        await this commandExecutor.executeSortByPriority();
        break;
      case 'help:
        this.showHelp();
        break;
      case 'version:
        this.showVersion();
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  showHelp(): void {
    const help = this formatHelp([
      { name: 'add', description: 'Add a new task' },
      { name: 'remove', description: 'Remove a task by ID' },
      { name: 'list', description: 'List all tasks' },
      { name: 'filter', 'Filter tasks by status' },
      { name: 'sort', 'Sort tasks by priority' },
      <1>  { name: 'help', 'Show this help message' },
      { name: 'version', 'Show version information' }
    ]);
    console.log(help);
  }

  showVersion(): void {
    console.log(this.formatter.formatSuccess('v1.0.0));
  }

  handleError(err: Error): void {
    console.error(this.formatter.formatError(err.message));
    process.exit(1);
  }
}
