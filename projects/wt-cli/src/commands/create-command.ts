import { BaseCommand } from './base-command';
import { GitService } from '../services/git-service';
import { CreateOptions } from '../types/create-options';

export class CreateCommand extends BaseCommand {
  private gitService: GitService;
  private options: CreateOptions;

  constructor(gitService: GitService, options: CreateOptions) {
    super();
    this.gitService = gitService;
    this.options = options;
  }

  async execute(args: string[]): Promise<void> {
    try {
      if (!this.validateArgs(args)) {
        throw new Error('Invalid arguments provided');
      }

      const options = this.parseOptions(args);
      const path = args[0];
      const branch = args[1] || 'main';

      if (!this.validatePath(path)) {
        throw new Error(`Invalid path: ${path}`);
      }

      if (!this.validateBranch(branch)) {
        throw new Error(`Invalid branch: ${branch}`);
      }

      await this.createWorktree(path, branch);
      await this.checkoutBranch(path, branch);

      if (this.options.verbose) {
        console.log(`Created worktree at ${path} with branch ${branch}`);
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  validateArgs(args: string[]): boolean {
    return args.length >= 1 && args[0].trim().length > 0;
  }

  parseOptions(args: string[]): CreateOptions {
    const options: CreateOptions = {
      verbose: this.options.verbose || false,
      force: this.options.force || false,
      checkout: this.options.checkout !== false
    };

    for (let i = 2; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      } else if (arg === '--force' || arg === '-f') {
        options.force = true;
      } else if (arg === '--no-checkout') {
        options.checkout = false;
      }
    }

    return options;
  }

  async createWorktree(path: string, branch: string): Promise<void> {
    try {
      await this.gitService.addWorktree(path, branch, {
        force: this.options.force,
        checkout: this.options.checkout
      });
    } catch (error) {
      throw new Error(`Failed to create worktree: ${(error as Error).message}`);
    }
  }

  async checkoutBranch(path: string, branch: string): Promise<void> {
    if (!this.options.checkout) {
      return;
    }

    try {
      await this.gitService.checkoutBranch(path, branch);
    } catch (error) {
      throw new Error(`Failed to checkout branch: ${(error as Error).message}`);
    }
  }

  validatePath(path: string): boolean {
    if (!path || path.trim().length === 0) {
      return false;
    }

    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(path)) {
      return false;
    }

    if (path.includes('..') || path.startsWith('/') || path.startsWith('\\')) {
      return false;
    }

    return true;
  }

  validateBranch(branch: string): boolean {
    if (!branch || branch.trim().length === 0) {
      return false;
    }

    const invalidChars = /[~\^:\\\s\*\[\]\{\}\?]/;
    if (invalidChars.test(branch)) {
      return false;
    }

    if (branch.startsWith('.') || branch.endsWith('.') || branch.includes('..')) {
      return false;
    }

    return true;
  }

  getHelp(): string {
    return `
Usage: git-worktree create <path> [branch] [options]

Create a new worktree at the specified path with an optional branch.

Arguments:
  path      The directory where the worktree will be created
  branch    The branch to checkout (default: current branch)

Options:
  --verbose, -v    Enable verbose output
  --force, -f     Force creation even if path exists
  --no-checkout    Skip checking out the branch

Examples:
  git-worktree create ../my-feature
  git-worktree create ../bugfix feature/bug-123
  git-worktree create ../hotfix -v --force
`;
  }

  getDescription(): string {
    return 'Create a new git worktree at the specified path';
  }

  handleError(error: Error): void {
    console.error(`Create command failed: ${error.message}`);
    
    if (this.options.verbose) {
      console.error('Stack trace:', error.stack);
    }

    throw error;
  }
}
