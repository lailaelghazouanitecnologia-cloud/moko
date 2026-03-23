import { EventEmitter } from '../core';
import { Scene } from '../scene';

export class SceneRegistry extends EventEmitter {
    private _scenes: Map<string, Scene> = new Map();

    register(sceneId: string, scene: Scene): void {
        this._scenes.set(sceneId, scene);
        this.emit('register', sceneId, scene);
    }

    get(sceneId: string): Scene | undefined {
        return this._scenes.get(sceneId);
    }

    has(sceneId: string): boolean {
        return this._scenes.has(sceneId);
    }

    delete(sceneId: string): boolean {
        const result = this._scenes.delete(sceneId);
        if (result) {
            this.emit('delete', sceneId);
        }
        return result;
    }

    clear(): void {
        this._scenes.clear();
        this.emit('clear');
    }

    keys(): IterableIterator<string> {
        return this._scenes.keys();
    }
}
