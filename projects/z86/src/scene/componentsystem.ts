import { EventHandler } from '../core/event-handler.js';
import { Entity } from './entity.js';

export class ComponentSystem extends EventHandler {
    id: string;
    app: any;
    store: Map<number, any>;
    schema: any;

    constructor(id: string, app: any, schema: any) {
        super();
        this.id = id;
        this.app = app;
        this.store = new Map();
        this.schema = schema;
    }

    addComponent(entity: Entity, data?: any): any {
        if (!entity) {
            throw new Error('Entity is required');
        }

        const componentId = entity.getGuid();
        if (this.store.has(componentId)) {
            throw new Error(`Entity already has ${this.id} component`);
        }

        const componentData = this.initializeComponentData(data || {});
        this.store.set(componentId, componentData);

        const component = this.createComponent(entity, componentData);
        entity.c[this.id] = component;

        this.fire('add', entity, component);
        return component;
    }

    removeComponent(entity: Entity): void {
        if (!entity) {
            throw new Error('Entity is required');
        }

        const componentId = entity.getGuid();
        if (!this.store.has(componentId)) {
            return;
        }

        const component = entity.c[this.id];
        if (component && component.destroy) {
            component.destroy();
        }

        this.store.delete(componentId);
        delete entity.c[this.id];

        this.fire('remove', entity);
    }

    initializeComponentData(data: any): any {
        const initialized: any = {};
        
        if (this.schema && this.schema.properties) {
            for (const key in this.schema.properties) {
                const prop = this.schema.properties[key];
                if (data[key] !== undefined) {
                    initialized[key] = data[key];
                } else if (prop.default !== undefined) {
                    initialized[key] = this.cloneValue(prop.default);
                } else {
                    initialized[key] = null;
                }
            }
        } else {
            for (const key in data) {
                initialized[key] = this.cloneValue(data[key]);
            }
        }

        return initialized;
    }

    cloneComponent(entity: Entity): any {
        if (!entity) {
            throw new Error('Entity is required');
        }

        const componentId = entity.getGuid();
        if (!this.store.has(componentId)) {
            throw new Error(`Entity does not have ${this.id} component`);
        }

        const data = this.store.get(componentId);
        return this.cloneValue(data);
    }

    private cloneValue(value: any): any {
        if (value === null || value === undefined) {
            return value;
        }

        if (Array.isArray(value)) {
            return value.map(item => this.cloneValue(item));
        }

        if (typeof value === 'object') {
            const cloned: any = {};
            for (const key in value) {
                if (value.hasOwnProperty(key)) {
                    cloned[key] = this.cloneValue(value[key]);
                }
            }
            return cloned;
        }

        return value;
    }

    private createComponent(entity: Entity, data: any): any {
        return {
            system: this,
            entity: entity,
            enabled: true,
            data: data,
            onEnable: function() {
                this.enabled = true;
                this.fire('enable');
            },
            onDisable: function() {
                this.enabled = false;
                this.fire('disable');
            },
            onPostStateChange: function() {
                this.fire('state');
            },
            destroy: function() {
                this.fire('destroy');
            }
        };
    }
}
