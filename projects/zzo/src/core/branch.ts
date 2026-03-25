import { Commit } from './commit';

/**
 * Named movable pointer to a commit.
 */
export class Branch {
  name: string;
  commit: Commit;
  upstream: Branch | null;
  isRemote: boolean;

  /**
   * Creates a new Branch instance.
   * @param name - The name of the branch.
   * @param commit - The commit this branch points to.
   * @param upstream - The upstream branch (optional).
   * @param isRemote - Whether this branch is a remote branch (default: false).
   */
  constructor(name: string, commit: Commit, upstream: Branch | null = null, isRemote: boolean = false) {
    if (!name || typeof name !== 'string') {
      throw new Error('Branch name must be a non-empty string');
    }
    if (!commit) {
      throw new Error('Commit is required');
    }
    this.name = name;
    this.commit = commit;
    this.upstream = upstream;
    this.isRemote = isRemote;
  }

  /**
   * Moves the branch pointer to the specified commit.
   * @param commit - The commit to move the pointer to.
   */
  moveTo(commit: Commit): void {
    if (!commit) {
      throw new Error('Commit is required');
    }
    this.commit = commit;
  }

  /**
   * Merges the histories of this branch and another branch.
   * @param other - The other branch to merge.
   * @returns The new merge commit.
   */
  merge(other: Branch): Commit {
    if (!other) {
      throw new Error('Other branch is required');
    }
    if (!(other instanceof Branch)) {
      throw new Error('Argument must be an instance of Branch');
    }

    const ancestor = this.latestCommonAncestor(other);
    if (!ancestor) {
      throw new Error('No common ancestor found');
    }

    const newCommit = new Commit(
      'merge-' + Date.now(),
      `Merge branch '${other.name}' into ${this.name}`,
      'system',
      new Date(),
      [this.commit, other.commit],
      new Map([...this.commit.tree, ...other.commit.tree])
    );

    this.moveTo(newCommit);
    return newCommit;
  }

  /**
   * Replays commits from this branch onto another commit.
   * @param onto - The commit to rebase onto.
   */
  rebase(onto: Commit): void {
    if (!onto) {
      throw new Error('Onto commit is required');
    }
    if (!(onto instanceof Commit)) {
      throw new Error('Argument must be an instance of Commit');
    }

    const newCommit = new Commit(
      'rebase-' + Date.now(),
      `Rebase onto ${onto.sha}`,
      'system',
      new Date(),
      [onto],
      new Map(this.commit.tree)
    );

    this.moveTo(newCommit);
  }

  /**
   * Renames the branch.
   * @param newName - The new name for the branch.
   */
  rename(newName: string): void {
    if (!newName || typeof newName !== 'string') {
      throw new Error('New name must be a non-empty string');
    }
    this.name = newName;
  }

  /**
   * Removes the pointer by nullifying the commit and upstream references.
   */
  delete(): void {
    this.commit = null as any;
    this.upstream = null;
  }

  /**
   * Checks if a commit is an ancestor of this branch.
   * @param commit - The commit to check.
   * @returns True if the commit is an ancestor, false otherwise.
   */
  isAncestor(commit: Commit): boolean {
    if (!commit) {
      throw new Error('Commit is required');
    }
    if (!(commit instanceof Commit)) {
      throw new Error('Argument must be an instance of Commit');
    }

    let current: Commit | null = this.commit;
    const visited = new Set<string>();

    while (current && !visited.has(current.sha)) {
      visited.add(current.sha);
      if (current.sha === commit.sha) {
        return true;
      }
      current = current.parents[0] || null;
    }

    return false;
  }

  /**
   * Finds the latest common ancestor commit between this branch and another.
   * @param other - The other branch.
   * @returns The latest common ancestor commit.
   * @throws Error if no common ancestor is found.
   */
  latestCommonAncestor(other: Branch): Commit {
    if (!other) {
      throw new Error('Other branch is required');
    }
    if (!(other instanceof Branch)) {
      throw new Error('Argument must be an instance of Branch');
    }

    const visited = new Set<string>();
    let current: Commit | null = this.commit;

    while (current) {
      visited.add(current.sha);
      current = current.parents[0] || null;
    }

    current = other.commit;
    while (current) {
      if (visited.has(current.sha)) {
        return current;
      }
      current = current.parents[0] || null;
    }

    throw new Error('No common ancestor found');
  }

  /**
   * Returns a string representation of the branch.
   * @returns The branch name.
   */
  toString(): string {
    return this.name;
  }

  /**
   * Checks if this branch is equal to another branch by comparing names.
   * @param other - The other branch to compare.
   * @returns True if the branches have the same name, false otherwise.
   */
  equals(other: Branch): boolean {
    if (!other) return false;
    if (!(other instanceof Branch)) return false;
    return this.name === other.name;
  }

  /**
   * Gets the full name of the branch, including remote prefix if applicable.
   * @returns The full branch name.
   */
  getFullName(): string {
    return this.isRemote ? `origin/${this.name}` : this.name;
  }

  /**
   * Checks if this branch is ahead of its upstream branch.
   * @returns True if ahead, false if not or no upstream.
   */
  isAhead(): boolean {
    if (!this.upstream) return false;
    return !this.upstream.isAncestor(this.commit);
  }

  /**
   * Checks if this branch is behind its upstream branch.
   * @returns True if behind, false if not or no upstream.
   */
  isBehind(): boolean {
    if (!this.upstream) return false;
    return !this.isAncestor(this.upstream.commit);
  }

  /**
   * Gets the number of commits this branch is ahead of its upstream.
   * @returns The number of commits ahead.
   */
  getAheadCount(): number {
    if (!this.upstream) return 0;
    return this.countCommitsSince(this.upstream.commit);
  }

  /**
   * Gets the number of commits this branch is behind its upstream.
   * @returns The number of commits behind.
   */
  getBehindCount(): number {
    if (!this.upstream) return 0;
    return this.upstream.countCommitsSince(this.commit);
  }

  /**
   * Counts the number of commits since a given ancestor commit.
   * @param ancestor - The ancestor commit.
   * @returns The number of commits since the ancestor.
   */
  private countCommitsSince(ancestor: Commit): number {
    let count = 0;
    let current: Commit | null = this.commit;
    const visited = new Set<string>();

    while (current && !visited.has(current.sha)) {
      if (current.sha === ancestor.sha) {
        return count;
      }
      visited.add(current.sha);
      count++;
      current = current.parents[0] || null;
    }

    return count;
  }
}
