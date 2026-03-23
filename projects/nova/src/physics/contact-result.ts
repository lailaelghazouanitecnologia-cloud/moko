import { Vec3 } from '../math';
import { Collider } from './collider';

export class ContactResult {
    colliderA: Collider | null = null;
    colliderB: Collider | null = null;
    point: Vec3 = { x: 0, y: 0, z: 0 };
    normal: Vec3 = { x: 0, y: 1, z: 0 };
    penetration: number = 0.0;
    impulse: number = 0.0;
    friction: number = 0.5;
    restitution: number = 0.5;

    getColliderA(): Collider {
        return this.colliderA!;
    }

    getColliderB(): Collider {
        return this.colliderB!;
    }

    getPoint(): Vec3 {
        return this.point;
    }

    getNormal(): Vec3 {
        return this.normal;
    }

    getPenetration(): number {
        return this.penetration;
    }

    getImpulse(): number {
        return this.impulse;
    }

    getFriction(): number {
        return this.friction;
    }

    getRestitution(): number {
        return this.restitution;
    }

    setPoint(point: Vec3): void {
        this.point = point;
    }

    setNormal(normal: Vec3): void {
        this.normal = normal;
    }

    setPenetration(penetration: number): void {
        this.penetration = penetration;
    }

    setImpulse(impulse: number): void {
        this.impulse = impulse;
    }
}
