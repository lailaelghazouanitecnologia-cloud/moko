import { Vec3 } from '../math';
import { RigidBody } from './rigid-body';

export class RaycastResult {
    hitPoint: Vec3;
    hitNormal: Vec3;
    distance: number;
    body: RigidBody;

    constructor(hitPoint?: Vec3, hitNormal?: Vec3, distance?: number, body?: RigidBody) {
        this.hitPoint = hitPoint ?? new Vec3();
        this.hitNormal = hitNormal ?? new Vec3();
        this.distance = distance ?? 0;
        this.body = body ?? null as any;
    }

    clone(): RaycastResult {
        return new RaycastResult(
            this.hitPoint.clone(),
            this.hitNormal.clone(),
            this.distance,
            this.body
        );
    }

    copy(other: RaycastResult): RaycastResult {
        this.hitPoint.copy(other.hitPoint);
        this.hitNormal.copy(other.hitNormal);
        this.distance = other.distance;
        this.body = other.body;
        return this;
    }

    equals(other: RaycastResult): boolean {
        return this.hitPoint.equals(other.hitPoint) &&
               this.hitNormal.equals(other.hitNormal) &&
               Math.abs(this.distance - other.distance) < 1e-6 &&
               this.body === other.body;
    }

    reset(): RaycastResult {
        this.hitPoint.set(0, 0, 0);
        this.hitNormal.set(0, 0, 0);
        this.distance = 0;
        this.body = null as any;
        return this;
    }

    set(hitPoint: Vec3, hitNormal: Vec3, distance: number, body: RigidBody): RaycastResult {
        this.hitPoint.copy(hitPoint);
        this.hitNormal.copy(hitNormal);
        this.distance = distance;
        this.body = body;
        return this;
    }

    toString(): string {
        return `RaycastResult{hitPoint:${this.hitPoint}, hitNormal:${this.hitNormal}, distance:${this.distance}, body:${this.body}}`;
    }
}
