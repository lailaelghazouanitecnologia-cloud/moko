import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { Worktree } from './worktree';

export class WorktreeStore {
    private storagePath: string;
    private worktrees: Map<string, Worktree>;
    private dirty: boolean;

    constructor(storagePath: string) {
        this.storagePath = storagePath;
        this.worktrees = new Map<string, Worktree>();
        this.dirty = false;
    }

    async load(): Promise<void> {
        try {
            const data = await fs.readFile(this.storagePath, 'utf-8');
            const parsed = JSON.parse(data);
            this.worktrees.clear();
            
            for (const [path, worktreeData] of Object.entries(parsed)) {
                const worktree = new Worktree(
                    worktreeData.path,
                    worktreeData.head,
                    worktreeData.branch,
                    worktreeData.isMain || false,
                    worktreeData.isLocked || false,
                    worktreeData.lockReason || ''
                );
                this.worktrees.set(path, worktree);
            }
            
            this.dirty = false;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                this.worktrees.clear();
                this.dirty = false;
                return;
            }
            throw error;
        }
    }

    async save(): Promise<void> {
        const data: Record<string, any> = {};
        
        for (const [path, worktree] of this.worktrees) {
            data[path] = {
                path: worktree.path,
                head: worktree.head,
                branch: worktree.branch,
                isMain: worktree.isMain,
                isLocked: worktree.isLocked,
                lockReason: worktree.lockReason
            };
        }
        
        await fs.mkdir(dirname(this.storagePath), { recursive: true });
        await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2));
        this.dirty = false;
    }

    add(worktree: Worktree): void {
        this.worktrees.set(worktree.path, worktree);
        this.dirty = true;
    }

    remove(path: string): boolean {
        const result = this.worktrees.delete(path);
        if (result) {
            this.dirty = true;
        }
        return result;
    }

    get(path: string): Worktree | undefined {
        return this.worktrees.get(path);
    }

    getAll(): Worktree[] {
        return Array.from(this.worktrees.values());
    }

    clear(): void {
        this.worktrees.clear();
        this.dirty = true;
    }

    exists(path: string): boolean {
        return this.worktrees.has(path);
    }

    update(worktree: Worktree): void {
        this.worktrees.set(worktree.path, worktree);
        this.dirty = true;
    }

    isDirty(): boolean {
        return this.dirty;
    }

    markClean(): void {
        this.dirty = false;
    }

    async ensureStorage(): Promise<void> {
        try {
            await fs.access(this.storagePath);
        } catch {
            await fs.mkdir(dirname(this.storagePath), { recursive: true });
            await fs.writeFile(this.storagePath, '{}');
        }
    }
}
