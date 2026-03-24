import { Vec3 } from './vec3';
import { Vec4 } from './vec4';

/**
 * Represents a 3-dimensional ray with an origin and a direction.
 */
export class Ray {
    private _origin: Vec3;
    private _direction: Vec3;

    /**
     * Creates a new Ray instance.
     * @param origin - The starting point of the ray. Defaults to (0, 0, 0).
     * @param direction - The direction vector of the ray. Defaults to (0, 0, 1).
     */
    constructor(origin?: Vec3, direction?: Vec3) {
        this._origin = origin ? origin.clone() : new Vec3();
        this._direction = direction ? direction.clone() : new Vec3(0, 0, 1);
        this._validateDirection();
    }

    /**
     * Copies the properties of another ray to this one.
     * @param r - The ray to copy from.
     * @returns This ray for chaining.
     * @throws {TypeError} If r is not a valid Ray instance.
     */
    copy(r: Ray): Ray {
        if (!(r instanceof Ray)) {
            throw new TypeError('Expected a Ray instance for copying');
        }
        this._origin.copy(r._origin);
        this._direction.copy(r._direction);
        this._validateDirection();
        return this;
    }

    /**
     * Creates a new ray with the same origin and direction as this one.
     * @returns A new Ray instance.
     */
    clone(): Ray {
        return new Ray().copy(this);
    }

    /**
     * Sets the origin and direction of the ray.
     * @param origin - The new origin.
     * @param direction - The new direction.
     * @returns This ray for chaining.
     * @throws {TypeError} If origin or direction are not valid Vec3 instances.
     */
    set(origin: Vec3, direction: Vec3): Ray {
        if (!(origin instanceof Vec3) || !(direction instanceof Vec3)) {
            throw new TypeError('Origin and direction must be Vec3 instances');
        }
        this._origin.copy(origin);
        this._direction.copy(direction);
        this._validateDirection();
        return this;
    }

    /**
     * Computes a point along the ray at the given parameter t.
     * @param t - The distance along the ray.
     * @returns A new Vec3 at the computed point.
     * @throws {TypeError} If t is not a finite number.
     */
    at(t: number): Vec3 {
        if (!Number.isFinite(t)) {
            throw new TypeError('Parameter t must be a finite number');
        }
        const result = new Vec3();
        result.copy(this._direction).mul(t).add(this._origin);
        return result;
    }

    /**
     * Intersects the ray with a plane.
     * @param plane - The plane defined as Vec4 where (x, y, z) is the normal and w is the distance from origin.
     * @returns The distance (t) along the ray to the intersection, or -1 if no intersection.
     * @throws {TypeError} If plane is not a valid Vec4 instance.
     */
    intersectPlane(plane: Vec4): number {
        if (!(plane instanceof Vec4)) {
            throw new TypeError('Expected a Vec4 for plane');
        }
        const normal = new Vec3(plane.x, plane.y, plane.z);
        const d = plane.w;
        const denom = normal.dot(this._direction);

        if (Math.abs(denom) < 1e-6) {
            return -1;
        }

        const t = -(normal.dot(this._origin) + d) / denom;
        return t >= 0 ? t : -1;
    }

    /**
     * Intersects the ray with a sphere.
     * @param center - The sphere center.
     * @param radius - The sphere radius.
     * @returns The distance (t) along the ray to the closest intersection, or -1 if no intersection.
     * @throws {TypeError} If center is not a Vec3 or radius is not a positive finite number.
     */
    intersectSphere(center: Vec3, radius: number): number {
        if (!(center instanceof Vec3)) {
            throw new TypeError('Expected a Vec3 for center');
        }
        if (!Number.isFinite(radius) || radius <= 0) {
            throw new RangeError('Radius must be a positive finite number');
        }
        const oc = new Vec3().sub(this._origin).add(center);
        const a = this._direction.dot(this._direction);
        const b = 2.0 * oc.dot(this._direction);
        const c = oc.dot(oc) - radius * radius;
        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) {
            return -1;
        }

        const t1 = (-b - Math.sqrt(discriminant)) / (2.0 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2.0 * a);

        if (t1 >= 0) {
            return t1;
        }

        if (t2 >= 0) {
            return t2;
        }

        return -1;
    }

    /**
     * Intersects the ray with an axis‐aligned bounding box.
     * @param min - The minimum corner of the box.
     * @param max - The maximum corner of the box.
     * @returns The distance (t) along the ray to the closest intersection, or -1 if no intersection.
     * @throws {TypeError} If min or max are not valid Vec3 instances.
     */
    intersectBox(min: Vec3, max: Vec3): number {
        if (!(min instanceof Vec3) || !(max instanceof Vec3)) {
            throw new TypeError('min and max must be Vec3 instances');
        }
        if (min.x > max.x || min.y > max.y || min.z > max.z) {
            throw new RangeError('Invalid box: min must be less than or equal to max');
        }
        const invDirX = 1.0 / this._direction.x;
        const invDirY = 1.0 / this._direction.y;
        const invDirZ = 1.0 / this._direction.z;

        let t1 = (min.x - this._origin.x) * invDirX;
        let t2 = (max.x - this._origin.x) * invDirX;
        let t3 = (min.y - this._origin.y) * invDirY;
        let t4 = (max.y - this._origin.y) * invDirY;
        let t5 = (min.z - this._origin.z) * invDirZ;
        let t6 = (max.z - this._origin.z) * invDirZ;

        const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
        const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

        if (tmax < 0 || tmin > tmax) {
            return -1;
        }

        return tmin >= 0 ? tmin : tmax;
    }

    /**
     * Gets the origin of the ray.
     */
    get origin(): Vec3 {
        return this._origin;
    }

    /**
     * Gets the direction of the ray.
     */
    get direction(): Vec3 {
        return this._direction;
    }

    /**
     * Sets the origin of the ray.
     * @param value - The new origin.
     * @throws {TypeError} If value is not a valid Vec3 instance.
     */
    set origin(value: Vec3) {
        if (!(value instanceof Vec3)) {
            throw new TypeError('Origin must be a Vec3 instance');
        }
        this._origin.copy(value);
    }

    /**
     * Sets the direction of the ray.
     * @param value - The new direction.
     * @throws {TypeError} If value is not a valid Vec3 instance.
     * @throws {RangeError} If the direction is a zero vector.
     */
    set direction(value: Vec3) {
        if (!(value instanceof Vec3)) {
            throw new TypeError('Direction must be a Vec3 instance');
        }
        this._direction.copy(value);
        this._validateDirection();
    }

    /**
     * Ensures the direction is not a zero vector.
     * @private
     * @throws {RangeError} If the direction is a zero vector.
     */
    private _validateDirection(): void {
        if (this._direction.length() === 0) {
            throw new RangeError('Direction cannot be a zero vector');
        }
    }
}
