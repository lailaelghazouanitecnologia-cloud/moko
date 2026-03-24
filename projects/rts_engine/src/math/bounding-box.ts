import { Vec3 } from './vec3';
import { Mat4 } from './mat4';

/**
 * Represents an axis-aligned bounding box (AABB) in 3D space.
 * Defined by two points: the minimum corner and the maximum corner.
 */
export class BoundingBox {
    private _min: Vec3;
    private _max: Vec3;

    /**
     * Creates a new BoundingBox.
     * @param min - The minimum corner of the box. Defaults to positive infinity.
     * @param max - The maximum corner of the box. Defaults to negative infinity.
     */
    constructor(min?: Vec3, max?: Vec3) {
        this._min = min ? min.clone() : new Vec3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        this._max = max ? max.clone() : new Vec3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    }

    /**
     * Gets the minimum corner of the box.
     */
    get min(): Vec3 {
        return this._min;
    }

    /**
     * Gets the maximum corner of the box.
     */
    get max(): Vec3 {
        return this._max;
    }

    /**
     * Copies the values from another BoundingBox.
     * @param box - The BoundingBox to copy from.
     * @returns This BoundingBox for chaining.
     */
    copy(box: BoundingBox): BoundingBox {
        if (!box) {
            throw new Error('BoundingBox.copy: Cannot copy from null or undefined');
        }
        this._min.copy(box._min);
        this._max.copy(box._max);
        return this;
    }

    /**
     * Creates a new BoundingBox with the same values as this one.
     * @returns A new BoundingBox instance.
     */
    clone(): BoundingBox {
        return new BoundingBox(this._min, this._max);
    }

    /**
     * Sets the minimum and maximum corners of the box.
     * @param min - The new minimum corner.
     * @param max - The new maximum corner.
     * @returns This BoundingBox for chaining.
     */
    set(min: Vec3, max: Vec3): BoundingBox {
        if (!min || !max) {
            throw new Error('BoundingBox.set: Both min and max must be valid Vec3');
        }
        this._min.copy(min);
        this._max.copy(max);
        return this;
    }

    /**
     * Checks if the box is empty (min > max in any axis).
     * @returns True if the box is empty.
     */
    isEmpty(): boolean {
        return this._min.x > this._max.x || this._min.y > this._max.y || this._min.z > this._max.z;
    }

    /**
     * Calculates the center point of the box.
     * @returns A new Vec3 representing the center.
     */
    center(): Vec3 {
        if (this.isEmpty()) {
            return new Vec3();
        }
        return new Vec3(
            (this._min.x + this._max.x) * 0.5,
            (this._min.y + this._max.y) * 0.5,
            (this._min.z + this._max.z) * 0.5
        );
    }

    /**
     * Calculates the size of the box.
     * @returns A new Vec3 representing the size (width, height, depth).
     */
    size(): Vec3 {
        if (this.isEmpty()) {
            return new Vec3();
        }
        return new Vec3(
            this._max.x - this._min.x,
            this._max.y - this._min.y,
            this._max.z - this._min.z
        );
    }

    /**
     * Calculates the radius of the box (half the diagonal length).
     * @returns The radius.
     */
    radius(): number {
        return this.size().length() * 0.5;
    }

    /**
     * Checks if a point is inside or on the boundary of the box.
     * @param point - The point to check.
     * @returns True if the point is inside or on the boundary.
     */
    containsPoint(point: Vec3): boolean {
        if (!point) {
            throw new Error('BoundingBox.containsPoint: point must be a valid Vec3');
        }
        return point.x >= this._min.x && point.x <= this._max.x &&
               point.y >= this._min.y && point.y <= this._max.y &&
               point.z >= this._min.z && point.z <= this._max.z;
    }

    /**
     * Checks if this box completely contains another box.
     * @param box - The other BoundingBox.
     * @returns True if this box contains the other box.
     */
    containsBox(box: BoundingBox): boolean {
        if (!box) {
            throw new Error('BoundingBox.containsBox: box must be a valid BoundingBox');
        }
        return this._min.x <= box._min.x && box._max.x <= this._max.x &&
               this._min.y <= box._min.y && box._max.y <= this._max.y &&
               this._min.z <= box._min.z && box._max.z <= this._max.z;
    }

    /**
     * Checks if this box intersects with another box.
     * @param box - The other BoundingBox.
     * @returns True if the boxes intersect.
     */
    intersectsBox(box: BoundingBox): boolean {
        if (!box) {
            throw new Error('BoundingBox.intersectsBox: box must be a valid BoundingBox');
        }
        return this._min.x <= box._max.x && this._max.x >= box._min.x &&
               this._min.y <= box._max.y && this._max.y >= box._min.y &&
               this._min.z <= box._max.z && this._max.z >= box._min.z;
    }

    /**
     * Calculates the distance from the box to a point.
     * @param point - The point to calculate distance to.
     * @returns The distance.
     */
    distanceToPoint(point: Vec3): number {
        if (!point) {
            throw new Error('BoundingBox.distanceToPoint: point must be a valid Vec3');
        }
        const dx = Math.max(this._min.x - point.x, 0, point.x - this._max.x);
        const dy = Math.max(this._min.y - point.y, 0, point.y - this._max.y);
        const dz = Math.max(this._min.z - point.z, 0, point.z - this._max.z);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Expands the box to include a point.
     * @param point - The point to include.
     * @returns This BoundingBox for chaining.
     */
    expand(point: Vec3): BoundingBox {
        if (!point) {
            throw new Error('BoundingBox.expand: point must be a valid Vec3');
        }
        if (this.isEmpty()) {
            this._min.copy(point);
            this._max.copy(point);
        } else {
            this._min.x = Math.min(this._min.x, point.x);
            this._min.y = Math.min(this._min.y, point.y);
            this._min.z = Math.min(this._min.z, point.z);
            this._max.x = Math.max(this._max.x, point.x);
            this._max.y = Math.max(this._max.y, point.y);
            this._max.z = Math.max(this._max.z, point.z);
        }
        return this;
    }

    /**
     * Expands the box by a vector amount in all directions.
     * @param expand - The expansion vector.
     * @returns This BoundingBox for chaining.
     */
    expandByVec3(expand: Vec3): BoundingBox {
        if (!expand) {
            throw new Error('BoundingBox.expandByVec3: expand must be a valid Vec3');
        }
        this._min.sub(expand);
        this._max.add(expand);
        return this;
    }

    /**
     * Unions this box with another box.
     * @param box - The other BoundingBox.
     * @returns This BoundingBox for chaining.
     */
    union(box: BoundingBox): BoundingBox {
        if (!box) {
            throw new Error('BoundingBox.union: box must be a valid BoundingBox');
        }
        if (this.isEmpty()) {
            return this.copy(box);
        }
        if (box.isEmpty()) {
            return this;
        }
        this._min.x = Math.min(this._min.x, box._min.x);
        this._min.y = Math.min(this._min.y, box._min.y);
        this._min.z = Math.min(this._min.z, box._min.z);
        this._max.x = Math.max(this._max.x, box._max.x);
        this._max.y = Math.max(this._max.y, box._max.y);
        this._max.z = Math.max(this._max.z, box._max.z);
        return this;
    }

    /**
     * Intersects this box with another box.
     * @param box - The other BoundingBox.
     * @returns This BoundingBox for chaining.
     */
    intersect(box: BoundingBox): BoundingBox {
        if (!box) {
            throw new Error('BoundingBox.intersect: box must be a valid BoundingBox');
        }
        if (!this.intersectsBox(box)) {
            return this.set(new Vec3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
                          new Vec3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY));
        }
        this._min.x = Math.max(this._min.x, box._min.x);
        this._min.y = Math.max(this._min.y, box._min.y);
        this._min.z = Math.max(this._min.z, box._min.z);
        this._max.x = Math.min(this._max.x, box._max.x);
        this._max.y = Math.min(this._max.y, box._max.y);
        this._max.z = Math.min(this._max.z, box._max.z);
        return this;
    }

    /**
     * Transforms this box by a 4x4 matrix.
     * @param mat - The transformation matrix.
     * @returns This BoundingBox for chaining.
     */
    transform(mat: Mat4): BoundingBox {
        if (!mat) {
            throw new Error('BoundingBox.transform: mat must be a valid Mat4');
        }
        const center = this.center();
        const extent = new Vec3(
            (this._max.x - this._min.x) * 0.5,
            (this._max.y - this._min.y) * 0.5,
            (this._max.z - this._min.z) * 0.5
        );

        const transformedCenter = mat.transformPoint(center);
        const transformedExtent = new Vec3(
            Math.abs((mat as any).data[0] * extent.x) + Math.abs((mat as any).data[4] * extent.y) + Math.abs((mat as any).data[8] * extent.z),
            Math.abs((mat as any).data[1] * extent.x) + Math.abs((mat as any).data[5] * extent.y) + Math.abs((mat as any).data[9] * extent.z),
            Math.abs((mat as any).data[2] * extent.x) + Math.abs((mat as any).data[6] * extent.y) + Math.abs((mat as any).data[10] * extent.z)
        );

        this._min = transformedCenter.clone().sub(transformedExtent);
        this._max = transformedCenter.clone().add(transformedExtent);
        return this;
    }

    /**
     * Sets this box to enclose all given points.
     * @param points - Array of Vec3 points.
     * @returns This BoundingBox for chaining.
     */
    fromPoints(points: Vec3[]): BoundingBox {
        if (!Array.isArray(points) || points.length === 0) {
            this._min = new Vec3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
            this._max = new Vec3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
            return this;
        }

        this._min = points[0].clone();
        this._max = points[0].clone();

        for (let i = 1; i < points.length; i++) {
            const p = points[i];
            if (!p) {
                throw new Error(`BoundingBox.fromPoints: points[${i}] is not a valid Vec3`);
            }
            this._min.x = Math.min(this._min.x, p.x);
            this._min.y = Math.min(this._min.y, p.y);
            this._min.z = Math.min(this._min.z, p.z);
            this._max.x = Math.max(this._max.x, p.x);
            this._max.y = Math.max(this._max.y, p.y);
            this._max.z = Math.max(this._max.z, p.z);
        }

        return this;
    }

    /**
     * Checks if this box equals another box within a tolerance.
     * @param box - The other BoundingBox.
     * @param epsilon - The tolerance for comparison.
     * @returns True if the boxes are equal within tolerance.
     */
    equals(box: BoundingBox, epsilon: number = 1e-6): boolean {
        if (!box) {
            throw new Error('BoundingBox.equals: box must be a valid BoundingBox');
        }
        return this._min.equals(box._min, epsilon) && this._max.equals(box._max, epsilon);
    }

    /**
     * Creates an empty BoundingBox.
     * @returns A new empty BoundingBox.
     */
    static empty(): BoundingBox {
        return new BoundingBox(
            new Vec3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
            new Vec3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)
        );
    }

    /**
     * Creates a BoundingBox from a center point and size.
     * @param center - The center of the box.
     * @param size - The size of the box.
     * @returns A new BoundingBox.
     */
    static fromCenterSize(center: Vec3, size: Vec3): BoundingBox {
        if (!center || !size) {
            throw new Error('BoundingBox.fromCenterSize: center and size must be valid Vec3');
        }
        const halfSize = size.clone().mul(0.5);
        return new BoundingBox(
            center.clone().sub(halfSize),
            center.clone().add(halfSize)
        );
    }
}
