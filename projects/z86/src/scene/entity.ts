import { GraphNode } from './GraphNode';
import { Component } from './Component';

export class Entity extends GraphNode {
    c: { [key: string]: Component } = {};
    _guid: string;
    anim: Component | null = null;
    camera: Component | null = null;
    collision: Component | null = null;
    light: Component | null = null;
    model: Component | null = null;
    render: Component | null = null;
    script: Component | null = null;
    sprite: Component | null = null;
    sound: Component | null = null;

    constructor(name?: string) {
        super(name);
        this._guid = Math.random().toString(36).substring(2, 15);
    }

    addComponent(type: string, data?: any): Component {
        const component = new Component();
        component.entity = this;
        this.c[type] = component;
        
        switch (type) {
            case 'anim': this.anim = component; break;
            case 'camera': this.camera = component; break;
            case 'collision': this.collision = component; break;
            case 'light': this.light = component; break;
            case 'model': this.model = component; break;
            case 'render': this.render = component; break;
            case 'script': this.script = component; break;
            case 'sprite': this.sprite = component; break;
            case 'sound': this.sound = component; break;
        }
        
        return component;
    }

    removeComponent(type: string): void {
        const component = this.c[type];
        if (component) {
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

    clone(): Entity {
        const cloned = new Entity(this.name);
        
        for (const type in this.c) {
            cloned.addComponent(type);
        }
        
        for (const child of this.children) {
            if (child instanceof Entity) {
                cloned.addChild(child.clone());
            }
        }
        
        return cloned;
    }

    findByGuid(guid: string): Entity | null {
        if (this._guid === guid) {
            return this;
        }
        
        for (const child of this.children) {
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
        const queue: Entity[] = [this];
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.name === name) {
                return current;
            }
            
            for (const child of current.children) {
                if (child instanceof Entity) {
                    queue.push(child);
                }
            }
        }
        
        return null;
    }

    findByPath(path: string): Entity | null {
        const parts = path.split('/');
        let current: Entity = this;
        
        for (const part of parts) {
            if (part === '' || part === '.') {
                continue;
            }
            
            if (part === '..') {
                current = current.parent as Entity;
                if (!current) {
                    return null;
                }
            } else {
                const found = current.children.find(child => 
                    child instanceof Entity && child.name === part
                ) as Entity;
                
                if (!found) {
                    return null;
                }
                current = found;
            }
        }
        
        return current;
    }
}
