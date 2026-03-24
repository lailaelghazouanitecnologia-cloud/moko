import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';
// UNRESOLVED: import { AABB } from '../math/aabb';
import { CollisionMesh } from './collision-mesh';

export enum ColliderType {
  SPHERE = 0,
  BOX = 1,
  CAPSULE = 2,
  CYLINDER = 3,
  CONE = 4,
  MESH = 5
}

export class Collider {
  private type: ColliderType;
  private offset: Vec3;
  private rotation: Quat;
  private mesh: CollisionMesh | null;

  constructor() {
    this.type = ColliderType.SPHERE;
    this.offset = new Vec3(0, 0, 0);
    this.rotation = new Quat(0, 0, 0, 1);
    this.mesh = null;
  }

  /**
   * Change the shape type of the collider
   * @param type - The collider type to set
   * @throws {Error} If type is not a valid ColliderType enum value
   */
  setType(type: ColliderType): void {
    if (!this.isValidColliderType(type)) {
      throw new Error(`Invalid collider type: ${type}`);
    }
    this.type = type;
  }

  /**
   * Move the collider relative to the rigid body
   * @param offset - The offset vector to apply
   * @throws {Error} If offset is null or undefined
   */
  setOffset(offset: Vec3): void {
    if (!offset) {
      throw new Error('Offset cannot be null or undefined');
    }
    this.offset.set(offset.x, offset.y, offset.z);
  }

  /**
   * Rotate the collider relative to the rigid body
   * @param rot - The rotation quaternion to apply
   * @throws {Error} If rot is null or undefined
   */
  setRotation(rot: Quat): void {
    if (!rot) {
      throw new Error('Rotation cannot be null or undefined');
    }
    this.rotation.set(rot.x, rot.y, rot.z, rot.w);
  }

  /**
   * Get the axis-aligned bounding box of the collider
   * @returns The AABB in world space
   */
  getAABB(): AABB {
    const aabb = new AABB();
    
    switch (this.type) {
      case ColliderType.SPHERE:
        aabb.setFromSphere(new Vec3(0, 0, 0), 0.5);
        break;
      case ColliderType.BOX:
        aabb.setFromSphere(new Vec3(0, 0, 0), 0.707);
        break;
      case ColliderType.CAPSULE:
        aabb.setFromSphere(new Vec3(0, 0, 0), 0.5);
        aabb.min.y -= 0.5;
        aabb.max.y += 0.5;
        break;
      case ColliderType.CYLINDER:
        aabb.setFromSphere(new Vec3(0, 0, 0), 0.5);
        aabb.min.y -= 0.5;
        aabb.max.y += 0.5;
        break;
      case ColliderType.CONE:
        aabb.setFromSphere(new Vec3(0, 0, 0), 0.5);
        aabb.min.y -= 0.5;
        aabb.max.y += 0.5;
        break;
      case ColliderType.MESH:
        if (this.mesh) {
          aabb.copy(this.mesh.getBounds());
        } else {
          aabb.setFromSphere(new Vec3(0, 0, 0), 0.5);
        }
        break;
      default:
        aabb.setFromSphere(new Vec3(0, 0, 0), 0.5);
        break;
    }
    
    aabb.min.add(this.offset);
    aabb.max.add(this.offset);
    
    return aabb;
  }

  /**
   * Set triangle mesh for mesh collider
   * @param mesh - The collision mesh to use
   * @throws {Error} If mesh is null or undefined
   */
  setMesh(mesh: CollisionMesh): void {
    if (!mesh) {
      throw new Error('Mesh cannot be null or undefined');
    }
    this.mesh = mesh;
    this.type = ColliderType.MESH;
  }

  /**
   * Calculate the volume of the collider
   * @returns The volume in cubic units
   */
  getVolume(): number {
    switch (this.type) {
      case ColliderType.SPHERE:
        return (4/3) * Math.PI * Math.pow(0.5, 3);
      case ColliderType.BOX:
        return 1;
      case ColliderType.CAPSULE:
        return Math.PI * Math.pow(0.5, 2) * (4/3 * 0.5 + 1);
      case ColliderType.CYLINDER:
        return Math.PI * Math.pow(0.5, 2) * 1;
      case ColliderType.CONE:
        return (1/3) * Math.PI * Math.pow(0.5, 2) * 1;
      case ColliderType.MESH:
        if (this.mesh) {
          const bounds = this.mesh.getBounds();
          const size = bounds.getSize();
          return size.x * size.y * size.z;
        }
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get the current collider type
   * @returns The current collider type
   */
  getType(): ColliderType {
    return this.type;
  }

  /**
   * Get the offset of the collider
   * @returns A copy of the offset vector
   */
  getOffset(): Vec3 {
    return new Vec3(this.offset.x, this.offset.y, this.offset.z);
  }

  /**
   * Get the rotation of the collider
   * @returns A copy of the rotation quaternion
   */
  getRotation(): Quat {
    return new Quat(this.rotation.x, this.rotation.y, this.rotation.z, this.rotation.w);
  }

  /**
   * Get the collision mesh if type is MESH
   * @returns The collision mesh or null if not a mesh collider
   */
  getMesh(): CollisionMesh | null {
    return this.mesh;
  }

  /**
   * Check if the collider is a mesh collider with valid mesh data
   * @returns True if mesh collider with valid mesh
   */
  hasMesh(): boolean {
    return this.type === ColliderType.MESH && this.mesh !== null;
  }

  /**
   * Reset the collider to default values
   */
  reset(): void {
    this.type = ColliderType.SPHERE;
    this.offset.set(0, 0, 0);
    this.rotation.set(0, 0, 0, 1);
    this.mesh = null;
  }

  /**
   * Create a deep copy of this collider
   * @returns A new collider instance with copied values
   */
  clone(): Collider {
    const clone = new Collider();
    clone.type = this.type;
    clone.offset.set(this.offset.x, this.offset.y, this.offset.z);
    clone.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z, this.rotation.w);
    clone.mesh = this.mesh;
    return clone;
  }

  /**
   * Check if two colliders are equivalent
   * @param other - The collider to compare with
   * @returns True if colliders are equivalent
   */
  equals(other: Collider): boolean {
    if (!other) return false;
    
    return this.type === other.type &&
           this.offset.equals(other.offset) &&
           this.rotation.equals(other.rotation) &&
           this.mesh === other.mesh;
  }

  /**
   * Validate if a value is a valid ColliderType enum value
   * @param type - The value to validate
   * @returns True if valid collider type
   * @private
   */
  private isValidColliderType(type: any): boolean {
    return Object.values(ColliderType).includes(type);
  }
}