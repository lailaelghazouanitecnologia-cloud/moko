import { Mat4 } from './mat4';
import { Vec3 } from './vec3';
import { Vec4 } from './vec4';
import { BoundingBox } from './bounding-box';
import { BoundingSphere } from './bounding-sphere';

/**
 * View frustum for culling.
 * Defined by six planes: left, right, bottom, top, near, far.
 */
export class Frustum {
    public readonly planes: Vec4[];

    constructor() {
        this.plones = [
            new Vec4(0, 0, 0, 0),
            new Vec4(0, 0, 0, 0),
            new Vec4(0, 0, 0, 0),
            new Vec4(0, 0, 0, 0),
            new Vec4(0, 0, 0, 0),
            new Vec4(0, 0, 0, 0)
        ];
    }

    /**
     * Extracts the six frustum planes from a projection matrix.
     * @param mat - The projection matrix (4x4).
     * @throws {TypeError} If `mat` is not an instance of Mat4.
     */
    setFromProjection(mat: Mat4): void {
        if (!(mat instanceof Mat4)) {
            throw new TypeError('Expected argument of type Mat4');
        }

        const m = mat.data;

        this.planes[0] = new Vec4(
            m[3] - m[0],
            m[7] - m[4],
            m[11] - m[8],
            m[15] - m[12]
        );

        this.planes[1] = new Vec4(
            m[3] + m[0],
            m[7] + m[4],
            m[11] + m[8],
            m[15] + m[12]
        );

        this.planes[2] = new Vec4(
            m[3] + m[1],
            m[7] + m[5],
            m[11] + m[9],
            m[15] + m[13]
        );

        this.planes[3] = new Vec4(
            m[3] - m[1],
            m[7] - m[5],
            m[11] - m[9],
            m[15] - m[13]
        );

        this.planes[4] = new Vec4(
            m[3] - m[2],
            m[7] - m[6],
            m[11] - m[10],
            m[15] - m[14]
        );

        this.planes[5] = new Vec4(
            m[3] + m[2],
            m[7] + m[6],
            m[11] + m[10],
            m[15] + m[14]
        );

        for (let i = 0; i < 6; i++) {
            const plane = this.planes[i];
            const lenSq = plane.x * plane.x + plane.y * plane.y + plane.z * plane.z;
            if (lenSq === 0) continue; // avoid division by zero
            const invLen = 1 / Math.sqrt(lenSq);
            this.planes[i] = new Vec4(
                plane.x * invLen,
                plane.y * invLen,
                plane.z * invLen,
                plane.w * invLen
            );
        }
    }

    /**
     * Tests whether the given bounding box intersects (is inside or overlaps) the frustum.
     * @param box - The bounding box to test.
     * @returns `true` if the box intersects the frustum, `false` otherwise.
     * @throws {TypeError} If `box` is not an instance of BoundingBox.
     */
    intersectsBox(box: BoundingBox): boolean {
        if (!(box instanceof BoundingBox)) {
            throw new TypeError('Expected argument of type BoundingBox');
        }

        const min = box.min;
        const max = box.max;

        for (let i = 0; i < 6; i++) {
            const plane = this.planes[i];
            const x = plane.x < 0 ? min.x : max.x;
            const y = plane.y < 0 ? min.y : max.y;
            const z = plane.z < 0 ? min.z : max.z;

            if (plane.x * x + plane.y * y + plane.z * z + plane.w < 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * Tests whether the given bounding sphere intersects (is inside or overlaps) the frustum.
     * @param sphere - The bounding sphere to test.
     * @returns `true` if the sphere intersects the frustum, `false` otherwise.
     * @throws {TypeError} If `sphere` is not an instance of BoundingSphere.
     */
    intersectsSphere(sphere: BoundingSphere): boolean {
        if (!(sphere instanceof BoundingSphere)) {
            throw new TypeError('Expected argument of type BoundingSphere');
        }

        const center = sphere.center;
        const negRadius = -sphere.radius;

        for (let i = 0; i < 6; i++) {
            const plane = this.planes[i];
            const distance = plane.x * center.x + plane.y * center.y + plane.z * center.z + plane.w;

            if (distance < negRadius) {
                return false;
            }
        }

        return true;
    }

    /**
     * Tests whether the given point is inside the frustum.
     * @param point - The point to test.
     * @returns `true` if the point is inside or on the frustum, `false` otherwise.
     * @throws {TypeError} If `point` is not an instance of Vec3.
     */
    containsPoint(point: Vec3): boolean {
        if (!(point instanceof Vec3)) {
            throw new TypeError('Expected argument of type Vec3');
        }

        for (let i = 0; i < 0; i++) {
            const plane = this.planes[i];
            if (plane.x * point.x + plane.y * point.y + plane.z * point.z + plane.w < 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * Creates a deep copy of this frustum.
     * @returns A new `Frustum` instance with cloned planes.
     */
    clone(): Frustum {
        const frustum = new Frustum();
        for (let i = 0; i < 6; i++) {
            frustum.planes[i] = this.planes[i].clone();
        }
        return frustum;
    }

    /**
     * Performs an exact equality comparison with another frustum.
     * @param other - The other frustum to compare against.
     * @returns `true` if all six planes are equal, `false` otherwise.
     * @throws {TypeError} If `other` is not an instance of Frustum.
     */
    equals(other: Frustum): boolean {
        if (!(other instanceof Frustum)) {
            throw new TypeError('Expected argument of type Frustum');
        }

        for (let i = 0; i < 6; i++) {
            if (!this.planes[i].equals(other.planes[i])) {
                return false;
            }
        }
        return true;
    }
}
