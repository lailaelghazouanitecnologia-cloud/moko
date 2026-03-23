import { BaseCommand } from './base-command';
import { GitService } from '../services/git-service';
import { Worktree } from '../types/worktree';
import { SwitchOptions } from '../types/switch-options';
import { Logger } from '../utils/logger';
import * as path from 'path';
import * as process from 'process';

export class SwitchCommand extends BaseCommand {
  private gitService: GitService;
  private options: SwitchOptions;

  constructor(gitService: GitService, options: SwitchOptions = {}) {
    super();
    this.gitService = gitService;
    this.options = options;
  }

  async execute(args: string[]): Promise<void> {
    try {
      if (!this.validateArgs(args)) {
        throw new Error('Invalid arguments provided');
      }

      const parsedOptions = this.parseOptions(args);
      const worktreePath = args[0];
      
      const worktree = await this.findWorktree(worktreePath);
      if (!worktree) {
        throw new Error(`Worktree not found: ${worktreePath}`);
      }

      if (!this.validateWorktree(worktree)) {
        throw new Error(`Invalid worktree: ${worktreePath}`);
      }

      await this.switchToWorktree(worktree.path);
      await this.updateGitDir(worktree.path);
      
      Logger.info(`Switched to worktree: ${worktree.path}`);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  validateArgs(args: string[]): boolean {
    return args.length > 0 && typeof args[0] === 'string' && args[0].trim().length > 0;
  }

  parseOptions(args: string[]): SwitchOptions {
    const options: SwitchOptions = { ...this.options };
    
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--verbose':
          options.verbose = true;
          break;
        case '--force':
          options.force = true;
          break;
      }
    }
    
    return options;
  }

  async findWorktree(path: string): Promise<Worktree | null> {
    try {
      const worktrees = await this.gitService.getWorktrees();
      const normalizedPath = path.resolve(path);
      
      return worktrees.find(w => path.resolve(w.path) === normalizedPath) || null;
    } catch (error) {
      Logger.error(`Error finding worktree: ${error}`);
      return null;
    }
  }

  validateWorktree(worktree: Worktree): boolean {
    return worktree && 
           typeof worktree.path === 'string' && 
           worktree.path.trim().length > 0 &&
           worktree.isValid !== false;
  }

  async switchToWorktree(path: string): Promise<void> {
    try {
      const normalizedPath = path.resolve(path);
      process.chdir(normalizedPath);
      
      if (this.options.verbose) {
        Logger.info(`Changed directory to: ${normalizedPath}`);
      }
    } catch (error) {
      throw new Error(`Failed to switch to worktree directory: ${error}`);
    }
  }

  async updateGitDir(path: string): Promise<void> {
    try {
      const gitDir = path.join(path, '.git');
      process.env.GIT_DIR = gitDir;
      
      if (this.options.verbose) {
        Logger.info(`Updated GIT_DIR to: ${gitDir}`);
      }
    } catch (error) {
      throw new Error(`Failed to update git directory context: ${error}`);
    }
  }

  getHelp(): string {
    return `Usage: switch <worktree-path> [options]

Options:
  --verbose    Enable verbose logging
  --force      Force switch even if worktree appears invalid

Switches to an existing git worktree at the specified path.`;
  }

  getDescription(): string {
    return 'Switch to an existing git worktree';
  }

  handleError(error: Error): void {
    Logger.error(`Switch command failed: ${error.message}`);
    
    if (this.options.verbose) {
      Logger.error(error.stack || 'No stack trace available');
    }
  }
}
