import { GraphNode } from './graph-node';
import { Component } from './component';
import { ComponentSystem } from './component-system';
import { Camera } from './camera';
import { Light } from './light';
import { MeshRenderer } from './mesh-renderer';

export class Entity extends GraphNode {
    c: { [key: string]: Component } = {};
    _guid: string;
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
        this._guid = Math.random().toString(36).substr(2, 9);
    }

    addComponent(type: string, data?: any): Component {
        const system = ComponentSystem.getSystem(type);
        if (!system) {
            throw new Error(`Component type '${type}' does not exist`);
        }
        
        const component = system.addComponent(this, data);
        this.c[type] = component;
        
        switch (type) {
            case 'anim': this.anim = component; break;
            case 'camera': this.camera = component as Camera; break;
            case 'collision': this.collision = component; break;
            case 'light': this.light = component as Light; break;
            case 'model': this.model = component; break;
            case 'render': this.render = component as MeshRenderer; break;
            case 'script': this.script = component; break;
            case 'sprite': this.sprite = component; break;
            case 'sound': this.sound = component; break;
        }
        
        return component;
    }

    removeComponent(type: string): void {
        const component = this.c[type];
        if (!component) return;
        
        const system = ComponentSystem.getSystem(type);
        if (system) {
            system.removeComponent(this, component);
        }
        
        delete this.c[type];
        
        switch (type) {
            case 'anim': this.anim = null; break;
            case 'camera': this.camera = null; break;
            case 'collision': this.collision = null; break;
            case 'light': this.light = null; break;
            case 'model': this.model = null; break;
            case 'render': this.render = null; break;
            case 'script': this.script = null; break;
            case 'sprite': this.sprite = null; break;
            case 'sound': this.sound = null; break;
        }
    }

    getComponent(type: string): Component | null {
        return this.c[type] || null;
    }

    destroy(): void {
        for (const type in this.c) {
            this.removeComponent(type);
        }
        
        for (let i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            if (child instanceof Entity) {
                child.destroy();
            }
        }
        
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    findByGuid(guid: string): Entity | null {
        if (this._guid === guid) {
            return this;
        }
        
        for (const child of this.children) {
            if (child instanceof Entity) {
                const found = child.findByGuid(guid);
                if (found) return found;
            }
        }
        
        return null;
    }

    findByName(name: string): Entity | null {
        if (this.name === name) {
            return this;
        }
        
        for (const child of this.children) {
            if (child instanceof Entity) {
                const found = child.findByName(name);
                if (found) return found;
            }
        }
        
        return null;
    }

    findByPath(path: string): Entity | null {
        const parts = path.split('/');
        let current: Entity = this;
        
        for (const part of parts) {
            if (part === '..') {
                current = current.parent as Entity;
                if (!current) return null;
            } else if (part === '.') {
                continue;
            } else {
                let found = false;
                for (const child of current.children) {
                    if (child instanceof Entity && child.name === part) {
                        current = child;
                        found = true;
                        break;
                    }
                }
                if (!found) return null;
            }
        }
        
        return current;
    }

    clone(): Entity {
        const clone = new Entity(this.name);
        
        for (const type in this.c) {
            const component = this.c[type];
            const system = ComponentSystem.getSystem(type);
            if (system) {
                const data = system.cloneComponent(component);
                clone.addComponent(type, data);
            }
        }
        
        for (const child of this.children) {
            if (child instanceof Entity) {
                const childClone = child.clone();
                clone.addChild(childClone);
            }
        }
        
        return clone;
    }
}
