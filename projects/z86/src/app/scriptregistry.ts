import { EventEmitter } from '../core/eventemitter';
import { Script } from './script';

export class ScriptRegistry extends EventEmitter {
    private _scripts: Map<string, Script>;

    constructor() {
        super();
        this._scripts = new Map<string, Script>();
    }

    register(name: string, script: Script): void {
        if (this._scripts.has(name)) {
            throw new Error(`Script '${name}' is already registered`);
        }
        this._scripts.set(name, script);
        this.emit('register', name, script);
    }

    get(name: string): Script | undefined {
        return this._scripts.get(name);
    }

    list(): string[] {
        return Array.from(this._scripts.keys());
    }

    remove(name: string): boolean {
        const script = this._scripts.get(name);
        if (!script) {
            return false;
        }
        this._scripts.delete(name);
        this.emit('remove', name, script);
        return true;
    }
}
