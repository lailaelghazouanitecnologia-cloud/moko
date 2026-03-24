import { ValidationError } from '../core/platform';

/**
 * Represents a named scope for organizing and resolving resources in a hierarchical structure.
 * Supports path-based resource resolution with relative and absolute paths.
 */
export class ScopeSpace {
    private name: string;
    private parent: ScopeSpace | null = null;
    private children: ScopeSpace[] = [];
    private resources: Map<string, any> = new Map();

    /**
     * Creates a new ScopeSpace instance.
     * @param name - The name of this scope (must be non-empty and contain no path separators)
     * @param parent - Optional parent scope for hierarchical organization
     * @throws {ValidationError} If name is invalid
     */
    constructor(name: string, parent?: ScopeSpace) {
        this.validateName(name);
        this.name = name;
        if (parent) {
            this.parent = parent;
            parent.addChild(this);
        }
    }

    /**
     * Resolves a resource or scope using a path string.
     * Supports absolute paths starting with '/' and relative paths.
     * Uses '.' for current scope and '..' for parent scope.
     * @param path - The path to resolve
     * @returns The resolved resource or undefined if not found
     * @throws {ValidationError} If path is invalid
     */
    resolve(path: string): any {
        if (typeof path !== 'string') {
            throw new ValidationError('Path must be a string');
        }

        if (path === '') {
            return undefined;
        }

        if (path.startsWith('/')) {
            let root: ScopeSpace = this;
            while (root.parent) {
                root = root.parent;
            }
            return root.resolve(path.substring(1));
        }

        const parts = this.parsePath(path);
        let current: ScopeSpace = this;
        let resource: any = null;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (part === '..') {
                if (current.parent) {
                    current = current.parent;
                }
                continue;
            }

            if (i === parts.length - 1) {
                resource = current.resources.get(part);
                if (resource !== undefined) return resource;
            }

            const child = current.children.find(c => c.name === part);
            if (child) {
                current = child;
            } else {
                return undefined;
            }
        }

        return undefined;
    }

    /**
     * Adds a child scope to this scope.
     * @param child - The child scope to add
     * @throws {ValidationError} If child is invalid or already has a different parent
     */
    addChild(child: ScopeSpace): void {
        if (!child || !(child instanceof ScopeSpace)) {
            throw new ValidationError('Child must be a valid ScopeSpace instance');
        }

        if (child.parent && child.parent !== this) {
            throw new ValidationError('Child already belongs to another parent scope');
        }

        const index = this.children.indexOf(child);
        if (index === -1) {
            this.children.push(child);
            child.parent = this;
        }
    }

    /**
     * Adds a resource to this scope.
     * @param name - The name of the resource (must be non-empty and valid)
     * @param resource - The resource to store
     * @throws {ValidationError} If name is invalid
     */
    addResource(name: string, resource: any): void {
        this.validateResourceName(name);
        this.resources.set(name, resource);
    }

    /**
     * Removes a resource from this scope.
     * @param name - The name of the resource to remove
     * @returns true if the resource was found and removed, false otherwise
     */
    removeResource(name: string): boolean {
        if (typeof name !== 'string' || name.length === 0) {
            return false;
        }
        return this.resources.delete(name);
    }

    /**
     * Gets the name of this scope.
     * @returns The name of this scope
     */
    getName(): string {
        return this.name;
    }

    /**
     * Gets the parent scope.
     * @returns The parent scope or null if this is a root scope
     */
    getParent(): ScopeSpace | null {
        return this.parent;
    }

    /**
     * Gets a copy of the child scopes.
     * @returns An array of child scopes
     */
    getChildren(): ScopeSpace[] {
        return [...this.children];
    }

    /**
     * Gets the absolute path from the root to this scope.
     * @returns The absolute path string
     */
    getPath(): string {
        const parts: string[] = [];
        let current: ScopeSpace | null = this;
        while (current) {
            parts.unshift(current.name);
            current = current.parent;
        }
        return '/' + parts.join('/');
    }

    /**
     * Gets all resources in this scope.
     * @returns A map of resource names to resources
     */
    getResources(): Map<string, any> {
        return new Map(this.resources);
    }

    /**
     * Removes a child scope from this scope.
     * @param child - The child to remove
     * @returns true if the child was found and removed, false otherwise
     */
    removeChild(child: ScopeSpace): boolean {
        if (!child || !(child instanceof ScopeSpace)) {
            return false;
        }

        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            if (child.parent === this) {
                child.parent = null;
            }
            return true;
        }
        return false;
    }

    /**
     * Clears all resources from this scope.
     */
    clearResources(): void {
        this.resources.clear();
    }

    /**
     * Checks if this scope has a resource with the given name.
     * @param name - The resource name to check
     * @returns true if the resource exists, false otherwise
     */
    hasResource(name: string): boolean {
        if (typeof name !== 'string' || name.length === 0) {
            return false;
        }
        return this.resources.has(name);
    }

    /**
     * Gets a resource by name from this scope only (does not search parent scopes).
     * @param name - The resource name
     * @returns The resource or undefined if not found
     */
    getResource(name: string): any {
        if (typeof name !== 'string' || name.length === 0) {
            return undefined;
        }
        return this.resources.get(name);
    }

    /**
     * Validates a scope name.
     * @private
     * @param name - The name to validate
     * @throws {ValidationError} If name is invalid
     */
    private validateName(name: string): void {
        if (typeof name !== 'string') {
            throw new ValidationError('Name must be a string');
        }
        if (name.length === 0) {
            throw new ValidationError('Name cannot be empty');
        }
        if (name.includes('/') || name.includes('\\')) {
            throw new ValidationError('Name cannot contain path separators');
        }
        if (name === '.' || name === '..') {
            throw new ValidationError('Name cannot be "." or ".."');
        }
    }

    /**
     * Validates a resource name.
     * @private
     * @param name - The resource name to validate
     * @throws {ValidationError} If name is invalid
     */
    private validateResourceName(name: string): void {
        if (typeof name !== 'string') {
            throw new ValidationError('Resource name must be a string');
        }
        if (name.length === 0) {
            throw new ValidationError('Resource name cannot be empty');
        }
    }

    /**
     * Parses a path string into path components.
     * @private
     * @param path - The path to parse
     * @returns An array of path components
     */
    private parsePath(path: string): string[] {
        return path.split('/').filter(part => part !== '' && part !== '.');
    }
}