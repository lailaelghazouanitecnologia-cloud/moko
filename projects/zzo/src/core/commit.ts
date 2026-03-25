/**
 * Immutable DAG node for repository history
 */
export class Commit {
    sha: string;
    message: string;
    author: string;
    timestamp: Date;
    parents: Commit[];
    tree: Map<string, string>;

    constructor(sha: string, message: string, author: string, timestamp: Date, parents: Commit[] = [], tree: Map<string, string> = new Map()) {
        this.sha = sha;
        this.message = message;
        this.author = author;
        this.timestamp = timestamp;
        this.parents = parents;
        this.tree = tree;
    }

    /**
     * Get the first seven characters of the SHA hash
     * @returns Short SHA string (7 characters)
     */
    getShortSha(): string {
        return this.sha.substring(0, 7);
    }

    /**
     * Check if this commit is a merge commit
     * @returns True if commit has exactly two parents
     */
    isMerge(): boolean {
        return this.parents.length === 2;
    }

    /**
     * Get the nth parent commit
     * @param index - Index of the parent (0-based)
     * @returns The parent commit or null if index is out of bounds
     */
    getParent(index: number): Commit | null {
        if (index < 0 || index >= this.parents.length) {
            return null;
        }
        return this.parents[index];
    }

    /**
     * Calculate the graph distance between this commit and another commit
     * @param other - The target commit
     * @returns The number of commits between this and other, or -1 if not reachable
     */
    getDistance(other: Commit): number {
        if (!other) {
            throw new Error('Target commit cannot be null or undefined');
        }

        if (!(other instanceof Commit)) {
            throw new TypeError('Target must be a Commit instance');
        }

        const visited = new Set<string>();
        const queue: Array<{ commit: Commit; distance: number }> = [{ commit: this, distance: 0 }];

        while (queue.length > 0) {
            const current = queue.shift()!;
            
            if (current.commit.sha === other.sha) {
                return current.distance;
            }

            if (visited.has(current.commit.sha)) {
                continue;
            }
            visited.add(current.commit.sha);

            for (const parent of current.commit.parents) {
                if (!visited.has(parent.sha)) {
                    queue.push({ commit: parent, distance: current.distance + 1 });
                }
            }
        }

        return -1;
    }

    /**
     * Get list of all file paths in this commit
     * @returns Array of file paths
     */
    getChangedFiles(): string[] {
        return Array.from(this.tree.keys());
    }

    /**
     * Check if a file exists in this commit
     * @param path - File path to check
     * @returns True if file exists in the commit
     */
    hasFile(path: string): boolean {
        if (typeof path !== 'string') {
            throw new TypeError('Path must be a string');
        }
        
        if (path.trim() === '') {
            throw new Error('Path cannot be empty');
        }

        return this.tree.has(path);
    }

    /**
     * Get the blob hash for a file
     * @param path - File path
     * @returns Blob SHA hash or null if file doesn't exist
     */
    getFileHash(path: string): string | null {
        if (typeof path !== 'string') {
            throw new TypeError('Path must be a string');
        }
        
        if (path.trim() === '') {
            throw new Error('Path cannot be empty');
        }

        return this.tree.get(path) || null;
    }

    /**
     * Get the number of parents
     * @returns Number of parent commits
     */
    getParentCount(): number {
        return this.parents.length;
    }

    /**
     * Check if this is a root commit (no parents)
     * @returns True if commit has no parents
     */
    isRoot(): boolean {
        return this.parents.length === 0;
    }

    /**
     * Get all ancestors up to a specified depth
     * @param maxDepth - Maximum depth to traverse (default: Infinity)
     * @returns Array of ancestor commits
     */
    getAncestors(maxDepth: number = Infinity): Commit[] {
        if (typeof maxDepth !== 'number' || maxDepth < 0) {
            throw new Error('maxDepth must be a non-negative number');
        }

        const ancestors: Commit[] = [];
        const visited = new Set<string>();
        const queue: Array<{ commit: Commit; depth: number }> = [{ commit: this, depth: 0 }];

        while (queue.length > 0) {
            const current = queue.shift()!;
            
            if (current.depth > maxDepth) {
                continue;
            }

            if (visited.has(current.commit.sha)) {
                continue;
            }
            visited.add(current.commit.sha);

            if (current.depth > 0) {
                ancestors.push(current.commit);
            }

            for (const parent of current.commit.parents) {
                queue.push({ commit: parent, depth: current.depth + 1 });
            }
        }

        return ancestors;
    }

    /**
     * Check if this commit is an ancestor of another commit
     * @param descendant - Potential descendant commit
     * @returns True if this commit is an ancestor
     */
    isAncestorOf(descendant: Commit): boolean {
        if (!descendant) {
            throw new Error('Descendant commit cannot be null or undefined');
        }

        if (!(descendant instanceof Commit)) {
            throw new TypeError('Descendant must be a Commit instance');
        }

        const visited = new Set<string>();
        const queue: Commit[] = [descendant];

        while (queue.length > 0) {
            const current = queue.shift()!;
            
            if (current.sha === this.sha) {
                return true;
            }

            if (visited.has(current.sha)) {
                continue;
            }
            visited.add(current.sha);

            for (const parent of current.parents) {
                queue.push(parent);
            }
        }

        return false;
    }

    /**
     * Get the common ancestor with another commit
     * @param other - Other commit to find common ancestor with
     * @returns The common ancestor commit or null if none exists
     */
    getCommonAncestor(other: Commit): Commit | null {
        if (!other) {
            throw new Error('Other commit cannot be null or undefined');
        }

        if (!(other instanceof Commit)) {
            throw new TypeError('Other must be a Commit instance');
        }

        const ancestors = new Set<string>();
        const queue: Commit[] = [this];

        while (queue.length > 0) {
            const current = queue.shift()!;
            
            if (ancestors.has(current.sha)) {
                continue;
            }
            ancestors.add(current.sha);

            for (const parent of current.parents) {
                queue.push(parent);
            }
        }

        const otherQueue: Commit[] = [other];
        const otherVisited = new Set<string>();

        while (otherQueue.length > 0) {
            const current = otherQueue.shift()!;
            
            if (ancestors.has(current.sha)) {
                return current;
            }

            if (otherVisited.has(current.sha)) {
                continue;
            }
            otherVisited.add(current.sha);

            for (const parent of current.parents) {
                otherQueue.push(parent);
            }
        }

        return null;
    }

    /**
     * Create a copy of this commit with new properties
     * @param overrides - Properties to override
     * @returns New Commit instance
     */
    copy(overrides: Partial<{
        sha: string;
        message: string;
        author: string;
        timestamp: Date;
        parents: Commit[];
        tree: Map<string, string>;
    }> = {}): Commit {
        return new Commit(
            overrides.sha ?? this.sha,
            overrides.message ?? this.message,
            overrides.author ?? this.author,
            overrides.timestamp ?? this.timestamp,
            overrides.parents ?? [...this.parents],
            overrides.tree ?? new Map(this.tree)
        );
    }

    /**
     * Convert commit to a plain object
     * @returns Plain object representation
     */
    toJSON(): object {
        return {
            sha: this.sha,
            message: this.message,
            author: this.author,
            timestamp: this.timestamp.toISOString(),
            parents: this.parents.map(p => p.sha),
            tree: Array.from(this.tree.entries())
        };
    }

    /**
     * Create a commit from a plain object
     * @param data - Plain object data
     * @returns New Commit instance
     */
    static fromJSON(data: any): Commit {
        if (!data || typeof data !== 'object') {
            throw new TypeError('Data must be an object');
        }

        if (!data.sha || typeof data.sha !== 'string') {
            throw new Error('SHA is required and must be a string');
        }

        if (!data.message || typeof data.message !== 'string') {
            throw new Error('Message is required and must be a string');
        }

        if (!data.author || typeof data.author !== 'string') {
            throw new Error('Author is required and must be a string');
        }

        if (!data.timestamp) {
            throw new Error('Timestamp is required');
        }

        const timestamp = new Date(data.timestamp);
        if (isNaN(timestamp.getTime())) {
            throw new Error('Invalid timestamp');
        }

        const parents = Array.isArray(data.parents) ? data.parents : [];
        const tree = new Map<string, string>(Array.isArray(data.tree) ? data.tree : []);

        return new Commit(
            data.sha,
            data.message,
            data.author,
            timestamp,
            parents,
            tree
        );
    }
}
