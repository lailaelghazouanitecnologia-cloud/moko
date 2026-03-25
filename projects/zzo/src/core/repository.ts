import { Branch } from './branch';
import { Commit } from './commit';

/**
 * Git repository abstraction.
 * Manages branches, commits, and merge operations.
 */
export class Repository {
    id: string;
    path: string;
    branches: Map<string, Branch>;
    commits: Map<string, Commit>;
    head: Branch;

    /**
     * Creates a new Repository instance.
     * @param id - Unique identifier for the repository
     * @param path - File system path to the repository
     * @throws {Error} If id or path is empty
     */
    constructor(id: string, path: string) {
        if (!id || !id.trim()) {
            throw new Error('Repository id cannot be empty');
        }
        if (!path || !path.trim()) {
            throw new Error('Repository path cannot be empty');
        }

        this.id = id;
        this.path = path;
        this.branches = new Map<string, Branch>();
        this.commits = new Map<string, Commit>();
        this.head = new Branch('main', new Commit('', '', '', new Date(), [], new Map<string, string>()));
    }

    /**
     * Retrieve a commit by its hash.
     * @param hash - The SHA hash of the commit
     * @returns The commit if found, undefined otherwise
     * @throws {Error} If hash is empty
     */
    getCommit(hash: string): Commit | undefined {
        if (!hash || !hash.trim()) {
            throw new Error('Commit hash cannot be empty');
        }
        return this.commits.get(hash);
    }

    /**
     * Append a commit to the DAG.
     * @param commit - The commit to add
     * @throws {Error} If commit is invalid or already exists
     */
    addCommit(commit: Commit): void {
        if (!commit) {
            throw new Error('Commit cannot be null or undefined');
        }
        if (!commit.sha) {
            throw new Error('Commit must have a valid SHA');
        }
        if (this.commits.has(commit.sha)) {
            throw new Error(`Commit ${commit.sha} already exists`);
        }
        this.commits.set(commit.sha, commit);
    }

    /**
     * Spawn a new branch from a given commit.
     * @param name - Name of the new branch
     * @param from - Commit to branch from
     * @returns The newly created branch
     * @throws {Error} If name is empty or branch already exists
     */
    createBranch(name: string, from: Commit): Branch {
        if (!name || !name.trim()) {
            throw new Error('Branch name cannot be empty');
        }
        if (!from) {
            throw new Error('Base commit cannot be null or undefined');
        }
        if (this.branches.has(name)) {
            throw new Error(`Branch ${name} already exists`);
        }

        const branch = new Branch(name, from);
        this.branches.set(name, branch);
        return branch;
    }

    /**
     * Checkout a branch by name.
     * @param name - Name of the branch to switch to
     * @throws {Error} If branch does not exist
     */
    switchBranch(name: string): void {
        if (!name || !name.trim()) {
            throw new Error('Branch name cannot be empty');
        }
        const branch = this.branches.get(name);
        if (!branch) {
            throw new Error(`Branch ${name} not found`);
        }
        this.head = branch;
    }

    /**
     * Merge two branches.
     * @param source - Source branch to merge from
     * @param target - Target branch to merge into
     * @returns The merge commit created
     * @throws {Error} If branches are invalid or no common ancestor exists
     */
    merge(source: Branch, target: Branch): Commit {
        if (!source) {
            throw new Error('Source branch cannot be null or undefined');
        }
        if (!target) {
            throw new Error('Target branch cannot be null or undefined');
        }
        if (source === target) {
            throw new Error('Cannot merge a branch into itself');
        }

        const commonAncestor = this.findCommonAncestor(source.commit, target.commit);
        if (!commonAncestor) {
            throw new Error('No common ancestor found');
        }

        const mergeCommit = new Commit(
            this.generateSha(),
            `Merge ${source.name} into ${target.name}`,
            'System',
            new Date(),
            [target.commit, source.commit],
            new Map<string, string>([...target.commit.tree, ...source.commit.tree])
        );

        this.addCommit(mergeCommit);
        target.moveTo(mergeCommit);
        return mergeCommit;
    }

    /**
     * List all commits in a branch's history.
     * @param branch - Branch to get history from
     * @returns Array of commits in chronological order
     * @throws {Error} If branch is invalid
     */
    getHistory(branch: Branch): Commit[] {
        if (!branch) {
            throw new Error('Branch cannot be null or undefined');
        }

        const history: Commit[] = [];
        let current: Commit | null = branch.commit;

        while (current) {
            history.push(current);
            current = current.getParent(0);
        }

        return history;
    }

    /**
     * Find the lowest common ancestor of two commits.
     * @param a - First commit
     * @param b - Second commit
     * @returns The common ancestor commit, or undefined if none exists
     * @throws {Error} If either commit is invalid
     */
    findCommonAncestor(a: Commit, b: Commit): Commit | undefined {
        if (!a) {
            throw new Error('First commit cannot be null or undefined');
        }
        if (!b) {
            throw new Error('Second commit cannot be null or undefined');
        }

        const visited = new Set<string>();
        const queue: Commit[] = [a, b];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current.sha)) {
                return current;
            }
            visited.add(current.sha);

            for (const parent of current.parents) {
                queue.push(parent);
            }
        }

        return undefined;
    }

    /**
     * Generate a pseudo-random SHA hash.
     * @returns A random SHA-like string
     */
    private generateSha(): string {
        return Math.random().toString(36).substring(2, 15);
    }
}
