import { Vec3 } from '../math/vec3';
import { RigidBody } from './rigidbody';

export class RaycastResult {
    private _hitPoint: Vec3;
    private _hitNormal: Vec3;
    private _hitDistance: number;
    private _hitBody: RigidBody | null;
    private _hasHit: boolean;

    constructor() {
        this._hitPoint = new Vec3();
        this._hitNormal = new Vec3();
        this._hitDistance = 0;
        this._hitBody = null;
        this._hasHit = false;
    }

    get hitPoint(): Vec3 {
        return this._hitPoint;
    }

    set hitPoint(point: Vec3) {
        this._hitPoint.copy(point);
    }

    get hitNormal(): Vec3 {
        return this._hitNormal;
    }

    set hitNormal(normal: Vec3) {
        this._hitNormal.copy(normal);
    }

    get hitDistance(): number {
        return this._hitDistance;
    }

    set hitDistance(distance: number) {
        this._hitDistance = distance;
    }

    get hitBody(): RigidBody | null {
        return this._hitBody;
    }

    set hitBody(body: RigidBody | null) {
        this._hitBody = body;
    }

    get hasHit(): boolean {
        return this._hasHit;
    }

    set hasHit(hit: boolean) {
        this._hasHit = hit;
    }

    reset(): void {
        this._hitPoint.set(0, 0, 0);
        this._hitNormal.set(0, 0, 0);
        this._hitDistance = 0;
        this._hitBody = null;
        this._hasHit = false;
    }

    copy(other: RaycastResult): RaycastResult {
        this._hitPoint.copy(other._hitPoint);
        this._hitNormal.copy(other._hitNormal);
        this._hitDistance = other._hitDistance;
        this._hitBody = other._hitBody;
        this._hasHit = other._hasHit;
        return this;
    }

    clone(): RaycastResult {
        const result = new RaycastResult();
        result.copy(this);
        return result;
    }
}
