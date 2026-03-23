import { Command } from 'commander';
import { CliRunner } from './cli-runner';
import { CliConfig } from './cli-config';

export interface ParsedArgs {
  command: string;
  options: Record<string, any>;
  args: string[];
}

export class CliParser {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.program.name('git-worktree-manager');
    this.program.description('Manage git worktrees with ease');
    this.program.version('1.0.0');
    this.setupCommands();
  }

  setupCommands(): void {
    this.parseCreateCommand();
    this.parseListCommand();
    this.parseSwitchCommand();
    this.parseDeleteCommand();
    this.addGlobalOptions();
  }

  parseCreateCommand(): void {
    this.program
      .command('create <path>')
      .description('Create a new worktree at the specified path')
      .option('-b, --branch <branch>', 'Create and checkout a new branch')
      .option('-B, --force-branch <branch>', 'Create or reset a branch')
      .option('--checkout', 'Checkout the branch after creating', true)
      .option('--no-checkout', 'Do not checkout the branch after creating')
      .option('--lock', 'Keep the new worktree locked')
      .action((path: string, options: any) => {
        const runner = new CliRunner();
        runner.createWorktree(path, options);
      });
  }

  parseListCommand(): void {
    this.program
      .command('list')
      .alias('ls')
      .description('List all worktrees')
      .option('-v, --verbose', 'Show more details')
      .option('--porcelain', 'Machine-readable output')
      .option('--expire <time>', 'Prune worktrees older than specified time')
      .action((options: any) => {
        const runner = new CliRunner();
        runner.listWorktrees(options);
      });
  }

  parseSwitchCommand(): void {
    this.program
      .command('switch <path>')
      .description('Switch to a different worktree')
      .option('-b, --branch <branch>', 'Create and checkout a new branch')
      .option('-B, --force-branch <branch>', 'Create or reset a branch')
      .option('--detach', 'Detach HEAD in the new worktree')
      .action((path: string, options: any) => {
        const runner = new CliRunner();
        runner.switchWorktree(path, options);
      });
  }

  parseDeleteCommand(): void {
    this.program
      .command('delete <path>')
      .alias('rm')
      .description('Delete a worktree')
      .option('-f, --force', 'Force deletion even if the worktree is dirty')
      .option('--reason <reason>', 'Reason for deletion')
      .action((path: string, options: any) => {
        const runner = new CliRunner();
        runner.deleteWorktree(path, options);
      });
  }

  addGlobalOptions(): void {
    this.program
      .option('-v, --verbose', 'Enable verbose output')
      .option('-q, --quiet', 'Suppress output')
      .option('--no-color', 'Disable colored output')
      .option('--config <path>', 'Path to configuration file')
      .on('option:verbose', () => {
        process.env.VERBOSE = 'true';
      })
      .on('option:quiet', () => {
        process.env.QUIET = 'true';
      })
      .on('option:no-color', () => {
        process.env.NO_COLOR = 'true';
      });
  }

  parseArgs(argv: string[]): ParsedArgs {
    try {
      this.program.parse(argv);
      const command = this.program.args[0] || 'help';
      const options = this.program.opts();
      const args = this.program.args.slice(1);
      
      return {
        command,
        options,
        args
      };
    } catch (error) {
      this.handleUnknownCommand(argv[2] || 'unknown');
      process.exit(1);
    }
  }

  validateArgs(args: ParsedArgs): boolean {
    const validCommands = ['create', 'list', 'ls', 'switch', 'delete', 'rm', 'help'];
    
    if (!validCommands.includes(args.command)) {
      this.handleUnknownCommand(args.command);
      return false;
    }
    
    if (args.command === 'create' && args.args.length === 0) {
      console.error('Error: Path is required for create command');
      this.showHelp();
      return false;
    }
    
    if (args.command === 'switch' && args.args.length === 0) {
      console.error('Error: Path is required for switch command');
      this.showHelp();
      return false;
    }
    
    if (args.command === 'delete' && args.args.length === 0) {
      console.error('Error: Path is required for delete command');
      this.showHelp();
      return false;
    }
    
    return true;
  }

  showHelp(): void {
    this.program.help();
  }

  showVersion(): void {
    this.program.version();
  }

  handleUnknownCommand(command: string): void {
    console.error(`Unknown command: ${command}`);
    console.error('Run with --help for available commands');
    process.exit(1);
  }
}
