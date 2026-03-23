import { EventHandler } from '../core';
import { Entity } from './entity';
import { ComponentSystem } from './component-system';

export class Component extends EventHandler {
    system: ComponentSystem;
    entity: Entity;
    enabled: boolean;
    data: any;
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
        // lifecycle hook when enabled
    }

    onDisable(): void {
        // lifecycle hook when disabled
    }

    onPostStateChange(): void {
        // after enabled state flips
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
        if (this.system) {
            this.system.removeComponent(this.entity);
        }
    }
}
