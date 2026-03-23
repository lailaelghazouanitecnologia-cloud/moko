import { Vec3 } from './vec3';
import { Mat4 } from './mat4';
import { Plane } from './plane';
import { Frustum } from './frustum';
import { Ray } from './ray';

export class BoundingSphere {
    center: Vec3;
    radius: number;

    constructor(center: Vec3 = new Vec3(), radius: number = 0) {
        this.center = center.clone();
        this.radius = radius;
    }

    clone(): BoundingSphere {
        return new BoundingSphere(this.center.clone(), this.radius);
    }

    copy(sphere: BoundingSphere): BoundingSphere {
        this.center.copy(sphere.center);
        this.radius = sphere.radius;
        return this;
    }

    set(center: Vec3, radius: number): BoundingSphere {
        this.center.copy(center);
        this.radius = radius;
        return this;
    }

    empty(): boolean {
        return this.radius <= 0;
    }

    containsPoint(point: Vec3): boolean {
        return point.distanceToSquared(this.center) <= (this.radius * this.radius);
    }

    distanceToPoint(point: Vec3): number {
        return point.distanceTo(this.center) - this.radius;
    }

    intersectsSphere(sphere: BoundingSphere): boolean {
        const radiusSum = this.radius + sphere.radius;
        return this.center.distanceToSquared(sphere.center) <= (radiusSum * radiusSum);
    }

    intersectsBox(box: BoundingBox): boolean {
        return box.intersectsSphere(this);
    }

    intersectsPlane(plane: Plane): boolean {
        const distance = plane.distanceToPoint(this.center);
        return Math.abs(distance) <= this.radius;
    }

    clampPoint(point: Vec3, result: Vec3): Vec3 {
        const deltaLengthSq = this.center.distanceToSquared(point);
        result.copy(point);
        if (deltaLengthSq > (this.radius * this.radius)) {
            result.sub(this.center).normalize();
            result.multiplyScalar(this.radius).add(this.center);
        }
        return result;
    }

    getBoundingBox(result: BoundingBox): BoundingBox {
        result.set(this.center, this.center);
        result.expandByScalar(this.radius);
        return result;
    }

    applyMatrix4(matrix: Mat4): BoundingSphere {
        this.center.applyMatrix4(matrix);
        const scale = matrix.getMaxScaleOnAxis();
        this.radius *= scale;
        return this;
    }

    translate(offset: Vec3): BoundingSphere {
        this.center.add(offset);
        return this;
    }

    expandByPoint(point: Vec3): BoundingSphere {
        if (this.empty()) {
            this.center.copy(point);
            this.radius = 0;
            return this;
        }

        const toPoint = new Vec3().subVectors(point, this.center);
        const lengthSq = toPoint.lengthSq();

        if (lengthSq > (this.radius * this.radius)) {
            const length = Math.sqrt(lengthSq);
            const delta = (length - this.radius) * 0.5;
            this.radius += delta;
            this.center.add(toPoint.multiplyScalar(delta / length));
        }

        return this;
    }

    union(sphere: BoundingSphere): BoundingSphere {
        if (this.empty()) {
            return this.copy(sphere);
        }
        if (sphere.empty()) {
            return this;
        }

        const centerToCenter = new Vec3().subVectors(sphere.center, this.center);
        const distance = centerToCenter.length();
        const radiusDiff = sphere.radius - this.radius;

        if (radiusDiff >= distance) {
            if (radiusDiff >= 0) {
                return this.copy(sphere);
            } else {
                return this;
            }
        } else if (radiusDiff <= -distance) {
            if (radiusDiff <= 0) {
                return this;
            } else {
                return this.copy(sphere);
            }
        }

        const newRadius = (distance + this.radius + sphere.radius) * 0.5;
        const ratio = (newRadius - this.radius) / distance;
        this.center.add(centerToCenter.multiplyScalar(ratio));
        this.radius = newRadius;

        return this;
    }

    equals(sphere: BoundingSphere): boolean {
        return sphere.center.equals(this.center) && (sphere.radius === this.radius);
    }
}
