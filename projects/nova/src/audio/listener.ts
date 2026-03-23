import { Vec3 } from '../math';
import { Entity } from '../core';

export class Listener {
    private position: Vec3 = Vec3.ZERO.clone();
    private velocity: Vec3 = Vec3.ZERO.clone();
    private forward: Vec3 = Vec3.FORWARD.clone();
    private up: Vec3 = Vec3.UP.clone();
    private context: AudioListener | null = null;
    private attachedEntity: Entity | null = null;

    setPosition(p: Vec3): void {
        this.position.set(p.x, p.y, p.z);
        if (this.context) {
            this.context.setPosition(p.x, p.y, p.z);
        }
    }

    getPosition(): Vec3 {
        return this.position.clone();
    }

    setVelocity(v: Vec3): void {
        this.velocity.set(v.x, v.y, v.z);
        if (this.context && this.context.setVelocity) {
            this.context.setVelocity(v.x, v.y, v.z);
        }
    }

    getVelocity(): Vec3 {
        return this.velocity.clone();
    }

    setOrientation(f: Vec3, u: Vec3): void {
        this.forward.set(f.x, f.y, f.z);
        this.up.set(u.x, u.y, u.z);
        if (this.context) {
            this.context.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z);
        }
    }

    getForward(): Vec3 {
        return this.forward.clone();
    }

    getUp(): Vec3 {
        return this.up.clone();
    }

    update(dt: number): void {
        if (this.attachedEntity) {
            const transform = this.attachedEntity.transform;
            if (transform) {
                this.setPosition(transform.position);
                this.setOrientation(transform.forward, transform.up);
            }
        }
    }

    attachToEntity(entity: Entity): void {
        this.attachedEntity = entity;
    }

    detach(): void {
        this.attachedEntity = null;
    }
}
