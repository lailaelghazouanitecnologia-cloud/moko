import { Entity } from '../scene';

export interface Script {
    entity: Entity;
    enabled: boolean;
    initialize(): void;
    update(deltaTime: number): void;
    fixedUpdate(deltaTime: number): void;
    onEnable(): void;
    onDisable(): void;
    destroy(): void;
}

export interface ScriptConstructor {
    new (entity: Entity): Script;
}

export class ScriptRegistry {
    private _scripts: Map<string, ScriptConstructor> = new Map();
    private _instances: Set<Script> = new Set();

    constructor() {
        this._scripts = new Map();
        this._instances = new Set();
    }

    add(name: string, constructor: ScriptConstructor): void {
        this._scripts.set(name, constructor);
    }

    remove(name: string): void {
        this._scripts.delete(name);
    }

    has(name: string): boolean {
        return this._scripts.has(name);
    }

    get(name: string): ScriptConstructor {
        const constructor = this._scripts.get(name);
        if (!constructor) {
            throw new Error(`Script '${name}' not found in registry`);
        }
        return constructor;
    }

    create(name: string, entity: Entity): Script {
        const Constructor = this.get(name);
        const instance = new Constructor(entity);
        this._instances.add(instance);
        return instance;
    }

    destroy(script: Script): void {
        script.destroy();
        this._instances.delete(script);
    }

    list(): string[] {
        return Array.from(this._scripts.keys());
    }

    clear(): void {
        for (const instance of this._instances) {
            instance.destroy();
        }
        this._instances.clear();
        this._scripts.clear();
    }

    update(deltaTime: number): void {
        for (const instance of this._instances) {
            if (instance.enabled) {
                instance.update(deltaTime);
            }
        }
    }

    onEnable(): void {
        for (const instance of this._instances) {
            instance.onEnable();
        }
    }

    onDisable(): void {
        for (const instance of this._instances) {
            instance.onDisable();
        }
    }

    onFixedUpdate(deltaTime: number): void {
        for (const instance of this._instances) {
            if (instance.enabled) {
                instance.fixedUpdate(deltaTime);
            }
        }
    }
}
