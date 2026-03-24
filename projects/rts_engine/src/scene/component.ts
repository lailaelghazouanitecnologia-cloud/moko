import { Entity } from './entity';

/**
 * Base class for all components that can be attached to entities.
 * Components encapsulate reusable behavior and data that can be added to entities.
 */
export abstract class Component {
    protected entity: Entity;
    protected enabled: boolean;

    /**
     * Creates a new component instance attached to the specified entity.
     * @param entity - The entity this component belongs to
     * @throws {Error} If entity is null or undefined
     */
    constructor(entity: Entity) {
        if (!entity) {
            throw new Error('Entity cannot be null or undefined');
        }
        this.entity = entity;
        this.enabled = true;
    }

    /**
     * Called once when the component is initialized.
     * Override this method to perform setup logic.
     * @virtual
     */
    init(): void {
        // Override for setup
    }

    /**
     * Called every frame with the delta time since the last frame.
     * Override this method to implement per-frame update logic.
     * @param dt - Delta time in seconds since last frame
     * @virtual
     */
    update(dt: number): void {
        // Per frame logic
    }

    /**
     * Called when the component is being destroyed.
     * Override this method to cleanup resources.
     * @virtual
     */
    destroy(): void {
        // Cleanup resources
    }

    /**
     * Gets the entity this component is attached to.
     * @returns The parent entity
     */
    getEntity(): Entity {
        return this.entity;
    }

    /**
     * Checks if this component is currently enabled.
     * @returns True if the component is enabled, false otherwise
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Sets the enabled state of this component.
     * @param enabled - Whether to enable or disable the component
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Called when the component is enabled.
     * Override this method to handle enable logic.
     * @virtual
     */
    onEnable(): void {
        // Override for enable logic
    }

    /**
     * Called when the component is disabled.
     * Override this method to handle disable logic.
     * @virtual
     */
    onDisable(): void {
        // Override for disable logic
    }

    /**
     * Gets the name of this component type.
     * Override this method to provide a custom name.
     * @returns The component type name
     * @virtual
     */
    getName(): string {
        return this.constructor.name;
    }

    /**
     * Checks if this component is of a specific type.
     * @param componentType - The component type to check against
     * @returns True if this component is of the specified type
     */
    isType<T extends Component>(componentType: new (...args: any[]) => T): boolean {
        return this instanceof componentType;
    }

    /**
     * Gets a string representation of this component.
     * @returns String representation including component name and entity
     */
    toString(): string {
        return `${this.getName()}(entity: ${this.entity.getId()}, enabled: ${this.enabled})`;
    }

    /**
     * Validates the current state of the component.
     * Override this method to add custom validation logic.
     * @returns True if the component state is valid
     * @virtual
     */
    validate(): boolean {
        return this.entity !== null && this.entity !== undefined;
    }

    /**
     * Called when the parent entity is destroyed.
     * Override this method to handle entity destruction.
     * @virtual
     */
    onEntityDestroyed(): void {
        // Override for entity destruction handling
    }

    /**
     * Resets the component to its initial state.
     * Override this method to implement reset logic.
     * @virtual
     */
    reset(): void {
        this.enabled = true;
    }

    /**
     * Creates a deep copy of this component.
     * Override this method to implement proper cloning.
     * @param newEntity - The entity to attach the cloned component to
     * @returns A new component instance
     * @virtual
     */
    clone(newEntity: Entity): Component {
        const cloned = new (this.constructor as any)(newEntity);
        cloned.enabled = this.enabled;
        return cloned;
    }

    /**
     * Compares this component with another component for equality.
     * @param other - The component to compare with
     * @returns True if the components are equal
     */
    equals(other: Component): boolean {
        if (!other) return false;
        return this.entity === other.entity && 
               this.enabled === other.enabled &&
               this.constructor === other.constructor;
    }
}
