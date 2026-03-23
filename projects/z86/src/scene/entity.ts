import { GraphNode } from './graph-node';
import { Component } from './component';
import { Camera } from './camera';
import { Light } from './light';
import { MeshRenderer } from './mesh-renderer';
import { EventEmitter } from '../core';

export class Entity extends GraphNode {
    c: { [key: string]: Component } = {};
    _guid: string = '';
    anim: Component | null = null;
    camera: Camera | null = null;
    collision: Component | null = null;
    light: Light | null = null;
    model: Component | null = null;
    render: MeshRenderer | null = null;
    script: Component | null = null;
    sprite: Component | null = null;
    sound: Component | null = null;

    constructor(name?: string) {
        super(name);
        this._guid = this.generateGuid();
    }

    private generateGuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    addComponent(type: string, data?: any): Component | null {
        const system = this.getComponentSystem(type);
        if (!system) {
            console.warn(`Entity.addComponent: System '${type}' not found`);
            return null;
        }

        if (this.c[type]) {
            console.warn(`Entity.addComponent: Component '${type}' already exists`);
            return this.c[type];
        }

        const component = system.addComponent(this, data);
        this.c[type] = component;

        switch (type) {
            case 'camera': this.camera = component as Camera; break;
            case 'light': this.light = component as Light; break;
            case 'render': this.render = component as MeshRenderer; break;
            case 'anim': this.anim = component; break;
            case 'collision': this.collision = component; break;
            case 'model': this.model = component; break;
            case 'script': this.script = component; break;
            case 'sprite': this.sprite = component; break;
            case 'sound': this.sound = component; break;
        }

        return component;
    }

    removeComponent(type: string): boolean {
        const component = this.c[type];
        if (!component) {
            console.warn(`Entity.removeComponent: Component '${type}' not found`);
            return false;
        }

        const system = this.getComponentSystem(type);
        if (system) {
            system.removeComponent(this);
        }

        delete this.c[type];

        switch (type) {
            case 'camera': this.camera = null; break;
            case 'light': this.light = null; break;
            case 'render': this.render = null; break;
            case 'anim': this.anim = null; break;
            case 'collision': this.collision = null; break;
            case 'model': this.model = null; break;
            case 'script': this.script = null; break;
            case 'sprite': this.sprite = null; break;
            case 'sound': this.sound = null; break;
        }

        return true;
    }

    getComponent(type: string): Component | null {
        return this.c[type] || null;
    }

    destroy(): void {
        Object.keys(this.c).forEach(type => {
            this.removeComponent(type);
        });

        if (this.parent) {
            this.parent.removeChild(this);
        }

        this.children.slice().forEach(child => {
            if (child instanceof Entity) {
                child.destroy();
            }
        });
    }

    findByGuid(guid: string): Entity | null {
        if (this._guid === guid) {
            return this;
        }

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            if (child instanceof Entity) {
                const found = child.findByGuid(guid);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    findByName(name: string): Entity | null {
        if (this.name === name) {
            return this;
        }

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            if (child instanceof Entity) {
                const found = child.findByName(name);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    findByPath(path: string): Entity | null {
        const parts = path.split('/');
        let current: Entity = this;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part === '') continue;

            let found = false;
            for (let j = 0; j < current.children.length; j++) {
                const child = current.children[j];
                if (child instanceof Entity && child.name === part) {
                    current = child;
                    found = true;
                    break;
                }
            }

            if (!found) {
                return null;
            }
        }

        return current;
    }

    clone(): Entity {
        const clone = new Entity(this.name);
        
        clone.localPosition.copy(this.localPosition);
        clone.localRotation.copy(this.localRotation);
        clone.localScale.copy(this.localScale);

        Object.keys(this.c).forEach(type => {
            const system = this.getComponentSystem(type);
            if (system && system.cloneComponent) {
                const data = system.cloneComponent(this);
                clone.addComponent(type, data);
            }
        });

        this.children.forEach(child => {
            if (child instanceof Entity) {
                const childClone = child.clone();
                clone.addChild(childClone);
            }
        });

        return clone;
    }

    private getComponentSystem(type: string): ComponentSystem | null {
        return null;
    }
}
