import { Component } from './component';
import { Entity } from './entity';

/**
 * Manages lifecycle and updates of components
 */
export class ComponentSystem {
    private components: Map<Entity, Component>;
    private enabled: boolean;

    constructor() {
        this.components = new Map<Entity, Component>();
        this.enabled = true;
    }

    /**
     * Attach component to entity
     * @param entity - The entity to attach the component to
     * @param component - The component to attach
     * @throws {Error} If entity or component is invalid
     */
    add(entity: Entity, component: Component): void {
        if (!entity) {
            throw new Error('Entity cannot be null or undefined');
        }
        if (!component) {
            throw new Error('Component cannot be null or undefined');
        }
        if (this.components.has(entity)) {
            console.warn(`ComponentSystem: Entity ${entity.id} already has a component. Overwriting existing component.`);
        }
        this.components.set(entity, component);
    }

    /**
     * Detach component from entity
     * @param entity - The entity to remove the component from
     * @throws {Error} If entity is invalid
     */
    remove(entity: Entity): void {
        if (!entity) {
            throw new Error('Entity cannot be null or undefined');
        }
        if (!this.components.has(entity)) {
            console.warn(`ComponentSystem: Entity ${entity.id} does not have a component to remove.`);
        }
        this.components.delete(entity);
    }

    /**
     * Retrieve component attached to entity
     * @param entity - The entity to get the component from
     * @returns The component or undefined if not found
     * @throws {Error} If entity is invalid
     */
    get(entity: Entity): Component | undefined {
        if (!entity) {
            throw new Error('Entity cannot be null or undefined');
        }
        return this.components.get(entity);
    }

    /**
     * Tick all components
     * @param dt - Delta time in seconds
     * @throws {Error} If dt is invalid
     */
    update(dt: number): void {
        if (typeof dt !== 'number' || dt < 0) {
            throw new Error('dt must be a non-negative number');
        }
        if (!this.enabled) return;
        
        for (const component of this.components.values()) {
            if (component.enabled) {
                component.update(dt);
            }
        }
    }

    /**
     * Activate system
     */
    enable(): void {
        this.enabled = true;
    }

    /**
     * Deactivate system
     */
    disable(): void {
        this.enabled = false;
    }

    /**
     * Remove all components
     */
    clear(): void {
        this.components.clear();
    }

    /**
     * Check if system is enabled
     * @returns True if enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get count of components
     * @returns Number of components
     */
    size(): number {
        return this.components.size;
    }

    /**
     * Check if entity has component
     * @param entity - The entity to check
     * @returns True if entity has component
     * @throws {Error} If entity is invalid
     */
    has(entity: Entity): boolean {
        if (!entity) {
            throw new Error('Entity cannot be null or undefined');
        }
        return this.components.has(entity);
    }

    /**
     * Get all entities with components
     * @returns Array of entities
     */
    getEntities(): Entity[] {
        return Array.from(this.components.keys());
    }

    /**
     * Get all components
     * @returns Array of components
     */
    getComponents(): Component[] {
        return Array.from(this.components.values());
    }
}
