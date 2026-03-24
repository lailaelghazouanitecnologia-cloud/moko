import { Vec3 } from './vec3';
import { Vec4 } from './vec4';
import { Mat4 } from './mat4';

/**
 * A perspective frustum defined by six planes (left, right, bottom, top, near, far).
 * Used primarily for camera culling and intersection tests.
 */
export class Frustum {
  private planes: Vec4[];

  constructor() {
    this.planes = [
      new Vec4(), // left
      new Vec4(), // right
      new Vec4(), // bottom
      new Vec4(), // top
      new Vec4(), // near
      new Vec4()  // far
    ];
  }

  /**
   * Copies the planes from another frustum into this one.
   * @param f Source frustum
   * @returns This frustum for chaining
   * @throws {TypeError} If f is not a Frustum instance
   */
  copy(f: Frustum): Frustum {
    if (!(f instanceof Frustum)) {
      throw new TypeError('Expected Frustum for copy');
    }
    this.validatePlanes();
    for (let i = 0; i < 6; i++) {
      this.planes[i].copy(f.planes[i]);
    }
    return this;
  }

  /**
   * Creates a new frustum with identical planes to this one.
   * @returns New frinstance
   */
  clone(): Frustum {
    const newFrustum = new Frustum();
    newFrustum.copy(this);
    return newFrustum;
  }

  /**
   * Extracts the frum planes from a 4x4 projection matrix.
   * @param mat 4x4 matrix (typically projection * view)
   * @returns This frustum for chaining
   * @throws {TypeError} If mat is not a Mat4 instance
   */
  fromMatrix(mat: Mat4): Frustum {
    if (!(mat instanceof Mat4)) {
      throw new TypeError('Expected Mat4');
    }
    const m = mat as any;

    // Left plane
    this.planes[0].set(
      m[3] + m[0],
      m[7] + m[4],
      m[11] + m[8],
      m[15] + m[12]
    ).normalize();

    // Right plane
    this.planes[1].set(
      m[3] - m[0],
      m[7] - m[4],
      m[11] - m[8],
      m[15] - m[12]
    ).normalize();

    // Bottom plane
    this.planes[2].set(
      m[3] + m[1],
      m[7] + m[5],
      m[11] + m[9],
      m[15] + m[13]
    ).normalize();

    // Top plane
    this.planes[3].set(
      m[3] - m[1],
      m[7] - m[5],
      m[11] - m[9],
      m[15] - m[13]
    ).normalize();

    // Near plane
    this.planes[4].set(
      m[3] + m[2],
      m[7] + m[6],
      m[11] + m[10],
      m[15] + m[14]
    ).normalize();

    // Far plane
    this.planes[5].set(
      m[3] - m[2],
      m[7] - m[6],
      m[11] - m[10],
      m[15] - m[14]
    ).normalize();

    return this;
  }

  /**
   * Tests whether a 3D point lies inside the frum.
   * @param point 3D point
   * @returns true if inside or on the boundary
   * @throws {TypeError} If point is not a Vec3 instance
   */
  containsPoint(point: Vec3): boolean {
    if (!(point instanceof Vec3)) {
      throw new TypeError('Expected Vec3');
    }
    for (let i = 0; i < 6; i++) {
      const plane = this.planes[i];
      const distance = plane.x * (point as any).x + plane.y * (point as any).y + plane.z * (point as any).z + plane.w;
      if (distance <= 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Tests whether a sphere intersects the frum.
   * @param center Sphere center
   * @param radius Sphere radius
   * @returns true if the sphere is fully or partially inside
   * @throws {TypeError} If center is not a Vec3 instance
   * @throws {RangeError} If radius is negative
   */
  containsSphere(center: Vec3, radius: number): boolean {
    if (!(center instanceof Vec3)) {
      throw new TypeError('Expected Vec3 for center');
    }
    if (radius < 0) {
      throw new RangeError('Radius must be non-negative');
    }
    for (let i = 0; i < 6; i++) {
      const plane = this.planes[i];
      const distance = plane.x * (center as any).x + plane.y * (center as any).y + plane.z * (center as any).z + plane.w;
      if (distance <= -radius) {
        return false;
      }
    }
    return true;
  }

  /**
   * Tests whether an axis-aligned box intersects the frum.
   * @param min Minimum corner of the box
   * @param max Maximum corner of the box
   * @returns true if the box is fully or partially inside
   * @throws {TypeError} If min or max is not a Vec3 instance
   * @throws {RangeError} If min is not component-wise <= max
   */
  containsBox(min: Vec3, max: Vec3): boolean {
    if (!(min instanceof Vec3) || !(max instanceof Vec3)) {
      throw new TypeError('Expected Vec3 for min and max');
    }
    if ((min as any).x > (max as any).x || (min as any).y > (max as any).y || (min as any).z > (max as any).z) {
      throw new RangeError('min must be component-wise <= max');
    }
    for (let i = 0; i < 6; i++) {
      const plane = this.planes[i];
      const nx = plane.x < 0 ? (min as any).x : (max as any).x;
      const ny = plane.y < 0 ? (min as any).y : (max as any).y;
      const nz = plane.z < 0 ? (min as any).z : (max as any).z;
      const distance = plane.x * nx + plane.y * ny + plane.z * nz + plane.w;
      if (distance <= 0) {
        return false;
      }
    }
    return true;
  }

  /** Left clipping plane (normalized) */
  get left(): Vec4 {
    return this.planes[0];
  }

  /** Right clipping plane (normalized) */
  get right(): Vec4 {
    return this.planes[1];
  }

  /** Bottom clipping plane (normalized) */
  get bottom(): Vec4 {
    return this.planes[2];
  }

  /** Top clipping plane (normalized) */
  get top(): Vec4 {
    return this.planes[3];
  }

  /** Near clipping plane (normalized) */
  get near(): Vec4 {
    return this.planes[4];
  }

  /** Far clipping plane (normalized) */
  get far(): Vec4 {
    return this.planes[5];
  }

  /**
   * Sets all planes to zero (invalid frum).
   * @returns This frum for chaining
   */
  reset(): Frustum {
    for (let i = 0; i < 6; i++) {
      this.planes[i].set(0, 0, 0, 0);
    }
    return this;
  }

  /**
   * Compares this frum to another for equality.
   * @param other Other frum
   * @returns true if all planes are exact
   */
  equals(other: Frustum): boolean {
    if (!(other instanceof Frustum)) return false;
    for (let i = 0; i < 6; i++) {
      if (!(this.planes[i] as any).equals((other.planes[i] as any))) return false;
    }
    return true;
  }

  /**
   * Produces a concise string representation.
   * @returns "[left,right,bottom,top,near,far]"
   */
  toString(): string {
    return `[${this.planes.map(p => p.toString()).join(',')}]`;
  }

  /**
   * Ensures all planes are valid (non-zero) Vec4 instances.
   * @private
   */
  private validatePlanes(): void {
    for (let i = 0; i < 6; i++) {
      if (!(this.planes[i] instanceof Vec4)) {
        throw new Error(`Plane ${i} is not a Vec4`);
      }
    }
  }
}
