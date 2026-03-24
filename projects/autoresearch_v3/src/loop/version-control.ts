import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * Manages code versioning for loop iterations.
 */
export class VersionControl {
  private repoPath: string;
  private currentBranch: string;
  private commitHistory: string[];
  private stashStack: string[];

  /**
   * Creates an instance of VersionControl.
   * @param repoPath - The path to the repository.
   */
  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.currentBranch = 'main';
    this.commitHistory = [];
    this.stashStack = [];
  }

  /**
   * Initialize a new Git repository at the specified path.
   * @param path - Directory path for the new repository.
   * @throws {Error} If initialization fails.
   */
  initRepo(path: string): void {
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid repository path provided');
    }

    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }

    try {
      execSync('git init', { cwd: path, stdio: 'pipe' });
      execSync('git config user.name "ResearchLoop"', { cwd: path, stdio: 'pipe' });
      execSync('git config user.email "research@loop.dev"', { cwd: path, stdio: 'pipe' });

      const gitignorePath = join(path, '.gitignore');
      if (!existsSync(gitignorePath)) {
        writeFileSync(gitignorePath, 'node_modules/\ndist/\n*.log\n.env\n');
      }

      this.repoPath = path;
      this.currentBranch = 'main';
      this.commitHistory = [];
      this.stashStack = [];
    } catch (error) {
      throw new Error(`Failed to initialize repository: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Commit all current changes with the provided message.
   * @param message - Commit message.
   * @returns The hash of the new commit.
   * @throws {Error} If commit fails.
   */
  commitChanges(message: string): string {
    if (!message || typeof message !== 'string') {
      throw new Error('Commit message must be a non-empty string');
    }

    try {
      execSync('git add -A', { cwd: this.repoPath, stdio: 'pipe' });
      const result = execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
        cwd: this.repoPath,
        encoding: 'utf8',
      });

      const hash = execSync('git rev-parse HEAD', {
        cwd: this.repoPath,
        encoding: 'utf8',
      }).trim();

      this.commitHistory.push(hash);
      return hash;
    } catch (error) {
      throw new Error(`Failed to commit changes: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Create a new branch and switch to it.
   * @param name - Name of the new branch.
   * @throws {Error} If branch creation fails.
   */
  createBranch(name: string): void {
    if (!name || !this.isValidBranchName(name)) {
      throw new Error('Invalid branch name provided');
    }

    try {
      execSync(`git checkout -b ${name}`, { cwd: this.repoPath, stdio: 'pipe' });
      this.currentBranch = name;
    } catch (error) {
      throw new Error(`Failed to create branch: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Switch to an existing branch.
   * @param name - Name of the branch to checkout.
   * @throws {Error} If checkout fails.
   */
  switchBranch(name: string): void {
    if (!name || !this.isValidBranchName(name)) {
      throw new Error('Invalid branch name provided');
    }

    try {
      execSync(`git checkout ${name}`, { cwd: this.repoPath, stdio: 'pipe' });
      this.currentBranch = name;
    } catch (error) {
      throw new Error(`Failed to switch branch: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Stash uncommitted changes for later recovery.
   * @returns Unique identifier for the stash.
   * @throws {Error} If stashing fails.
   */
  stashChanges(): string {
    try {
      const stashId = `stash_${Date.now()}`;
      execSync('git stash push -m "ResearchLoop auto-stash"', { cwd: this.repoPath, stdio: 'pipe' });
      this.stashStack.push(stashId);
      return stashId;
    } catch (error) {
      throw new Error(`Failed to stash changes: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Restore a previously stashed state and remove it from the stack.
   * @param id - Identifier of the stash to restore.
   * @throws {Error} If stash is not found or cannot be applied.
   */
  popStash(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid stash id provided');
    }

    try {
      const index = this.stashStack.indexOf(id);
      if (index === -1) {
        throw new Error(`Stash ${id} not found`);
      }

      execSync('git stash pop', { cwd: this.repoPath, stdio: 'pipe' });
      this.stashStack.splice(index, 1);
    } catch (error) {
      throw new Error(`Failed to pop stash: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Revert a specific commit by creating a new commit that undoes its changes.
   * @param hash - Hash of the commit to revert.
   * @throws {Error} If revert fails.
   */
  revertCommit(hash: string): void {
    if (!hash || !this.isValidHash(hash)) {
      throw new Error('Invalid commit hash provided');
    }

    try {
      execSync(`git revert --no-edit ${hash}`, { cwd: this.repoPath, stdio: 'pipe' });

      const newHash = execSync('git rev-parse HEAD', {
        cwd: this.repoPath,
        encoding: 'utf8',
      }).trim();

      this.commitHistory.push(newHash);
    } catch (error) {
      throw new Error(`Failed to revert commit: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Show differences between two commits or between HEAD and current changes.
   * @param hash - Optional commit hash to diff against its parent.
   * @returns Diff output as a string.
   * @throws {Error} If diff generation fails.
   */
  getDiff(hash?: string): string {
    try {
      if (hash) {
        if (!this.isValidHash(hash)) {
          throw new Error('Invalid commit hash provided');
        }
        return execSync(`git diff ${hash}^ ${hash}`, {
          cwd: this.repoPath,
          encoding: 'utf8',
        });
      } else {
        return execSync('git diff HEAD', {
          cwd: this.repoPath,
          encoding: 'utf8',
        });
      }
    } catch (error) {
      throw new Error(`Failed to get diff: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Validate a branch name according to Git rules.
   * @param name - Branch name to validate.
   * @returns True if valid, false otherwise.
   */
  private isValidBranchName(name: string): boolean {
    const branchNameRegex = /^(?!@$|{1,1}@$)(?!.*\.\.)(?!.*[/.]$)(?!.*\.$)[^ ~^:?*\[\\,;\`"'<>|^\x00-\x1f]+$/;
    return branchNameRegex.test(name);
  }

  /**
   * Validate a commit hash format.
   * @param hash - Hash to validate.
   * @returns True if valid, false otherwise.
   */
  private isValidHash(hash: string): boolean {
    return /^[a-f0-9]{7,40}$/i.test(hash);
  }

  /**
   * Safely extract error message from unknown error types.
   * @param error - Error object or string.
   * @returns String representation of the error.
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
