import { EventHandler } from '../core';
import { Entity } from './entity';

export interface ComponentData {
    [key: string]: any;
}

export class Component extends EventHandler {
    system: ComponentSystem;
    entity: Entity;
    enabled: boolean;
    data: ComponentData;
    gameObject: any;
    destroyed: boolean;

    constructor(system: ComponentSystem, entity: Entity) {
        super();
        this.system = system;
        this.entity = entity;
        this.enabled = true;
        this.data = {};
        this.gameObject = null;
        this.destroyed = false;
    }

    onEnable(): void {
        // Lifecycle hook when enabled
    }

    onDisable(): void {
        // Lifecycle hook when disabled
    }

    onPostStateChange(): void {
        // After state change callback
    }

    getGameObject(): any {
        return this.gameObject;
    }

    setGameObject(gameObject: any): void {
        this.gameObject = gameObject;
    }

    isDestroyed(): boolean {
        return this.destroyed;
    }

    enable(): void {
        if (!this.enabled) {
            this.enabled = true;
            this.onEnable();
            this.onPostStateChange();
        }
    }

    disable(): void {
        if (this.enabled) {
            this.enabled = false;
            this.onDisable();
            this.onPostStateChange();
        }
    }

    destroy(): void {
        this.destroyed = true;
        this.enabled = false;
        this.system = null;
        this.entity = null;
        this.gameObject = null;
        this.data = null;
    }
}
