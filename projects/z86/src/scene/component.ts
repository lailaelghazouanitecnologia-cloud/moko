import { EventHandler } from '../framework/event-handler';
import { Entity } from './entity';

export class Component extends EventHandler {
    system: any;
    entity: Entity;
    enabled: boolean;
    data: any;
    gameObject: any;
    destroyed: boolean;

    constructor(system: any, entity: Entity) {
        super();
        this.system = system;
        this.entity = entity;
        this.enabled = false;
        this.data = {};
        this.gameObject = null;
        this.destroyed = false;
    }

    onEnable(): void {
        // lifecycle callback when enabled
    }

    onDisable(): void {
        // lifecycle callback when disabled
    }

    onPostStateChange(): void {
        // after enabled state changes
    }

    getGameObject(): any {
        return this.gameObject;
    }

    setGameObject(gameObject: any): void {
        this.gameObject = gameObject;
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
    }

    isDestroyed(): boolean {
        return this.destroyed;
    }
}
