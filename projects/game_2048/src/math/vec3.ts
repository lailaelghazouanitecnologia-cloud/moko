/**
 * A 3D vector class backed by a Float32Array for efficient storage and operations.
 */
export class Vec3 {
    data: Float32Array;

    /**
     * Creates a new Vec3 instance.
     * @param x - The x component. Defaults to 0.
     * @param y - The y component. Defaults to 0.
     * @param z - The z component. Defaults to 0.
     */
    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.data = new Float32Array(3);
        this.set(x, y, z);
    }

    /**
     * Gets the x component of the vector.
     */
    get x(): number {
        return this.data[0];
    }

    /**
     * Sets the x component of the vector.
     */
    set x(value: number) {
        this.data[0] = this._validateNumber(value, 'x');
    }

    /**
     * Gets the y component of the vector.
     */
    get y(): number {
        return this.data[1];
    }

    /**
     * Sets the y component of the vector.
     */
    set y(value: number) {
        this.data[1] = this._validateNumber(value, 'y');
    }

    /**
     * Gets the z component of the vector.
     */
    get z(): number {
        return this.data[2];
    }

    /**
     * Sets the z component of the vector.
     */
    set z(value: number) {
        this.data[2] = this._validateNumber(value, 'z');
    }

    /**
     * Sets the components of the vector.
     * @param x - The x component.
     * @param y - The y component.
     * @param z - The z component.
     * @returns This vector for chaining.
     */
    set(x: number, y: number, z: number): Vec3 {
        this.data[0] = this._validateNumber(x, 'x');
        this.data[1] = this._validateNumber(y, 'y');
        this.data[2] = this._validateNumber(z, 'z');
        return this;
    }

    /**
     * Creates a copy of this vector.
     * @returns A new Vec3 instance with the same components.
     */
    clone(): Vec3 {
        return new Vec3(this.data[0], this.data[1], this.data[2]);
    }

    /**
     * Copies the components from another vector to this vector.
     * @param v - The vector to copy from.
     * @returns This vector for chaining.
     * @throws {TypeError} If v is not a Vec3 instance.
     */
    copy(v: Vec3): Vec3 {
        if (!(v instanceof Vec3)) {
            throw new TypeError('Expected Vec3 instance');
        }
        this.data[0] = v.data[0];
        this.data[1] = v.data[1];
        this.data[2] = v.data[2];
        return this;
    }

    /**
     * Adds another vector to this vector.
     * @param v - The vector to add.
     * @param out - Optional vector to store the result. If not provided, modifies this vector.
     * @returns The result vector.
     * @throws {TypeError} If v is not a Vec3 instance.
     */
    add(v: Vec3, out?: Vec3): Vec3 {
        if (!(v instanceof Vec3)) {
            throw new TypeError('Expected Vec3 instance');
        }
        const result = out || this;
        result.data[0] = this.data[0] + v.data[0];
        result.data[1] = this.data[1] + v.data[1];
        result.data[2] = this.data[2] + v.data[2];
        return result;
    }

    /**
     * Subtracts another vector from this vector.
     * @param v - The vector to subtract.
     * @param out - Optional vector to store the result. If not provided, modifies this vector.
     * @returns The result vector.
     * @throws {TypeError} If v is not a Vec3 instance.
     */
    sub(v: Vec3, out?: Vec3): Vec3 {
        if (!(v instanceof Vec3)) {
            throw new TypeError('Expected Vec3 instance');
        }
        const result = out || this;
        result.data[0] = this.data[0] - v.data[0];
        result.data[1] = this.data[1] - v.data[1];
        result.data[2] = this.data[2] - v.data[2];
        return result;
    }

    /**
     * Scales this vector by a scalar.
     * @param s - The scalar to multiply by.
     * @param out - Optional vector to store the result. If not provided, modifies this vector.
     * @returns The result vector.
     */
    scale(s: number, out?: Vec3): Vec3 {
        const scalar = this._validateNumber(s, 'scale');
        const result = out || this;
        result.data[0] = this.data[0] * scalar;
        result.data[1] = this.data[1] * scalar;
        result.data[2] = this.data[2] * scalar;
        return result;
    }

    /**
     * Computes the dot product with another vector.
     * @param v - The other vector.
     * @returns The dot product.
     * @throws {TypeError} If v is not a Vec3 instance.
     */
    dot(v: Vec3): number {
        if (!(v instanceof Vec3)) {
            throw new TypeError('Expected Vec3 instance');
        }
        return this.data[0] * v.data[0] + this.data[1] * v.data[1] + this.data[2] * v.data[2];
    }

    /**
     * Computes the cross product with another vector.
     * @param v - The other vector.
     * @param out - Optional vector to store the result. If not provided, modifies this vector.
     * @returns The result vector.
     * @throws {TypeError} If v is not a Vec3 instance.
     */
    cross(v: Vec3, out?: Vec3): Vec3 {
        if (!(v instanceof Vec3)) {
            throw new TypeError('Expected Vec3 instance');
        }
        const result = out || this;
        const ax = this.data[0], ay = this.data[1], az = this.data[2];
        const bx = v.data[0], by = v.data[1], bz = v.data[2];
        result.data[0] = ay * bz - az * by;
        result.data[1] = az * bx - ax * bz;
        result.data[2] = ax * by - ay * bx;
        return result;
    }

    /**
     * Computes the length (magnitude) of this vector.
     * @returns The length.
     */
    length(): number {
        const x = this.data[0], y = this.data[1], z = this.data[2];
        return Math.sqrt(x * x + y * y + z * z);
    }

    /**
     * Computes the squared length of this vector (faster than length for comparisons).
     * @returns The squared length.
     */
    lengthSquared(): number {
        const x = this.data[0], y = this.data[1], z = this.data[2];
        return x * x + y * y + z * z;
    }

    /**
     * Normalizes this vector (scales to unit length).
     * @param out - Optional vector to store the result. If not provided, modifies this vector.
     * @returns The result vector.
     */
    normalize(out?: Vec3): Vec3 {
        const result = out || this;
        const x = this.data[0], y = this.data[1], z = this.data[2];
        const len = Math.sqrt(x * x + y * y + z * z);
        if (len > 0) {
            const inv = 1 / len;
            result.data[0] = x * inv;
            result.data[1] = y * inv;
            result.data[2] = z * inv;
        } else {
            result.data[0] = 0;
            result.data[1] = 0;
            result.data[2] = 0;
        }
        return result;
    }

    /**
     * Computes the distance to another vector.
     * @param v - The other vector.
     * @returns The distance.
     * @throws {TypeError} If v is not a Vec3 instance.
     */
    distance(v: Vec3): number {
        if (!(v instanceof Vec3)) {
            throw new TypeError('Expected Vec3 instance');
        }
        const dx = this.data[0] - v.data[0];
        const dy = this.data[1] - v.data[1];
        const dz = this.data[2] - v.data[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Computes the squared distance to another vector (faster than distance for comparisons).
     * @param v - The other vector.
     * @returns The squared distance.
     * @throws {TypeError} If v is not a Vec3 instance.
     */
    distanceSquared(v: Vec3): number {
        if (!(v instanceof Vec3)) {
            throw new TypeError('Expected Vec3 instance');
        }
        const dx = this.data[0] - v.data[0];
        const dy = this.data[1] - v.data[1];
        const dz = this.data[2] - v.data[2];
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Linearly interpolates between this vector and another.
     * @param v - The target vector.
     * @param t - The interpolation factor (0 to 1).
     * @param out - Optional vector to store the result. If not provided, modifies this vector.
     * @returns The result vector.
     * @throws {TypeError} If v is not a Vec3 instance.
     * @throws {RangeError} If t is not between 0 and 1.
     */
    lerp(v: Vec3, t: number, out?: Vec3): Vec3 {
        if (!(v instanceof Vec3)) {
            throw new TypeError('Expected Vec3 instance');
        }
        const factor = this._validateNumber(t, 't');
        if (factor < 0 || factor > 1) {
            throw new RangeError('Interpolation factor must be between 0 and 1');
        }
        const result = out || this;
        const ax = this.data[0], ay = this.data[1], az = this.data[2];
        result.data[0] = ax + (v.data[0] - ax) * factor;
        result.data[1] = ay + (v.data[1] - ay) * factor;
        result.data[2] = az + (v.data[2] - az) * factor;
        return result;
    }

    /**
     * Checks if this vector is equal to another within a given tolerance.
     * @param v - The other vector.
     * @param epsilon - The tolerance. Defaults to Number.EPSILON.
     * @returns True if the vectors are equal within tolerance.
     * @throws {TypeError} If v is not a Vec3 instance.
     */
    equals(v: Vec3, epsilon: number = Number.EPSILON): boolean {
        if (!(v instanceof Vec3)) {
            throw new TypeError('Expected Vec3 instance');
        }
        const eps = this._validateNumber(epsilon, 'epsilon');
        return Math.abs(this.data[0] - v.data[0]) <= eps &&
               Math.abs(this.data[1] - v.data[1]) <= eps &&
               Math.abs(this.data[2] - v.data[2]) <= eps;
    }

    /**
     * Sets this vector to zero.
     * @returns This vector for chaining.
     */
    zero(): Vec3 {
        this.data[0] = 0;
        this.data[1] = 0;
        this.data[2] = 0;
        return this;
    }

    /**
     * Negates this vector.
     * @param out - Optional vector to store the result. If not provided, modifies this vector.
     * @returns The result vector.
     */
    negate(out?: Vec3): Vec3 {
        const result = out || this;
        result.data[0] = -this.data[0];
        result.data[1] = -this.data[1];
        result.data[2] = -this.data[2];
        return result;
    }

    /**
     * Returns a string representation of this vector.
     * @returns A string like "Vec3(x, y, z)".
     */
    toString(): string {
        return `Vec3(${this.data[0]}, ${this.data[1]}, ${this.data[2]})`;
    }

    /**
     * Returns an array representation of this vector.
     * @returns An array [x, y, z].
     */
    toArray(): number[] {
        return [this.data[0], this.data[1], this.data[2]];
    }

    /**
     * Creates a Vec3 from an array.
     * @param arr - The array with 3 elements.
     * @returns A new Vec3 instance.
     * @throws {TypeError} If arr is not an array with 3 numbers.
     */
    static fromArray(arr: number[]): Vec3 {
        if (!Array.isArray(arr) || arr.length !== 3) {
            throw new TypeError('Expected array with 3 elements');
        }
        return new Vec3(arr[0], arr[1], arr[2]);
    }

    /**
     * Creates a Vec3 from spherical coordinates.
     * @param radius - The radius.
     * @param theta - The polar angle in radians (0 to PI).
     * @param phi - The azimuthal angle in radians (0 to 2*PI).
     * @returns A new Vec3 instance.
     */
    static fromSpherical(radius: number, theta: number, phi: number): Vec3 {
        const r = Math.abs(radius);
        const sinTheta = Math.sin(theta);
        return new Vec3(
            r * sinTheta * Math.cos(phi),
            r * Math.cos(theta),
            r * sinTheta * Math.sin(phi)
        );
    }

    /**
     * Validates that a value is a finite number.
     * @param value - The value to validate.
     * @param name - The name of the parameter for error messages.
     * @returns The validated number.
     * @throws {TypeError} If value is not a finite number.
     */
    private _validateNumber(value: number, name: string): number {
        if (typeof value !== 'number' || !isFinite(value)) {
            throw new TypeError(`${name} must be a finite number`);
        }
        return value;
    }
}
