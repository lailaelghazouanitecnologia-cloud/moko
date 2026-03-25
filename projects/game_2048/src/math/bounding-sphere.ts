import { Vec3 } from './vec3';
import { BoundingBox } from './bounding-box';

/**
 * A sphere used for fast bounding volume checks.
 */
export class BoundingSphere {
    center: Vec3;
    radius: number;

    /**
     * Creates a new BoundingSphere.
     * @param center - The center of the sphere (default: Vec3(0,0,0))
     * @param radius - The radius of the sphere (default: 0)
     */
    constructor(center: Vec3 = new Vec3(), radius: number = 0) {
        this.center = center.clone();
        this.radius = radius;
    }

    /**
     * Sets the center and radius of the sphere.
     * @param center - The new center
     * @param radius - The new radius
     * @returns This sphere for chaining
     */
    set(center: Vec3, radius: number): BoundingSphere {
        if (!center) {
            throw new Error('center must be a valid Vec3');
        }
        if (typeof radius !== 'number' || isNaN(radius) || !isFinite(radius)) {
            throw new Error('radius must be a finite number');
        }
        this.center.copy(center);
        this.radius = radius;
        return this;
    }

    /**
     * Copies the properties from another sphere.
     * @param sphere - The sphere to copy from
     * @returns This sphere for chaining
     */
    copy(sphere: BoundingSphere): BoundingSphere {
        if (!sphere || !(sphere instanceof BoundingSphere)) {
            throw new Error('sphere must be a valid BoundingSphere');
        }
        this.center.copy(sphere.center);
        this.radius = sphere.radius;
        return this;
    }

    /**
     * Clones this sphere.
     * @returns A new BoundingSphere with the same properties
     */
    clone(): BoundingSphere {
        return new BoundingSphere(this.center.clone(), this.radius);
    }

    /**
     * Resets the sphere to zero radius at origin.
     * @returns This sphere for chaining
     */
    empty(): BoundingSphere {
        this.center.set(0, 0, 0);
        this.radius = 0;
        return this;
    }

    /**
     * Fits the sphere to the given points.
     * @param points - Array of Vec3 points
     * @returns This sphere for chaining
     */
    fromPoints(points: Vec3[]): BoundingSphere {
        if (!Array.isArray(points)) {
            throw new Error('points must be an array');
        }
        if (points.length === 0) {
            return this.empty();
        }

        let minX = points[0].x;
        let minY = points[0].y;
        let minZ = points[0].z;
        let maxX = minX;
        let maxY = minY;
        let maxZ = minZ;

        for (let i = 1; i < points.length; i++) {
            const p = points[i];
            if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.z !== 'number') {
                throw new Error(`points[${i}] must be a valid Vec3`);
            }
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            minZ = Math.min(minZ, p.z);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
            maxZ = Math.max(maxZ, p.z);
        }

        this.center.set(
            (minX + maxX) * 0.5,
            (minY + maxY) * 0.5,
            (minZ + maxZ) * 0.5
        );

        let maxRadiusSq = 0;
        for (let i = 0; i < points.length; i++) {
            const dx = points[i].x - this.center.x;
            const dy = points[i].y - this.center.y;
            const dz = points[i].z - this.center.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            maxRadiusSq = Math.max(maxRadiusSq, distSq);
        }

        this.radius = Math.sqrt(maxRadiusSq);
        return this;
    }

    /**
     * Fits the sphere to the given bounding box.
     * @param box - The bounding box
     * @returns This sphere for chaining
     */
    fromBox(box: BoundingBox): BoundingSphere {
        if (!box || !box.min || !box.max) {
            throw new Error('box must be a valid BoundingBox');
        }
        const center = new Vec3();
        center.add(box.min, box.max);
        center.scale(0.5);
        
        const dx = box.max.x - box.min.x;
        const dy = box.max.y - box.min.y;
        const dz = box.max.z - box.min.z;
        
        this.center.copy(center);
        this.radius = Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5;
        return this;
    }

    /**
     * Checks if a point is inside or on the sphere.
     * @param point - The point to check
     * @returns true if the point is inside or on the sphere
     */
    containsPoint(point: Vec3): boolean {
        if (!point || !(point instanceof Vec3)) {
            throw new Error('point must be a valid Vec3');
        }
        const dx = point.x - this.center.x;
        const dy = point.y - this.center.y;
        const dz = point.z - this.center.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        return distSq <= this.radius * this.radius;
    }

    /**
     * Checks if this sphere intersects another sphere.
     * @param sphere - The other sphere
     * @returns true if the spheres overlap
     */
    intersectsSphere(sphere: BoundingSphere): boolean {
        if (!sphere || !(sphere instanceof BoundingSphere)) {
            throw new Error('sphere must be a valid BoundingSphere');
        }
        const dx = sphere.center.x - this.center.x;
        const dy = sphere.center.y - this.center.y;
        const dz = sphere.center.z - this.center.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const radiusSum = this.radius + sphere.radius;
        return distSq <= radiusSum * radiusSum;
    }

    /**
     * Checks if this sphere intersects a box.
     * @param box - The box to test
     * @returns true if the sphere and box overlap
     */
    intersectsBox(box: BoundingBox): boolean {
        if (!box || !box.min || !box.max) {
            throw new Error('box must be a valid BoundingBox');
        }
        const closest = new Vec3();
        
        closest.x = Math.max(box.min.x, Math.min(this.center.x, box.max.x));
        closest.y = Math.max(box.min.y, Math.min(this.center.y, box.max.y));
        closest.z = Math.max(box.min.z, Math.min(this.center.z, box.max.z));
        
        const dx = closest.x - this.center.x;
        const dy = closest.y - this.center.y;
        const dz = closest.z - this.center.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        
        return distSq <= this.radius * this.radius;
    }

    /**
     * Expands the sphere to include the given point.
     * @param point - The point to include
     * @returns This sphere for chaining
     */
    expand(point: Vec3): BoundingSphere {
        if (!point || !(point instanceof Vec3)) {
            throw new Error('point must be a valid Vec3');
        }
        const dx = point.x - this.center.x;
        const dy = point.y - this.center.y;
        const dz = point.z - this.center.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);
        
        if (dist <= this.radius) {
            return this;
        }
        
        const newRadius = (this.radius + dist) * 0.5;
        const k = (newRadius - this.radius) / dist;
        
        this.center.x += dx * k;
        this.center.y += dy * k;
        this.center.z += dz * k;
        this.radius = newRadius;
        
        return this;
    }

    /**
     * Returns a string representation of the sphere.
     * @returns String representation
     */
    toString(): string {
        return `BoundingSphere(center: ${this.center.toString()}, radius: ${this.radius})`;
    }

    /**
     * Checks equality with another sphere.
     * @param sphere - The sphere to compare
     * @returns true if equal
     */
    equals(sphere: BoundingSphere): boolean {
        if (!sphere || !(sphere instanceof BoundingSphere)) {
            return false;
        }
        return this.center.equals(sphere.center) && this.radius === sphere.radius;
    }
}
