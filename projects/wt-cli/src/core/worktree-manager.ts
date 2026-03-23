import { promises as fs } from 'fs';
import { join, resolve, relative, isAbsolute, normalize } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Worktree } from './worktree';
import { WorktreeStore } from './worktree-store';

const execAsync = promisify(exec);

export class WorktreeManager {
    private repoPath: string;
    private store: WorktreeStore;

    constructor(repoPath: string) {
        this.repoPath = resolve(repoPath);
        this.store = new WorktreeStore(join(this.repoPath, '.git', 'worktrees.json'));
    }

    async create(branch: string, path?: string): Promise<Worktree> {
        if (!this.isBranchExists(branch)) {
            await this.createBranch(branch);
        }

        const worktreePath = path ? resolve(path) : join(this.repoPath, '..', `${branch}-worktree`);
        
        if (!this.validatePath(worktreePath)) {
            throw new Error('Worktree path must be within repository bounds');
        }

        const { stdout } = await execAsync(`git -C "${this.repoPath}" worktree add "${worktreePath}" "${branch}"`);
        
        const worktree = new Worktree();
        worktree.path = worktreePath;
        worktree.branch = branch;
        worktree.locked = false;
        
        const worktrees = await this.store.load();
        worktrees.push(worktree);
        await this.store.save(worktrees);
        
        return worktree;
    }

    async remove(path: string, force?: boolean): Promise<void> {
        const normalizedPath = normalize(resolve(path));
        
        if (!this.validatePath(normalizedPath)) {
            throw new Error('Invalid worktree path');
        }

        const worktrees = await this.store.load();
        const index = worktrees.findIndex(w => normalize(w.path) === normalizedPath);
        
        if (index === -1) {
            throw new Error('Worktree not found');
        }

        const cmd = force ? `git -C "${this.repoPath}" worktree remove --force "${normalizedPath}"` 
                          : `git -C "${this.repoPath}" worktree remove "${normalizedPath}"`;
        
        await execAsync(cmd);
        
        worktrees.splice(index, 1);
        await this.store.save(worktrees);
    }

    async list(): Promise<Worktree[]> {
        const worktrees = await this.store.load();
        return [...worktrees];
    }

    findByBranch(branch: string): Worktree | undefined {
        const worktrees = this.store.getCached();
        return worktrees.find(w => w.branch === branch);
    }

    findByPath(path: string): Worktree | undefined {
        const normalizedPath = normalize(resolve(path));
        const worktrees = this.store.getCached();
        return worktrees.find(w => normalize(w.path) === normalizedPath);
    }

    async switchTo(path: string): Promise<void> {
        const normalizedPath = normalize(resolve(path));
        const worktree = this.findByPath(normalizedPath);
        
        if (!worktree) {
            throw new Error('Worktree not found');
        }

        await execAsync(`cd "${normalizedPath}" && git checkout "${worktree.branch}"`);
    }

    validatePath(path: string): boolean {
        const normalizedPath = normalize(resolve(path));
        const repoParent = resolve(this.repoPath, '..');
        
        return normalizedPath.startsWith(repoParent) && 
               !normalizedPath.startsWith(join(this.repoPath, '.git'));
    }

    isBranchExists(branch: string): boolean {
        try {
            execSync(`git -C "${this.repoPath}" show-ref --verify --quiet refs/heads/"${branch}"`);
            return true;
        } catch {
            return false;
        }
    }

    async createBranch(branch: string, base?: string): Promise<void> {
        const baseBranch = base || 'HEAD';
        await execAsync(`git -C "${this.repoPath}" branch "${branch}" "${baseBranch}"`);
    }

    getCurrentWorktree(): Worktree | undefined {
        const cwd = process.cwd();
        const worktrees = this.store.getCached();
        return worktrees.find(w => cwd.startsWith(w.path));
    }

    async lock(path: string): Promise<void> {
        const normalizedPath = normalize(resolve(path));
        const worktrees = await this.store.load();
        const worktree = worktrees.find(w => normalize(w.path) === normalizedPath);
        
        if (!worktree) {
            throw new Error('Worktree not found');
        }

        worktree.locked = true;
        await this.store.save(worktrees);
    }

    async unlock(path: string): Promise<void> {
        const normalizedPath = normalize(resolve(path));
        const worktrees = await this.store.load();
        const worktree = worktrees.find(w => normalize(w.path) === normalizedPath);
        
        if (!worktree) {
            throw new Error('Worktree not found');
        }

        worktree.locked = false;
        await this.store.save(worktrees);
    }

    async prune(): Promise<void> {
        const worktrees = await this.store.load();
        const validWorktrees: Worktree[] = [];
        
        for (const worktree of worktrees) {
            try {
                await fs.access(worktree.path);
                const gitPath = join(worktree.path, '.git');
                await fs.access(gitPath);
                validWorktrees.push(worktree);
            } catch {
                // Worktree directory or .git missing, skip
            }
        }
        
        await this.store.save(validWorktrees);
    }

    getMainWorktree(): Worktree {
        const mainWorktree = new Worktree();
        mainWorktree.path = this.repoPath;
        mainWorktree.branch = 'main';
        mainWorktree.locked = false;
        return mainWorktree;
    }
}

import { execSync } from 'child_process';
