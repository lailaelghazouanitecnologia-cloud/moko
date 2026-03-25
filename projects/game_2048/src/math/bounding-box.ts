import { Vec3 } from './vec3';
import { Mat4 } from './mat4';
import { BoundingSphere } from './bounding-sphere';
import { Frustum } from './frustum';
import { Ray } from './ray';

/**
 * Represents an axis-aligned bounding box (AABB) in 3D space.
 * Defined by minimum and maximum corner points.
 */
export class BoundingBox {
    min: Vec3;
    max: Vec3;

    /**
     * Creates a new BoundingBox.
     * @param min - The minimum corner point. Defaults to (0,0,0).
     * @param max - The maximum corner point. Defaults to (0,0,0).
     */
    constructor(min?: Vec3, max?: Vec3) {
        this.min = min ? min.clone() : new Vec3();
        this.max = max ? max.clone() : new Vec3();
    }

    /**
     * Sets the minimum and maximum points of this box.
     * @param min - The new minimum point.
     * @param max - The new maximum point.
     * @returns This box for chaining.
     * @throws {Error} If min or max is not a valid Vec3.
     */
    set(min: Vec3, max: Vec3): BoundingBox {
        if (!min || !min.isVec3) throw new Error('Invalid min Vec3');
        if (!max || !max.isVec3) throw new Error('Invalid max Vec3');
        this.min.copy(min);
        this.max.copy(max);
        return this;
    }

    /**
     * Copies the bounds from another box.
     * @param box - The source box.
     * @returns This box for chaining.
     * @throws {Error} If box is not a valid BoundingBox.
     */
    copy(box: BoundingBox): BoundingBox {
        if (!box || !box.isBoundingBox) throw new Error('Invalid BoundingBox');
        this.min.copy(box.min);
        this.max.copy(box.max);
        return this;
    }

    /**
     * Creates a new box with the same bounds as this one.
     * @returns A new BoundingBox instance.
     */
    clone(): BoundingBox {
        return new BoundingBox(this.min, this.max);
    }

    /**
     * Resets this box to zero volume at the origin.
     * @returns This box for chaining.
     */
    empty(): BoundingBox {
        this.min.set(0, 0, 0);
        this.max.set(0, 0, 0);
        return this;
    }

    /**
     * Builds the box to enclose an array of points.
     * @param points - Array of Vec3 points.
     * @returns This box for chaining.
     * @throws {Error} If points is not an array or contains invalid Vec3s.
     */
    fromPoints(points: Vec3[]): BoundingBox {
        if (!Array.isArray(points)) throw new Error('Points must be an array');
        if (points.length === 0) {
            return this.empty();
        }

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const p of points) {
            if (!p || !p.isVec3) throw new Error('All points must be valid Vec3');
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            minZ = Math.min(minZ, p.z);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
            maxZ = Math.max(maxZ, p.z);
        }

        this.min.set(minX, minY, minZ);
        this.max.set(maxX, maxY, maxZ);
        return this;
    }

    /**
     * Computes the center point of this box.
     * @returns A new Vec3 representing the center.
     */
    center(): Vec3 {
        return new Vec3(
            (this.min.x + this.max.x) * 0.5,
            (this.min.y + this.max.y) * 0.5,
            (this.min.z + this.max.z) * 0.5
        );
    }

    /**
     * Computes the size (width, height, depth) of this box.
     * @returns A new Vec3 containing the size components.
     */
    size(): Vec3 {
        return new Vec3(
            this.max.x - this.min.x,
            this.max.y - this.min.y,
            this.max.z - this.min.z
        );
    }

    /**
     * Checks if a point lies inside or on the boundary of this box.
     * @param point - The point to test.
     * @returns True if the point is inside or on the boundary.
     * @throws {Error} If point is not a valid Vec3.
     */
    containsPoint(point: Vec3): boolean {
        if (!point || !point.isVec3) throw new Error('Invalid Vec3 point');
        return point.x >= this.min.x && point.x <= this.max.x &&
               point.y >= this.min.y && point.y <= this.max.y &&
               point.z >= this.min.z && point.z <= this.max.z;
    }

    /**
     * Checks if this box intersects another box.
     * @param box - The other box.
     * @returns True if the boxes intersect.
     * @throws {Error} If box is not a valid BoundingBox.
     */
    intersectsBox(box: BoundingBox): boolean {
        if (!box || !box.isBoundingBox) throw new Error('Invalid BoundingBox');
        return this.min.x <= box.max.x && this.max.x >= box.min.x &&
               this.min.y <= box.max.y && this.max.y >= box.min.y &&
               this.min.z <= box.max.z && this.max.z >= box.min.z;
    }

    /**
     * Checks if this box intersects a sphere.
     * @param sphere - The sphere to test.
     * @returns True if they intersect.
     * @throws {Error} If sphere is not a valid BoundingSphere.
     */
    intersectsSphere(sphere: BoundingSphere): boolean {
        if (!sphere || !sphere.isBoundingSphere) throw new Error('Invalid BoundingSphere');
        const closest = new Vec3(
            Math.max(this.min.x, Math.min(sphere.center.x, this.max.x)),
            Math.max(this.min.y, Math.min(sphere.center.y, this.max.y)),
            Math.max(this.min.z, Math.min(sphere.center.z, this.max.z))
        );

        const distance = closest.sub(sphere.center).length();
        return distance <= sphere.radius;
    }

    /**
     * Expands this box to include a point.
     * @param point - The point to include.
     * @returns This box for chaining.
     * @throws {Error} If point is not a valid Vec3.
     */
    expand(point: Vec3): BoundingBox {
        if (!point || !point.isVec3) throw new Error('Invalid Vec3 point');
        this.min.set(
            Math.min(this.min.x, point.x),
            Math.min(this.min.y, point.y),
            Math.min(this.min.z, point.z)
        );
        this.max.set(
            Math.max(this.max.x, point.x),
            Math.max(this.max.y, point.y),
            Math.max(this.max.z, point.z)
        );
        return this;
    }

    /**
     * Transforms this box by a 4x4 matrix and returns the new axis-aligned box.
     * @param matrix - The transformation matrix.
     * @returns This box for chaining.
     * @throws {Error} If matrix is not a valid Mat4.
     */
    transform(matrix: Mat4): BoundingBox {
        if (!matrix || !matrix.isMat4) throw new Error('Invalid Mat4');
        const corners = [
            new Vec3(this.min.x, this.min.y, this.min.z),
            new Vec3(this.max.x, this.min.y, this.min.z),
            new Vec3(this.min.x, this.max.y, this.min.z),
            new Vec3(this.max.x, this.max.y, this.min.z),
            new Vec3(this.min.x, this.min.y, this.max.z),
            new Vec3(this.max.x, this.min.y, this.max.z),
            new Vec3(this.min.x, this.max.y, this.max.z),
            new Vec3(this.max.x, this.max.y, this.max.z)
        ];

        const transformedCorners = corners.map(corner => {
            const x = matrix.data[0] * corner.x + matrix.data[4] * corner.y + matrix.data[8] * corner.z + matrix.data[12];
            const y = matrix.data[1] * corner.x + matrix.data[5] * corner.y + matrix.data[9] * corner.z + matrix.data[13];
            const z = matrix.data[2] * corner.x + matrix.data[6] * corner.y + matrix.data[10] * corner.z + matrix.data[14];
            return new Vec3(x, y, z);
        });

        return this.fromPoints(transformedCorners);
    }

    /**
     * Checks if this box intersects a frustum.
     * @param frustum - The frustum to test.
     * @returns True if the box intersects the frustum.
     * @throws {Error} If frustum is not a valid Frustum.
     */
    intersectsFrustum(frustum: Frustum): boolean {
        if (!frustum || !frustum.isFrustum) throw new Error('Invalid Frustum');
        const center = this.center();
        const size = this.size();
        const halfSize = size.scale(0.5);

        for (const plane of frustum.planes) {
            const normal = new Vec3(plane.x, plane.y, plane.z);
            const distance = normal.x * center.x + normal.y * center.y + normal.z * center.z + plane.w;
            const radius = Math.abs(normal.x * halfSize.x) + Math.abs(normal.y * halfSize.y) + Math.abs(normal.z * halfSize.z);
            
            if (distance + radius < 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Computes the closest distance from this box to a point.
     * @param point - The point to measure to.
     * @returns The distance.
     * @throws {Error} If point is not a valid Vec3.
     */
    distanceToPoint(point: Vec3): number {
        if (!point || !point.isVec3) throw new Error('Invalid Vec3 point');
        const closest = new Vec3(
            Math.max(this.min.x, Math.min(point.x, this.max.x)),
            Math.max(this.min.y, Math.min(point.y, this.max.y)),
            Math.max(this.min.z, Math.min(point.z, this.max.z))
        );
        return closest.sub(point).length();
    }

    /**
     * Checks if a ray intersects this box.
     * @param ray - The ray to test.
     * @returns True if the ray intersects the box.
     * @throws {Error} If ray is not a valid Ray.
     */
    intersectsRay(ray: Ray): boolean {
        if (!ray || !ray.isRay) throw new Error('Invalid Ray');
        const invDirX = 1 / ray.direction.x;
        const invDirY = 1 / ray.direction.y;
        const invDirZ = 1 / ray.direction.z;

        let t1 = (this.min.x - ray.origin.x) * invDirX;
        let t2 = (this.max.x - ray.origin.x) * invDirX;
        let tmin = Math.min(t1, t2);
        let tmax = Math.max(t1, t2);

        t1 = (this.min.y - ray.origin.y) * invDirY;
        t2 = (this.max.y - ray.origin.y) * invDirY;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));

        t1 = (this.min.z - ray.origin.z) * invDirZ;
        t2 = (this.max.z - ray.origin.z) * invDirZ;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));

        return tmax >= Math.max(0, tmin);
    }

    /**
     * Checks if this box is valid (min <= max on all axes).
     * @returns True if the box is valid.
     */
    isValid(): boolean {
        return this.min.x <= this.max.x && this.min.y <= this.max.y && this.min.z <= this.max.z;
    }

    /**
     * Ensures min and max are correctly ordered.
     * @returns This box for chaining.
     */
    sort(): BoundingBox {
        const newMin = new Vec3(
            Math.min(this.min.x, this.max.x),
            Math.min(this.min.y, this.max.y),
            Math.min(this.min.z, this.max.z)
        );
        const newMax = new Vec3(
            Math.max(this.min.x, this.max.x),
            Math.max(this.min.y, this.max.y),
            Math.max(this.min.z, this.max.z)
        );
        this.min.copy(newMin);
        this.max.copy(newMax);
        return this;
    }

    /**
     * Computes the surface area of this box.
     * @returns The surface area.
     */
    surfaceArea(): number {
        const size = this.size();
        return 2 * (size.x * size.y + size.x * size.z + size.y * size.z);
    }

    /**
     * Computes the volume of this box.
     * @returns The volume.
     */
    volume(): number {
        const size = this.size();
        return size.x * size.y * size.z;
    }

    /**
     * Checks if this box contains another box entirely.
     * @param box - The box to test.
     * @returns True if this box contains the other box.
     * @throws {Error} If box is not a valid BoundingBox.
     */
    containsBox(box: BoundingBox): boolean {
        if (!box || !box.isBoundingBox) throw new Error('Invalid BoundingBox');
        return this.min.x <= box.min.x && this.max.x >= box.max.x &&
               this.min.y <= box.min.y && this.max.y >= box.max.y &&
               this.min.z <= box.min.z && this.max.z >= box.max.z;
    }

    /**
     * Merges another box into this one, expanding as needed.
     * @param box - The box to merge.
     * @returns This box for chaining.
     * @throws {Error} If box is not a valid BoundingBox.
     */
    union(box: BoundingBox): BoundingBox {
        if (!box || !box.isBoundingBox) throw new Error('Invalid BoundingBox');
        this.min.set(
            Math.min(this.min.x, box.min.x),
            Math.min(this.min.y, box.min.y),
            Math.min(this.min.z, box.min.z)
        );
        this.max.set(
            Math.max(this.max.x, box.max.x),
            Math.max(this.max.y, box.max.y),
            Math.max(this.max.z, box.max.z)
        );
        return this;
    }

    /**
     * Computes the intersection of this box and another.
     * @param box - The other box.
     * @returns A new BoundingBox representing the intersection, or null if no intersection.
     * @throws {Error} If box is not a valid BoundingBox.
     */
    intersection(box: BoundingBox): BoundingBox | null {
        if (!box || !box.isBoundingBox) throw new Error('Invalid BoundingBox');
        const newMin = new Vec3(
            Math.max(this.min.x, box.min.x),
            Math.max(this.min.y, box.min.y),
            Math.max(this.min.z, box.min.z)
        );
        const newMax = new Vec3(
            Math.min(this.max.x, box.max.x),
            Math.min(this.max.y, box.max.y),
            Math.min(this.max.z, box.max.z)
        );
        const result = new BoundingBox(newMin, newMax);
        return result.isValid() ? result : null;
    }

    /**
     * Inflates or deflates this box uniformly.
     * @param delta - The amount to expand (positive) or shrink (negative).
     * @returns This box for chaining.
     */
    inflate(delta: number): BoundingBox {
        const deltaVec = new Vec3(delta, delta, delta);
        this.min.sub(deltaVec);
        this.max.add(deltaVec);
        return this;
    }

    /**
     * Checks for approximate equality with another box.
     * @param box - The other box.
     * @param epsilon - Tolerance for comparison. Defaults to 1e-6.
     * @returns True if the boxes are approximately equal.
     * @throws {Error} If box is not a valid BoundingBox.
     */
    equals(box: BoundingBox, epsilon: number = 1e-6): boolean {
        if (!box || !box.isBoundingBox) throw new Error('Invalid BoundingBox');
        return this.min.equals(box.min, epsilon) && this.max.equals(box.max, epsilon);
    }

    /**
     * Returns a string representation of this box.
     * @returns A string like "BoundingBox(min: Vec3(...), max: Vec3(...))".
     */
    toString(): string {
        return `BoundingBox(min: ${this.min.toString()}, max: ${this.max.toString()})`;
    }

    /**
     * Type guard to check if an object is a BoundingBox.
     */
    get isBoundingBox(): true {
        return true;
    }
}
