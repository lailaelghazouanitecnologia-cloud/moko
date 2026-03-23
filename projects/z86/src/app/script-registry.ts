import { EventEmitter } from '../core';
import { Application } from './application';

interface ScriptConstructor {
    new (app: Application): Script;
}

interface Script {
    initialize?: () => void;
    postInitialize?: () => void;
    update?: (dt: number) => void;
    postUpdate?: (dt: number) => void;
    swap?: (old: Script) => void;
    destroy?: () => void;
    attributes?: Record<string, any>;
}

class ScriptRegistry extends EventEmitter {
    private app: Application;
    private scripts: Map<string, ScriptConstructor> = new Map();
    private instances: Map<string, Script[]> = new Map();

    constructor(app: Application) {
        super();
        this.app = app;
    }

    add(name: string, constructor: ScriptConstructor): void {
        if (this.scripts.has(name)) {
            throw new Error(`Script '${name}' is already registered`);
        }
        this.scripts.set(name, constructor);
        this.emit('add', name, constructor);
    }

    remove(name: string): void {
        if (!this.scripts.has(name)) {
            throw new Error(`Script '${name}' is not registered`);
        }
        this.scripts.delete(name);
        this.emit('remove', name);
    }

    has(name: string): boolean {
        return this.scripts.has(name);
    }

    list(): string[] {
        return Array.from(this.scripts.keys());
    }

    create(name: string): Script {
        const Constructor = this.scripts.get(name);
        if (!Constructor) {
            throw new Error(`Script '${name}' is not registered`);
        }
        const instance = new Constructor(this.app);
        if (!this.instances.has(name)) {
            this.instances.set(name, []);
        }
        this.instances.get(name)!.push(instance);
        this.emit('create', name, instance);
        return instance;
    }

    destroy(name: string, instance: Script): void {
        const list = this.instances.get(name);
        if (!list) return;
        const index = list.indexOf(instance);
        if (index !== -1) {
            list.splice(index, 1);
            if (instance.destroy) {
                instance.destroy();
            }
            this.emit('destroy', name, instance);
        }
    }

    destroyAll(name: string): void {
        const list = this.instances.get(name);
        if (!list) return;
        while (list.length > 0) {
            const instance = list.pop()!;
            if (instance.destroy) {
                instance.destroy();
            }
            this.emit('destroy', name, instance);
        }
    }

    get(name: string): Script[] {
        return this.instances.get(name) || [];
    }

    forEach(callback: (name: string, constructor: ScriptConstructor) => void): void {
        this.scripts.forEach((constructor, name) => {
            callback(name, constructor);
        });
    }

    clear(): void {
        this.instances.forEach((list, name) => {
            this.destroyAll(name);
        });
        this.instances.clear();
        this.scripts.clear();
        this.emit('clear');
    }
}

export { ScriptRegistry };
