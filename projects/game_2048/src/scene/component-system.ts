import { Component } from './component';
import { Entity } from './entity';

/**
 * Abstract base class for managing components of a specific type.
 * Handles component lifecycle, updates, and entity-to-component mapping.
 */
export abstract class ComponentSystem {
    protected components: Component[] = [];
    protected entities: Map<Entity, Component[]> = new Map();

    constructor(protected name: string) {}

    /**
     * Factory method to create a new component instance for the given entity.
     * @param entity - The entity to which the component will be attached.
     * @returns A new instance of the component.
     */
    abstract createComponent(entity: Entity): Component;

    /**
     * Adds a component to the specified entity.
     * @param entity - The entity to which the component will be added.
     * @param component - The component instance to add.
     * @throws {Error} If entity or component is invalid.
     */
    addComponent(entity: Entity, component: Component): void {
        if (!entity) {
            throw new Error('Entity is required');
        }
        if (!component) {
            throw new Error('Component is required');
        }
        if (!this.entities.has(entity)) {
            this.entities.set(entity, []);
        }
        this.entities.get(entity)!.push(component);
        this.components.push(component);
    }

    /**
     * Removes a component from the specified entity.
     * @param entity - The entity from which the component will be removed.
     * @param component - The component instance to remove.
     * @throws {Error} If entity or component is invalid.
     */
    removeComponent(entity: Entity, component: Component): void {
        if (!entity) {
            throw new Error('Entity is required');
        }
        if (!component) {
            throw new Error('Component is required');
        }
        const entityComponents = this.entities.get(entity);
        if (entityComponents) {
            const index = entityComponents.indexOf(component);
            if (index !== -1) {
                entityComponents.splice(index, 1);
            }
            if (entityComponents.length === 0) {
                this.entities.delete(entity);
            }
        }
        const componentIndex = this.components.indexOf(component);
        if (componentIndex !== -1) {
            this.components.splice(componentIndex, 1);
        }
    }

    /**
     * Retrieves all components attached to the specified entity.
     * @param entity - The entity whose components are to be retrieved.
     * @returns An array of components attached to the entity, or empty array if none.
     * @throws {Error} If entity is invalid.
     */
    getComponents(entity: Entity): Component[] {
        if (!entity) {
            throw new Error('Entity is required');
        }
        return this.entities.get(entity) || [];
    }

    /**
     * Retrieves the first component of the specified type attached to the entity.
     * @param entity - The entity whose component is to be retrieved.
     * @param type - The constructor of the component type to find.
     * @returns The first matching component, or null if none found.
     * @throws {Error} If entity or type is invalid.
     */
    getComponent<T extends Component>(entity: Entity, type: new (...args: any[]) => T): T | null {
        if (!entity) {
            throw new Error('Entity is required');
        }
        if (!type) {
            throw new Error('Component type is required');
        }
        const entityComponents = this.entities.get(entity);
        if (entityComponents) {
            for (const component of entityComponents) {
                if (component instanceof type) {
                    return component;
                }
            }
        }
        return null;
    }

    /**
     * Updates all enabled components in the system.
     * @param dt - Delta time in seconds since last update.
     */
    update(dt: number): void {
        if (typeof dt !== 'number' || dt < 0) {
            throw new Error('dt must be a non-negative number');
        }
        for (const component of this.components) {
            if (component.enabled) {
                component.update(dt);
            }
        }
    }

    /**
     * Destroys all components and clears internal state.
     */
    destroy(): void {
        for (const component of this.components) {
            component.destroy();
        }
        this.components.length = 0;
        this.entities.clear();
    }

    /**
     * Gets the name of this system.
     * @returns The system name.
     */
    get name(): string {
        return this.name;
    }

    /**
     * Checks if the specified entity has any components in this system.
     * @param entity - The entity to check.
     * @returns True if the entity has components, false otherwise.
     * @throws {Error} If entity is invalid.
     */
    hasEntity(entity: Entity): boolean {
        if (!entity) {
            throw new Error('Entity is required');
        }
        return this.entities.has(entity);
    }

    /**
     * Removes all components from the specified entity.
     * @param entity - The entity whose components will be removed.
     * @throws {Error} If entity is invalid.
     */
    removeEntity(entity: Entity): void {
        if (!entity) {
            throw new Error('Entity is required');
        }
        const entityComponents = this.entities.get(entity);
        if (entityComponents) {
            for (const component of entityComponents) {
                const index = this.components.indexOf(component);
                if (index !== -1) {
                    this.components.splice(index, 1);
                }
                component.destroy();
            }
            this.entities.delete(entity);
        }
    }

    /**
     * Retrieves all entities that have components in this system.
     * @returns An array of entities.
     */
    getEntities(): Entity[] {
        return Array.from(this.entities.keys());
    }

    /**
     * Retrieves the count of components in this system.
     * @returns The number of components.
     */
    getComponentCount(): number {
        return this.components.length;
    }

    /**
     * Retrieves the count of entities with components in this system.
     * @returns The number of entities.
     */
    getEntityCount(): number {
        return this.entities.size;
    }
}
