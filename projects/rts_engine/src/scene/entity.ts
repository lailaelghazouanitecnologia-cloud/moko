import { Mat4 } from '../math/mat4';
import { Component } from './component';
import { SceneNode } from './scene-node';

/**
 * Represents an object in the scene that can hold components and be part of a hierarchy.
 */
export class Entity extends SceneNode {
    private components: Map<string, Component> = new Map();
    private guid: string = this.generateGuid();
    private name: string = '';

    constructor(name?: string) {
        super();
        if (name) {
            this.name = name;
        }
    }

    /**
     * Adds a component of the specified type to this entity.
     * @param type - The type of component to add
     * @param options - Optional configuration for the component
     * @returns The created component or null if the component system is not found
     */
    addComponent(type: string, options?: any): Component | null {
        if (!type || typeof type !== 'string') {
            console.warn('Entity.addComponent: Invalid component type provided');
            return null;
        }

        const system = this.getComponentSystem(type);
        if (!system) {
            console.warn(`Entity.addComponent: Component system for type '${type}' not found`);
            return null;
        }

        try {
            const component = system.createComponent(this, options);
            if (!component) {
                console.warn(`Entity.addComponent: Failed to create component of type '${type}'`);
                return null;
            }
            this.components.set(type, component);
            return component;
        } catch (error) {
            console.error(`Entity.addComponent: Error creating component of type '${type}'`, error);
            return null;
        }
    }

    /**
     * Removes a component of the specified type from this entity.
     * @param type - The type of component to remove
     * @returns True if the component was found and removed, false otherwise
     */
    removeComponent(type: string): boolean {
        if (!type || typeof type !== 'string') {
            console.warn('Entity.removeComponent: Invalid component type provided');
            return false;
        }

        const component = this.components.get(type);
        if (!component) {
            return false;
        }

        try {
            component.destroy();
            this.components.delete(type);
            return true;
        } catch (error) {
            console.error(`Entity.removeComponent: Error removing component of type '${type}'`, error);
            return false;
        }
    }

    /**
     * Gets a component of the specified type from this entity.
     * @param type - The type of component to retrieve
     * @returns The component or null if not found
     */
    getComponent(type: string): Component | null {
        if (!type || typeof type !== 'string') {
            console.warn('Entity.getComponent: Invalid component type provided');
            return null;
        }
        return this.components.get(type) || null;
    }

    /**
     * Gets all components attached to this entity.
     * @returns An array of all components
     */
    getComponents(): Component[] {
        return Array.from(this.components.values());
    }

    /**
     * Checks if this entity has a component of the specified type.
     * @param type - The type of component to check for
     * @returns True if the component exists, false otherwise
     */
    hasComponent(type: string): boolean {
        if (!type || typeof type !== 'string') {
            return false;
        }
        return this.components.has(type);
    }

    /**
     * Destroys this entity and all its components.
     */
    destroy(): void {
        try {
            for (const component of this.components.values()) {
                component.destroy();
            }
            this.components.clear();
            super.destroy();
        } catch (error) {
            console.error('Entity.destroy: Error during destruction', error);
        }
    }

    /**
     * Creates a deep clone of this entity including all components and children.
     * @returns A new Entity instance that is a clone of this one
     */
    clone(): Entity {
        try {
            const clone = new Entity(this.name);
            clone.localTransform = new Mat4(this.localTransform);
            clone.worldTransform = new Mat4(this.worldTransform);
            clone.enabled = this.enabled;

            for (const [type, component] of this.components) {
                const system = this.getComponentSystem(type);
                if (system && system.cloneComponent) {
                    const clonedComponent = system.cloneComponent(component);
                    if (clonedComponent) {
                        clonedComponent.entity = clone;
                        clone.components.set(type, clonedComponent);
                    }
                }
            }

            for (const child of this.children) {
                if (child instanceof Entity) {
                    const clonedChild = child.clone();
                    clone.addChild(clonedChild);
                }
            }

            return clone;
        } catch (error) {
            console.error('Entity.clone: Error cloning entity', error);
            return new Entity(this.name);
        }
    }

    /**
     * Finds an entity by its GUID in this entity's hierarchy.
     * @param guid - The GUID to search for
     * @returns The found entity or null if not found
     */
    findByGuid(guid: string): Entity | null {
        if (!guid || typeof guid !== 'string') {
            console.warn('Entity.findByGuid: Invalid GUID provided');
            return null;
        }

        if (this.guid === guid) {
            return this;
        }

        for (const child of this.children) {
            if (child instanceof Entity) {
                const found = child.findByGuid(guid);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    /**
     * Finds an entity by its name in this entity's hierarchy.
     * @param name - The name to search for
     * @returns The first entity with matching name or null if not found
     */
    findByName(name: string): Entity | null {
        if (!name || typeof name !== 'string') {
            console.warn('Entity.findByName: Invalid name provided');
            return null;
        }

        if (this.name === name) {
            return this;
        }

        for (const child of this.children) {
            if (child instanceof Entity) {
                const found = child.findByName(name);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    /**
     * Finds entities by name in this entity's hierarchy.
     * @param name - The name to search for
     * @returns An array of all entities with matching names
     */
    findAllByName(name: string): Entity[] {
        if (!name || typeof name !== 'string') {
            return [];
        }

        const results: Entity[] = [];
        this.findAllByNameRecursive(name, results);
        return results;
    }

    private findAllByNameRecursive(name: string, results: Entity[]): void {
        if (this.name === name) {
            results.push(this);
        }

        for (const child of this.children) {
            if (child instanceof Entity) {
                child.findAllByNameRecursive(name, results);
            }
        }
    }

    /**
     * Finds an entity by a path relative to this entity.
     * @param path - The path to search for (e.g., "child/grandchild" or "../sibling")
     * @returns The found entity or null if not found
     */
    findByPath(path: string): Entity | null {
        if (!path || typeof path !== 'string') {
            console.warn('Entity.findByPath: Invalid path provided');
            return null;
        }

        const parts = path.split('/').filter(part => part.length > 0);
        if (parts.length === 0) {
            return this;
        }

        let current: Entity = this;

        for (const part of parts) {
            if (part === '..') {
                if (!current.parent || !(current.parent instanceof Entity)) {
                    return null;
                }
                current = current.parent as Entity;
            } else if (part === '.') {
                continue;
            } else {
                const child = current.findByName(part);
                if (!child) {
                    return null;
                }
                current = child;
            }
        }

        return current;
    }

    /**
     * Gets the GUID of this entity.
     * @returns The GUID string
     */
    getGuid(): string {
        return this.guid;
    }

    /**
     * Gets the name of this entity.
     * @returns The name string
     */
    getName(): string {
        return this.name;
    }

    /**
     * Sets the name of this entity.
     * @param name - The new name
     */
    setName(name: string): void {
        if (!name || typeof name !== 'string') {
            console.warn('Entity.setName: Invalid name provided');
            return;
        }
        this.name = name;
    }

    /**
     * Gets the number of components attached to this entity.
     * @returns The component count
     */
    getComponentCount(): number {
        return this.components.size;
    }

    /**
     * Gets all component types attached to this entity.
     * @returns An array of component type strings
     */
    getComponentTypes(): string[] {
        return Array.from(this.components.keys());
    }

    private generateGuid(): string {
        return 'entity_' + Math.random().toString(36).substr(2, 9);
    }

    private getComponentSystem(type: string): any {
        // This would typically be implemented to retrieve the component system
        // from a registry or manager. For now, return null as placeholder.
        return null;
    }
}
