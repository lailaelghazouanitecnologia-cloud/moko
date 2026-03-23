import { BaseCommand } from './base-command';
import { GitService } from '../services/git-service';
import { Worktree } from '../types/worktree';
import { ListOptions } from '../types/list-options';

export class ListCommand extends BaseCommand {
  private gitService: GitService;
  private options: ListOptions;

  constructor(gitService: GitService) {
    super();
    this.gitService = gitService;
    this.options = {
      verbose: false,
      filter: null,
      sortBy: 'path',
      sortOrder: 'asc'
    };
  }

  async execute(args: string[]): Promise<void> {
    try {
      this.options = this.parseOptions(args);
      
      if (!this.validateArgs(args)) {
        throw new Error('Invalid arguments provided');
      }

      const worktrees = await this.getWorktrees();
      const filtered = this.filterWorktrees(worktrees);
      const sorted = this.sortWorktrees(filtered);
      
      this.displayWorktrees(sorted);
    } catch (error) {
      console.error(`Error listing worktrees: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  validateArgs(args: string[]): boolean {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--verbose' || arg === '-v') {
        continue;
      }
      
      if (arg === '--filter' || arg === '-f') {
        if (i + 1 >= args.length) return false;
        i++;
        continue;
      }
      
      if (arg === '--sort' || arg === '-s') {
        if (i + 1 >= args.length) return false;
        const sortValue = args[i + 1];
        if (!['path', 'branch', 'date'].includes(sortValue)) return false;
        i++;
        continue;
      }
      
      if (arg === '--order' || arg === '-o') {
        if (i + 1 >= args.length) return false;
        const orderValue = args[i + 1];
        if (!['asc', 'desc'].includes(orderValue)) return false;
        i++;
        continue;
      }
      
      return false;
    }
    
    return true;
  }

  parseOptions(args: string[]): ListOptions {
    const options: ListOptions = {
      verbose: false,
      filter: null,
      sortBy: 'path',
      sortOrder: 'asc'
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      } else if ((arg === '--filter' || arg === '-f') && i + 1 < args.length) {
        options.filter = args[i + 1];
        i++;
      } else if ((arg === '--sort' || arg === '-s') && i + 1 < args.length) {
        const sortValue = args[i + 1];
        if (['path', 'branch', 'date'].includes(sortValue)) {
          options.sortBy = sortValue as 'path' | 'branch' | 'date';
        }
        i++;
      } else if ((arg === '--order' || arg === '-o') && i + 1 < args.length) {
        const orderValue = args[i + 1];
        if (['asc', 'desc'].includes(orderValue)) {
          options.sortOrder = orderValue as 'asc' | 'desc';
        }
        i++;
      }
    }

    return options;
  }

  async getWorktrees(): Promise<Worktree[]> {
    try {
      return await this.gitService.getWorktrees();
    } catch (error) {
      throw new Error(`Failed to fetch worktrees: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  formatOutput(worktrees: Worktree[]): string {
    if (worktrees.length === 0) {
      return 'No worktrees found.';
    }

    const lines: string[] = [];
    
    if (this.options.verbose) {
      lines.push('Worktrees:');
      lines.push('');
      
      worktrees.forEach((worktree, index) => {
        lines.push(`${index + 1}. ${worktree.path}`);
        lines.push(`   Branch: ${worktree.branch}`);
        lines.push(`   SHA: ${worktree.sha}`);
        lines.push(`   Detached: ${worktree.detached ? 'Yes' : 'No'}`);
        lines.push(`   Bare: ${worktree.bare ? 'Yes' : 'No'}`);
        lines.push(`   Locked: ${worktree.locked || 'No'}`);
        lines.push('');
      });
    } else {
      lines.push('Worktrees:');
      worktrees.forEach((worktree, index) => {
        const branchInfo = worktree.detached ? `(detached HEAD: ${worktree.sha.substring(0, 7)})` : `[${worktree.branch}]`;
        lines.push(`${index + 1}. ${worktree.path} ${branchInfo}`);
      });
    }

    return lines.join('\n');
  }

  filterWorktrees(worktrees: Worktree[]): Worktree[] {
    if (!this.options.filter) {
      return worktrees;
    }

    const filterLower = this.options.filter.toLowerCase();
    
    return worktrees.filter(worktree => {
      return worktree.path.toLowerCase().includes(filterLower) ||
             worktree.branch.toLowerCase().includes(filterLower) ||
             worktree.sha.toLowerCase().includes(filterLower);
    });
  }

  sortWorktrees(worktrees: Worktree[]): Worktree[] {
    const sorted = [...worktrees];
    const { sortBy, sortOrder } = this.options;
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'path':
          comparison = a.path.localeCompare(b.path);
          break;
        case 'branch':
          comparison = a.branch.localeCompare(b.branch);
          break;
        case 'date':
          const dateA = new Date(a.sha ? 0 : Date.now()).getTime();
          const dateB = new Date(b.sha ? 0 : Date.now()).getTime();
          comparison = dateA - dateB;
          break;
        default:
          comparison = a.path.localeCompare(b.path);
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return sorted;
  }

  displayWorktrees(worktrees: Worktree[]): void {
    const output = this.formatOutput(worktrees);
    console.log(output);
  }

  getHelp(): string {
    return `Usage: list [options]

Options:
  -v, --verbose          Show detailed information
  -f, --filter <term>    Filter worktrees by term
  -s, --sort <field>     Sort by: path, branch, date (default: path)
  -o, --order <order>    Sort order: asc, desc (default: asc)

Examples:
  list                   List all worktrees
  list --verbose         Show detailed information
  list --filter feature  Show worktrees containing 'feature'
  list --sort branch     Sort by branch name`;
  }

  getDescription(): string {
    return 'List all git worktrees';
  }
}
