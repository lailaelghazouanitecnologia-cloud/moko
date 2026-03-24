/**
 * A 4-dimensional vector class with x, y, z, and w components.
 * Uses a Float32Array internally for efficient storage and operations.
 */
export class Vec4 {
    private data: Float32Array;

    /**
     * Creates a new Vec4 instance.
     * @param x - The x component (default: 0)
     * @param y - The y component (default: x)
     * @param z - The z component (default: x)
     * @param w - The w component (default: x)
     * @throws {TypeError} If any component is not a finite number
     */
    constructor(x: number = 0, y: number = x, z: number = x, w: number = x) {
        this.data = new Float32Array(4);
        this.set(x, y, z, w);
    }

    /** Gets the x component */
    get x(): number { return this.data[0]; }
    /** Gets the y component */
    get y(): number { return this.data[1]; }
    /** Gets the z component */
    get z(): number { return this.data[2]; }
    /** Gets the w component */
    get w(): number { return this.data[3]; }

    /** Sets the x component */
    set x(value: number) { this.data[0] = this._validateComponent(value, 'x'); }
    /** Sets the y component */
    set y(value: number) { this.data[1] = this._validateComponent(value, 'y'); }
    /** Sets the z component */
    set z(value: number) { this.data[2] = this._validateComponent(value, 'z'); }
    /** Sets the w component */
    set w(value: number) { this.data[3] = this._validateComponent(value, 'w'); }

    /**
     * Sets all components of the vector.
     * @param x - The x component
     * @param y - The y component (default: x)
     * @param z - The z component (default: x)
     * @param w - The w component (default: x)
     * @returns This vector for method chaining
     * @throws {TypeError} If any component is not a finite number
     */
    set(x: number, y: number = x, z: number = x, w: number = x): Vec4 {
        this.data[0] = this._validateComponent(x, 'x');
        this.data[1] = this._validateComponent(y, 'y');
        this.data[2] = this._validateComponent(z, 'z');
        this.data[3] = this._validateComponent(w, 'w');
        return this;
    }

    /**
     * Copies the components from another vector to this vector.
     * @param v - The source vector
     * @returns This vector for method chaining
     * @throws {TypeError} If v is not a Vec4 instance
     */
    copy(v: Vec4): Vec4 {
        if (!(v instanceof Vec4)) {
            throw new TypeError('Expected Vec4 instance');
        }
        this.data[0] = v.data[0];
        this.data[1] = v.data[1];
        this.data[2] = v.data[2];
        this.data[3] = v.data[3];
        return this;
    }

    /**
     * Creates a new vector with the same components as this vector.
     * @returns A new Vec4 instance
     */
    clone(): Vec4 {
        return new Vec4(this.data[0], this.data[1], this.data[2], this.data[3]);
    }

    /**
     * Calculates the length (magnitude) of this vector.
     * @returns The length of the vector
     */
    length(): number {
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        const w = this.data[3];
        return Math.sqrt(x * x + y * y + z * z + w * w);
    }

    /**
     * Calculates the squared length of this vector.
     * @returns The squared length of the vector
     */
    lengthSquared(): number {
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        const w = this.data[3];
        return x * x + y * y + z * z + w * w;
    }

    /**
     * Normalizes this vector (makes it unit length).
     * @returns This vector for method chaining
     * @throws {Error} If the vector has zero length
     */
    normalize(): Vec4 {
        const len = this.length();
        if (len === 0) {
            throw new Error('Cannot normalize zero-length vector');
        }
        const invLen = 1 / len;
        this.data[0] *= invLen;
        this.data[1] *= invLen;
        this.data[2] *= invLen;
        this.data[3] *= invLen;
        return this;
    }

    /**
     * Calculates the dot product with another vector.
     * @param v - The other vector
     * @returns The dot product
     * @throws {TypeError} If v is not a Vec4 instance
     */
    dot(v: Vec4): number {
        if (!(v instanceof Vec4)) {
            throw new TypeError('Expected Vec4 instance');
        }
        return this.data[0] * v.data[0] +
               this.data[1] * v.data[1] +
               this.data[2] * v.data[2] +
               this.data[3] * v.data[3];
    }

    /**
     * Adds another vector to this vector component-wise.
     * @param v - The vector to add
     * @returns This vector for method chaining
     * @throws {TypeError} If v is not a Vec4 instance
     */
    add(v: Vec4): Vec4 {
        if (!(v instanceof Vec4)) {
            throw new TypeError('Expected Vec4 instance');
        }
        this.data[0] += v.data[0];
        this.data[1] += v.data[1];
        this.data[2] += v.data[2];
        this.data[3] += v.data[3];
        return this;
    }

    /**
     * Subtracts another vector from this vector component-wise.
     * @param v - The vector to subtract
     * @returns This vector for method chaining
     * @throws {TypeError} If v is not a Vec4 instance
     */
    sub(v: Vec4): Vec4 {
        if (!(v instanceof Vec4)) {
            throw new TypeError('Expected Vec4 instance');
        }
        this.data[0] -= v.data[0];
        this.data[1] -= v.data[1];
        this.data[2] -= v.data[2];
        this.data[3] -= v.data[3];
        return this;
    }

    /**
     * Multiplies this vector by a scalar.
     * @param s - The scalar value
     * @returns This vector for method chaining
     * @throws {TypeError} If s is not a finite number
     */
    mul(s: number): Vec4 {
        if (!Number.isFinite(s)) {
            throw new TypeError('Scalar must be a finite number');
        }
        this.data[0] *= s;
        this.data[1] *= s;
        this.data[2] *= s;
        this.data[3] *= s;
        return this;
    }

    /**
     * Performs linear interpolation between this vector and another vector.
     * @param v - The target vector
     * @param t - The interpolation factor (0 = this, 1 = v)
     * @returns This vector for method chaining
     * @throws {TypeError} If v is not a Vec4 instance or t is not a finite number
     * @throws {RangeError} If t is not between 0 and 1
     */
    lerp(v: Vec4, t: number): Vec4 {
        if (!(v instanceof Vec4)) {
            throw new TypeError('Expected Vec4 instance');
        }
        if (!Number.isFinite(t)) {
            throw new TypeError('Interpolation factor must be a finite number');
        }
        if (t < 0 || t > 1) {
            throw new RangeError('Interpolation factor must be between 0 and 1');
        }
        const x = this.data[0];
        const y = this.data[1];
        const z = this.data[2];
        const w = this.data[3];
        this.data[0] = x + (v.data[0] - x) * t;
        this.data[1] = y + (v.data[1] - y) * t;
        this.data[2] = z + (v.data[2] - z) * t;
        this.data[3] = w + (v.data[3] - w) * t;
        return this;
    }

    /**
     * Creates a vector with all components set to 0.
     * @returns A new Vec4 instance
     */
    static zero(): Vec4 {
        return new Vec4(0, 0, 0, 0);
    }

    /**
     * Creates a vector with all components set to 1.
     * @returns A new Vec4 instance
     */
    static one(): Vec4 {
        return new Vec4(1, 1, 1, 1);
    }

    /**
     * Validates that a component value is a finite number.
     * @param value - The value to validate
     * @param name - The name of the component for error messages
     * @returns The validated value
     * @throws {TypeError} If value is not a finite number
     */
    private _validateComponent(value: number, name: string): number {
        if (!Number.isFinite(value)) {
            throw new TypeError(`${name} component must be a finite number`);
        }
        return value;
    }
}
