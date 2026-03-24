import { Vec3 } from './vec3';

/**
 * A 3-dimensional bounding sphere defined by a center point and a radius.
 */
export class BoundingSphere {
    private center: Vec3;
    private radius: number;

    /**
     * Creates a new BoundingSphere.
     * @param center - The center of the sphere. Defaults to Vec3.zero().
     * @param radius - The radius of the sphere. Defaults to 0.
     * @throws {Error} If radius is negative.
     */
    constructor(center?: Vec3, radius?: number) {
        this.center = center ? center.clone() : Vec3.zero();
        this.radius = radius ?? 0;
        
        if (this.radius < 0) {
            throw new Error('BoundingSphere radius cannot be negative');
        }
    }

    /**
     * Copies the properties from another BoundingSphere to this instance.
     * @param sphere - The BoundingSphere to copy from.
     * @returns This BoundingSphere instance for chaining.
     * @throws {Error} If sphere is null or undefined.
     */
    copy(sphere: BoundingSphere): BoundingSphere {
        if (!sphere) {
            throw new Error('Cannot copy from null or undefined BoundingSphere');
        }
        
        this.center.copy(sphere.center);
        this.radius = sphere.radius;
        return this;
    }

    /**
     * Creates a deep copy of this BoundingSphere.
     * @returns A new BoundingSphere instance with the same properties.
     */
    clone(): BoundingSphere {
        return new BoundingSphere(this.center, this.radius);
    }

    /**
     * Sets the center and radius of this BoundingSphere.
     * @param center - The new center position.
     * @param radius - The new radius.
     * @returns This BoundingSphere instance for chaining.
     * @throws {Error} If center is null/undefined or radius is negative.
     */
    set(center: Vec3, radius: number): BoundingSphere {
        if (!center) {
            throw new Error('Center cannot be null or undefined');
        }
        if (radius < 0) {
            throw new Error('Radius cannot be negative');
        }
        
        this.center.copy(center);
        this.radius = radius;
        return this;
    }

    /**
     * Gets the center of this BoundingSphere.
     * @returns A clone of the center Vec3.
     */
    getCenter(): Vec3 {
        return this.center.clone();
    }

    /**
     * Gets the radius of this BoundingSphere.
     * @returns The radius value.
     */
    getRadius(): number {
        return this.radius;
    }

    /**
     * Checks if this BoundingSphere is empty (radius <= 0).
     * @returns True if the sphere is empty, false otherwise.
     */
    isEmpty(): boolean {
        return this.radius <= 0;
    }

    /**
     * Checks if a point is contained within this BoundingSphere.
     * @param point - The point to test.
     * @returns True if the point is inside or on the sphere, false otherwise.
     * @throws {Error} If point is null or undefined.
     */
    containsPoint(point: Vec3): boolean {
        if (!point) {
            throw new Error('Point cannot be null or undefined');
        }
        
        if (this.isEmpty()) {
            return false;
        }
        
        return this.center.distance(point) <= this.radius;
    }

    /**
     * Checks if this BoundingSphere intersects with another BoundingSphere.
     * @param sphere - The other sphere to test against.
     * @returns True if the spheres intersect or touch, false otherwise.
     * @throws {Error} If sphere is null or undefined.
     */
    intersectsSphere(sphere: BoundingSphere): boolean {
        if (!sphere) {
            throw new Error('Sphere cannot be null or undefined');
        }
        
        if (this.isEmpty() || sphere.isEmpty()) {
            return false;
        }
        
        const distance = this.center.distance(sphere.center);
        return distance <= (this.radius + sphere.radius);
    }

    /**
     * Checks if this BoundingSphere intersects with an axis-aligned box.
     * @param min - The minimum corner of the box.
     * @param max - The maximum corner of the box.
     * @returns True if the sphere intersects the box, false otherwise.
     * @throws {Error} If min or max is null/undefined, or if min > max.
     */
    intersectsBox(min: Vec3, max: Vec3): boolean {
        if (!min || !max) {
            throw new Error('Min and max cannot be null or undefined');
        }
        
        if (this.isEmpty()) {
            return false;
        }
        
        // Validate that min <= max
        if ((min as any).x > (max as any).x || (min as any).y > (max as any).y || (min as any).z > (max as any).z) {
            throw new Error('Invalid box: min must be less than or equal to max');
        }
        
        const closest = new Vec3(
            Math.max((min as any).x, Math.min((this.center as any).x, (max as any).x)),
            Math.max((min as any).y, Math.min((this.center as any).y, (max as any).y)),
            Math.max((min as any).z, Math.min((this.center as any).z, (max as any).z))
        );
        
        return this.containsPoint(closest);
    }

    /**
     * Calculates the distance from this BoundingSphere to a point.
     * @param point - The point to calculate distance to.
     * @returns The distance from the sphere's surface to the point (0 if point is inside).
     * @throws {Error} If point is null or undefined.
     */
    distanceToPoint(point: Vec3): number {
        if (!point) {
            throw new Error('Point cannot be null or undefined');
        }
        
        if (this.isEmpty()) {
            return this.center.distance(point);
        }
        
        return Math.max(0, this.center.distance(point) - this.radius);
    }

    /**
     * Expands this BoundingSphere to include a point.
     * @param point - The point to include.
     * @returns This BoundingSphere instance for chaining.
     * @throws {Error} If point is null or undefined.
     */
    expandToIncludePoint(point: Vec3): BoundingSphere {
        if (!point) {
            throw new Error('Point cannot be null or undefined');
        }
        
        if (this.isEmpty()) {
            this.center.copy(point);
            this.radius = 0;
            return this;
        }

        const distance = this.center.distance(point);
        if (distance <= this.radius) {
            return this;
        }

        const newRadius = (distance + this.radius) / 2;
        const t = (newRadius - this.radius) / distance;
        this.center.lerp(point, t);
        this.radius = newRadius;
        return this;
    }

    /**
     * Expands this BoundingSphere to include another BoundingSphere.
     * @param sphere - The sphere to include.
     * @returns This BoundingSphere instance for chaining.
     * @throws {Error} If sphere is null or undefined.
     */
    expandToIncludeSphere(sphere: BoundingSphere): BoundingSphere {
        if (!sphere) {
            throw new Error('Sphere cannot be null or undefined');
        }
        
        if (this.isEmpty()) {
            this.copy(sphere);
            return this;
        }

        if (sphere.isEmpty()) {
            return this;
        }

        const distance = this.center.distance(sphere.center);
        const newRadius = Math.max(this.radius, distance + sphere.radius);
        if (newRadius <= this.radius) {
            return this;
        }

        if (distance === 0) {
            this.radius = newRadius;
            return this;
        }

        const t = (newRadius - this.radius) / distance;
        this.center.lerp(sphere.center, t);
        this.radius = newRadius;
        return this;
    }

    /**
     * Transforms this BoundingSphere by a matrix.
     * @param matrix - The transformation matrix.
     * @returns A new BoundingSphere transformed by the matrix.
     * @throws {Error} If matrix is null or undefined.
     */
    transform(matrix: any): BoundingSphere {
        if (!matrix) {
            throw new Error('Matrix cannot be null or undefined');
        }
        
        const transformedCenter = matrix.transformPoint ? matrix.transformPoint(this.center) : matrix.transform(this.center);
        
        // Extract scale from matrix
        const scale = new Vec3(
            matrix.data[0] * matrix.data[0] + matrix.data[1] * matrix.data[1] + matrix.data[2] * matrix.data[2],
            matrix.data[4] * matrix.data[4] + matrix.data[5] * matrix.data[5] + matrix.data[6] * matrix.data[6],
            matrix.data[8] * matrix.data[8] + matrix.data[9] * matrix.data[9] + matrix.data[10] * matrix.data[10]
        );
        
        const maxScale = Math.sqrt(Math.max((scale as any).x, Math.max((scale as any).y, (scale as any).z)));
        return new BoundingSphere(transformedCenter, this.radius * maxScale);
    }

    /**
     * Creates a BoundingSphere that encloses all given points.
     * @param points - Array of Vec3 points.
     * @returns A new BoundingSphere that contains all points.
     * @throws {Error} If points array is null or undefined.
     */
    static fromPoints(points: Vec3[]): BoundingSphere {
        if (!points) {
            throw new Error('Points array cannot be null or undefined');
        }
        
        if (points.length === 0) {
            return new BoundingSphere();
        }

        // Validate all points
        for (let i = 0; i < points.length; i++) {
            if (!points[i]) {
                throw new Error(`Point at index ${i} is null or undefined`);
            }
        }

        let center = Vec3.zero();
        for (const point of points) {
            center = center.add(point);
        }
        center = center.mul(1 / points.length);

        let maxRadiusSquared = 0;
        for (const point of points) {
            const distanceSquared = (center as any).distanceSquared(point);
            if (distanceSquared > maxRadiusSquared) {
                maxRadiusSquared = distanceSquared;
            }
        }

        return new BoundingSphere(center, Math.sqrt(maxRadiusSquared));
    }

    /**
     * Creates a BoundingSphere from an axis-aligned box.
     * @param min - The minimum corner of the box.
     * @param max - The maximum corner of the box.
     * @returns A new BoundingSphere that encloses the box.
     * @throws {Error} If min or max is null/undefined, or if min > max.
     */
    static fromBox(min: Vec3, max: Vec3): BoundingSphere {
        if (!min || !max) {
            throw new Error('Min and max cannot be null or undefined');
        }
        
        // Validate that min <= max
        if ((min as any).x > (max as any).x || (min as any).y > (max as any).y || (min as any).z > (max as any).z) {
            throw new Error('Invalid box: min must be less than or equal to max');
        }
        
        const center = min.add(max).mul(0.5);
        const radius = center.distance(max);
        return new BoundingSphere(center, radius);
    }

    /**
     * Checks if this BoundingSphere equals another.
     * @param sphere - The sphere to compare with.
     * @returns True if both center and radius are equal.
     */
    equals(sphere: BoundingSphere): boolean {
        if (!sphere) {
            return false;
        }
        
        return this.center.equals(sphere.center) && this.radius === sphere.radius;
    }

    /**
     * Creates a string representation of this BoundingSphere.
     * @returns A string in the format "BoundingSphere(center: [x, y, z], radius: r)".
     */
    toString(): string {
        return `BoundingSphere(center: ${this.center.toString()}, radius: ${this.radius})`;
    }
}
