import { Component } from './component';
import { Entity } from './entity';

/**
 * Base class for all component systems in the engine.
 * Manages the lifecycle and update of components attached to entities.
 */
export abstract class ComponentSystem {
    /** Unique identifier for this system */
    protected id: string;
    /** Map of entity GUIDs to their components */
    protected components: Map<string, Component> = new Map();
    /** Generic key-value store for system-level data */
    protected store: Map<string, any> = new Map();
    /** Schema definition for component initialization */
    protected schema: any[] = [];

    constructor(id: string) {
        if (!id || typeof id !== 'string') {
            throw new Error('ComponentSystem requires a non-empty string id');
        }
        this.id = id;
    }

    /**
     * Adds a component to the specified entity.
     * @param entity - The entity to attach the component to
     * @param data - Optional initialization data for the component
     * @returns The newly created component
     */
    abstract addComponent(entity: Entity, data?: any): Component;

    /**
     * Removes a component from the specified entity.
     * @param entity - The entity whose component should be removed
     */
    abstract removeComponent(entity: Entity): void;

    /**
     * Clones a component from one entity to another.
     * @param entity - The source entity
     * @param clone - The destination entity
     */
    abstract cloneComponent(entity: Entity, clone: Entity): void;

    /**
     * Initializes component data based on provided properties.
     * @param component - The component to initialize
     * @param data - The data object containing property values
     * @param properties - Array of property names to initialize
     */
    initializeComponentData(component: Component, data: any, properties: string[]): void {
        if (!component) {
            throw new Error('Cannot initialize data for null component');
        }
        if (!Array.isArray(properties)) {
            throw new Error('Properties must be an array of strings');
        }

        for (const property of properties) {
            if (typeof property !== 'string') {
                console.warn(`Skipping non-string property name: ${property}`);
                continue;
            }
            if (data && data.hasOwnProperty(property)) {
                (component as any)[property] = data[property];
            }
        }
    }

    /**
     * Retrieves a component attached to the specified entity.
     * @param entity - The entity to query
     * @returns The component if found, null otherwise
     */
    getComponent(entity: Entity): Component | null {
        if (!this.validateEntity(entity)) {
            return null;
        }
        return this.components.get(entity.guid) || null;
    }

    /**
     * Checks if the specified entity has a component in this system.
     * @param entity - The entity to query
     * @returns True if the entity has a component
     */
    hasComponent(entity: Entity): boolean {
        if (!this.validateEntity(entity)) {
            return false;
        }
        return this.components.has(entity.guid);
    }

    /**
     * Updates all enabled components in the system.
     * @param dt - Delta time in seconds since last update
     */
    onUpdate(dt: number): void {
        if (typeof dt !== 'number' || dt < 0) {
            console.warn('Invalid delta time provided to onUpdate');
            return;
        }

        for (const component of this.components.values()) {
            if (component && component.enabled && typeof component.update === 'function') {
                try {
                    component.update(dt);
                } catch (error) {
                    console.error(`Error updating component: ${error}`);
                }
            }
        }
    }

    /**
     * Cleans up all components and internal data.
     */
    destroy(): void {
        for (const component of this.components.values()) {
            if (component && typeof component.destroy === 'function') {
                try {
                    component.destroy();
                } catch (error) {
                    console.error(`Error destroying component: ${error}`);
                }
            }
        }
        this.components.clear();
        this.store.clear();
    }

    /**
     * Gets the unique identifier of this system.
     * @returns The system id
     */
    getId(): string {
        return this.id;
    }

    /**
     * Gets the number of components in this system.
     * @returns The component count
     */
    getCount(): number {
        return this.components.size;
    }

    /**
     * Gets all components in this system.
     * @returns Array of components
     */
    getComponents(): Component[] {
        return Array.from(this.components.values());
    }

    /**
     * Stores a value in the system's internal store.
     * @param key - The key to store under
     * @param value - The value to store
     */
    setStoreValue(key: string, value: any): void {
        if (typeof key !== 'string' || !key) {
            throw new Error('Store key must be a non-empty string');
        }
        this.store.set(key, value);
    }

    /**
     * Retrieves a value from the system's internal store.
     * @param key - The key to retrieve
     * @returns The stored value or undefined
     */
    getStoreValue(key: string): any {
        if (typeof key !== 'string') {
            return undefined;
        }
        return this.store.get(key);
    }

    /**
     * Removes a value from the system's internal store.
     * @param key - The key to remove
     * @returns True if the key existed and was removed
     */
    removeStoreValue(key: string): boolean {
        if (typeof key !== 'string') {
            return false;
        }
        return this.store.delete(key);
    }

    /**
     * Clears all values from the system's internal store.
     */
    clearStore(): void {
        this.store.clear();
    }

    /**
     * Validates that an entity object has a valid guid property.
     * @param entity - The entity to validate
     * @returns True if the entity is valid
     */
    private validateEntity(entity: any): entity is Entity {
        if (!entity) {
            return false;
        }
        if (typeof entity.guid !== 'string' || !entity.guid) {
            console.warn('Entity missing valid guid property');
            return false;
        }
        return true;
    }

    /**
     * Gets an iterator for all components in the system.
     * @returns Iterator of [guid, component] pairs
     */
    *[Symbol.iterator](): Iterator<[string, Component]> {
        yield* this.components.entries();
    }
}
