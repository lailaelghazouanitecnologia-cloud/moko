import { EventEmitter } from '../core';
import { ResourceLoader } from '../core';

export class AssetRegistry extends EventEmitter {
    private assets: Map<string, any> = new Map();
    private loader: ResourceLoader;

    constructor(loader: ResourceLoader) {
        super();
        this.loader = loader;
    }

    register(name: string, asset: any): void {
        if (this.assets.has(name)) {
            throw new Error(`Asset with name "${name}" is already registered.`);
        }
        this.assets.set(name, asset);
        this.emit('register', name, asset);
    }

    get(name: string): any {
        if (!this.assets.has(name)) {
            throw new Error(`Asset with name "${name}" is not found.`);
        }
        return this.assets.get(name);
    }

    list(): string[] {
        return Array.from(this.assets.keys());
    }
}
