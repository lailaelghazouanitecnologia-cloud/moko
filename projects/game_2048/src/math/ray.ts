import { Vec3 } from './vec3';
import { Mat4 } from './mat4';

/**
 * Represents a ray in 3D space defined by an origin point and a direction vector.
 */
export class Ray {
    origin: Vec3;
    direction: Vec3;

    /**
     * Creates a new Ray instance.
     * @param origin - The origin point of the ray. Defaults to (0, 0, 0).
     * @param direction - The direction vector of the ray. Defaults to (0, 0, 1).
     * @throws {Error} If direction is a zero vector.
     */
    constructor(origin: Vec3 = new Vec3(), direction: Vec3 = new Vec3(0, 0, 1)) {
        this.origin = origin.clone();
        this.direction = direction.clone().normalize();
        
        if (this.direction.length() === 0) {
            throw new Error('Ray direction cannot be a zero vector');
        }
    }

    /**
     * Sets the origin and direction of the ray.
     * @param origin - The new origin point.
     * @param direction - The new direction vector.
     * @returns This ray instance for method chaining.
     * @throws {Error} If direction is a zero vector.
     */
    set(origin: Vec3, direction: Vec3): Ray {
        if (!origin || !direction) {
            throw new Error('Origin and direction must be provided');
        }
        
        this.origin.copy(origin);
        this.direction.copy(direction).normalize();
        
        if (this.direction.length() === 0) {
            throw new Error('Ray direction cannot be a zero vector');
        }
        
        return this;
    }

    /**
     * Creates a deep copy of this ray.
     * @returns A new Ray instance with the same origin and direction.
     */
    clone(): Ray {
        return new Ray(this.origin, this.direction);
    }

    /**
     * Copies the origin and direction from another ray.
     * @param ray - The ray to copy from.
     * @returns This ray instance for method chaining.
     * @throws {Error} If ray is null or undefined.
     */
    copy(ray: Ray): Ray {
        if (!ray) {
            throw new Error('Ray to copy from must be provided');
        }
        
        this.origin.copy(ray.origin);
        this.direction.copy(ray.direction);
        return this;
    }

    /**
     * Calculates a point along the ray at the given distance.
     * @param t - The distance along the ray.
     * @param out - Optional Vec3 to store the result. If not provided, a new Vec3 is created.
     * @returns The point at distance t along the ray.
     */
    at(t: number, out: Vec3 = new Vec3()): Vec3 {
        if (typeof t !== 'number' || !isFinite(t)) {
            throw new Error('Parameter t must be a finite number');
        }
        
        return out.copy(this.direction).scale(t).add(this.origin);
    }

    /**
     * Checks if this ray intersects a sphere.
     * @param sphere - An object with center (Vec3) and radius (number) properties.
     * @returns True if the ray intersects the sphere, false otherwise.
     * @throws {Error} If sphere or its properties are invalid.
     */
    intersectsSphere(sphere: { center: Vec3; radius: number }): boolean {
        if (!sphere || !sphere.center || typeof sphere.radius !== 'number') {
            throw new Error('Valid sphere object with center and radius properties must be provided');
        }
        
        if (sphere.radius < 0) {
            throw new Error('Sphere radius cannot be negative');
        }
        
        const oc = this.origin.clone().sub(sphere.center);
        const a = this.direction.dot(this.direction);
        const b = 2.0 * oc.dot(this.direction);
        const c = oc.dot(oc) - sphere.radius * sphere.radius;
        const discriminant = b * b - 4 * a * c;
        return discriminant >= 0;
    }

    /**
     * Checks if this ray intersects an axis-aligned box.
     * @param box - An object with min (Vec3) and max (Vec3) properties representing the box bounds.
     * @returns True if the ray intersects the box, false otherwise.
     * @throws {Error} If box or its properties are invalid.
     */
    intersectsBox(box: { min: Vec3; max: Vec3 }): boolean {
        if (!box || !box.min || !box.max) {
            throw new Error('Valid box object with min and max properties must be provided');
        }
        
        if (box.min.x > box.max.x || box.min.y > box.max.y || box.min.z > box.max.z) {
            throw new Error('Box min must be less than or equal to box max in all dimensions');
        }
        
        let tmin = -Infinity;
        let tmax = Infinity;

        const direction = this.direction;
        
        // Handle zero direction components
        if (direction.x === 0) {
            if (this.origin.x < box.min.x || this.origin.x > box.max.x) return false;
        } else {
            const invDirectionX = 1.0 / direction.x;
            let t1 = (box.min.x - this.origin.x) * invDirectionX;
            let t2 = (box.max.x - this.origin.x) * invDirectionX;
            
            if (invDirectionX < 0) {
                [t1, t2] = [t2, t1];
            }
            
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            
            if (tmin > tmax) return false;
        }
        
        if (direction.y === 0) {
            if (this.origin.y < box.min.y || this.origin.y > box.max.y) return false;
        } else {
            const invDirectionY = 1.0 / direction.y;
            let t3 = (box.min.y - this.origin.y) * invDirectionY;
            let t4 = (box.max.y - this.origin.y) * invDirectionY;
            
            if (invDirectionY < 0) {
                [t3, t4] = [t4, t3];
            }
            
            tmin = Math.max(tmin, t3);
            tmax = Math.min(tmax, t4);
            
            if (tmin > tmax) return false;
        }
        
        if (direction.z === 0) {
            if (this.origin.z < box.min.z || this.origin.z > box.max.z) return false;
        } else {
            const invDirectionZ = 1.0 / direction.z;
            let t5 = (box.min.z - this.origin.z) * invDirectionZ;
            let t6 = (box.max.z - this.origin.z) * invDirectionZ;
            
            if (invDirectionZ < 0) {
                [t5, t6] = [t6, t5];
            }
            
            tmin = Math.max(tmin, t5);
            tmax = Math.min(tmax, t6);
            
            if (tmin > tmax) return false;
        }
        
        return tmax >= Math.max(0, tmin);
    }

    /**
     * Calculates the shortest distance from this ray to a point.
     * @param point - The point to measure distance to.
     * @returns The shortest distance from the ray to the point.
     * @throws {Error} If point is not a valid Vec3.
     */
    distanceToPoint(point: Vec3): number {
        if (!point || typeof point.dot !== 'function') {
            throw new Error('Valid Vec3 point must be provided');
        }
        
        const direction = this.direction.clone().normalize();
        const v = point.clone().sub(this.origin);
        const t = v.dot(direction);
        
        // If projection is behind the ray origin, return distance to origin
        if (t < 0) {
            return this.origin.distance(point);
        }
        
        const projection = this.origin.clone().add(direction.scale(t));
        return projection.distance(point);
    }

    /**
     * Checks if this ray intersects a plane.
     * @param plane - An object with normal (Vec3) and distance (number) properties.
     * @returns True if the ray intersects the plane, false otherwise.
     * @throws {Error} If plane or its properties are invalid.
     */
    intersectsPlane(plane: { normal: Vec3; distance: number }): boolean {
        if (!plane || !plane.normal || typeof plane.distance !== 'number') {
            throw new Error('Valid plane object with normal and distance properties must be provided');
        }
        
        const denominator = this.direction.dot(plane.normal);
        if (Math.abs(denominator) < 1e-6) return false;
        const t = -(this.origin.dot(plane.normal) + plane.distance) / denominator;
        return t >= 0;
    }

    /**
     * Calculates the intersection point between this ray and a plane.
     * @param plane - An object with normal (Vec3) and distance (number) properties.
     * @param out - Optional Vec3 to store the result. If not provided, a new Vec3 is created.
     * @returns The intersection point if it exists, or null if the ray is parallel to the plane or intersects behind the origin.
     * @throws {Error} If plane or its properties are invalid.
     */
    intersectPlane(plane: { normal: Vec3; distance: number }, out: Vec3 = new Vec3()): Vec3 | null {
        if (!plane || !plane.normal || typeof plane.distance !== 'number') {
            throw new Error('Valid plane object with normal and distance properties must be provided');
        }
        
        const denominator = this.direction.dot(plane.normal);
        if (Math.abs(denominator) < 1e-6) return null;
        const t = -(this.origin.dot(plane.normal) + plane.distance) / denominator;
        if (t < 0) return null;
        return this.at(t, out);
    }

    /**
     * Transforms this ray by a 4x4 matrix.
     * @param mat4 - The transformation matrix.
     * @returns A new Ray instance transformed by the matrix.
     * @throws {Error} If matrix is invalid.
     */
    transform(mat4: Mat4): Ray {
        if (!mat4 || !mat4.transformPoint || !mat4.transformVector) {
            throw new Error('Valid Mat4 transformation matrix must be provided');
        }
        
        const newOrigin = mat4.transformPoint(this.origin, new Vec3());
        const newDirection = mat4.transformVector(this.direction, new Vec3()).normalize();
        
        return new Ray(newOrigin, newDirection);
    }

    /**
     * Checks if this ray is equal to another ray within a given tolerance.
     * @param ray - The ray to compare with.
     * @param tolerance - The tolerance for comparison. Defaults to 1e-6.
     * @returns True if the rays are equal within the tolerance, false otherwise.
     */
    equals(ray: Ray, tolerance: number = 1e-6): boolean {
        if (!ray) return false;
        return this.origin.equals(ray.origin, tolerance) && this.direction.equals(ray.direction, tolerance);
    }

    /**
     * Returns a string representation of this ray.
     * @returns A string in the format "Ray(origin: [x, y, z], direction: [x, y, z])".
     */
    toString(): string {
        return `Ray(origin: ${this.origin.toString()}, direction: ${this.direction.toString()})`;
    }

    /**
     * Resets this ray to default values.
     * @returns This ray instance for method chaining.
     */
    reset(): Ray {
        this.origin.set(0, 0, 0);
        this.direction.set(0, 0, 1);
        return this;
    }

    /**
     * Gets the closest point on this ray to another point.
     * @param point - The point to find the closest point to.
     * @param out - Optional Vec3 to store the result. If not provided, a new Vec3 is created.
     * @returns The closest point on the ray to the given point.
     * @throws {Error} If point is not a valid Vec3.
     */
    closestPointToPoint(point: Vec3, out: Vec3 = new Vec3()): Vec3 {
        if (!point || typeof point.dot !== 'function') {
            throw new Error('Valid Vec3 point must be provided');
        }
        
        const t = this._calculateProjectionParameter(point);
        
        // If projection is behind the ray origin, return origin
        if (t < 0) {
            return out.copy(this.origin);
        }
        
        return this.at(t, out);
    }

    /**
     * Calculates the parameter t for the closest point on the ray to a given point.
     * @param point - The point to calculate for.
     * @returns The parameter t value.
     * @private
     */
    private _calculateProjectionParameter(point: Vec3): number {
        const v = point.clone().sub(this.origin);
        return v.dot(this.direction) / this.direction.dot(this.direction);
    }
}
