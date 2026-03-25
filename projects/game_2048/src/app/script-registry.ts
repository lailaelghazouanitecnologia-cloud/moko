/**
 * Central registry for script management.
 * Provides methods to register, unregister, enable, disable, and query scripts.
 */
export class ScriptRegistry {
    private scripts: Map<string, Script>;
    private active: Set<string>;

    constructor() {
        this.scripts = new Map<string, Script>();
        this.active = new Set<string>();
    }

    /**
     * Registers a new script with the given ID.
     * @param id - Unique identifier for the script.
     * @param script - The script object to register.
     * @throws {Error} If id is not a non-empty string or script is not provided.
     */
    register(id: string, script: Script): void {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new Error('Script ID must be a non-empty string');
        }
        if (!script) {
            throw new Error('Script object is required');
        }
        this.scripts.set(id, script);
    }

    /**
     * Unregisters a script by its ID.
     * @param id - The ID of the script to remove.
     * @throws {Error} If id is not a non-empty string.
     */
    unregister(id: string): void {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new Error('Script ID must be a non-empty string');
        }
        this.scripts.delete(id);
        this.active.delete(id);
    }

    /**
     * Retrieves a script by its ID.
     * @param id - The ID of the script to retrieve.
     * @returns The script object if found, otherwise undefined.
     * @throws {Error} If id is not a non-empty string.
     */
    get(id: string): Script | undefined {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new Error('Script ID must be a non-empty string');
        }
        return this.scripts.get(id);
    }

    /**
     * Enables a registered script.
     * @param id - The ID of the script to enable.
     * @throws {Error} If id is not a non-empty string or script is not registered.
     */
    enable(id: string): void {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new Error('Script ID must be a non-empty string');
        }
        if (!this.scripts.has(id)) {
            throw new Error(`Script with ID '${id}' is not registered`);
        }
        this.active.add(id);
    }

    /**
     * Disables an active script.
     * @param id - The ID of the script to disable.
     * @throws {Error} If id is not a non-empty string.
     */
    disable(id: string): void {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new Error('Script ID must be a non-empty string');
        }
        this.active.delete(id);
    }

    /**
     * Checks if a script is currently enabled.
     * @param id - The ID of the script to check.
     * @returns True if the script is enabled, false otherwise.
     * @throws {Error} If id is not a non-empty string.
     */
    isEnabled(id: string): boolean {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new Error('Script ID must be a non-empty string');
        }
        return this.active.has(id);
    }

    /**
     * Lists all registered script IDs.
     * @returns An array of script IDs.
     */
    list(): string[] {
        return Array.from(this.scripts.keys());
    }

    /**
     * Clears all registered and active scripts.
     */
    clear(): void {
        this.scripts.clear();
        this.active.clear();
    }
}
