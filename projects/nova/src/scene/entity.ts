import { GraphNode } from './graph-node';
import { Component } from './component';
import { ComponentSystem } from './component-system';
import { Camera } from './camera';
import { Light } from './light';
import { MeshRenderer } from './mesh-renderer';
import { Scene } from './scene';
import { BatchManager } from './batch-manager';
import { ForwardRenderer } from './forward-renderer';
import { ResourceLoader, Platform } from '../core';
import { Mat3, Mat4, BoundingBox } from '../math';
import { VertexFormat, Texture, Mesh } from '../graphics';

export class Entity extends GraphNode {
    c: { [key: string]: Component };
    _guid: string;
    anim: Component | null;
    camera: Camera | null;
    collision: Component | null;
    light: Light | null;
    model: Component | null;
    render: MeshRenderer | null;
    script: Component | null;
    sprite: Component | null;
    sound: Component | null;

    constructor(name?: string) {
        super(name);
        this.c = {};
        this._guid = this.generateGuid();
        this.anim = null;
        this.camera = null;
        this.collision = null;
        this.light = null;
        this.model = null;
        this.render = null;
        this.script = null;
        this.sprite = null;
        this.sound = null;
    }

    addComponent(type: string, data?: any): Component {
        const system = this.getComponentSystem(type);
        if (!system) {
            throw new Error(`Component system '${type}' not found`);
        }

        if (this.c[type]) {
            throw new Error(`Entity already has component of type '${type}'`);
        }

        const component = system.addComponent(this, data);
        this.c[type] = component;

        switch (type) {
            case 'anim':
                this.anim = component;
                break;
            case 'camera':
                this.camera = component as Camera;
                break;
            case 'collision':
                this.collision = component;
                break;
            case 'light':
                this.light = component as Light;
                break;
            case 'model':
                this.model = component;
                break;
            case 'render':
                this.render = component as MeshRenderer;
                break;
            case 'script':
                this.script = component;
                break;
            case 'sprite':
                this.sprite = component;
                break;
            case 'sound':
                this.sound = component;
                break;
        }

        return component;
    }

    removeComponent(type: string): void {
        const component = this.c[type];
        if (!component) {
            return;
        }

        const system = this.getComponentSystem(type);
        if (system) {
            system.removeComponent(this);
        }

        delete this.c[type];

        switch (type) {
            case 'anim':
                this.anim = null;
                break;
            case 'camera':
                this.camera = null;
                break;
            case 'collision':
                this.collision = null;
                break;
            case 'light':
                this.light = null;
                break;
            case 'model':
                this.model = null;
                break;
            case 'render':
                this.render = null;
                break;
            case 'script':
                this.script = null;
                break;
            case 'sprite':
                this.sprite = null;
                break;
            case 'sound':
                this.sound = null;
                break;
        }
    }

    getComponent(type: string): Component | null {
        return this.c[type] || null;
    }

    destroy(): void {
        const componentTypes = Object.keys(this.c);
        for (const type of componentTypes) {
            this.removeComponent(type);
        }

        this.parent?.removeChild(this);
        this.children.length = 0;
    }

    findByGuid(guid: string): Entity | null {
        if (this._guid === guid) {
            return this;
        }

        for (const child of this.children) {
            const result = (child as Entity).findByGuid?.(guid);
            if (result) {
                return result;
            }
        }

        return null;
    }

    findByName(name: string): Entity | null {
        if (this.name === name) {
            return this;
        }

        for (const child of this.children) {
            const result = (child as Entity).findByName?.(name);
            if (result) {
                return result;
            }
        }

        return null;
    }

    findByPath(path: string): Entity | null {
        if (!path.startsWith('/')) {
            return null;
        }

        const parts = path.split('/').filter(p => p.length > 0);
        if (parts.length === 0) {
            return this;
        }

        let current: Entity = this;
        for (const part of parts) {
            let found = false;
            for (const child of current.children) {
                if (child.name === part) {
                    current = child as Entity;
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

        const componentTypes = Object.keys(this.c);
        for (const type of componentTypes) {
            const system = this.getComponentSystem(type);
            if (system && system.cloneComponent) {
                system.cloneComponent(this, clone);
            }
        }

        for (const child of this.children) {
            const childClone = (child as Entity).clone?.();
            if (childClone) {
                clone.addChild(childClone);
            }
        }

        return clone;
    }

    private generateGuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    private getComponentSystem(type: string): ComponentSystem | null {
        return null;
    }
}
