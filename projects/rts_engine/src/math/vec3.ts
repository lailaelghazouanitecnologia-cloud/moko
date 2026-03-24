export class Vec3 {
    private data: Float32Array;

    /**
     * Creates a new 3D vector.
     * @param x - The x component (default: 0)
     * @param y - The y component (default: x)
     * @param z - The z component (default: x)
     */
    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.data = new Float32Array(3);
        this.set(x, y, z);
    }

    /**
     * Sets the components of this vector.
     * @param x - The x component
     * @param y - The y component (default: x)
     * @param z - The z component (default: x)
     * @returns This vector for chaining
     */
    set(x: number, y: number = x, z: number = x): Vec3 {
        this.validateNumber(x, 'x');
        this.validateNumber(y, 'y');
        this.validateNumber(z, 'z');
        this.data[0] = x;
        this.data[1] = y;
        this.data[2] = z;
        return this;
    }

    /**
     * Copies the components from another vector.
     * @param v - The vector to copy from
     * @returns This vector for chaining
     * @throws {TypeError} If v is not a Vec3 instance
     */
    copy(v: Vec3): Vec3 {
        this.validateVec3(v, 'v');
        this.data[0] = v.data[0];
        this.data[1] = v.data[1];
        this.data[2] = v.data[2];
        return this;
    }

    /**
     * Creates a new vector with the same components as this one.
     * @returns A new Vec3 instance
     */
    clone(): Vec3 {
        return new Vec3(this.data[0], this.data[1], this.data[2]);
    }

    /**
     * Calculates the length (magnitude) of this vector.
     * @returns The length of the vector
     */
    length(): number {
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        return Math.sqrt(x * x + y * y + z * z);
    }

    /**
     * Calculates the squared length of this vector.
     * @returns The squared length of the vector
     */
    lengthSquared(): number {
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        return x * x + y * y + z * z;
    }

    /**
     * Normalizes this vector (makes it a unit vector).
     * @returns This vector for chaining
     */
    normalize(): Vec3 {
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        const len = Math.sqrt(x * x + y * y + z * z);
        if (len > 0) {
            const inv = 1 / len;
            this.data[0] = x * inv;
            this.data[1] = y * inv;
            this.data[2] = z * inv;
        }
        return this;
    }

    /**
     * Calculates the dot product with another vector.
     * @param v - The other vector
     * @returns The dot product
     * @throws {TypeError} If v is not a Vec3 instance
     */
    dot(v: Vec3): number {
        this.validateVec3(v, 'v');
        return this.data[0] * v.data[0] + this.data[1] * v.data[1] + this.data[2] * v.data[2];
    }

    /**
     * Calculates the cross product with another vector.
     * @param v - The other vector
     * @returns A new vector representing the cross product
     * @throws {TypeError} If v is not a Vec3 instance
     */
    cross(v: Vec3): Vec3 {
        this.validateVec3(v, 'v');
        const ax = this.data[0];
        const ay = this.data[1];
        const az = this.data[2];
        const bx = v.data[0];
        const by = v.data[1];
        const bz = v.data[2];
        return new Vec3(
            ay * bz - az * by,
            az * bx - ax * bz,
            ax * by - ay * bx
        );
    }

    /**
     * Adds another vector to this vector.
     * @param v - The vector to add
     * @returns A new vector representing the sum
     * @throws {TypeError} If v is not a Vec3 instance
     */
    add(v: Vec3): Vec3 {
        this.validateVec3(v, 'v');
        return new Vec3(
            this.data[0] + v.data[0],
            this.data[1] + v.data[1],
            this.data[2] + v.data[2]
        );
    }

    /**
     * Subtracts another vector from this vector.
     * @param v - The vector to subtract
     * @returns A new vector representing the difference
     * @throws {TypeError} If v is not a Vec3 instance
     */
    sub(v: Vec3): Vec3 {
        this.validateVec3(v, 'v');
        return new Vec3(
            this.data[0] - v.data[0],
            this.data[1] - v.data[1],
            this.data[2] - v.data[2]
        );
    }

    /**
     * Multiplies this vector by a scalar.
     * @param s - The scalar value
     * @returns A new vector representing the product
     * @throws {TypeError} If s is not a number
     */
    mul(s: number): Vec3 {
        this.validateNumber(s, 's');
        return new Vec3(
            this.data[0] * s,
            this.data[1] * s,
            this.data[2] * s
        );
    }

    /**
     * Calculates the distance to another vector.
     * @param v - The other vector
     * @returns The distance between the vectors
     * @throws {TypeError} If v is not a Vec3 instance
     */
    distance(v: Vec3): number {
        this.validateVec3(v, 'v');
        const dx = this.data[0] - v.data[0];
        const dy = this.data[1] - v.data[1];
        const dz = this.data[2] - v.data[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Performs linear interpolation between this vector and another.
     * @param v - The target vector
     * @param t - The interpolation factor (0-1)
     * @returns A new vector representing the interpolation
     * @throws {TypeError} If v is not a Vec3 or t is not a number
     * @throws {RangeError} If t is not between 0 and 1
     */
    lerp(v: Vec3, t: number): Vec3 {
        this.validateVec3(v, 'v');
        this.validateNumber(t, 't');
        if (t < 0 || t > 1) {
            throw new RangeError('t must be between 0 and 1');
        }
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        return new Vec3(
            x + (v.data[0] - x) * t,
            y + (v.data[1] - y) * t,
            z + (v.data[2] - z) * t
        );
    }

    /**
     * Returns a string representation of this vector.
     * @returns A string in the format "(x, y, z)"
     */
    toString(): string {
        return `(${this.data[0]}, ${this.data[1]}, ${this.data[2]})`;
    }

    /**
     * Checks if this vector is equal to another vector within a tolerance.
     * @param v - The other vector
     * @param tolerance - The tolerance for comparison (default: 1e-6)
     * @returns True if the vectors are equal within the tolerance
     * @throws {TypeError} If v is not a Vec or tolerance is not a number
     */
    equals(v: Vec3, tolerance: number = 1e-6): boolean {
        this.validateVec3(v, 'v');
        this.validateNumber(tolerance, 'tolerance');
        return Math.abs(this.data[0] - v.data[0]) < tolerance &&
               Math.abs(this.data[1] - v.data[1]) < tolerance &&
               Math.abs(this.data[2] - v.data[2]) < tolerance;
    }

    /**
     * Creates a vector with all components set to zero.
     * @returns A new zero vector
     */
    static zero(): Vec3 {
        return new Vec3(0, 0, 0);
    }

    /**
     * Creates a vector with all components set to one.
     * @returns A new vector with all components as 1
     */
    static one(): Vec3 {
        return new Vec3(1, 1, 1);
    }

    /**
     * Creates a vector pointing up (0, 1, 0).
     * @returns A new up vector
     */
    static up(): Vec3 {
        return new Vec3(0, 1, 0);
    }

    /**
     * Creates a vector pointing right (1, 0, 0).
     * @returns A new right vector
     */
    static right(): Vec3 {
        return new Vec3(1, 0, 0);
    }

    /**
     * Creates a vector pointing forward (0, 0, -1).
     * @returns A new forward vector
     */
    static forward(): Vec3 {
        return new Vec3(0, 0, -1);
    }

    /**
     * Validates that a value is a number.
     * @param value - The value to validate
     * @param name - The name of the parameter for error messages
     * @throws {TypeError} If value is not a number
     */
    private validateNumber(value: any, name: string): void {
        if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
            throw new TypeError(`${name} must be a valid number`);
        }
    }

    /**
     * Validates that a value is a Vec3 instance.
     * @param value - The value to validate
     * @param name - The name of the parameter for error messages
     * @throws {TypeError} If value is not a Vec3 instance
     */
    private validateVec3(value: any, name: string): void {
        if (!(value instanceof Vec3)) {
            throw new TypeError(`${name} must be a Vec3 instance`);
        }
    }
}
