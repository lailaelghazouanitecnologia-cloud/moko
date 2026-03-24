import { Script } from './script';
import { Actor } from './actor';

/**
 * Manages registration, instantiation, and lifecycle of script templates and instances.
 */
export class ScriptRegistry {
    private scripts: Map<string, Script> = new Map();
    private instances: Map<number, Script> = new Map();
    private nextId: number = 1;

    /**
     * Registers a new script template under the given name.
     * @param name Unique name for the template.
     * @param script Script template to register.
     * @throws {TypeError} If name is not a non-empty string or script is not an object.
     */
    public register(name: string, script: Script): void {
        if (typeof name !== 'string' || name.trim().length === 0) {
            throw new TypeError('Template name must be a non-empty string');
        }
        if (typeof script !== 'object' || script === null) {
            throw new TypeError('Script template must be an object');
        }
        this.scripts.set(name.trim(), script);
    }

    /**
     * Creates a new script instance from a registered template and attaches it to an actor.
     * @param name Template name to instantiate.
     * @param actor Actor to which the script instance will be attached.
     * @returns Unique instance identifier.
     * @throws {Error} If template does not exist or actor is invalid.
     */
    public create(name: string, actor: Actor): number {
        if (typeof name !== 'string' || name.trim().length === 0) {
            throw new TypeError('Template name must be a non-empty string');
        }
        if (!actor || typeof actor !== 'object') {
            throw new TypeError('Actor must be a valid object');
        }

        const template = this.scripts.get(name.trim());
        if (!template) {
            throw new Error(`Script template '${name}' not found`);
        }

        const id = this.nextId++;
        const instance = Object.create(template);
        instance.actor = actor;
        this.instances.set(id, instance);

        if (instance.awake && typeof instance.awake === 'function') {
            instance.awake();
        }

        return id;
    }

    /**
     * Retrieves a script instance by its identifier.
     * @param id Instance identifier.
     * @returns Script instance.
     * @throws {TypeError} If id is not a number.
     * @throws {Error} If instance does not exist.
     */
    public get(id: number): Script {
        if (!Number.isInteger(id) || id <= 0) {
            throw new TypeError('Instance id must be a positive integer');
        }
        const instance = this.instances.get(id);
        if (!instance) {
            throw new Error(`Script instance with id ${id} not found`);
        }
        return instance;
    }

    /**
     * Destroys a script instance and calls its destroy method if present.
     * @param id Instance identifier.
     * @returns True if the instance was found and destroyed, false otherwise.
     * @throws {TypeError} If id is not a number.
     */
    public destroy(id: number): boolean {
        if (!Number.isInteger(id) || id <= 0) {
            throw new TypeType('Instance id must be a positive integer');
        }
        const instance = this.instances.get(id);
        if (!instance) {
            return false;
        }
        if (instance.destroy && typeof instance.destroy === 'function') {
            try {
                instance.destroy();
            } catch (err) {
                console.error(`Error during destroy of script instance ${id}:`, err);
            }
        }
        this.instances.delete(id);
        return true;
    }

    /**
     * Checks whether a template with the given name exists.
     * @param name Template name to check.
     * @returns True if template exists, false otherwise.
     * @throws {TypeError} If name is not a string.
     */
    public hasTemplate(name: string): boolean {
        if (typeof name !== 'string') {
            throw new TypeError('Template name must be a string');
        }
        return this.scripts.has(name.trim());
    }

    /**
     * Retrieves a registered script template by name.
     * @param name Template name.
     * @returns Script template.
     * @throws {TypeError} If name is not a non-empty string.
     * @throws {Error} If template does not exist.
     */
    public getTemplate(name: string): Script {
        if (typeof name !== 'string' || name.trim().length === 0) {
            throw new TypeError('Template name must be a non-empty string');
        }
        const template = this.scripts.get(name.trim());
        if (!template) {
            throw new Error(`Script template '${name}' not found`);
        }
        return template;
    }

    /**
     * Lists all registered template names.
     * @returns Array of template names.
     */
    public listTemplates(): string[] {
        return Array.from(this.scripts.keys());
    }

    /**
     * Calls update on all active script instances.
     * @param dt Delta time in seconds since last update.
     * @throws {TypeError} If dt is not a number.
     */
    public updateAll(dt: number): void {
        if (typeof dt !== 'number' || isNaN(dt)) {
            throw new TypeError('Delta time must be a valid number');
        }
        for (const instance of this.instances.values()) {
            if (instance.update && typeof instance.update === 'function') {
                try {
                    instance.update(dt);
                } catch (err) {
                    console.error('Error during script update:', err);
                }
            }
        }
    }

    /**
     * Destroys all instances and clears all templates and instances.
     */
    public clear(): void {
        for (const [id, instance] of this.instances.entries()) {
            if (instance.destroy && typeof instance.destroy === 'function') {
                try {
                    instance.destroy();
                } catch (err) {
                    console.error(`Error during destroy of script instance ${id}:`, err);
                }
            }
        }
        this.instances.clear();
        this.scripts.clear();
        this.nextId = 1;
    }

    /**
     * Returns the number of active script instances.
     */
    public get instanceCount(): number {
        return this.instances.size;
    }

    /**
     * Returns the number of registered templates.
     */
    public get templateCount(): number {
        return this.scripts.size;
    }

    /**
     * Checks whether a script instance exists by id.
     * @param id Instance identifier.
     * @returns True if instance exists, false otherwise.
     * @throws {TypeError} If id is not a number.
     */
    public hasInstance(id: number): boolean {
        if (!Number.isInteger(id) || id <= 0) {
            throw new TypeError('Instance id must be a positive integer');
        }
        return this.instances.has(id);
    }

    /**
     * Removes a template by name.
     * @param name Template name to unregister.
     * @returns True if template was removed, false if it did not exist.
     * @throws {TypeError} If name is not a string.
     */
    public unregister(name: string): boolean {
        if (typeof name !== 'string') {
            throw new TypeError('Template name must be a string');
        }
        return this.scripts.delete(name.trim());
    }

    /**
     * Calls a method on all active script instances.
     * @param methodName Name of the method to call.
     * @param args Arguments to pass to the method.
     */
    public broadcast(methodName: string, ...args: any[]): void {
        if (typeof methodName !== 'string' || methodName.trim().length === 0) {
            throw new TypeError('Method name must be a non-empty string');
        }
        for (const instance of this.instances.values()) {
            if (instance[methodName] && typeof instance[methodName] === 'function') {
                try {
                    instance[methodName](...args);
                } catch (err) {
                    console.error(`Error during broadcast of method '${methodName}':`, err);
                }
            }
        }
    }
}
