import { EventHandler } from '../core/event-handler';

export interface ComponentData {
    [key: string]: any;
}

export class Component extends EventHandler {
    system: ComponentSystem;
    entity: Entity;
    enabled: boolean;
    data: ComponentData;
    gameObject: GameObject;
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
        // After enabled state flips
    }

    getGameObject(): GameObject {
        return this.gameObject;
    }

    setGameObject(gameObject: GameObject): void {
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
        if (!this.destroyed) {
            this.destroyed = true;
            if (this.gameObject) {
                this.gameObject.removeComponent(this);
            }
            this.fire('destroy');
            this.off();
        }
    }
}
