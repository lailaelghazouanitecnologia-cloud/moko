/**
 * Vec4 - 4D vector with w component
 */
export class Vec4 {
    x: number;
    y: number;
    z: number;
    w: number;

    /**
     * Creates a new Vec4 instance
     * @param x - X component (default: 0)
     * @param y - Y component (default: 0)
     * @param z - Z component (default: 0)
     * @param w - W component (default: 0)
     */
    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    /**
     * Creates a copy of this vector
     * @returns New Vec4 instance with same components
     */
    clone(): Vec4 {
        return new Vec4(this.x, this.y, this.z, this.w);
    }

    /**
     * Sets all components of this vector
     * @param x - X component
     * @param y - Y component
     * @param z - Z component
     * @param w - W component
     * @returns This vector for chaining
     */
    set(x: number, y: number, z: number, w: number): Vec4 {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    /**
     * Copies components from another vector
     * @param v - Source vector
     * @returns This vector for chaining
     * @throws {TypeError} If v is not a Vec4 instance
     */
    copy(v: Vec4): Vec4 {
        if (!(v instanceof Vec4)) {
            throw new TypeError('Expected Vec4 instance');
        }
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        this.w = v.w;
        return this;
    }

    /**
     * Compares this vector with another using epsilon tolerance
     * @param v - Vector to compare
     * @param eps - Epsilon tolerance (default: 1e-6)
     * @returns True if vectors are equal within epsilon
     * @throws {TypeError} If v is not a Vec4 instance
     */
    equals(v: Vec4, eps: number = 1e-6): boolean {
        if (!(v instanceof Vec4)) {
            throw new TypeError('Expected Vec4 instance');
        }
        if (typeof eps !== 'number' || eps < 0 || !isFinite(eps)) {
            throw new TypeError('Epsilon must be a non-negative finite number');
        }
        return Math.abs(this.x - v.x) < eps &&
               Math.abs(this.y - v.y) < eps &&
               Math.abs(this.z - v.z) < eps &&
               Math.abs(this.w - v.w) < eps;
    }

    /**
     * Adds another vector to this vector
     * @param v - Vector to add
     * @returns This vector for chaining
     * @throws {TypeError} If v is not a Vec4 instance
     */
    add(v: Vec4): Vec4 {
        if (!(v instanceof Vec4)) {
            throw new TypeError('Expected Vec4 instance');
        }
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        this.w += v.w;
        return this;
    }

    /**
     * Subtracts another vector from this vector
     * @param v - Vector to subtract
     * @returns This vector for chaining
     * @throws {TypeError} If v is not a Vec4 instance
     */
    sub(v: Vec4): Vec4 {
        if (!(v instanceof Vec4)) {
            throw new TypeError('Expected Vec4 instance');
        }
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        this.w -= v.w;
        return this;
    }

    /**
     * Multiplies this vector by a scalar
     * @param s - Scalar value
     * @returns This vector for chaining
     * @throws {TypeError} If s is not a finite number
     */
    mul(s: number): Vec4 {
        if (typeof s !== 'number' || !isFinite(s)) {
            throw new TypeError('Scalar must be a finite number');
        }
        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w *= s;
        return this;
    }

    /**
     * Computes dot product with another vector
     * @param v - Other vector
     * @returns Dot product value
     * @throws {TypeError} If v is not a Vec4 instance
     */
    dot(v: Vec4): number {
        if (!(v instanceof Vec4)) {
            throw new TypeError('Expected Vec4 instance');
        }
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }

    /**
     * Computes the length (magnitude) of this vector
     * @returns Vector length
     */
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }

    /**
     * Normalizes this vector to unit length
     * @returns This vector for chaining
     */
    normalize(): Vec4 {
        const len = this.length();
        if (len > 0) {
            const inv = 1 / len;
            this.x *= inv;
            this.y *= inv;
            this.z *= inv;
            this.w *= inv;
        }
        return this;
    }

    /**
     * Loads components from a typed array
     * @param arr - Source array
     * @param offset - Starting index (default: 0)
     * @returns This vector for chaining
     * @throws {TypeError} If arr is not a Float32Array
     * @throws {RangeError} If offset is out of bounds
     */
    fromArray(arr: Float32Array, offset: number = 0): Vec4 {
        if (!(arr instanceof Float32Array)) {
            throw new TypeError('Expected Float32Array');
        }
        if (typeof offset !== 'number' || !isFinite(offset) || offset < 0) {
            throw new TypeError('Offset must be a non-negative finite number');
        }
        if (offset + 3 >= arr.length) {
            throw new RangeError('Offset out of bounds');
        }
        this.x = arr[offset];
        this.y = arr[offset + 1];
        this.z = arr[offset + 2];
        this.w = arr[offset + 3];
        return this;
    }

    /**
     * Stores components to a typed array
     * @param arr - Destination array (optional, creates new if omitted)
     * @param offset - Starting index (default: 0)
     * @returns The array
     * @throws {TypeError} If arr is provided but not a Float32Array
     * @throws {RangeError} If offset is out of bounds
     */
    toArray(arr?: Float32Array, offset: number = 0): Float32Array {
        if (arr !== undefined && !(arr instanceof Float32Array)) {
            throw new TypeError('Expected Float32Array');
        }
        if (typeof offset !== 'number' || !isFinite(offset) || offset < 0) {
            throw new TypeError('Offset must be a non-negative finite number');
        }
        if (!arr) {
            arr = new Float32Array(4);
        } else if (offset + 3 >= arr.length) {
            throw new RangeError('Offset out of bounds');
        }
        arr[offset] = this.x;
        arr[offset + 1] = this.y;
        arr[offset + 2] = this.z;
        arr[offset + 3] = this.w;
        return arr;
    }

    /**
     * Creates a Vec4 from a Float32Array
     * @param arr - Source array
     * @param offset - Starting index (default: 0)
     * @returns New Vec4 instance
     * @throws {TypeError} If arr is not a Float32Array
     * @throws {RangeError} If offset is out of bounds
     */
    static fromArray(arr: Float32Array, offset: number = 0): Vec4 {
        if (!(arr instanceof Float32Array)) {
            throw new TypeError('Expected Float32Array');
        }
        if (typeof offset !== 'number' || !isFinite(offset) || offset < 0) {
            throw new TypeError('Offset must be a non-negative finite number');
        }
        if (offset + 3 >= arr.length) {
            throw new RangeError('Offset out of bounds');
        }
        return new Vec4(arr[offset], arr[offset + 1], arr[offset + 2], arr[offset + 3]);
    }

    /**
     * Creates a zero vector
     * @returns New Vec4 with all components zero
     */
    static zero(): Vec4 {
        return new Vec4(0, 0, 0, 0);
    }

    /**
     * Creates a unit vector along X axis
     * @returns New Vec4(1,0,0,0)
     */
    static unitX(): Vec4 {
        return new Vec4(1, 0, 0, 0);
    }

    /**
     * Creates a unit vector along Y axis
     * @returns New Vec4(0,1,0,0)
     */
    static unitY(): Vec4 {
        return new Vec4(0, 1, 0, 0);
    }

    /**
     * Creates a unit vector along Z axis
     * @returns New Vec4(0,0,1,0)
     */
    static unitZ(): Vec4 {
        return new Vec4(0, 0, 1, 0);
    }

    /**
     * Creates a unit vector along W axis
     * @returns New Vec4(0,0,0,1)
     */
    static unitW(): Vec4 {
        return new Vec4(0, 0, 0, 1);
    }
}
