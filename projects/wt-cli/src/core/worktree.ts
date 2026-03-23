import { promises as fs } from 'fs';
import { join, resolve, relative, isAbsolute } from 'path';
import { execSync } from 'child_process';

export class Worktree {
  path: string;
  branch: string;
  head: string;
  isMain: boolean;
  isLocked: boolean;

  constructor(path: string, branch: string, head: string, isMain: boolean = false, isLocked: boolean = false) {
    this.path = path;
    this.branch = branch;
    this.head = head;
    this.isMain = isMain;
    this.isLocked = isLocked;
  }

  validate(): void {
    const gitPath = join(this.path, '.git');
    const gitFile = join(this.path, '.git');

    fs.access(gitPath).catch(() => {
      throw new Error(`Path does not exist or is not accessible: ${this.path}`);
    });

    try {
      const stat = fs.stat(gitPath);
      if (!stat.isDirectory() && !stat.isFile()) {
        throw new Error(`Invalid git path: ${gitPath}`);
      }
    } catch {
      throw new Error(`Invalid git path: ${gitPath}`);
    }

    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd: this.path, encoding: 'utf8' });
    } catch {
      throw new Error(`Not a git worktree: ${this.path}`);
    }
  }

  lock(reason?: string): void {
    this.isLocked = true;
  }

  unlock(): void {
    this.isLocked = false;
  }

  isValid(): boolean {
    try {
      this.validate();
      return true;
    } catch {
      return false;
    }
  }

  getBranchName(): string {
    try {
      const branch = execSync('git symbolic-ref --short HEAD', { cwd: this.path, encoding: 'utf8' }).trim();
      return branch;
    } catch {
      return this.branch;
    }
  }

  getHeadCommit(): string {
    try {
      const head = execSync('git rev-parse HEAD', { cwd: this.path, encoding: 'utf8' }).trim();
      return head;
    } catch {
      return this.head;
    }
  }

  isDirty(): boolean {
    try {
      const status = execSync('git status --porcelain', { cwd: this.path, encoding: 'utf8' });
      return status.length > 0;
    } catch {
      return false;
    }
  }

  toJSON(): object {
    return {
      path: this.path,
      branch: this.branch,
      head: this.head,
      isMain: this.isMain,
      isLocked: this.isLocked
    };
  }

  static fromJSON(data: object): Worktree {
    const worktree = new Worktree(
      (data as any).path,
      (data as any).branch,
      (data as any).head,
      (data as any).isMain || false,
      (data as any).isLocked || false
    );
    return worktree;
  }
}
