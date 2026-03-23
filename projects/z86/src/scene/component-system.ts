import { EventHandler } from '../core';
import { Entity } from './entity';
import { Component } from './component';

export class ComponentSystem extends EventHandler {
    id: string;
    app: any;
    store: Map<Entity, Component>;
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

        for (const prop of properties) {
            if (data.hasOwnProperty(prop)) {
                (component as any)[prop] = data[prop];
            }
        }

        for (const key in data) {
            if (data.hasOwnProperty(key) && component.hasOwnProperty(key)) {
                (component as any)[key] = data[key];
            }
        }
    }

    cloneComponent(entity: Entity, clone: Entity): Component | null {
        const component = this.store.get(entity);
        if (!component) return null;

        const clonedComponent = this.addComponent(clone, component.data);
        if (clonedComponent) {
            clonedComponent.enabled = component.enabled;
        }
        return clonedComponent;
    }

    addComponent(entity: Entity, data: any = {}): Component | null {
        if (this.store.has(entity)) {
            throw new Error(`Entity already has ${this.id} component`);
        }

        const component = new Component(this, entity);
        this.store.set(entity, component);
        entity[this.id] = component;

        this.initializeComponentData(component, data, this.schema);
        
        if (component.onInitialize) {
            component.onInitialize();
        }

        return component;
    }

    removeComponent(entity: Entity): void {
        const component = this.store.get(entity);
        if (!component) return;

        if (component.onDisable) {
            component.onDisable();
        }

        if (component.onDestroy) {
            component.onDestroy();
        }

        this.store.delete(entity);
        delete entity[this.id];
    }

    update(dt: number): void {
        for (const component of this.store.values()) {
            if (component.enabled && component.update) {
                component.update(dt);
            }
        }
    }

    onInitialize(): void {
        // Base implementation - override in subclasses
    }

    onPostInitialize(): void {
        // Base implementation - override in subclasses
    }
}
