import { Vec3 } from '../math';
import { Entity } from '../scene';
import { Collider } from './collider';

export class RaycastResult {
    collider: Collider | null = null;
    entity: Entity | null = null;
    point: Vec3 = { x: 0, y: 0, z: 0 };
    normal: Vec3 = { x: 0, y: 1, z: 0 };
    distance: number = 0.0;
    hit: boolean = false;

    getCollider(): Collider | null {
        return this.collider;
    }

    getEntity(): Entity | null {
        return this.entity;
    }

    getPoint(): Vec3 {
        return this.point;
    }

    getNormal(): Vec3 {
        return this.normal;
    }

    getDistance(): number {
        return this.distance;
    }

    hasHit(): boolean {
        return this.hit;
    }

    setHit(hit: boolean): void {
        this.hit = hit;
    }

    setPoint(point: Vec3): void {
        this.point = point;
    }

    setNormal(normal: Vec3): void {
        this.normal = normal;
    }

    setDistance(distance: number): void {
        this.distance = distance;
    }
}
