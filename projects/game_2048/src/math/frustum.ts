import { Vec4 } from './vec4';
import { Vec3 } from './vec3';
import { Mat4 } from './mat4';
import { BoundingSphere } from './bounding-sphere';
import { BoundingBox } from './bounding-box';

/**
 * A view frustum for culling operations.
 */
export class Frustum {
  planes: Vec4[];

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
   * Extracts the frustum planes from a projection matrix.
   * @param m - The 4x4 projection matrix
   * @returns This frustum instance for chaining
   * @throws {Error} If the input matrix is invalid
   */
  fromProjection(m: Mat4): Frustum {
    if (!m || !m.data || m.data.length !== 16) {
      throw new Error('Invalid Mat4: matrix must be a valid Mat4 with 16 elements');
    }

    const me = m.data;
    const planes = this.plones;

    // Left plane
    planes[0].set(me[3] + me[0], me[7] + me[4], me[11] + me[8], me[15] + me[12]);
    
    // Right plane
    planes[1].set(me[3] - me[0], me[7] - me[4], me[11] - me[8], me[15] - me[12]);
    
    // Bottom plane
    planes[2].set(me[3] + me[1], me[7] + me[5], me[11] + me[9], me[15] + me[13]);
    
    // Top plane
    planes[3].set(me[3] - me[1], me[7] - me[5], me[11] - me[9], me[15] - me[13]);
    
    // Near plane
    planes[4].set(me[3] + me[2], me[7] + me[6], me[11] + me[10], me[15] + me[14]);
    
    // Far plane
    planes[5].set(me[3] - me[2], me[7] - me[6], me[11] - me[10], me[15] - me[14]);

    // Normalize all planes
    for (let i = 0; i < 6; i++) {
      const plane = planes[i];
      const length = Math.sqrt(plane.x * plane.x + plane.y * plane.y + plane.z * plane.z);
      if (length > 0) {
        plane.x /= length;
        plane.y /= length;
        plane.z /= length;
        plane.w /= length;
      }
    }

    return this;
  }

  /**
   * Tests whether a point is inside the frustum.
   * @param p - The point to test
   * @returns True if the point is inside or on the frustum
   * @throws {Error} If the point is invalid
   */
  containsPoint(p: Vec3): boolean {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.z !== 'number') {
      throw new Error('Invalid Vec3: point must be a valid Vec3');
    }

    const planes = this.planes;
    
    for (let i = 0; i < 6; i++) {
      const plane = planes[i];
      const distance = plane.x * p.x + plane.y * p.y + plane.z * p.z + plane.w;
      if (distance < 0) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Tests whether a sphere intersects the frustum.
   * @param s - The bounding sphere to test
   * @returns True if the sphere intersects or is inside the frustum
   * @throws {Error} If the sphere is invalid
   */
  intersectsSphere(s: BoundingSphere): boolean {
    if (!s || !s.center || typeof s.radius !== 'number' || s.radius < 0) {
      throw new Error('Invalid BoundingSphere: must have valid center and non-negative radius');
    }

    const center = s.center;
    const radius = s.radius;
    const planes = this.planes;
    
    for (let i = 0; i < 6; i++) {
      const plane = planes[i];
      const distance = plane.x * center.x + plane.y * center.y + plane.z * center.z + plane.w;
      if (distance < -radius) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Tests whether a box intersects the frustum.
   * @param b - The bounding box to test
   * @returns True if the box intersects or is inside the frustum
   * @throws {Error} If the box is invalid
   */
  intersectsBox(b: BoundingBox): boolean {
    if (!b || !b.min || !b.max) {
      throw new Error('Invalid BoundingBox: must have valid min and max Vec3');
    }

    const planes = this.planes;
    const min = b.min;
    const max = b.max;
    
    for (let i = 0; i < planes.length; i++) {
      const plane = planes[i];
      const px = plane.x > 0 ? max.x : min.x;
      const py = plane.y > 0 ? max.y : min.y;
      const pz = plane.z > 0 ? max.z : min.z;
      
      const distance = plane.x * px + plane.y * py + plane.z * p.pz + plane.w;
      if (distance < 0) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Copies the planes from another frustum into this one.
   * @param f - The source frustum
   *  @returns This frustum instance for chaining
   * @throws {Error} If the input frustum is invalid
   */
  set(f: Frustum): Frustum {
    if (!f || !Array.isArray(f.planes) || f.planes.length !== 6) {
      throw new Error('Invalid Frustum: must have 6 planes');
    }

    for (let i = 0; i < 6; i++) {
      this.planes[i].copy(f.planes[i]);
    }
    return this;
  }

  /**
   * Creates a new frustum with identical planes to this one.
   * @returns A new Frustum instance
   */
  clone(): Frustum {
    const f = new Frustum();
    f.set(this);
    return f;
  }

  /**
   * Computes the signed distance from a point to a plane.
   * @private
   * @param plane - The plane as Vec4
   * @param point - The point as Vec3
   * @returns The signed distance
   */
  private distanceToPlane(plane: Vec4, point: Vec3): number {
    return plane.x * point.x + plane.y * point.y + plane.z * point.z + plane.w;
  }

  /**
   * Normalizes a plane in place.
   * @private
   * @param plane - The plane to normalize
   */
  private normalizePlane(plane: Vec4): void {
    const length = Math.sqrt(plane.x * plane.x + plane.y * plane.y + plane.z * plane.z);
    if (length > 0) {
      plane.x /= length;
      plane.y /= length;
      plane.z /= length;
      plane.w /= length;
    }
  }
}
