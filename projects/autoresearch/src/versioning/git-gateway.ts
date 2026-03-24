import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import { CommitInfo } from './index';

/**
 * Gateway for interacting with Git repositories.
 * Provides high-level methods for common Git operations.
 */
export class GitGateway {
  private repoPath: string;
  private branch: string;
  private git: SimpleGit;

  /**
   * Creates an instance of GitGateway.
   * @param repoPath Path to the repository directory.
   * @param branch Default branch name (defaults to 'main').
   */
  constructor(repoPath: string, branch: string = 'main') {
    if (!repoPath || typeof repoPath !== 'string') {
      throw new Error('Repository path must be a non-empty string');
    }
    if (!branch || typeof branch !== 'string') {
      throw new Error('Branch name must be a non-empty string');
    }

    this.repoPath = resolve(repoPath);
    this.branch = branch;

    const options: SimpleGitOptions = {
      baseDir: this.repoPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    };

    this.git = simpleGit(options);
    this.initializeRepo();
  }

  /**
   * Initialize the repository if it does not exist.
   */
  private initializeRepo(): void {
    try {
      if (!existsSync(this.repoPath)) {
        mkdirSync(this.repoPath, { recursive: true });
      }

      if (!existsSync(join(this.repoPath, '.git'))) {
        this.git.init().then(() => {
          this.git.checkoutLocalBranch(this.branch);
        }).catch((err) => {
          console.error('Failed to initialize Git repository:', err);
        });
      }
    } catch (err) {
      console.error('Error initializing repository:', err);
      throw new Error('Failed to initialize repository');
    }
  }

  /**
   * Create a new commit with the provided message and content.
   * @param message The commit message.
   * @param content The file content to commit.
   * @returns The hash of the created commit.
   */
  public async commit(message: string, content: string): Promise<string> {
    if (!message || typeof message !== 'string') {
      throw new Error('Commit message must be a non-empty string');
    }
    if (content === undefined || content === null) {
      throw new Error('Content must be provided for commit');
    }

    try {
      const filePath = join(this.repoPath, 'experiment.json');
      writeFileSync(filePath, content, { encoding: 'utf8' });

      await this.git.add('experiment.json');
      const result = await this.git.commit(message);

      return result.commit || '';
    } catch (err) {
      console.error('Error creating commit:', err);
      throw new Error('Failed to create commit');
    }
  }

  /**
   * Retrieve information about a specific commit.
   * @param hash The hash of the commit to retrieve.
   * @returns The commit information.
   */
  public async getCommit(hash: string): Promise<CommitInfo> {
    if (!hash || typeof hash !== 'string') {
      throw new Error('Hash must be a non-empty string');
    }

    try {
      const log = await this.git.log({ from: hash, to: hash, maxCount: 1 });
      const commit = log.latest;

      if (!commit) {
        throw new Error(`Commit ${hash} not found`);
      }

      return {
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: new Date(commit.date),
        parents: commit.parents,
      };
    } catch (err) {
      console.error(`Error retrieving commit ${hash}:`, err);
      throw new Error(`Failed to retrieve commit ${hash}`);
    }
  }

  /**
   * Retrieve the commit history up to a specified limit.
   * @param limit Maximum number of commits to retrieve.
   * @returns Array of commit information.
   */
  public async getHistory(limit: number): Promise<CommitInfo[]> {
    if (typeof limit !== 'number' || limit <= 0) {
      throw new Error('Limit must be a positive number');
    }

    try {
      const log = await this.git.log({ maxCount: limit });

      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: new Date(commit.date),
        parents: commit.parents,
      }));
    } catch (err) {
      console.error('Error retrieving history:', err);
      throw new Error('Failed to retrieve history');
    }
  }

  /**
   * Switch to a specific commit.
   * @param hash The hash of the commit to checkout.
   */
  public async checkout(hash: string): Promise<void> {
    if (!hash || typeof hash !== 'string') {
      throw new Error('Hash must be a non-empty string');
    }

    try {
      await this.git.checkout(hash);
    } catch (err) {
      console.error(`Error checking out commit ${hash}:`, err);
      throw new Error(`Failed to checkout commit ${hash}`);
    }
  }

  /**
   * Get the diff between two commits.
   * @param from The starting commit hash.
   * @param to The ending commit hash.
   *  @returns The formatted diff.
   */
  public async diff(from: string, to: string): Promise<string> {
    if (!from || typeof from !== 'string') {
      throw new Error('From hash must be a non-empty string');
    }
    if (!to || typeof to !== 'string') {
      throw new Error('To hash must be a non-empty string');
    }

    try {
      const diff = await this.git.diff([from, to]);
      return diff;
    } catch (err) {
      console.error(`Error generating diff from ${from} to ${to}:`, err);
      throw new Error('Failed to generate diff');
    }
  }

  /**
   * Create a new branch.
   * @param name The name of the new branch.
   */
  public async createBranch(name: string): Promise<void> {
    if (!name || typeof name !== 'string') {
      throw new Error('Branch name must be a non-empty string');
    }

    try {
      await this.git.checkoutLocalBranch(name);
    } catch (err) {
      console.error(`Error creating branch ${name}:`, err);
      throw new Error(`Failed to create branch ${name}`);
    }
  }

  /**
   * Switch to an existing branch.
   * @param name The name of the branch to switch to.
   */
  public async switchBranch(name: string): Promise<void> {
    if (!name || typeof name !== 'string') {
      throw new Error('Branch name must be a non-empty string');
    }

    try {
      await this.git.checkout(name);
    } catch (err) {
      console.error(`Error switching to branch ${name}:`, err);
      throw new Error(`Failed to switch to branch ${name}`);
    }
  }

  /**
   * Get a list of all branches.
   * @returns Array of branch names.
   */
  public async getBranches(): Promise<string[]> {
    try {
      const branches = await this.git.branch();
      return [...branches.all];
    } catch (err) {
      console.error('Error retrieving branches:', err);
      throw new Error('Failed to retrieve branches');
    }
  }

  /**
   * Merge a branch into the current branch.
   * @param branch The name of the branch to merge.
   */
  public async merge(branch: string): Promise<void> {
    if (!branch || typeof branch !== 'string') {
      throw new Error('Branch name must be a non-empty string');
    }

    try {
      await this.git.merge([branch]);
    } catch (err) {
      console.error(`Error merging branch ${branch}:`, err);
      throw new Error(`Failed to merge branch ${branch}`);
    }
  }

  /**
   * Push changes to the remote repository.
   */
  public async push(): Promise<void> {
    try {
      await this.git.push('origin', this.branch);
    } catch (err) {
      console.error('Error pushing changes:', err);
      throw new Error('Failed to push changes');
    }
  }

  /**
   * Pull changes from the remote repository.
   */
  public async pull(): Promise<void> {
    try {
      await this.git.pull('origin', this.branch);
    } catch (err) {
      console.error('Error pulling changes:', err);
      throw new Error('Failed to pull changes');
    }
  }

  /**
   * Get the current repository path.
   * @returns The repository path.
   */
  public getRepoPath(): string {
    return this.repoPath;
  }

  /**
   * Get the current branch name.
   * @returns The current branch name.
   */
  public getCurrentBranch(): string {
    return this.branch;
  }
}