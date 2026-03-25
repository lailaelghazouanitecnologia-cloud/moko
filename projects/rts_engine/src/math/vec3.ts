/**
 * A 3D vector class providing common vector operations.
 */
export class Vec3 {
    public readonly x: number;
    public readonly y: number;
    public readonly z: number;

    /**
     * Creates a new Vec3 instance.
     * @param x - The x component (default 0).
     * @param y - The y component (default 0).
     * @param z - The z component (default 0).
     */
    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * Creates a new Vec3 with the specified components.
     * @param x - The x component.
     * @param y - The y component.
     * @param z - The z component.
     * @returns A new Vec3 instance.
     */
    set(x: number, y: number, z: number): Vec3 {
        if (!this.isValidNumber(x) || !this.isValidNumber(y) || !this.isValidNumber(z)) {
            throw new Error('Invalid number provided to Vec3.set');
        }
        return new Vec3(x, y, z);
    }

    /**
     * Creates a copy of this vector.
     * @returns A new Vec3 instance with the same components.
     */
    clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    /**
     * Adds another vector to this vector.
     * @param v - The vector to add.
     * @returns A new Vec3 instance representing the sum.
     */
    add(v: Vec3): Vec3 {
        this.validateVec3(v, 'add');
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    /**
     * Subtracts another vector from this vector.
     * @param v - The vector to subtract.
     * @returns A new Vec3 instance representing the difference.
     */
    sub(v: Vec3): Vec3 {
        this.validateVec3(v, 'sub');
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    /**
     * Scales this vector by a scalar value.
     * @param s - The scalar multiplier.
     * @returns A new Vec3 instance scaled by s.
     */
    scale(s: number): Vec3 {
        if (!this.isValidNumber(s)) {
            throw new Error('Invalid scalar provided to Vec3.scale');
        }
        return new Vec3(this.x * s, this.y * s, this.z * s);
    }

    /**
     * Computes the dot product with another vector.
     * @param v - The other vector.
     * @returns The dot product as a number.
     */
    dot(v: Vec3): number {
        this.validateVec3(v, 'dot');
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    /**
     * Computes the cross product with another vector.
     * @param v - The other vector.
     * @returns A new Vec3 instance perpendicular to both.
     */
    cross(v: Vec3): Vec3 {
        this.validateVec3(v, 'cross');
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    /**
     * Computes the length (magnitude) of this vector.
     * @returns The length as a number.
     */
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /**
     * Normalizes this vector to unit length.
     * @returns A new Vec3 instance with length 1, or zero vector if original length is 0.
     */
    normalize(): Vec3 {
        const len = this.length();
        if (len === 0) {
            return new Vec3(0, 0, 0);
        }
        return new Vec3(this.x / len, this.y / len, this.z / len);
    }

    /**
     * Computes the Euclidean distance to another vector.
     * @param v - The other vector.
     * @returns The distance as a number.
     */
    distance(v: Vec3): number {
        this.validateVec3(v, 'distance');
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Checks if a value is a valid finite number.
     * @param n - The value to check.
     * @returns True if n is a finite number, false otherwise.
     */
    private isValidNumber(n: unknown): n is number {
        return typeof n === 'number' && isFinite(n);
    }

    /**
     * Validates that the provided value is a Vec3 instance.
     * @param v - The value to validate.
     * @param method - The method name for error context.
     */
    private validateVec3(v: unknown, method: string): asserts v is Vec3 {
        if (!(v instanceof Vec3)) {
            throw new TypeError(`Vec3.${method} expects a Vec3 instance`);
        }
    }
}
