import { ResourceLoader } from '../core';
import { Entity } from '../scene';

interface SceneTemplate {
    url: string;
    data?: any;
}

export class Scene {
    root: Entity;

    constructor() {
        this.root = new Entity('Root');
    }
}

export class SceneRegistry {
    private _scenes: Map<string, SceneTemplate>;
    private _loader: ResourceLoader;

    constructor(loader: ResourceLoader) {
        this._scenes = new Map();
        this._loader = loader;
    }

    add(name: string, url: string): void {
        this._scenes.set(name, { url });
    }

    remove(name: string): void {
        this._scenes.delete(name);
    }

    has(name: string): boolean {
        return this._scenes.has(name);
    }

    get(name: string): SceneTemplate {
        const template = this._scenes.get(name);
        if (!template) {
            throw new Error(`Scene '${name}' not found in registry`);
        }
        return template;
    }

    async load(name: string): Promise<Scene> {
        const template = this.get(name);
        if (!template.data) {
            template.data = await this._loader.loadJson(template.url);
        }
        return this._createScene(template.data);
    }

    async loadFromUrl(url: string): Promise<Scene> {
        const data = await this._loader.loadJson(url);
        return this._createScene(data);
    }

    list(): string[] {
        return Array.from(this._scenes.keys());
    }

    clear(): void {
        this._scenes.clear();
    }

    private _createScene(data: any): Scene {
        const scene = new Scene();
        
        if (data.entities) {
            for (const entityData of data.entities) {
                const entity = new Entity(entityData.name || 'Entity');
                this._applyEntityData(entity, entityData);
                scene.root.addChild(entity);
            }
        }

        return scene;
    }

    private _applyEntityData(entity: Entity, data: any): void {
        if (data.position) {
            entity.setPosition(data.position.x || 0, data.position.y || 0, data.position.z || 0);
        }
        if (data.rotation) {
            entity.setEulerAngles(data.rotation.x || 0, data.rotation.y || 0, data.rotation.z || 0);
        }
        if (data.scale) {
            entity.setLocalScale(data.scale.x || 1, data.scale.y || 1, data.scale.z || 1);
        }
    }
}
