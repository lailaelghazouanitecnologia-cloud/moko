import { Entity } from './entity';

/**
 * Base attachable scene data
 */
export class Component {
    entity: Entity;
    enabled: boolean;
    id: string;

    constructor() {
        this.entity = null as any;
        this.enabled = true;
        this.id = '';
    }

    /**
     * Setup resources
     * @throws {Error} If initialization fails
     */
    init(): void {
        try {
            this.validateRequiredFields();
            this.onInit();
        } catch (error) {
            throw new Error(`Component.init() failed for id=${this.id}: ${error instanceof Error ? error.message : error}`);
        }
    }

    /**
     * Cleanup resources
     * @throws {Error} If cleanup fails
     */
    destroy(): void {
        try {
            this.onDestroy();
        } catch (error) {
            throw new Error(`Component.destroy() failed for id=${this.id}: ${error instanceof Error ? error.message : error}`);
        }
    }

    /**
     * Per frame logic
     * @param dt - Delta time in seconds
     * @throws {Error} If update fails
     */
    update(dt: number): void {
        if (!this.enabled) return;
        
        try {
            this.validateDeltaTime(dt);
            this.onUpdate(dt);
        } catch (error) {
            throw new Error(`Component.update() failed for id=${this.id}: ${error instanceof Error ? error.message : error}`);
        }
    }

    /**
     * Activate component
     */
    enable(): void {
        this.enabled = true;
        this.onEnable();
    }

    /**
     * Deactivate component
     */
    disable(): void {
        this.enabled = false;
        this onDisable();
    }

    /**
     * Duplicate instance
     * @returns A new component instance with copied values
     * @throws {Error} If cloning fails
     */
    clone(): Component {
        try {
            const copy = new Component();
            if (!this.entity) {
                throw new Error('Cannot clone: entity is null');
            }
            copy.entity = this.entity;
            copy.enabled = this.enabled;
            copy.id = this.id || this.generateId();
            return copy;
        } catch (error) {
            throw new Error(`Component.clone() failed: ${error instanceof Error ? error.message : error}`);
        }
    }

    /**
     * Validate required fields before initialization
     * @throws {Error} If validation fails
     */
    private validateRequiredFields(): void {
        if (!this.id || typeof this.id !== 'string') {
            throw new Error('Component ID must be a non-empty string');
        }
        if (!this.entity) {
            throw new Error('Component must be attached to an entity');
        }
    }

    /**
     * Validate delta time parameter
     * @param dt - Delta time in seconds
     * @throws {Error} If dt is invalid
     */
    private validateDeltaTime(dt: number): void {
        if (typeof dt !== 'number' || isNaN(dt) || dt < 0) {
            throw new Error('Delta time must be a non-negative number');
        }
    }

    /**
     * Generate a unique ID for the component
     * @returns A unique ID string
     */
    private generateId(): string {
        return `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Hook for initialization logic (to be overridden by subclasses)
     */
    protected onInit(): void {
        // To be implemented by derived classes
    }

    /**
     * Hook for cleanup logic (to be overridden by subclasses)
     */
    protected onDestroy(): void {
        // To be implemented by derived classes
    }

    /**
     * Hook for update logic (to be overridden by subclasses)
     */
    protected onUpdate(dt: number): void {
        // To be implemented by derived classes
    }

    /**
     * Hook for enable logic (to be overridden by subclasses)
     */
    protected onEnable(): void {
        // To be implemented by derived classes
    }

    /**
     * Hook for disable logic (to be overridden by subclasses)
     */
    protected onDisable(): void {
        // To be implemented by derived classes
    }
}
