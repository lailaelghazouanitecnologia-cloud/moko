import { GraphicsDevice } from './graphics-device';

/**
 * GPU resource binding namespace.
 * Manages named bindings of GPU resources that can be applied to a GraphicsDevice.
 */
export class ScopeSpace {
    id: string;
    bindings: Map<string, any>;

    /**
     * Creates a new ScopeSpace instance.
     * @param id - Optional identifier for this scope space. Defaults to empty string.
     */
    constructor(id: string = '') {
        if (typeof id !== 'string') {
            throw new TypeError('ScopeSpace id must be a string');
        }
        this.id = id;
        this.bindings = new Map<string, any>();
    }

    /**
     * Attach a resource to this scope space with a given name.
     * @param name - The name to bind the resource under
     * @param resource - The resource to bind
     * @throws {TypeError} If name is not a string
     */
    bind(name: string, resource: any): void {
        if (typeof name !== 'string') {
            throw new TypeError('Binding name must be a string');
        }
        if (name.length === 0) {
            throw new Error('Binding name cannot be empty');
        }
        this.bindings.set(name, resource);
    }

    /**
     * Detach a resource from this scope space by name.
     * @param name - The name of the resource to unbind
     * @throws {TypeError} If name is not a string
     */
    unbind(name: string): void {
        if (typeof name !== 'string') {
            throw new TypeError('Binding name must be a string');
        }
        this.bindings.delete(name);
    }

    /**
     * Remove all bindings from this scope space.
     */
    clear(): void {
        this.bindings.clear();
    }

    /**
     * Check if a binding exists with the given name.
     * @param name - The name to check
     * @returns True if a binding exists for the name, false otherwise
     * @throws {TypeError} If name is not a string
     */
    has(name: string): boolean {
        if (typeof name !== 'string') {
            throw new TypeError('Binding name must be a string');
        }
        return this.bindings.has(name);
    }

    /**
     * Retrieve a bound resource by name.
     * @param name - The name of the resource to retrieve
     * @returns The bound resource, or undefined if not found
     * @throws {TypeError} If name is not a string
     */
    get(name: string): any {
        if (typeof name !== 'string') {
            throw new TypeError('Binding name must be a string');
        }
        return this.bindings.get(name);
    }

    /**
     * Apply all bound resources to the GPU device.
     * @param device - The GraphicsDevice to apply resources to
     * @throws {TypeError} If device is not a valid GraphicsDevice
     */
    apply(device: GraphicsDevice): void {
        if (!device || typeof device !== 'object') {
            throw new TypeError('Invalid GraphicsDevice provided');
        }
        for (const [name, resource] of this.bindings) {
            if (resource && typeof resource.bind === 'function') {
                resource.bind(device);
            } else if (resource && typeof resource.apply === 'function') {
                resource.apply(device);
            }
        }
    }

    /**
     * Get the number of bindings in this scope space.
     * @returns The number of bindings
     */
    get size(): number {
        return this.bindings.size;
    }

    /**
     * Get all binding names in this scope space.
     * @returns An array of binding names
     */
    getBindingNames(): string[] {
        return Array.from(this.bindings.keys());
    }

    /**
     * Clone this scope space with optional new id.
     * @param newId - Optional new id for the cloned scope space
     * @returns A new ScopeSpace instance with copied bindings
     */
    clone(newId?: string): ScopeSpace {
        const cloned = new ScopeSpace(newId ?? this.id);
        for (const [name, resource] of this.bindings) {
            cloned.bind(name, resource);
        }
        return cloned;
    }

    /**
     * Merge another scope space into this one.
     * @param other - The ScopeSpace to merge into this one
     * @param overwrite - Whether to overwrite existing bindings (default: true)
     * @throws {TypeError} If other is not a ScopeSpace instance
     */
    merge(other: ScopeSpace, overwrite: boolean = true): void {
        if (!(other instanceof ScopeSpace)) {
            throw new TypeError('Can only merge with another ScopeSpace');
        }
        for (const [name, resource] of other.bindings) {
            if (overwrite || !this.has(name)) {
                this.bind(name, resource);
            }
        }
    }
}
