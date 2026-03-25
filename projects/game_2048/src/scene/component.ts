import { Entity } from './entity';

/**
 * Base data container attached to entities.
 */
export class Component {
    entity: Entity;
    enabled: boolean;
    id: string;

    /**
     * Creates a new Component instance.
     * @param entity - The entity this component is attached to.
     * @throws {Error} Throws if entity is null or undefined.
     */
    constructor(entity: Entity) {
        if (!entity) {
            throw new Error('Component requires a valid entity');
        }
        this.entity = entity;
        this.enabled = true;
        this.id = `${entity.id}-component`;
    }

    /**
     * Sets up the component for use.
     * Override in derived classes for custom initialization logic.
     */
    init(): void {
        // Setup component
    }

    /**
     * Cleans up resources used by the component.
     * Override in derived classes for custom cleanup logic.
     */
    destroy(): void {
        // Cleanup resources
    }

    /**
     * Updates the component each frame.
     * @param dt - Delta time in seconds since last frame.
     * @throws {Error} Throws if dt is not a valid number.
     */
    update(dt: number): void {
        if (typeof dt !== 'number' || isNaN(dt) || dt < 0) {
            throw new Error('update requires a valid non-negative number for dt');
        }
        // Per frame logic
    }

    /**
     * Toggles the active state of the component.
     * @param flag - True to enable, false to disable.
     * @throws {Error} Throws if flag is not a boolean.
     */
    setEnabled(flag: boolean): void {
        if (typeof flag !== 'boolean') {
            throw new Error('setEnabled requires a boolean value');
        }
        this.enabled = flag;
    }

    /**
     * Checks if the component is enabled.
     * @returns True if the component is enabled, false otherwise.
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Creates a copy of this component.
     * @returns A new Component instance with the same properties.
     */
    clone(): Component {
        const cloned = new Component(this.entity);
        cloned.enabled = this.enabled;
        cloned.id = this.id;
        return cloned;
    }
}
