import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';
import { Mat4 } from '../math/mat4';
import { Skeleton } from './skeleton';

/**
 * Single skeletal joint.
 */
export class Bone {
  public name: string;
  public parent: number;
  public position: Vec3;
  public rotation: Quat;
  public scale: Vec3;

  /**
   * Creates a new Bone instance.
   * @param name - Bone identifier.
   * @param parent - Parent bone index (-1 for root).
   * @param position - Local position.
   * @param rotation - Local rotation.
   * @param scale - Local scale.
   */
  constructor(
    name: string = '',
    parent: number = -1,
    position: Vec3 = new Vec3(0, 0, 0),
    rotation: Quat = new Quat(0, 0, 0, 1),
    scale: Vec3 = new Vec3(1, 1, 1)
  ) {
    this.name = typeof name === 'string' ? name : '';
    this.parent = Number.isInteger(parent) && parent >= -1 ? parent : -1;
    this.position = position instanceof Vec3 ? position.clone() : new Vec3(0, 0, 0);
    this.rotation = rotation instanceof Quat ? rotation.clone() : new Quat(0, 0, 0, 1);
    this.scale = scale instanceof Vec3 ? scale.clone() : new Vec3(1, 1, 1);
  }

  /**
   * Computes the local TRS matrix.
   * @returns Local transform matrix.
   */
  getLocalTransform(): Mat4 {
    const matrix = new Mat4();
    matrix.setTRS(this.position, this.rotation, this.scale);
    return matrix;
  }

  /**
   * Computes the world-space transform matrix.
   * @param skeleton - Skeleton this bone belongs to.
   * @returns World transform matrix.
   * @throws {Error} If skeleton is invalid or parent index is out of range.
   */
  getWorldTransform(skeleton: Skeleton): Mat4 {
    if (!skeleton || typeof skeleton.getBone !== 'function') {
      throw new Error('Invalid skeleton provided to getWorldTransform');
    }

    const local = this.getLocalTransform();
    if (this.parent === -1) {
      return local;
    }

    const parentBone = skeleton.getBone(this.parent);
    if (!parentBone) {
      throw new Error(`Parent bone index ${this.parent} not found in skeleton`);
    }

    const parentWorld = parentBone.getWorldTransform(skeleton);
    const result = new Mat4();
    result.mul2(parentWorld, local);
    return result;
  }

  /**
   * Orients the bone to look at a target position.
   * @param target - World position to look at.
   * @param up - Up vector for orientation.
   * @throws {Error} If target or up vectors are invalid.
   */
  lookAt(target: Vec3, up: Vec3): void {
    if (!(target instanceof Vec3) || !(up instanceof Vec3)) {
      throw new Error('target and up must be Vec3 instances');
    }

    const m = new Mat4();
    Mat4.lookAt(this.position, target, up, m);
    const rotation = new Quat();
    rotation.setFromMat4(m);
    this.rotation.copy(rotation);
  }

  /**
   * Creates a deep copy of this bone.
   * @returns Cloned bone.
   */
  clone(): Bone {
    return new Bone(
      this.name,
      this.parent,
      this.position.clone(),
      this.rotation.clone(),
      this.scale.clone()
    );
  }

  /**
   * Sets the local position with validation.
   * @param v - New position vector.
   */
  setPosition(v: Vec3): void {
    if (!(v instanceof Vec3)) {
      throw new Error('Position must be a Vec3 instance');
    }
    this.position.copy(v);
  }

  /**
   * Sets the local rotation with validation.
   * @param q - New rotation quaternion.
   */
  setRotation(q: Quat): void {
    if (!(q instanceof Quat)) {
      throw new Error('Rotation must be a Quat instance');
    }
    this.rotation.copy(q);
  }

  /**
   * Sets the local scale with validation.
   * @param v - New scale vector.
   */
  setScale(v: Vec3): void {
    if (!(v instanceof Vec3)) {
      throw new Error('Scale must be a Vec3 instance');
    }
    this.scale.copy(v);
  }

  /**
   * Resets the bone to default transform.
   */
  reset(): void {
    this.position.set(0, 0, 0);
    this.rotation.set(0, 0, 0, 1);
    this.scale.set(1, 1, 1);
  }

  /**
   * Checks equality with another bone.
   * @param other - Bone to compare.
   * @returns True if all fields match.
   */
  equals(other: Bone): boolean {
    if (!(other instanceof Bone)) return false;
    return (
      this.name === other.name &&
      this.parent === other.parent &&
      this.position.equals(other.position) &&
      this.rotation.equals(other.rotation) &&
      this.scale.equals(other.scale)
    );
  }

  /**
   * Serializes the bone to a plain object.
   * @returns Plain object representation.
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      parent: this.parent,
      position: this.position.toJSON !== undefined ? this.position.toJSON() : { x: this.position.x, y: this.position.y, z: this.position.z },
      rotation: this.rotation.toJSON !== undefined ? this.rotation.toJSON() : { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z, w: this.rotation.w },
      scale: this.scale.toJSON !== undefined ? this.scale.toJSON() : { x: this.scale.x, y: this.scale.y, z: this.scale.z }
    };
  }

  /**
   * Reconstructs a bone from a plain object.
   * @param data - Serialized bone data.
   * @returns New Bone instance.
   * @throws {Error} If data is invalid.
   */
  static fromJSON(data: Record<string, any>): Bone {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid bone data for fromJSON');
    }
    const pos = new Vec3(data.position?.x ?? 0, data.position?.y ?? 0, data.position?.z ?? 0);
    const rot = new Quat(data.rotation?.x ?? 0, data.rotation?.y ?? 0, data.rotation?.z ?? 0, data.rotation?.w ?? 1);
    const scl = new Vec3(data.scale?.x ?? 1, data.scale?.y ?? 1, data.scale?.z ?? 1);
    return new Bone(data.name ?? '', data.parent ?? -1, pos, rot, scl);
  }
}