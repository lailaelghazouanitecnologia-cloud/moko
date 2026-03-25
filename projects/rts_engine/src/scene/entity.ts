import { Component } from './component';
import { GraphNode } from './graph-node';

/**
 * Container for components that represents an object in the scene
 */
export class Entity {
    id: string;
    components: Map<string, Component>;
    active: boolean;
    node: GraphNode;

    /**
     * Creates a new Entity instance
     * @param id - Unique identifier for the entity. Auto-generated if not provided
     */
    constructor(id: string = '') {
        this.id = id || generateId();
        this.components = new Map<string, Component>();
        this.active = true;
        this.node = new GraphNode();
    }

    /**
     * Attach a component instance to this entity
     * @param type - The type of component to add
     * @param data - Optional data to initialize the component with
     * @returns The newly created component
     * @throws {Error} If type is not a non-empty string
     */
    addComponent(type: string, data?: any): Component {
        if (!this.isValidComponentType(type)) {
            throw new Error('Component type must be a non-empty string');
        }

        const component = new Component();
        component.entity = this;
        component.enabled = true;
        component.id = type;
        
        if (data) {
            Object.assign(component, data);
        }
        
        this.components.set(type, component);
        return component;
    }

    /**
     * Detach a component by type
     * @param type - The type of component to remove
     * @throws {Error} If type is not a non-empty string
     */
    removeComponent(type: string): void {
        if (!this.isValidComponentType(type)) {
            throw new Error('Component type must be a non-empty string');
        }

        const component = this.components.get(type);
        if (component) {
            component.destroy();
            this.components.delete(type);
        }
    }

    /**
     * Retrieve a component by type
     * @param type - The type of component to get
     * @returns The component or null if not found
     * @throws {Error} If type is not a non-empty string
     */
    getComponent(type: string): Component | null {
        if (!this.isValidComponentType(type)) {
            throw new Error('Component type must be a non-empty string');
        }

        return this.components.get(type) || null;
    }

    /**
     * Check if a component exists
     * @param type - The type of component to check
     * @returns True if the component exists
     * @throws {Error} If type is not a non-empty string
     */
    hasComponent(type: string): boolean {
        if (!this.isValidComponentType(type)) {
            throw new Error('Component type must be a non-empty string');
        }

        return this.components.has(type);
    }

    /**
     * Toggle entity state
     * @param value - True to activate, false to deactivate
     */
    setActive(value: boolean): void {
        this.active = value;
        for (const component of this.components.values()) {
            if (value) {
                component.enable();
            } else {
                component.disable();
            }
        }
    }

    /**
     * Cleanup components and destroy the entity
     */
    destroy(): void {
        for (const component of this.components.values()) {
            component.destroy();
        }
        this.components.clear();
        this.active = false;
    }

    /**
     * Validate component type
     * @private
     */
    private isValidComponentType(type: string): boolean {
        return typeof type === 'string' && type.length > 0;
    }
}

/**
 * Generate a unique identifier for entities
 * @private
 */
function generateId(): string {
    return 'entity_' + Math.random().toString(36).substr(2, 9);
}
