import { Vec3 } from './vec3';
import { BoundingBox } from './bounding-box';

/**
 * A 3D sphere defined by a center point and a radius.
 * Used primarily for bounding volume calculations and intersection tests.
 */
export class BoundingSphere {
  public readonly center: Vec3;
  public readonly radius: number;

  /**
   * Creates a new BoundingSphere.
   * @param center - The center of the sphere. Defaults to (0, 0, 0).
   * @param radius - The radius of the sphere. Must be non-negative. Defaults to 0.
   * @throws {Error} If radius is negative.
   */
  constructor(center: Vec3 = new Vec3(), radius: number = 0) {
    if (radius < 0) {
      throw new Error('BoundingSphere radius must be non-negative');
    }
    this.center = center;
    this.radius = radius;
  }

  /**
   * Creates a new BoundingSphere with the given center and radius.
   * @param center - The center of the new sphere.
   * @param radius - The radius of the new sphere. Must be non-negative.
   * @returns A new BoundingSphere instance.
   * @throws {Error} If radius is negative.
   */
  set(center: Vec3, radius: number): BoundingSphere {
    if (radius < 0) {
      throw new Error('BoundingSphere radius must be non-negative');
    }
    return new BoundingSphere(center, radius);
  }

  /**
   * Creates a deep copy of this sphere.
   * @returns A new BoundingSphere with cloned center and same radius.
   */
  clone(): BoundingSphere {
    return new BoundingSphere(this.center.clone(), this.radius);
  }

  /**
   * Creates a new BoundingSphere by copying another sphere's properties.
   * @param sphere - The sphere to copy from. Must not be null or undefined.
   * @returns A new BoundingSphere instance.
   * @throws {Error} If sphere is null or undefined.
   */
  copy(sphere: BoundingSphere): BoundingSphere {
    if (!sphere) {
      throw new Error('Cannot copy from null or undefined BoundingSphere');
    }
    return new BoundingSphere(sphere.center.clone(), sphere.radius);
  }

  /**
   * Creates a new BoundingSphere with the same center but zero radius.
   * @returns A new BoundingSphere with radius 0.
   */
  empty(): BoundingSphere {
    return new BoundingSphere(this.center, 0);
  }

  /**
   * Checks if a point is inside or on the surface of this sphere.
   * @param point - The point to test. Must not be null or undefined.
   * @returns True if the point is inside or on the sphere, false otherwise.
   * @throws {Error} If point is null or undefined.
   */
  containsPoint(point: Vec3): boolean {
    if (!point) {
      throw new Error('Point cannot be null or undefined');
    }
    const dx = point.x - this.center.x;
    const dy = point.y - this.center.y;
    const dz = point.z - this.center.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    return distanceSquared <= this.radius * this.radius;
  }

  /**
   * Checks if this sphere intersects with another sphere.
   * @param sphere - The other sphere to test against. Must not be null or undefined.
   * @returns True if the spheres intersect or touch, false otherwise.
   * @throws {Error} If sphere is null or undefined.
   */
  intersectsSphere(sphere: BoundingSphere): boolean {
    if (!sphere) {
      throw new Error('Sphere cannot be null or undefined');
    }
    const dx = sphere.center.x - this.center.x;
    const dy = sphere.center.y - this.center.y;
    const dz = sphere.center.z - this.center.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    const radiusSum = this.radius + sphere.radius;
    return distanceSquared <= radiusSum * radiusSum;
  }

  /**
   * Checks if this sphere intersects with a bounding box.
   * @param box - The bounding box to test against. Must not be null or undefined.
   * @returns True if the sphere intersects the box, false otherwise.
   * @throws {Error} If box is null or undefined.
   */
  intersectsBox(box: BoundingBox): boolean {
    if (!box) {
      throw new Error('BoundingBox cannot be null or undefined');
    }
    const closestX = Math.max(box.min.x, Math.min(this.center.x, box.max.x));
    const closestY = Math.max(box.min.y, Math.min(this.center.y, box.max.y));
    const closestZ = Math.max(box.min.z, Math.min(this.center.z, box.max.z));
    
    const dx = this.center.x - closestX;
    const dy = this.center.y - closestY;
    const dz = this.center.z - closestZ;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    
    return distanceSquared <= this.radius * this.radius;
  }

  /**
   * Calculates the signed distance from the sphere's surface to a point.
   * Negative values indicate the point is inside the sphere.
   * @param point - The point to measure distance to. Must not be null or undefined.
   * @returns The signed distance from the sphere's surface to the point.
   * @throws {Error} If point is null or undefined.
   */
  distanceToPoint(point: Vec3): number {
    if (!point) {
      throw new Error('Point cannot be null or undefined');
    }
    const dx = point.x - this.center.x;
    const dy = point.y - this.center.y;
    const dz = point.z - this.center.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return distance - this.radius;
  }

  /**
   * Expands this sphere to include a given point.
   * If the point is already inside, returns a copy of this sphere.
   * @param point - The point to include. Must not be null or undefined.
   * @returns A new BoundingSphere that encompasses the original sphere and the point.
   * @throws {Error} If point is null or undefined.
   */
  expand(point: Vec3): BoundingSphere {
    if (!point) {
      throw new Error('Point cannot be null or undefined');
    }
    const dx = point.x - this.center.x;
    const dy = point.y - this.center.y;
    const dz = point.z - this.center.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance <= this.radius) {
      return this.clone();
    }
    
    const newRadius = (this.radius + distance) / 2;
    const scale = (newRadius - this.radius) / distance;
    const newCenter = new Vec3(
      this.center.x + dx * scale,
      this.center.y + dy * scale,
      this.center.z + dz * scale
    );
    
    return new BoundingSphere(newCenter, newRadius);
  }

  /**
   * Checks if this sphere is equal to another sphere within a given tolerance.
   * @param sphere - The sphere to compare with. Must not be null or undefined.
   * @param tolerance - The maximum allowed difference for equality. Must be non-negative.
   * @returns True if the spheres are equal within tolerance, false otherwise.
   * @throws {Error} If sphere is null or undefined or tolerance is negative.
   */
  equals(sphere: BoundingSphere, tolerance: number = 1e-6): boolean {
    if (!sphere) {
      throw new Error('Sphere cannot be null or undefined');
    }
    if (tolerance < 0) {
      throw new Error('Tolerance must be non-negative');
    }
    return this.center.equals(sphere.center, tolerance) && 
           Math.abs(this.radius - sphere.radius) <= tolerance;
  }

  /**
   * Calculates the volume of this sphere.
   * @returns The volume of the sphere.
   */
  volume(): number {
    return (4 / 3) * Math.PI * this.radius * this.radius * this.radius;
  }

  /**
   * Calculates the surface area of this sphere.
   * @returns The surface area of the sphere.
   */
  surfaceArea(): number {
    return 4 * Math.PI * this.radius * this.radius;
  }

  /**
   * Creates a BoundingSphere that encompasses two spheres.
   * @param a - The first sphere. Must not be null or undefined.
   * @param b - The second sphere. Must not be null or undefined.
   * @returns A new BoundingSphere that encompasses both input spheres.
   * @throws {Error} If either sphere is null or undefined.
   */
  static union(a: BoundingSphere, b: BoundingSphere): BoundingSphere {
    if (!a || !b) {
      throw new Error('Both spheres must be non-null and defined');
    }
    const dx = b.center.x - a.center.x;
    const dy = b.center.y - a.center.y;
    const dz = b.center.z - a.center.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance + b.radius <= a.radius) {
      return a.clone();
    }
    if (distance + a.radius <= b.radius) {
      return b.clone();
    }
    
    const newRadius = (distance + a.radius + b.radius) / 2;
    const centerOffset = (newRadius - a.radius) / distance;
    const newCenter = new Vec3(
      a.center.x + dx * centerOffset,
      a.center.y + dy * centerOffset,
      a.center.z + dz * centerOffset
    );
    
    return new BoundingSphere(newCenter, newRadius);
  }
}
