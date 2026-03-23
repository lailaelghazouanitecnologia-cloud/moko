import { Vec3 } from './vec3';

export class BoundingBox {
    min: Vec3;
    max: Vec3;

    constructor(min?: Vec3, max?: Vec3) {
        this.min = min ? min.clone() : new Vec3(Infinity, Infinity, Infinity);
        this.max = max ? max.clone() : new Vec3(-Infinity, -Infinity, -Infinity);
    }

    clone(): BoundingBox {
        return new BoundingBox(this.min, this.max);
    }

    copy(box: BoundingBox): BoundingBox {
        this.min.copy(box.min);
        this.max.copy(box.max);
        return this;
    }

    set(min: Vec3, max: Vec3): BoundingBox {
        this.min.copy(min);
        this.max.copy(max);
        return this;
    }

    setFromPoints(points: Vec3[]): BoundingBox {
        this.makeEmpty();
        for (const point of points) {
            this.expandByPoint(point);
        }
        return this;
    }

    setFromCenterAndSize(center: Vec3, size: Vec3): BoundingBox {
        const halfSize = new Vec3().copy(size).multiplyScalar(0.5);
        this.min.copy(center).sub(halfSize);
        this.max.copy(center).add(halfSize);
        return this;
    }

    makeEmpty(): BoundingBox {
        this.min.set(Infinity, Infinity, Infinity);
        this.max.set(-Infinity, -Infinity, -Infinity);
        return this;
    }

    isEmpty(): boolean {
        return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
    }

    getCenter(target: Vec3): Vec3 {
        return target.addVectors(this.min, this.max).multiplyScalar(0.5);
    }

    getSize(target: Vec3): Vec3 {
        return target.subVectors(this.max, this.min);
    }

    expandByPoint(point: Vec3): BoundingBox {
        this.min.min(point);
        this.max.max(point);
        return this;
    }

    expandByVector(vector: Vec3): BoundingBox {
        this.min.sub(vector);
        this.max.add(vector);
        return this;
    }

    expandByScalar(scalar: number): BoundingBox {
        this.min.addScalar(-scalar);
        this.max.addScalar(scalar);
        return this;
    }

    containsPoint(point: Vec3): boolean {
        return point.x < this.min.x || point.x > this.max.x ||
               point.y < this.min.y || point.y > this.max.y ||
               point.z < this.min.z || point.z > this.max.z ? false : true;
    }

    containsBox(box: BoundingBox): boolean {
        return this.min.x <= box.min.x && box.max.x <= this.max.x &&
               this.min.y <= box.min.y && box.max.y <= this.max.y &&
               this.min.z <= box.min.z && box.max.z <= this.max.z;
    }

    intersectsBox(box: BoundingBox): boolean {
        return box.max.x < this.min.x || box.min.x > this.max.x ||
               box.max.y < this.min.y || box.min.y > this.max.y ||
               box.max.z < this.min.z || box.min.z > this.max.z ? false : true;
    }

    intersectsSphere(sphere: { center: Vec3; radius: number }): boolean {
        const closest = new Vec3();
        this.clampPoint(sphere.center, closest);
        return closest.distanceToSquared(sphere.center) <= (sphere.radius * sphere.radius);
    }

    intersectsPlane(plane: { normal: Vec3; constant: number }): boolean {
        const center = new Vec3();
        this.getCenter(center);
        const extent = new Vec3();
        this.getSize(extent).multiplyScalar(0.5);
        const radius = extent.dot(plane.normal);
        const distance = plane.normal.dot(center) + plane.constant;
        return Math.abs(distance) <= radius;
    }

    clampPoint(point: Vec3, target: Vec3): Vec3 {
        return target.copy(point).clamp(this.min, this.max);
    }

    distanceToPoint(point: Vec3): number {
        const clamped = new Vec3();
        this.clampPoint(point, clamped);
        return clamped.distanceTo(point);
    }

    getBoundingSphere(target: { center: Vec3; radius: number }): { center: Vec3; radius: number } {
        const center = new Vec3();
        this.getCenter(center);
        target.center.copy(center);
        target.radius = this.min.distanceTo(this.max) * 0.5;
        return target;
    }

    intersect(box: BoundingBox): BoundingBox {
        this.min.max(box.min);
        this.max.min(box.max);
        if (this.isEmpty()) this.makeEmpty();
        return this;
    }

    union(box: BoundingBox): BoundingBox {
        this.min.min(box.min);
        this.max.max(box.max);
        return this;
    }

    applyMatrix4(matrix: import('./mat4').Mat4): BoundingBox {
        const points = [
            new Vec3(this.min.x, this.min.y, this.min.z),
            new Vec3(this.min.x, this.min.y, this.max.z),
            new Vec3(this.min.x, this.max.y, this.min.z),
            new Vec3(this.min.x, this.max.y, this.max.z),
            new Vec3(this.max.x, this.min.y, this.min.z),
            new Vec3(this.max.x, this.min.y, this.max.z),
            new Vec3(this.max.x, this.max.y, this.min.z),
            new Vec3(this.max.x, this.max.y, this.max.z)
        ];
        this.makeEmpty();
        for (const point of points) {
            point.applyMatrix4(matrix);
            this.expandByPoint(point);
        }
        return this;
    }

    translate(offset: Vec3): BoundingBox {
        this.min.add(offset);
        this.max.add(offset);
        return this;
    }

    equals(box: BoundingBox): boolean {
        return box.min.equals(this.min) && box.max.equals(this.max);
    }
}
