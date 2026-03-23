import { BaseCommand } from './base-command';
import { GitService } from '../services/git-service';
import { DeleteOptions } from '../types/delete-options';
import { Logger } from '../utils/logger';

export class DeleteCommand extends BaseCommand {
  private gitService: GitService;
  private options: DeleteOptions;

  constructor(gitService: GitService, options: DeleteOptions = {}) {
    super();
    this.gitService = gitService;
    this.options = options;
  }

  async execute(args: string[]): Promise<void> {
    try {
      if (!this.validateArgs(args)) {
        throw new Error('Invalid arguments provided');
      }

      this.options = this.parseOptions(args);
      const path = args[0];

      if (!this.validateNotCurrent(path)) {
        throw new Error('Cannot delete current working directory');
      }

      const shouldDelete = await this.confirmDeletion(path);
      if (!shouldDelete) {
        Logger.info('Deletion cancelled by user');
        return;
      }

      if (this.options.force) {
        await this.forceRemove(path);
      } else {
        await this.removeWorktree(path);
      }

      await this.cleanDirectory(path);
      Logger.info(`Successfully deleted worktree: ${path}`);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  validateArgs(args: string[]): boolean {
    if (!args || args.length === 0) {
      return false;
    }
    return args[0].trim().length > 0;
  }

  parseOptions(args: string[]): DeleteOptions {
    const options: DeleteOptions = {
      force: false,
      verbose: false
    };

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--force' || arg === '-f') {
        options.force = true;
      } else if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      }
    }

    return options;
  }

  async confirmDeletion(path: string): Promise<boolean> {
    if (this.options.force) {
      return true;
    }

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`Are you sure you want to delete worktree at ${path}? (y/N): `, (answer: string) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  async removeWorktree(path: string): Promise<void> {
    try {
      await this.gitService.removeWorktree(path);
    } catch (error) {
      if (this.options.verbose) {
        Logger.error(`Failed to remove worktree: ${error}`);
      }
      throw error;
    }
  }

  async forceRemove(path: string): Promise<void> {
    try {
      await this.gitService.forceRemoveWorktree(path);
    } catch (error) {
      if (this.options.verbose) {
        Logger.error(`Failed to force remove worktree: ${error}`);
      }
      throw error;
    }
  }

  async cleanDirectory(path: string): Promise<void> {
    const fs = require('fs').promises;
    const pathModule = require('path');

    try {
      const exists = await fs.access(path).then(() => true).catch(() => false);
      if (exists) {
        const files = await fs.readdir(path);
        if (files.length === 0) {
          await fs.rmdir(path);
        }
      }
    } catch (error) {
      if (this.options.verbose) {
        Logger.warn(`Could not clean directory ${path}: ${error}`);
      }
    }
  }

  validateNotCurrent(path: string): boolean {
    const currentDir = process.cwd();
    const resolvedPath = require('path').resolve(path);
    return currentDir !== resolvedPath;
  }

  getHelp(): string {
    return `
Usage: git-worktree-cli delete <path> [options]

Options:
  -f, --force     Force deletion without confirmation
  -v, --verbose   Enable verbose logging

Examples:
  git-worktree-cli delete /path/to/worktree
  git-worktree-cli delete /path/to/worktree --force
  git-worktree-cli delete /path/to/worktree --verbose
`;
  }

  getDescription(): string {
    return 'Delete a git worktree at the specified path';
  }

  handleError(error: Error): void {
    Logger.error(`Delete command failed: ${error.message}`);
    if (this.options.verbose && error.stack) {
      Logger.error(error.stack);
    }
  }
}
