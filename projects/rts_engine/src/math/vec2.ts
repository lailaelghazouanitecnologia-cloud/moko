export class Vec2 {
    private data: Float32Array;

    /**
     * Creates a new 2D vector.
     * @param x - The x component. Defaults to 0.
     * @param y - The y component. Defaults to x if not provided.
     */
    constructor(x?: number, y?: number) {
        this.data = new Float32Array(2);
        this.set(x ?? 0, y ?? x ?? 0);
    }

    /**
     * Sets the components of this vector.
     * @param x - The x component.
     * @param y - The y component. Defaults to x if not provided.
     * @returns This vector for chaining.
     */
    set(x: number, y?: number): Vec2 {
        if (!Number.isFinite(x)) {
            throw new Error('x must be a finite number');
        }
        if (y !== undefined && !Number.isFinite(y)) {
            throw new Error('y must be a finite number');
        }
        this.data[0] = x;
        this.data[1] = y ?? x;
        return this;
    }

    /**
     * Copies the components from another vector.
     * @param v - The vector to copy from.
     * @returns This vector for chaining.
     */
    copy(v: Vec2): Vec2 {
        if (!(v instanceof Vec2)) {
            throw new Error('Argument must be an instance of Vec2');
        }
        this.data[0] = v.data[0];
        this.data[1] = v.data[1];
        return this;
    }

    /**
     * Creates a copy of this vector.
     * @returns A new vector with the same components.
     */
    clone(): Vec2 {
        return new Vec2(this.data[0], this.data[1]);
    }

    /**
     * Computes the magnitude (length) of this vector.
     * @returns The length of the vector.
     */
    length(): number {
        const x = this.data[0];
        const y = this.data[1];
        return Math.sqrt(x * x + y * y);
    }

    /**
     * Computes the squared magnitude of this vector.
     * @returns The squared length of the vector.
     */
    lengthSquared(): number {
        const x = this.data[0];
        const y = this.data[1];
        return x * x + y * y;
    }

    /**
     * Normalizes this vector to unit length.
     * @returns A new unit-length vector. If the original length is zero, returns a zero vector.
     */
    normalize(): Vec2 {
        const len = this.length();
        if (len === 0) {
            return new Vec2(0, 0);
        }
        const invLen = 1 / len;
        return new Vec2(this.data[0] * invLen, this.data[1] * invLen);
    }

    /**
     * Computes the dot product with another vector.
     * @param v - The other vector.
     * @returns The dot product.
     */
    dot(v: Vec2): number {
        if (!(v instanceof Vec2)) {
            throw new Error('Argument must be an instance of Vec2');
        }
        return this.data[0] * v.data[0] + this.data[1] * v.data[1];
    }

    /**
     * Adds this vector to another vector.
     * @param v - The vector to add.
     * @returns A new vector representing the sum.
     */
    add(v: Vec2): Vec2 {
        if (!(v instanceof Vec2)) {
            throw new Error('Argument must be an instance of Vec2');
        }
        return new Vec2(this.data[0] + v.data[0], this.data[1] + v.data[1]);
    }

    /**
     * Subtracts another vector from this vector.
     * @param v - The vector to subtract.
     * @returns A new vector representing the difference.
     */
    sub(v: Vec2): Vec2 {
        if (!(v instanceof Vec2)) {
            throw new Error('Argument must be an instance of Vec2');
        }
        return new Vec2(this.data[0] - v.data[0], this.data[1] - v.data[1]);
    }

    /**
     * Multiplies this vector by a scalar.
     * @param s - The scalar value.
     * @returns A new scaled vector.
     */
    mul(s: number): Vec2 {
        if (!Number.isFinite(s)) {
            throw new Error('Scalar must be a finite number');
        }
        return new Vec2(this.data[0] * s, this.data[1] * s);
    }

    /**
     * Computes the distance to another vector.
     * @param v - The other vector.
     * @returns The Euclidean distance.
     */
    distance(v: Vec2): number {
        if (!(v instanceof Vec2)) {
            throw new Error('Argument must be an instance of Vec2');
        }
        const dx = this.data[0] - v.data[0];
        const dy = this.data[1] - v.data[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Linearly interpolates between this vector and another.
     * @param v - The target vector.
     * @param t - The interpolation factor (0 returns this, 1 returns v).
     * @returns A new interpolated vector.
     */
    lerp(v: Vec2, t: number): Vec2 {
        if (!(v instanceof Vec2)) {
            throw new Error('First argument must be an instance of Vec2');
        }
        if (!Number.isFinite(t)) {
            throw new Error('Interpolation factor must be a finite number');
        }
        const x = this.data[0] + (v.data[0] - this.data[0]) * t;
        const y = this.data[1] + (v.data[1] - this.data[1]) * t;
        return new Vec2(x, y);
    }

    /**
     * Creates a zero vector.
     * @returns A new vector with components (0, 0).
     */
    static zero(): Vec2 {
        return new Vec2(0, 0);
    }

    /**
     * Creates a one vector.
     * @returns A new vector with components (1, 1).
     */
    static one(): Vec2 {
        return new Vec2(1, 1);
    }

    /**
     * Creates an up vector.
     * @returns A new vector with components (0, 1).
     */
    static up(): Vec2 {
        return new Vec2(0, 1);
    }

    /**
     * Creates a right vector.
     * @returns A new vector with components (1, 0).
     */
    static right(): Vec2 {
        return new Vec2(1, 0);
    }
}
