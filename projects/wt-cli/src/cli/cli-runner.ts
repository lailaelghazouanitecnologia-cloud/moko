import { CliParser } from './cli-parser';
import { CliConfig } from './cli-config';
import { WorktreeService } from '../worktree/worktree-service';
import { CreateArgs, ListArgs, SwitchArgs, DeleteArgs } from './types';
import { Worktree } from '../worktree/worktree';
import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { format } from 'util';

export class CliRunner {
  private parser: CliParser;
  private config: CliConfig;
  private worktreeService: WorktreeService;
  private spinner?: ora.Ora;

  constructor(parser: CliParser, config: CliConfig) {
    this.parser = parser;
    this.config = config;
    this.worktreeService = new WorktreeService();
  }

  async run(argv: string[]): Promise<number> {
    try {
      const parsed = this.parser.parse(argv);
      
      if (this.config.verbose) {
        this.logVerbose(`Running command: ${parsed.command}`);
      }

      switch (parsed.command) {
        case 'create':
          await this.executeCreate(parsed.args as CreateArgs);
          break;
        case 'list':
          await this.executeList(parsed.args as ListArgs);
          break;
        case 'switch':
          await this.executeSwitch(parsed.args as SwitchArgs);
          break;
        case 'delete':
          await this.executeDelete(parsed.args as DeleteArgs);
          break;
        default:
          throw new Error(`Unknown command: ${parsed.command}`);
      }

      return 0;
    } catch (error) {
      return this.handleError(error as Error);
    } finally {
      await this.cleanup();
    }
  }

  async executeCreate(args: CreateArgs): Promise<void> {
    this.showProgress('Creating worktree...');
    
    try {
      const worktree = await this.worktreeService.createWorktree({
        path: args.path,
        branch: args.branch,
        baseBranch: args.baseBranch,
        checkout: args.checkout !== false
      });

      this.spinner?.succeed(chalk.green(`Created worktree at ${worktree.path}`));
      
      if (args.format) {
        console.log(this.formatOutput(worktree, args.format));
      }
    } catch (error) {
      this.spinner?.fail(chalk.red('Failed to create worktree'));
      throw error;
    }
  }

  async executeList(args: ListArgs): Promise<void> {
    this.showProgress('Fetching worktrees...');
    
    try {
      const worktrees = await this.worktreeService.listWorktrees();
      this.spinner?.succeed();
      
      if (worktrees.length === 0) {
        console.log(chalk.yellow('No worktrees found'));
        return;
      }

      if (args.format) {
        console.log(this.formatOutput(worktrees, args.format));
      } else {
        worktrees.forEach(wt => {
          const current = wt.isCurrent ? chalk.green('*') : ' ';
          const clean = wt.isClean ? chalk.green('clean') : chalk.yellow('dirty');
          console.log(`${current} ${wt.path} [${wt.branch}] (${clean})`);
        });
      }
    } catch (error) {
      this.spinner?.fail(chalk.red('Failed to list worktrees'));
      throw error;
    }
  }

  async executeSwitch(args: SwitchArgs): Promise<void> {
    this.showProgress('Switching worktree...');
    
    try {
      const worktrees = await this.worktreeService.listWorktrees();
      let target: Worktree | undefined;

      if (args.path) {
        target = worktrees.find(wt => wt.path === args.path);
      } else if (args.branch) {
        target = worktrees.find(wt => wt.branch === args.branch);
      } else {
        target = await this.selectWorktree(worktrees);
      }

      if (!target) {
        throw new Error('Target worktree not found');
      }

      await this.worktreeService.switchWorktree(target.path);
      this.spinner?.succeed(chalk.green(`Switched to worktree at ${target.path}`));
    } catch (error) {
      this.spinner?.fail(chalk.red('Failed to switch worktree'));
      throw error;
    }
  }

  async executeDelete(args: DeleteArgs): Promise<void> {
    this.showProgress('Preparing to delete worktree...');
    
    try {
      const worktrees = await this.worktreeService.listWorktrees();
      let target: Worktree | undefined;

      if (args.path) {
        target = worktrees.find(wt => wt.path === args.path);
      } else if (args.branch) {
        target = worktrees.find(wt => wt.branch === args.branch);
      } else {
        target = await this.selectWorktree(worktrees);
      }

      if (!target) {
        throw new Error('Target worktree not found');
      }

      if (!args.force) {
        const confirmed = await this.confirmAction(
          `Delete worktree at ${target.path}? This cannot be undone.`
        );
        if (!confirmed) {
          this.logVerbose('Deletion cancelled by user');
          return;
        }
      }

      this.spinner?.text = 'Deleting worktree...';
      await this.worktreeService.deleteWorktree(target.path, args.force);
      this.spinner?.succeed(chalk.green(`Deleted worktree at ${target.path}`));
    } catch (error) {
      this.spinner?.fail(chalk.red('Failed to delete worktree'));
      throw error;
    }
  }

  formatOutput(data: any, format: string): string {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'yaml':
      case 'yml':
        const yaml = require('js-yaml');
        return yaml.dump(data);
      case 'table':
        if (Array.isArray(data)) {
          const headers = Object.keys(data[0] || {});
          const rows = data.map(obj => headers.map(h => obj[h] || ''));
          const table = require('cli-table3');
          const t = new table({ head: headers });
          rows.forEach(row => t.push(row));
          return t.toString();
        }
        return String(data);
      default:
        return format;
    }
  }

  handleError(error: Error): number {
    this.logError(error.message);
    
    if (this.config.verbose && error.stack) {
      console.error(chalk.gray(error.stack));
    }

    if (error.message.includes('not found')) {
      return 3;
    } else if (error.message.includes('permission')) {
      return 4;
    } else if (error.message.includes('invalid')) {
      return 5;
    }
    return 1;
  }

  logVerbose(message: string): void {
    if (this.config.verbose && !this.config.quiet) {
      console.error(chalk.gray(`[verbose] ${message}`));
    }
  }

  logError(message: string): void {
    if (!this.config.quiet) {
      console.error(chalk.red(`Error: ${message}`));
    }
  }

  async confirmAction(message: string): Promise<boolean> {
    if (this.config.quiet) {
      return true;
    }

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: false
      }
    ]);

    return confirmed;
  }

  async selectWorktree(worktrees: Worktree[]): Promise<Worktree> {
    if (worktrees.length === 0) {
      throw new Error('No worktrees available');
    }

    if (worktrees.length === 1) {
      return worktrees[0];
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select worktree:',
        choices: worktrees.map(wt => ({
          name: `${wt.path} [${wt.branch}]`,
          value: wt
        }))
      }
    ]);

    return selected;
  }

  showProgress(message: string): void {
    if (!this.config.quiet) {
      this.spinner = ora(message).start();
    }
  }

  async cleanup(): Promise<void> {
    if (this.spinner?.isSpinning) {
      this.spinner.stop();
    }
    await this.worktreeService.cleanup();
  }
}
