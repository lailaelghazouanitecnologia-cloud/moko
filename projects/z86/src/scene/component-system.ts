import { EventHandler } from '../core';
import { Entity } from './entity';
import { Component } from './component';

export class ComponentSystem extends EventHandler {
    id: string;
    app: any;
    store: Map<Entity, Component>;
    schema: Record<string, any>;

    constructor(id: string, app: any, schema: Record<string, any> = {}) {
        super();
        this.id = id;
        this.app = app;
        this.store = new Map();
        this.schema = schema;
    }

    initializeComponentData(component: Component, data: Record<string, any> = {}): void {
        const defaults = this.schema;
        for (const key in defaults) {
            if (defaults.hasOwnProperty(key)) {
                (component.data as any)[key] = data.hasOwnProperty(key) ? data[key] : defaults[key];
            }
        }
    }

    cloneComponent(entity: Entity, clone: Entity): Component | null {
        const original = this.store.get(entity);
        if (!original) return null;
        const component = new (original.constructor as any)(this, clone);
        component.data = JSON.parse(JSON.stringify(original.data));
        this.store.set(clone, component);
        return component;
    }

    addComponent(entity: Entity, data: Record<string, any> = {}): Component {
        const component = new Component(this, entity);
        this.initializeComponentData(component, data);
        this.store.set(entity, component);
        return component;
    }

    removeComponent(entity: Entity): void {
        const component = this.store.get(entity);
        if (component) {
            component.destroy();
            this.store.delete(entity);
        }
    }

    update(dt: number): void {
        for (const component of this.store.values()) {
            if (component.enabled && (component as any).update) {
                (component as any).update(dt);
            }
        }
    }
}
