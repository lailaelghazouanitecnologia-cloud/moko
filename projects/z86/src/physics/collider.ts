import { EventEmitter } from '../core/event-emitter';
import { Vec2 } from '../math/vec2';
import { Vec3 } from '../math/vec3';
import { BoundingBox } from '../math/bounding-box';
import { BoundingSphere } from '../math/bounding-sphere';
import { RigidBody } from './rigid-body';
import { ContactResult } from './contact-result';

export class Collider extends EventEmitter {
    private _body: RigidBody | null = null;
    private _shape: BoundingBox | BoundingSphere | null = null;
    private _enabled: boolean = true;

    constructor() {
        super();
    }

    attachToBody(body: RigidBody): void {
        if (this._body === body) {
            return;
        }

        if (this._body) {
            const oldBody = this._body;
            this._body = null;
            oldBody.removeCollider(this);
        }

        this._body = body;
        if (body) {
            body.addCollider(this);
        }
    }

    setShape(shape: BoundingBox | BoundingSphere): void {
        this._shape = shape;
        this.emit('shapeChanged', shape);
    }

    detectCollision(other: Collider): ContactResult | null {
        if (!this._shape || !other._shape) {
            return null;
        }

        if (this._shape instanceof BoundingBox && other._shape instanceof BoundingBox) {
            return this.boxToBoxCollision(this._shape, other._shape);
        }

        if (this._shape instanceof BoundingSphere && other._shape instanceof BoundingSphere) {
            return this.sphereToSphereCollision(this._shape, other._shape);
        }

        if (this._shape instanceof BoundingBox && other._shape instanceof BoundingSphere) {
            return this.boxToSphereCollision(this._shape, other._shape);
        }

        if (this._shape instanceof BoundingSphere && other._shape instanceof BoundingBox) {
            const result = this.boxToSphereCollision(other._shape, this._shape);
            if (result) {
                result.normal = result.normal.clone().mulScalar(-1);
            }
            return result;
        }

        return null;
    }

    private boxToBoxCollision(boxA: BoundingBox, boxB: BoundingBox): ContactResult | null {
        const centerA = boxA.center;
        const centerB = boxB.center;
        const halfExtentsA = boxA.halfExtents;
        const halfExtentsB = boxB.halfExtents;

        const dx = centerB.x - centerA.x;
        const dy = centerB.y - centerA.y;
        const dz = centerB.z - centerA.z;

        const overlapX = halfExtentsA.x + halfExtentsB.x - Math.abs(dx);
        const overlapY = halfExtentsA.y + halfExtentsB.y - Math.abs(dy);
        const overlapZ = halfExtentsA.z + halfExtentsB.z - Math.abs(dz);

        if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) {
            return null;
        }

        let normal: Vec3;
        let penetration: number;

        if (overlapX < overlapY && overlapX < overlapZ) {
            normal = new Vec3(dx > 0 ? 1 : -1, 0, 0);
            penetration = overlapX;
        } else if (overlapY < overlapZ) {
            normal = new Vec3(0, dy > 0 ? 1 : -1, 0);
            penetration = overlapY;
        } else {
            normal = new Vec3(0, 0, dz > 0 ? 1 : -1);
            penetration = overlapZ;
        }

        const contactPoint = new Vec3(
            centerA.x + (dx > 0 ? halfExtentsA.x : -halfExtentsA.x),
            centerA.y + (dy > 0 ? halfExtentsA.y : -halfExtentsA.y),
            centerA.z + (dz > 0 ? halfExtentsA.z : -halfExtentsA.z)
        );

        return new ContactResult(normal, penetration, contactPoint);
    }

    private sphereToSphereCollision(sphereA: BoundingSphere, sphereB: BoundingSphere): ContactResult | null {
        const distance = sphereA.center.distance(sphereB.center);
        const radiusSum = sphereA.radius + sphereB.radius;

        if (distance >= radiusSum) {
            return null;
        }

        const normal = sphereB.center.clone().sub(sphereA.center).normalize();
        const penetration = radiusSum - distance;
        const contactPoint = sphereA.center.clone().add(normal.clone().mulScalar(sphereA.radius));

        return new ContactResult(normal, penetration, contactPoint);
    }

    private boxToSphereCollision(box: BoundingBox, sphere: BoundingSphere): ContactResult | null {
        const closestPoint = this.closestPointOnBox(box, sphere.center);
        const distance = closestPoint.distance(sphere.center);

        if (distance >= sphere.radius) {
            return null;
        }

        const normal = sphere.center.clone().sub(closestPoint).normalize();
        const penetration = sphere.radius - distance;
        const contactPoint = closestPoint;

        return new ContactResult(normal, penetration, contactPoint);
    }

    private closestPointOnBox(box: BoundingBox, point: Vec3): Vec3 {
        const center = box.center;
        const halfExtents = box.halfExtents;

        const dx = point.x - center.x;
        const dy = point.y - center.y;
        const dz = point.z - center.z;

        const closestX = center.x + Math.max(-halfExtents.x, Math.min(halfExtents.x, dx));
        const closestY = center.y + Math.max(-halfExtents.y, Math.min(halfExtents.y, dy));
        const closestZ = center.z + Math.max(-halfExtents.z, Math.min(halfExtents.z, dz));

        return new Vec3(closestX, closestY, closestZ);
    }

    get body(): RigidBody | null {
        return this._body;
    }

    get shape(): BoundingBox | BoundingSphere | null {
        return this._shape;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        if (this._enabled !== value) {
            this._enabled = value;
            this.emit('enabledChanged', value);
        }
    }
}
