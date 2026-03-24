import { Vec3 } from '../math/vec3';
import { Vec2 } from '../math/vec2';
import { RigidBody } from './rigid-body';

/**
 * Represents the result of a ray-cast operation.
 * Contains information about the intersection point, normal, distance, and the hit body.
 */
export class RaycastResult {
  private hit: boolean;
  private point: Vec3;
  private normal: Vec3;
  private distance: number;
  private body: RigidBody | null;
  private uv: Vec2 | null;
  private backFace: boolean;

  /**
   * Creates a new RaycastResult instance.
   * @param hit - Whether the ray intersected with an object.
   * @param point - The point of intersection in world space.
   * @param normal - The surface normal at the point of intersection.
   * @param distance - The distance from the ray origin to the intersection point.
   * @param body - The body that was hit, if any.
   */
  constructor(
    hit: boolean = false,
    point: Vec3 = new Vec3(),
    normal: Vec3 = new Vec3(),
    distance: number = 0,
    body: RigidBody | null = null
  ) {
    this.hit = hit;
    this.point = point;
    this.normal = normal;
    this.distance = distance;
    this.body = body;
    this.uv = null;
    this.backFace = false;
  }

  /**
   * Gets the UV coordinates at the hit point.
   * If no UV was set, returns a new Vec2(0, 0).
   * @returns The UV coordinates as a Vec2.
   */
  getUV(): Vec2 {
    if (!this.uv) {
      this.uv = new Vec2(0, 0);
    }
    return this.uv;
  }

  /**
   * Checks if the hit was on the back face of the triangle.
   * @returns True if the hit was on the back face, false otherwise.
   */
  isBackFace(): boolean {
    return this.backFace;
  }

  /**
   * Determines whether the ray hit anything.
   * @returns True if the ray intersected with an object, false otherwise.
   */
  getHit(): boolean {
    return this.hit;
  }

  /**
   * Sets whether the ray hit anything.
   * @param hit - True if the ray intersected with an object, false otherwise.
   */
  setHit(hit: boolean): void {
    this.validateBoolean('hit', hit);
    this.hit = hit;
  }

  /**
   * Gets the point of intersection in world space.
   * @returns The point of intersection as a Vec3.
   */
  getPoint(): Vec3 {
    return this.point;
  }

  /**
   * Sets the point of intersection in world space.
   * @param point - The new intersection point.
   */
  setPoint(point: Vec3): void {
    this.validateVec3('point', point);
    this.point = point;
  }

  /**
   * Gets the surface normal at the point of intersection.
   * @returns The surface normal as a Vec3.
   */
  getNormal(): Vec3 {
    return this.normal;
  }

  /**
   * Sets the surface normal at the point of intersection.
   * @param normal - The new surface normal.
   */
  setNormal(normal: Vec3): void {
    this.validateVec3('normal', normal);
    this.normal = normal;
  }

  /**
   * Gets the distance from the ray origin to the intersection point.
   * @returns The distance as a number.
   */
  getDistance(): number {
    return this.distance;
  }

  /**
   * Sets the distance from the ray input to the intersection point.
   * @param distance - The new distance.
   */
  setDistance(distance: number): void {
    this.validateNumber('distance', distance, true);
    this.distance = distance;
  }

  /**
   * Gets the body that was hit, if any.
   * @returns The hit body or null if no body was hit.
   */
  getBody(): RigidBody | null {
    return this.body;
  }

  /**
   * Sets the body that was hit.
   * @param body - The body that was hit, or null if no body was hit.
   */
  setBody(body: RigidBody | null): void {
    this.body = body;
  }

  /**
   * Sets the UV coordinates at the hit point.
   * @param uv - The new UV coordinates.
   */
  setUV(uv: Vec2): void {
    this.validateVec2('uv', uv);
    this.uv = uv;
  }

  /**
   * Sets whether the hit was on the back face of the triangle.
   * @param backFace - True if the hit was on the back face, false otherwise.
   */
  setBackFace(backFace: boolean): void {
    this.validateBoolean('backFace', backFace);
    this.backFace = backFace;
  }

  /**
   * Resets the raycast result to its default state.
   */
  reset(): void {
    this.hit = false;
    this.point.set(0, 0, 0);
    this.normal.set(0, 0, 0);
    this.distance = 0;
    this.body = null;
    this.uv = null;
    this.backFace = false;
  }

  /**
   * Copies the values from another RaycastResult.
   * @param other - The other RaycastResult to copy from.
   */
  copyFrom(other: RaycastResult): void {
    if (!other) {
      throw new Error('Cannot copy from null or undefined RaycastResult');
    }
    this.hit = other.hit;
    this.point.copy(other.point);
    this.normal.copy(other.normal);
    this.distance = other.distance;
    this.body = other.body;
    this.uv = other.uv ? new Vec2(other.uv.x, other.uv.y) : null;
    this.backFace = other.backFace;
  }

  /**
   * Clones this RaycastResult.
   * @returns A new copy of this RaycastResult.
   */
  clone(): RaycastResult {
    const cloned = new RaycastResult(
      this.hit,
      this.point.clone(),
      this.normal.clone(),
      this.distance,
      this.body
    );
    cloned.uv = this.uv ? new Vec2(this.uv.x, this.uv.y) : null;
    cloned.backFace = this.backFace;
    return cloned;
  }

  /**
   * Validates that a value is a boolean.
   * @param name - The name of the field being validated.
   * @param value - The value to validate.
   */
  private validateBoolean(name: string, value: boolean): void {
    if (typeof value !== 'boolean') {
      throw new TypeError(`Expected boolean for ${name}, got ${typeof value}`);
    }
  }

  /**
   * Validates that a value is a number and optionally non-negative.
   * @param name - The name of the field being validated.
   * @param value - The value to validate.
   * @param nonNegative - Whether the value must be non-negative.
   */
  private validateNumber(name: string, value: number, nonNegative: boolean = false): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new TypeError(`Expected number for ${name}, got ${typeof value}`);
    }
    if (nonNegative && value < 0) {
      throw new RangeError(`${name} must be non-negative, got ${value}`);
    }
  }

  /**
   * Validates that a value is a Vec3.
   * @param name - The name of the field being validated.
   * @param value - The value to validate.
   */
  private validateVec3(name: string, value: Vec3): void {
    if (!(value instanceof Vec3)) {
      throw new TypeError(`Expected Vec3 for ${name}, got ${value}`);
    }
  }

  /**
   * Validates that a value is a Vec2.
   * @param name - The name of the field being validated.
   * @param value - The value to validate.
   */
  private validateVec2(name: string, value: Vec2): void {
    if (!(value instanceof Vec2)) {
      throw new TypeError(`Expected Vec2 for ${name}, got ${value}`);
    }
  }
}