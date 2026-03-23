import { EventHandler } from '../core/eventhandler.js';

export class SceneRegistry extends EventHandler {
    private _scenes: Map<string, any>;

    constructor() {
        super();
        this._scenes = new Map<string, any>();
    }

    register(name: string, scene: any): void {
        if (typeof name !== 'string' || name.length === 0) {
            throw new Error('Scene name must be a non-empty string');
        }
        if (!scene) {
            throw new Error('Scene cannot be null or undefined');
        }
        this._scenes.set(name, scene);
        this.fire('add', name, scene);
    }

    get(name: string): any {
        if (typeof name !== 'string') {
            throw new Error('Scene name must be a string');
        }
        return this._scenes.get(name);
    }

    list(): string[] {
        return Array.from(this._scenes.keys());
    }

    clear(): void {
        const names = this.list();
        this._scenes.clear();
        names.forEach(name => this.fire('remove', name));
    }
}
