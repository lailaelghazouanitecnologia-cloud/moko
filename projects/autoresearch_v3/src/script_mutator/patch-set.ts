import { AST } from './ast';
import { Patch } from './patch';

/**
 * A collection of AST mutation patches that can be applied and reverted as a group.
 */
export class PatchSet {
    private patches: Patch[];
    private applied: boolean;

    constructor() {
        this.patches = [];
        this.applied = false;
    }

    /**
     * Appends a new patch to the collection.
     * @param patch - The patch to add.
     * @throws {TypeError} If patch is not a valid Patch instance.
     */
    add(patch: Patch): void {
        if (!this.isValidPatch(patch)) {
            throw new TypeError('Invalid patch provided');
        }
        this.patches.push(patch);
    }

    /**
     * Applies all patches in the collection to the provided AST.
     * @param ast - The AST to apply patches to.
     * @returns The transformed AST.
     * @throws {TypeError} If ast is not a valid AST.
     */
    applyAll(ast: AST): AST {
        if (!ast) {
            throw new TypeError('Invalid AST provided');
        }

        let result = ast;
        const failedPatches: Patch[] = [];

        for (const patch of this.patches) {
            try {
                result = patch.apply(result);
            } catch (error) {
                failedPatches.push(patch);
            }
        }

        this.applied = true;
        return result;
    }

    /**
     * Reverts all patches in the collection from the provided AST.
     * @param ast - The AST to revert patches from.
     * @returns The reverted AST.
     * @throws {TypeError} If ast is not a valid AST.
     */
    revertAll(ast: AST): AST {
        if (!ast) {
            throw new TypeError('Invalid AST provided');
        }

        let result = ast;
        const failedPatches: Patch[] = [];

        for (let i = this.patches.length - 1; i >= 0; i--) {
            const patch = this.patches[i];
            try {
                result = patch.revert(result);
            } catch (error) {
                failedPatches.push(patch);
            }
        }

        this.applied = false;
        return result;
    }

    /**
     * Returns an array of patches that failed to apply or revert.
     * @returns Array of failed patches.
     */
    getFailed(): Patch[] {
        const failed: Patch[] = [];

        for (const patch of this.patches) {
            if (!patch.isSuccessful()) {
                failed.push(patch);
            }
        }

        return failed;
    }

    /**
     * Returns the number of patches in the collection.
     * @returns The patch count.
     */
    size(): number {
        return this.patches.length;
    }

    /**
     * Removes all patches from the collection and resets the applied state.
     */
    clear(): void {
        this.patches = [];
        this.applied = false;
    }

    /**
     * Checks if the collection contains no patches.
     * @returns True if the collection is empty, false otherwise.
     */
    isEmpty(): boolean {
        return this.patches.length === 0;
    }

    /**
     * Checks if a patch is valid for addition.
     * @private
     * @param patch - The patch to validate.
     * @returns True if valid, false otherwise.
     */
    private isValidPatch(patch: any): boolean {
        return patch && typeof patch.apply === 'function' && typeof patch.revert === 'function' && typeof patch.isSuccessful === 'function';
    }
}
