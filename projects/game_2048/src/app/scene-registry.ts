import { Scene } from '../scene/scene';

/**
 * Central registry for managing scenes.
 */
export class SceneRegistry {
    private scenes: Map<string, Scene>;
    private activeScene: string;
    private defaultScene: string;

    constructor() {
        this.scenes = new Map<string, Scene>();
        this.activeScene = '';
        this.defaultScene = '';
    }

    /**
     * Register a new scene with the registry.
     * @param id Unique identifier for the scene
     * @param scene The scene instance to register
     * @throws {Error} If id is empty or null
     * @throws {Error} If scene is null or undefined
     * @throws {Error} If a scene with the same id is already registered
     */
    register(id: string, scene: Scene): void {
        if (!this.isValidId(id)) {
            throw new Error('Scene id must be a non-empty string');
        }
        if (!scene) {
            throw new Error('Scene cannot be null or undefined');
        }
        if (this.scenes.has(id)) {
            throw new Error(`Scene with id '${id}' is already registered`);
        }
        this.scenes.set(id, scene);
    }

    /**
     * Unregister a scene from the registry.
     * @param id The id of the scene to unregister
     * @returns true if the scene was found and removed, false otherwise
     * @throws {Error} If id is empty or null
     */
    unregister(id: string): boolean {
        if (!this.isValidId(id)) {
            throw new Error('Scene id must be a non-empty string');
        }
        return this.scenes.delete(id);
    }

    /**
     * Retrieve a scene from the registry.
     * @param id The id of the scene to retrieve
     * @returns The scene instance or undefined if not found
     * @throws {Error} If id is empty or null
     */
    get(id: string): Scene | undefined {
        if (!this.isValidId(id)) {
            throw new Error('Scene id must be a non-empty string');
        }
        return this.scenes.get(id);
    }

    /**
     * Check if a scene exists in the registry.
     * @param id The id of the scene to check
     * @returns true if the scene exists, false otherwise
     * @throws {Error} If id is empty or null
     */
    has(id: string): boolean {
        if (!this.isValidId(id)) {
            throw new Error('Scene id must be a non-empty string');
        }
        return this.scenes.has(id);
    }

    /**
     * Load a scene by id.
     * @param id The id of the scene to load
     * @throws {Error} If the scene is not found
     * @throws {Error} If the scene fails to load
     */
    async load(id: string): Promise<void> {
        if (!this.isValidId(id)) {
            throw new Error('Scene id must be a non-empty string');
        }
        const scene = this.scenes.get(id);
        if (!scene) {
            throw new Error(`Scene '${id}' not found in registry`);
        }
        
        try {
            // Scene loading logic would go here
            // This might involve loading assets, initializing systems, etc.
            await scene.load();
        } catch (error) {
            throw new Error(`Failed to load scene '${id}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Unload a scene by id.
     * @param id The id of the scene to unload
     * @throws {Error} If the scene is not found
     * @throws {Error} If the scene fails to unload
     */
    async unload(id: string): Promise<void> {
        if (!this.isValidId(id)) {
            throw new Error('Scene id must be a non-empty string');
        }
        const scene = this.scems.get(id);
        if (!scene) {
            throw new Error(`Scene '${id}' not found in registry`);
        }
        
        try {
            // Scene unloading logic would go here
            // This might involve cleanup, asset unloading, etc.
            await scene.unload();
        } catch (error) {
            throw new Error(`Failed to unload scene '${id}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Switch to a different scene.
     * @param id The id of the scene to switch to
     * @throws {Error} If the scene is not found
     * @throws {Error} If the current scene fails to unload
     * @throws {Error} If the new scene fails to load
     */
    async switch(id: string): Promise<void> {
        if (!this.isValidId(id)) {
            throw new Error('Scene id must be a non-empty string');
        }
        if (!this.scenes.has(id)) {
            throw new Error(`Scene '${id}' not found in registry`);
        }

        if (this.activeScene) {
            await this.unload(this.activeScene);
        }
        await this.load(id);
        this.activeScene = id;
    }

    /**
     * Get a list of all registered scene ids.
     * @returns Array of scene ids
     */
    list(): string[] {
        return Array.from(this.scenes.keys());
    }

    /**
     * Clear all scenes from the registry.
     */
    clear(): void {
        this.scenes.clear();
        this.activeScene = '';
        this.defaultScene = '';
    }

    /**
     * Get the current active scene id.
     * @returns The active scene id or empty string if none is active
     */
    getActiveScene(): string {
        return this.activeScene;
    }

    /**
     * Get the default scene id.
     * @returns The default scene id or empty string if none is set
     */
    getDefaultScene(): string {
        return this.defaultScene;
    }

    /**
     * Set the default scene id.
     * @param id The id of the scene to set as default
     * @throws {Error} If the scene does not exist
     */
    setDefaultScene(id: string): void {
        if (!this.isValidId(id)) {
            throw new Error('Scene id must be a non-empty string');
        }
        if (!this.scenes.has(id)) {
            throw new Error(`Scene '${id}' not found in registry`);
        }
        this.defaultScene = id;
    }

    /**
     * Load the default scene.
     * @throws {Error} If no default scene is set
     * @throws {Error} If the default scene fails to load
     */
    async loadDefaultScene(): Promise<void> {
        if (!this.defaultScene) {
            throw new Error('No default scene is set');
        }
        await this.load(this.defaultScene);
        this.activeScene = this.defaultScene;
    }

    /**
     * Validate if a scene id is valid.
     * @param id The id to validate
     * @returns true if valid, false otherwise
     */
    private isValidId(id: string): boolean {
        return typeof id === 'string' && id.trim().length > 0;
    }
}