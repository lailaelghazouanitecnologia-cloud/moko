import { Vec3 } from './vec3';
import { Vec4 } from './vec4';
import { Mat4 } from './mat4';
import { BoundingSphere } from './bounding-sphere';

/**
 * Represents an axis-aligned bounding box (AABB) in 3D space.
 * Defined by two points: the minimum and maximum corners.
 */
export class BoundingBox {
  public readonly min: Vec3;
  public readonly max: Vec3;

  /**
   * Creates a new BoundingBox.
   * @param min - The minimum corner of the box. Defaults to (0, 0, 0).
   * @param max - The maximum corner of the box. Defaults to (0, 0, 0).
   */
  constructor(min: Vec3 = new Vec3(), max: Vec3 = new Vec3()) {
    this.min = min;
    this.max = max;
  }

  /**
   * Creates a new BoundingBox with the given min and max vectors.
   * @param min - The minimum corner of the box.
   * @param max - The maximum corner of the box.
   * @returns A new BoundingBox instance.
   */
  set(min: Vec3, max: Vec3): BoundingBox {
    if (!min || !max) {
      throw new Error('Both min and max must be provided');
    }
    return new BoundingBox(min, max);
  }

  /**
   * Creates a deep copy of this BoundingBox.
   * @returns A new BoundingBox with cloned min and max vectors.
   */
  clone(): BoundingBox {
    return new BoundingBox(this.min.clone(), this.max.clone());
  }

  /**
   * Creates a new BoundingBox by copying the min and max from another box.
   * @param box - The BoundingBox to copy from.
   * @returns A new BoundingBox instance.
   */
  copy(box: BoundingBox): BoundingBox {
    if (!box) {
      throw new Error('Cannot copy from null or undefined BoundingBox');
    }
    return new BoundingBox(box.min.clone(), box.max.clone());
  }

  /**
   * Checks if the box is empty (i.e., min > max in any dimension).
   * @returns True if the box is empty, false otherwise.
   */
  isEmpty(): boolean {
    return this.min.x > this.max.x || this.min.y > this.max.y || this.min.z > this.max.z;
  }

  /**
   * Calculates the center point of the box.
   * @returns A new Vec3 representing the center.
   */
  center(): Vec3 {
    return new Vec3(
      (this.min.x + this.max.x) * 0.5,
      (this.min.y + this.max.y) * 0.5,
      (this.min.z + this.max.z) * 0.5
    );
  }

  /**
   * Calculates the size (width, height, depth) of the box.
   * @returns A new Vec3 representing the size.
   */
  size(): Vec3 {
    return new Vec3(
      this.max.x - this.min.x,
      this.max.y - this.min.y,
      this.max.z - this.min.z
    );
  }

  /**
   * Expands the box to include the given point.
   * @param point - The point to include.
   * @returns A new expanded BoundingBox.
   */
  expand(point: Vec3): BoundingBox {
    if (!point) {
      throw new Error('Point must be provided');
    }
    const newMin = new Vec3(
      Math.min(this.min.x, point.x),
      Math.min(this.min.y, point.y),
      Math.min(this.min.z, point.z)
    );
    const newMax = new Vec3(
      Math.max(this.max.x, point.x),
      Math.max(this.max.y, point.y),
      Math.max(this.max.z, point.z)
    );
    return new BoundingBox(newMin, newMax);
  }

  /**
   * Expands the box to include another BoundingBox.
   * @param box - The BoundingBox to include.
   * @returns A new expanded BoundingBox.
   */
  expandBox(box: BoundingBox): BoundingBox {
    if (!box) {
      throw new Error('BoundingBox must be provided');
    }
    const newMin = new Vec3(
      Math.min(this.min.x, box.min.x),
      Math.min(this.min.y, box.min.y),
      Math.min(this.min.z, box.min.z)
    );
    const newMax = new Vec3(
      Math.max(this.max.x, box.max.x),
      Math.max(this.max.y, box.max.y),
      Math.max(this.max.z, box.max.z)
    );
    return new BoundingBox(newMin, newMax);
  }

  /**
   * Checks if the box contains a given point.
   * @param point - The point to check.
   * @returns True if the point is inside or on the boundary, false otherwise.
   */
  containsPoint(point: Vec3): boolean {
    if (!point) {
      throw new Error('Point must be provided');
    }
    return point.x >= this.min.x && point.x <= this.max.x &&
           point.y >= this.min.y && point.y <= this.max.y &&
           point.z >= this.min.z && point.z <= this.max.z;
  }

  /**
   * Checks if this box intersects another BoundingBox.
   * @param box - The BoundingBox to check against.
   * @returns True if the boxes intersect, false otherwise.
   */
  intersectsBox(box: BoundingBox): boolean {
    if (!box) {
      throw new Error('BoundingBox must be provided');
    }
    return this.min.x <= box.max.x && this.max.x >= box.min.x &&
           this.min.y <= box.max.y && this.max.y >= box.min.y &&
           this.min.z <= box.max.z && this.max.z >= box.min.z;
  }

  /**
   * Checks if this box intersects a BoundingSphere.
   * @param sphere - The BoundingSphere to check against.
   * @returns True if the box and sphere intersect, false otherwise.
   */
  intersectsSphere(sphere: BoundingSphere): boolean {
    if (!sphere) {
      throw new Error('BoundingSphere must be provided');
    }
    const closest = new Vec3(
      Math.max(this.min.x, Math.min(sphere.center.x, this.max.x)),
      Math.max(this.min.y, Math.min(sphere.center.y, this.max.y)),
      Math.max(this.min.z, Math.min(sphere.center.z, this.max.z))
    );
    const distance = closest.distance(sphere.center);
    return distance <= sphere.radius;
  }

  /**
   * Calculates the shortest distance from a point to this box.
   * @param point - The point to measure distance from.
   * @returns The distance from the point to the box.
   */
  distanceToPoint(point: Vec3): number {
    if (!point) {
      throw new Error('Point must be provided');
    }
    const closest = new Vec3(
      Math.max(this.min.x, Math.min(point.x, this.max.x)),
      Math.max(this.min.y, Math.min(point.y, this.max.y)),
      Math.max(this.min.z, Math.min(point.z, this.max.z))
    );
    return closest.distance(point);
  }

  /**
   * Transforms this box by a 4x4 matrix.
   * @param matrix - The transformation matrix.
   * @returns A new transformed BoundingBox.
   */
  transformMat4(matrix: Mat4): BoundingBox {
    if (!matrix) {
      throw new Error('Matrix must be provided');
    }
    const points = [
      new Vec3(this.min.x, this.min.y, this.min.z),
      new Vec3(this.min.x, this.min.y, this.max.z),
      new Vec3(this.min.x, this.max.y, this.min.z),
      new Vec3(this.min.x, this.max.y, this.max.z),
      new Vec3(this.max.x, this.min.y, this.min.z),
      new Vec3(this.max.x, this.min.y, this.max.z),
      new Vec3(this.max.x, this.max.y, this.min.z),
      new Vec3(this.max.x, this.max.y, this.max.z)
    ];

    let transformedMin = new Vec3(Infinity, Infinity, Infinity);
    let transformedMax = new Vec3(-Infinity, -Infinity, -Infinity);

    for (const point of points) {
      const transformed = matrix.transformVec4(new Vec4(point.x, point.y, point.z, 1));
      const transformedPoint = new Vec3(transformed.x / transformed.w, transformed.y / transformed.w, transformed.z / transformed.w);
      
      transformedMin = new Vec3(
        Math.min(transformedMin.x, transformedPoint.x),
        Math.min(transformedMin.y, transformedPoint.y),
        Math.min(transformedMin.z, transformedPoint.z)
      );
      transformedMax = new Vec3(
        Math.max(transformedMax.x, transformedPoint.x),
        Math.max(transformedMax.y, transformedPoint.y),
        Math.max(transformedMax.z, transformedPoint.z)
      );
    }

    return new BoundingBox(transformedMin, transformedMax);
  }

  /**
   * Creates a BoundingBox that encloses an array of points.
   * @param points - Array of Vec3 points.
   * @returns A new BoundingBox that contains all points.
   */
  fromPoints(points: Vec3[]): BoundingBox {
    if (!Array.isArray(points)) {
      throw new Error('Points must be an array');
    }
    if (points.length === 0) {
      return new BoundingBox();
    }

    let min = new Vec3(points[0].x, points[0].y, points[0].z);
    let max = new Vec3(points[0].x, points[0].y, points[0].z);

    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      if (!point) {
        throw new Error(`Point at index ${i} is null or undefined`);
      }
      min = new Vec3(
        Math.min(min.x, point.x),
        Math.min(min.y, point.y),
        Math.min(min.z, point.z)
      );
      max = new Vec3(
        Math.max(max.x, point.x),
        Math.max(max.y, point.y),
        Math.max(max.z, point.z)
      );
    }

    return new BoundingBox(min, max);
  }

  /**
   * Checks if this box is equal to another.
   * @param box - The BoundingBox to compare.
   * @returns True if both min and max are equal, false otherwise.
   */
  equals(box: BoundingBox): boolean {
    if (!box) {
      return false;
    }
    return this.min.equals(box.min) && this.max.equals(box.max);
  }

  /**
   * Creates a deep copy of this BoundingBox.
   * @returns A new BoundingBox with cloned min and max vectors.
   */
  clone(): BoundingBox {
    return new BoundingBox(this.min.clone(), this.max.clone());
  }

  /**
   * Creates a BoundingBox from a center and size.
   * @param center - The center of the box.
   * @param size - The size (width, height, depth) of the box.
   * @returns A new BoundingBox.
   */
  static fromCenterAndSize(center: Vec3, size: Vec3): BoundingBox {
    if (!center || !size) {
      throw new Error('Center and size must be provided');
    }
    const halfSize = size.multiplyScalar(0.5);
    return new BoundingBox(center.subtract(halfSize), center.add(halfSize));
  }

  /**
   * Creates a BoundingBox that encompasses two boxes.
   * @param a - First BoundingBox.
   * @param b - Second BoundingBox.
   * @returns A new BoundingBox that contains both input boxes.
   */
  static union(a: BoundingBox, b: BoundingBox): BoundingBox {
    if (!a || !b) {
      throw new Error('Both BoundingBoxes must be provided');
    }
    const min = new Vec3(
      Math.min(a.min.x, b.min.x),
      Math.min(a.min.y, b.min.y),
      Math.min(a.min.z, b.min.z)
    );
    const max = new Vec3(
      Math.max(a.max.x, b.max.x),
      Math.max(a.max.y, b.max.y),
      Math.max(a.max.z, b.max.z)
    );
    return new BoundingBox(min, max);
  }

  /**
   * Creates a BoundingBox that represents the intersection of two boxes.
   * @param a - First BoundingBox.
   * @param b - Second BoundingBox.
   * @returns A new BoundingBox representing the intersection, or an empty box if they do not intersect.
   */
  static intersection(a: BoundingBox, b: BoundingBox): BoundingBox {
    if (!a || !b) {
      throw new Error('Both BoundingBoxes must be provided');
    }
    const min = new Vec3(
      Math.max(a.min.x, b.min.x),
      Math.max(a.min.y, b.min.y),
      Math.max(a.min.z, b.min.z)
    );
    const max = new Vec3(
      Math.min(a.max.x, b.max.x),
      Math.min(a.max.y, b.max.y),
      Math.min(a.max.z, b.max.z)
    );
    return new BoundingBox(min, max);
  }
}
