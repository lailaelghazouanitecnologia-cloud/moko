import { EventHandler } from '../core';
import { Entity } from './entity';
import { Component } from './component';

export class ComponentSystem extends EventHandler {
    id: string;
    app: any;
    store: Map<number, Component>;
    schema: any[];

    constructor(id: string, app: any, schema: any[] = []) {
        super();
        this.id = id;
        this.app = app;
        this.store = new Map();
        this.schema = schema;
    }

    initializeComponentData(component: Component, data: any, properties: any[]): void {
        if (!component || !data) return;

        for (let i = 0; i < properties.length; i++) {
            const prop = properties[i];
            const name = prop.name;
            
            if (data.hasOwnProperty(name)) {
                if (prop.type === 'vec3' && Array.isArray(data[name])) {
                    component.data[name] = new Float32Array(data[name]);
                } else if (prop.type === 'vec4' && Array.isArray(data[name])) {
                    component.data[name] = new Float32Array(data[name]);
                } else if (prop.type === 'mat4' && Array.isArray(data[name])) {
                    component.data[name] = new Float32Array(data[name]);
                } else {
                    component.data[name] = data[name];
                }
            } else if (prop.hasOwnProperty('default')) {
                if (prop.type === 'vec3' && Array.isArray(prop.default)) {
                    component.data[name] = new Float32Array(prop.default);
                } else if (prop.type === 'vec4' && Array.isArray(prop.default)) {
                    component.data[name] = new Float32Array(prop.default);
                } else if (prop.type === 'mat4' && Array.isArray(prop.default)) {
                    component.data[name] = new Float32Array(prop.default);
                } else {
                    component.data[name] = prop.default;
                }
            }
        }
    }

    cloneComponent(entity: Entity, clone: Entity): Component | null {
        const component = this.store.get(entity.id);
        if (!component) return null;

        const clonedComponent = this.addComponent(clone, component.data);
        if (clonedComponent) {
            clonedComponent.enabled = component.enabled;
        }
        return clonedComponent;
    }

    addComponent(entity: Entity, data: any = {}): Component | null {
        if (this.store.has(entity.id)) {
            console.warn(`ComponentSystem: Entity ${entity.id} already has a ${this.id} component.`);
            return null;
        }

        const component = new Component(this, entity);
        component.data = {};
        
        this.initializeComponentData(component, data, this.schema);
        
        this.store.set(entity.id, component);
        
        if (entity.c) {
            entity.c[this.id] = component;
        }
        
        this.fire('add', entity, component);
        
        return component;
    }

    removeComponent(entity: Entity): void {
        const component = this.store.get(entity.id);
        if (!component) return;

        this.store.delete(entity.id);
        
        if (entity.c && entity.c[this.id]) {
            delete entity.c[this.id];
        }
        
        this.fire('remove', entity, component);
        
        component.fire('remove');
        component.destroy();
    }

    update(dt: number): void {
        // Base implementation - override in derived systems
    }

    destroy(): void {
        const entities = Array.from(this.store.keys());
        for (let i = 0; i < entities.length; i++) {
            const entity = { id: entities[i] } as Entity;
            this.removeComponent(entity);
        }
        this.store.clear();
        this.fire('destroy');
        super.destroy();
    }
}
