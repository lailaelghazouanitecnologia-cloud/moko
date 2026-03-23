import { GraphNode } from './graph-node';
import { Component } from './component';
import { Camera } from './camera';
import { Light } from './light';
import { MeshRenderer } from './mesh-renderer';
import { EventEmitter } from '../core';

export class Entity extends GraphNode {
    c: { [key: string]: Component } = {};
    _guid: string;
    anim?: Component;
    camera?: Camera;
    collision?: Component;
    light?: Light;
    model?: Component;
    render?: MeshRenderer;
    script?: Component;
    sprite?: Component;
    sound?: Component;

    constructor(name?: string) {
        super(name);
        this._guid = Math.random().toString(36).substring(2, 15);
    }

    addComponent(type: string, data?: any): Component {
        const system = (this as any).scene?.systems?.[type];
        if (!system) {
            throw new Error(`Component system '${type}' not found`);
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
        
        const system = (this as any).scene?.systems?.[type];
        if (system) {
            system.removeComponent(this);
        }
        
        delete this.c[type];
        
        switch (type) {
            case 'anim': delete this.anim; break;
            case 'camera': delete this.camera; break;
            case 'collision': delete this.collision; break;
            case 'light': delete this.light; break;
            case 'model': delete this.model; break;
            case 'render': delete this.render; break;
            case 'script': delete this.script; break;
            case 'sprite': delete this.sprite; break;
            case 'sound': delete this.sound; break;
        }
    }

    getComponent(type: string): Component | undefined {
        return this.c[type];
    }

    destroy(): void {
        for (const type in this.c) {
            this.removeComponent(type);
        }
        
        if (this.parent) {
            this.parent.removeChild(this);
        }
        
        for (let i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            if (child instanceof Entity) {
                child.destroy();
            }
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
        let current: Entity | null = this;
        
        for (const part of parts) {
            if (!current) return null;
            current = current.findByName(part);
        }
        
        return current;
    }

    clone(): Entity {
        const clone = new Entity(this.name);
        
        clone.localPosition.copy(this.localPosition);
        clone.localRotation.copy(this.localRotation);
        clone.localScale.copy(this.localScale);
        
        for (const type in this.c) {
            const component = this.c[type];
            const system = (this as any).scene?.systems?.[type];
            if (system && component) {
                const data = system.getComponentData(component);
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
