import { SceneFactory } from './scene-factory';

/**
 * Registry for managing scene factories.
 * Provides methods to register, unregister, and retrieve scene factories by name.
 */
export class SceneRegistry {
    private factories: Map<string, SceneFactory> = new Map();
    private preload: Set<string> = new Set();

    /**
     * Registers a scene factory under the given name.
     * @param name - Unique identifier for the scene factory.
     * @param factory - The scene factory to register.
     * @throws {TypeError} If name is not a non-empty string or factory is not a function.
     */
    public register(name: string, factory: SceneFactory): void {
        if (!this.isValidName(name)) {
            throw new TypeError('Scene factory name must be a non-empty string');
        }
        if (typeof factory !== 'function') {
            throw new TypeError('Scene factory must be a function');
        }
        this.factories.set(name, factory);
    }

    /**
     * Unregisters a scene factory by name.
     * @param name - The name of the factory to remove.
     * @returns true if the factory existed and was removed; otherwise false.
     * @throws {TypeError} If name is not a non-empty string.
     */
    public unregister(name: string): boolean {
        if (!this.isValidName(name)) {
            throw new TypeError('Scene factory name must be a non-empty string');
        }
        return this.factories.delete(name);
    }

    /**
     * Checks whether a factory with the given name exists.
     * @param name - The name to check.
     * @returns true if a factory with the name exists; otherwise false.
     * @throws {TypeError} If name is not a non-empty string.
     */
    public has(name: string): boolean {
        if (!this.isValidName(name)) {
            throw new TypeError('Scene factory name must be a non-empty string');
        }
        return this.factories.has(name);
    }

    /**
     * Retrieves a registered scene factory by name.
     * @param name - The name of the factory to retrieve.
     * @returns The requested scene factory.
     * @throws {Error} If no factory with the given name is registered.
     * @throws {TypeError} If name is not a non-empty string.
     */
    public get(name: string): SceneFactory {
        if (!this.isValidName(name)) {
            throw new TypeError('Scene factory name must be a non-empty string');
        }
        const factory = this.factories.get(name);
        if (!factory) {
            throw new Error(`Scene factory '${name}' not found`);
        }
        return factory;
    }

    /**
     * Returns an array of all registered factory names.
     * @returns Array of factory names.
     */
    public list(): string[] {
        return Array.from(this.factories.keys());
    }

    /**
     * Marks a scene factory for preloading.
     * @param name - The name of the factory to mark.
     * @throws {Error} If no factory with the given name is registered.
     * @throws {TypeError} If name is not a non-empty string.
     */
    public markPreload(name: string): void {
        if (!this.isValidName(name)) {
            throw new TypeError('Scene factory name must be a non-empty string');
        }
        if (!this.factories.has(name)) {
            throw new Error(`Cannot mark preload: scene factory '${name}' not found`);
        }
        this.preload.add(name);
    }

    /**
     * Returns an array of factory names marked for preloading.
     * @returns Array of preloaded factory names.
     */
    public getPreload(): string[] {
        return Array.from(this.preload);
    }

    /**
     * Clears all registered factories and preload markers.
     */
    public clear(): void {
        this.factories.clear();
        this.preload.clear();
    }

    /**
     * Validates that the provided name is a non-empty string.
     * @param name - The value to validate.
     * @returns true if valid; otherwise false.
     */
    private isValidName(name: unknown): name is string {
        return typeof name === 'string' && name.trim().length > 0;
    }
}
