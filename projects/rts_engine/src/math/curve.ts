import { Vec3 } from './vec3';
import { Mat4 } from './mat4';

/**
 * A 3-D curve defined by a sequence of control points.
 * Supports Catmull-Rom interpolation, looping, and geometric transformations.
 */
export class Curve {
    private points: Vec3[] = [];
    private cachedLength: number = 0;
    private needsLengthUpdate: boolean = true;

    /**
     * Creates a new Curve.
     * @param points Optional initial control points.
     */
    constructor(points?: Vec3[]) {
        if (points) {
            this.validatePointsArray(points);
            this.points = points.map(p => p.clone());
            this.needsLengthUpdate = true;
        }
    }

    /**
     * Adds a single control point to the end of the curve.
     * @param point The new control point.
     * @returns A new Curve instance with the added point.
     */
    addPoint(point: Vec3): Curve {
        if (!point) {
            throw new Error('Point must be defined');
        }
        const curve = new Curve();
        curve.points = [...this.points, point.clone()];
        curve.needsLengthUpdate = true;
        return curve;
    }

    /**
     * Inserts a control point at the specified index.
     * @param index Index to insert at.
     * :param point Point to insert.
     * @returns A new Curve instance with the inserted point.
     */
    insertPoint(index: number, point: Vec3): Curve {
        if (!point) {
            throw new Error('Point must be defined');
        }
        if (!Number.isInteger(index) || index < 0 || index > this.points.length) {
            throw new Error('Index out of range');
        }
        const curve = new Curve();
        curve.points = [
            ...this.points.slice(0, index),
            point.clone(),
            ...this.points.slice(index)
        ];
        curve.needsLengthUpdate = true;
        return curve;
    }

    /**
     * Removes a control point at the specified index.
     * @param index Index of the point to remove.
     * :returns A new Curve instance with the point removed.
     */
    removePoint(index: number): Curve {
        if (!Number.isInteger(index) || index < 0 || index >= this.points.length) {
            throw new Error('Index out of range');
        }
        const curve = new Curve();
        curve.points = this.points.filter((_, i) => i !== index);
        curve.needsLengthUpdate = true;
        return curve;
    }

    /**
     * Gets a control point by index.
     * @param index Index of the point.
     * @returns A clone of the control point.
     */
    getPoint(index: number): Vec3 {
        if (!Number.isInteger(index) || index < 0 || index >= this.points.length) {
            throw new Error('Point index out of range');
        }
        return this.points[index].clone();
    }

    /**
     * Gets all control points.
     * @returns An array of clones of the control points.
     */
    getPoints(): Vec3[] {
        return this.points.map(p => p.clone());
    }

    /**
     * Sets all control points.
     * @param points New control points.
     * @returns This curve instance for chaining.
     */
    setPoints(points: Vec3[]): Curve {
        this.validatePointsArray(points);
        this.points = points.map(p => p.clone());
        this.needsLengthUpdate = true;
        return this;
    }

    /**
     * Computes the total length of the polyline (chordal) approximation.
     * @returns The length of the curve.
     */
    getLength(): number {
        if (this.needsLengthUpdate) {
            this.cachedLength = 0;
            for (let i = 0; i < this.points.length - 1; i++) {
                this.cachedLength += this.points[i].distance(this.points[i + 1]);
            }
            this.needsLengthUpdate = false;
        }
        return this.cachedLength;
    }

    /**
     * Samples a point along the curve using Catmull-Rom interpolation.
     * @param t Interpolation parameter in [0,1].
     * @param loop Whether the curve should be treated as a closed loop.
     * @returns The interpolated point.
     */
    interpolate(t: number, loop: boolean = false): Vec3 {
        if (typeof t !== 'number' || !isFinite(t)) {
            throw new Error('t must be a finite number');
        }
        if (this.points.length === 0) {
            return Vec3.zero();
        }
        if (this.points.length === 1) {
            return this.points[0].clone();
        }

        const pointCount = this.points.length;
        const segmentCount = loop ? pointCount : pointCount - 1;

        let tClamped = t;
        if (loop) {
            tClamped = t - Math.floor(t);
        } else {
            tClamped = Math.max(0, Math.min(1, t));
        }

        const segmentIndex = Math.floor(tClamped * segmentCount);
        const localT = (tClamped * segmentCount) - segmentIndex;

        const i0 = this.wrapIndex(segmentIndex - 1, pointCount, loop);
        const i1 = this.wrapIndex(segmentIndex, pointCount, loop);
        const i2 = this.wrapIndex(segmentIndex + 1, pointCount, loop);
        const i3 = this.wrapIndex(segmentIndex + 2, pointCount, loop);

        const p0 = this.points[i0];
        const p1 = this.points[i1];
        const p2 = this.points[i2];
        const p3 = this.points[i3];

        const t2 = localT * localT;
        const t3 = t2 * localT;

        const a = -0.5 * t3 + t2 - 0.5 * localT;
        const b = 1.5 * t3 - 2.5 * t2 + 1;
        const c = -1.5 * t3 + 2 * t2 + 0.5 * localT;
        const d = 0.5 * t3 - 0.5 * t2;

        const x = a * p0.x + b * p1.x + c * p2.x + d * p3.x;
        const y = a * p0.y + b * p1.y + c * p2.y + d * p3.y;
        const z = a * p0.z + b * p1.z + c * p2.z + d * p3.z;

        return new Vec3(x, y, z);
    }

    /**
     * Samples a sequence of points along the curve.
     * @param divisions Number of segments to split the curve into.
     * @param loop Whether to treat the curve as a loop.
     * :returns An array of sampled points.
     */
    samplePoints(divisions: number = 50, loop: boolean = false): Vec3[] {
        if (!Number.isInteger(divisions) || divisions < 1) {
            throw new Error('divisions must be a positive integer');
        }
        const pts: Vec3[] = [];
        for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            pts.push(this.interpolate(t, loop));
        }
        return pts;
    }

    /**
     * Creates a deep copy of this curve.
     * @returns A new Curve instance with cloned control points.
     */
    clone(): Curve {
        const curve = new Curve();
        curve.points = this.points.map(p => p.clone());
        curve.cachedLength = this.cachedLength;
        curve.needsLengthUpdate = this.needsLengthUpdate;
        return curve;
    }

    /**
     * Copies data from another curve into a new instance.
     * @param curve Source curve.
     * :returns A new Curve instance with copied data.
     */
    copy(curve: Curve): Curve {
        if (!curve) {
            throw new Error('Curve to copy is required');
        }
        const result = new Curve();
        result.points = curve.points.map(p => p.clone());
        result.cachedLength = curve.cachedLength;
        result.needsLengthUpdate = curve.needsLengthUpdate;
        return result;
    }

    /**
     * Transforms the curve by a 4x4 matrix.
     * @param matrix Transformation matrix.
     * :returns A new Curve instance with transformed control points.
     */
    transform(matrix: Mat4): Curve {
        if (!matrix) {
            throw new Error('Transformation matrix is required');
        }
        const result = new Curve();
        result.points = this.points.map(p => matrix.transformPoint(p));
        result.needsLengthUpdate = true;
        return result;
    }

    /**
     * Scales the curve uniformly by a factor.
     * @param factor Scale factor.
     * :returns A new Curve instance with scaled control points.
     */
    scale(factor: number): Curve {
        if (typeof factor !== 'number' || !isFinite(factor)) {
            throw new Error('Factor must be a finite number');
        }
        const result = new Curve();
        result.points = this.points.map(p => p.mul(factor));
        result.needsLengthUpdate = true;
        return result;
    }

    /**
     * Reverses the order of control points.
     * @returns A new Curve instance with reversed control points.
     */
    reverse(): Curve {
        const result = new Curve();
        result.points = [...this.points].reverse();
        result.needsLengthUpdate = true;
        return result;
    }

    /**
     * Clears all control points.
     * @returns A new empty Curve.
     */
    clear(): Curve {
        return new Curve();
    }

    /**
     * Checks if the curve has no control points.
     * @returns True if the curve is empty.
     */
    isEmpty(): boolean {
        return this.points.length === 0;
    }

    /**
     * Gets the number of control points.
     * @returns The count of control points.
     */
    getPointCount(): number {
        return this.points.length;
    }

    /**
     * Computes the bounding box of the control points.
     * @returns An object with min and max Vec3s, or null if the curve is empty.
     */
    getBoundingBox(): { min: Vec3; max: Vec3 } | null {
        if (this.isEmpty()) return null;
        let min = this.points[0].clone();
        let max = this.points[0].clone();
        for (let i = 1; i < this.points.length; i++) {
            const p = this.points[i];
            min.x = Math.min(min.x, p.x);
            min.y = Math.min(min.y, p.y);
            min.z = Math.min(min.z, p.z);
            max.x = Math.max(max.x, p.x);
            max.y = Math.max(max.y, p.y);
            max.z = Math.max(max.z, p.z);
        }
        return { min, max };
    }

    /**
     * Converts the curve to an array of line segments.
     * @param divisions Number of segments per span.
     * :returns An array of vertices representing line segments.
     */
    toLineSegments(divisions: number = 10): Vec3[] {
        if (!Number.isInteger(divisions) || divisions < 1) {
            throw new Error('divisions must be a integer >= 1');
        }
        const segments: Vec3[] = [];
        const pts = this.samplePoints(divisions * Math.max(1, this.points.length - 1));
        for (let i = 0; i < pts.length - 1; i++) {
            segments.push(pts[i], pts[i + 1]);
        }
        return segments;
    }

    /**
     * Validates an array of control points.
     @param points Array to validate.
     */
    private validatePointsArray(points: Vec3[]): void {
        if (!Array.isArray(points)) {
            throw new Error('Points must be an array');
        }
        for (const p of points) {
            if (!(p instanceof Vec3)) {
                throw new Error('All points must be Vec3 instances');
            }
        }
    }

    /**
     * Wraps an index to stay within bounds, optionally looping.
     @param index Index to wrap.
     @param count Total number of points.
     @param loop Whether to loop.
     @returns The wrapped index.
     */
    private wrapIndex(index: number, count: number, loop: boolean): number {
        if (loop) {
            return ((index % count) + count) % count;
        }
        return Math.max(0, Math.min(count - 1, index));
    }
}
