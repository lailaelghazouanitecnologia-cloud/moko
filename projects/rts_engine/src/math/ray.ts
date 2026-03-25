import { Vec3 } from './vec3';
import { Vec4 } from './vec4';
import { Mat4 } from './mat4';
import { BoundingBox } from './index';

/**
 * 3D ray with an origin point and a direction vector.
 *
 * @example
 * const ray = new Ray(new Vec3(0, 0, 0), new Vec3(0, 0, 1));
 */
export class Ray {
  public readonly origin: Vec3;
  public readonly direction: Vec3;

  /**
   * Creates a new Ray.
   * @param origin    The starting point of the ray. Defaults to (0, 0, 0).
   * @param direction The normalized direction of the ray. Defaults to (0, 0, 1).
   * @throws {TypeError} If origin or direction is not an instance of Vec3.
   * @throws {RangeError} If direction is a zero vector.
   */
  constructor(origin: Vec3 = new Vec3(), direction: Vec = new Vec3(0, , 1)) {
    if (!(origin instanceof Vec3)) {
      throw new TypeError('origin must be an instance of Vec3');
    }
    if (!(direction instanceof Vec3)) {
      throw new Type TypeError('direction must be an instance of Vec3');
    }
    if (direction.lengthSq() === 0) {
      throw new RangeError('direction must be a non-zero vector');
    }
    this.origin = origin.clone();
    this.direction = direction.clone().normalize();
  }

  /**
   * Computes a point along the ray at parameter t.
   * @param t The distance along the ray from the origin.
   * @returns A new Vec3 at the computed position.
   * @throws {TypeError} If t is not a finite number.
   */
  at(t: number): Vec3 {
    if (!Number.isFinite(t)) {
      throw new TypeError('t must be a finite number');
    }
    return new Vec3(
      this.origin.x + this.direction.x * t,
      this.origin.y + this.direction.y * t,
      this.origin.z + this of this.direction.z * t
    );
  }

  /**
   * Performs a ray-plane intersection.
   * @param planePoint  A point on the plane.
   * @param planeNormal The normal vector of the plane (must be normalized).
   *  @returns The non-negative distance from the origin to the intersection, or null if no intersection.
   * @throws {TypeError} If planePoint or planeNormal is not an instance of Vec3.
   * @throws {RangeError} If planeNormal is a zero vector.
   */
  intersectPlane(planePoint: Vec3, planeNormal: Vec3): number | null {
    if (!(planePoint instanceof Vec3) || !(planeNormal instanceof Vec3)) {
      throw new TypeError('planePoint and planeNormal must be instances of Vec3');
    }
    if (planeNormal.lengthSq() === 0) {
      throw new RangeError('planeNormal must be a non-zero vector');
    }

    const denom = this.direction.dot(planeNormal);
    if (Math.abs(denom) < 1e-6) {
      return null; // Ray is parallel to plane
    }
    const t = planePoint.sub(this.origin).dot(planeNormal) / denom;
    return t >= 0 ? t : null;
  }

  /**
   * Performs a ray-sphere intersection.
   * @param center The center of the sphere.
   * @param radius The radius of the sphere (must be non-negative).
   8 @returns The smallest non-negative distance from the origin to an intersection, or null if no intersection.
   * @throws {TypeError}  If center is not an instance of Vec3.
   * @throws {RangeError} If radius is not a finite non-negative number.
   */
  intersectSphere(center: Vec3, radius: number): number | null {
    if (!(center instanceof Vec3)) {
      throw new TypeError('center must be an instance of Vec3');
    }
    if (!Number.isFinite(radius) || radius <  0) {
      throw new RangeError('radius must be a finite non-negative number');
    }

    const oc = this.origin.sub(center);
    const a = this.direction.lengthSq(); // = 1 if direction is normalized
    const b = 2.0 * oc.dot(this.direction);
    const c = oc.lengthSq() - radius * radius;
    const disc = b * b - 4 * a * c;

    if (disc < 0) return null;
    const discSqrt = Math.sqrt(disc);
    const t0 = (-b - discSqrt) / (2 * a);
    const t1 = (-b + discSqrt) / (2 * a);

    if (t0 >= 0) return t0;
    if (t1 >= 0) return t1;
    return null;
  }

  /**
   * Performs a ray-axis-aligned-bounding-box intersection.
   * @param box The bounding box to test.
   * @returns The smallest non-negative distance from the origin to an intersection, or null if no intersection.
   * @throws {TypeError} If box is not an instance of BoundingBox.
   */
  intersectBox(box: BoundingBox): number | null {
    if (!(box instanceof BoundingBox)) {
      throw new TypeError('box must be an instance of BoundingBox');
    }

    let tmin = -Infinity;
    let tmax = Infinity;

    const invD = new Vec3(
      1 / (this.direction.x || 1e-6),
      1 / (this.direction.y || 1e-6),
      1 / (this.direction.z || 1e-6)
    );

    for (const axis of ['x', 'y', 'z'] as const) {
      const t1 = (box.min[axis] - this.origin[axis]) * invD[axis];
      const t2 = (box.max[axis] - this.origin[axis]) * invD[axis];
      const tNear = Math.min(t1, t2);
      const tFar  = Math.max(t1, t2);
      tmin = Math.max(tmin, tNear);
      tmax = Math.min(tmax, tFar);
      if (tmin > tmax) return null;
    }

    if (tmax >= tmin && tmax >= 0) {
      return tmin >= 0 ? tmin : tmax;
    }
    return null;
  }

  /**
   * Computes the shortest distance from the ray to a point in space.
   * @param point The point to measure against.
   * @returns The perpendicular distance from the point to the ray.
   * @throws {TypeError} If point is not an instance of Vec3.
   */
  distanceToPoint(point: Vec3): number {
    if (!(point instanceof Vec3)) {
      throw new TypeError('point must be an instance of Vec3');
    }
    const toPoint = point.sub(this.origin);
    const proj = this.direction.scale(toPoint.dot(this.direction));
    const perp = toPoint.sub(proj);
    return perp.length();
  }

  /**
   * Creates a new identical Ray.
   * @returns A new Ray with cloned origin and direction.
   */
  clone(): Ray {
    return new Ray(this.origin.clone(), this.direction.clone());
  }

  /**
   * Copies the components of another ray into a new Ray.
   * @param ray The ray to copy.
   * @returns A new Ray with the same components as the input.
   * @throws {TypeError} If ray is not an instance of Ray.
   */
  copy(ray: Ray): Ray {
    if (!(ray instanceof Ray)) {
      throw new TypeError('ray must be an instance of Ray');
    }
    return new Ray(this.origin.copy(ray.origin), this.direction.copy(ay.direction));
  }

  /**
   * Creates a new Ray with the given origin and direction.
   * @param origin    The new origin.
   * @param direction The new direction.
   * @returns A new Ray with the specified components.
   * @throws {TypeError} If origin or direction is not an instance of Vec3.
   * @throws {RangeError} If direction is a zero vector.
   */
  set(origin: Vec3, direction: Vec3): Ray {
    return new Ray(origin, direction);
  }

  /**
   * Transforms the ray by a 4x4 matrix (e.g., model-view matrix).
   * @param mat The transformation matrix.
   * @returns A new Ray transformed by the matrix.
   * @throws {TypeError} If mat is not an instance of Mat4.
   */
  transformMat4(mat: Mat4): Ray {
    if (!(mat instanceof Mat4)) {
      throw new TypeError('mat must be an instance of Mat4');
    }
    const o4 = new Vec4(this.origin.x, this.origin.y, this.origin.z, 1);
    const d4 = new Vec4(this.direction.x, this.direction.y, this.direction.z, 0);

    const to = mat.multiplyVec4(o4);
    const td = mat.multiplyVec4(d4).normalize();

    return new Ray(
      new Vec3(to.x, to.y, to.z),
      new Vec3(td.x, td.y, td.z)
    );
  }
}