import { RigidBody } from './rigid-body';
import { Vec3 } from '../math/vec3';

/**
 * Represents a contact point between two rigid bodies.
 * Stores all necessary information to resolve a collision.
 */
export class ContactResult {
  private bodyA: RigidBody;
  private bodyB: RigidBody;
  private point: Vec3;
  private normal: Vec3;
  private penetration: number;
  private impulse: number;

  /**
   * Creates a new contact result
   * @param bodyA First rigid body involved in the contact
   * @param bodyB Second rigid body involved in the contact
   * @param point Contact point in world coordinates
   * =param normal Contact normal vector pointing from bodyA to bodyB
   * @param penetration Depth of penetration (negative for separation)
   * @param impulse Accumulated impulse applied at this contact (default: 0)
   * @throws {Error} If bodies are null, vectors are invalid, or penetration is NaN
   */
  constructor(bodyA: RigidBody, bodyB: RigidBody, point: Vec3, normal: Vec3, penetration: number, impulse: number = 0) {
    this.validateConstructorInputs(bodyA, bodyB, point, normal, penetration, impulse);
    
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.point = new Vec3(point.x, point.y, pointn.z);
    this.normal = new Vec3(normal.x, normal.y, normal.z);
    this.penetration = penetration;
    this.impulse = impulse;
  }

  /**
   * Calculates the relative velocity at the contact point
   * @returns Relative velocity vector between the two bodies
   */
  getRelativeVelocity(): Vec3 {
    if (!this.bodyA || !this.bodyB) {
      throw new Error('Cannot calculate relative velocity: bodies are invalid');
    }

    const velA = this.bodyA.getVelocity();
    const velB = this.bodyB.getVelocity();
    
    const relative = new Vec3(
      velB.x - velA.x,
      velB.y - velA.y,
      velB.z - velA.z
    );
    
    return relative;
  }

  /**
   * Validates if this contact is still valid
   * @returns true if contact is still valid (bodies are touching and within reasonable distance)
   */
  isValid(): boolean {
    if (!this.bodyA || !this.bodyB || !this.point || !this.normal) {
      return false;
    }

    const posA = this.bodyA.getPosition();
    const posB = this.bodyB.getPosition();
    
    if (!posA || !posB) {
      return false;
    }
    
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const dz = posB.z - posA.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    const threshold = 0.001;
    return this.penetration > threshold && distance < 1000;
  }

  /**
   * Gets the first body involved in the contact
   * @returns RigidBody A
   */
  getBodyA(): RigidBody {
    return this.bodyA;
  }

  /**
   * Gets the second body involved in the contact
   * @returns RigidBody B
   */
  getBodyB(): RigidBody {
    return this.bodyB;
  }

  /**
   * Gets the contact point in world coordinates
   * @returns Copy of the contact point vector
   */
  getPoint(): Vec3 {
    return new Vec3(this.point.x, this.point.y, this.point.z);
  }

  /**
   * Gets the contact normal vector
   * @returns Copy of the normal vector pointing from bodyA to bodyB
   */
  getNormal(): Vec3 {
    return new Vec3(this.normal.x, this.normal.y, this.normal.z);
  }

  /**
   * Gets the penetration depth
   * @returns Penetration depth (negative values indicate separation)
   */
  getPenetration(): number {
    return this.penetration;
  }

  /**
   * Gets the accumulated impulse at this contact
   * @returns Current impulse value
   */
  getImpulse(): number {
    return this.impulse;
  }

  /**
   * Sets the accumulated impulse for this contact
   * @param impulse New impulse value
   * @throws {Error} If impulse is NaN or infinite
   */
  setImpulse(impulse: number): void {
    if (!isFinite(impulse)) {
      throw new Error('Impulse must be a finite number');
    }
    this.impulse = impulse;
  }

  /**
   * Validates constructor inputs
   * @private
   */
  private validateConstructorInputs(bodyA: RigidBody, bodyB: RigidBody, point: Vec3, normal: Vec3, penetration: number, impulse: number): void {
    if (!bodyA || !bodyB) {
      throw new Error('Both bodyA and bodyB must be valid RigidBody instances');
    }

    if (bodyA === bodyB) {
      throw new Error('BodyA and bodyB cannot be the same instance');
    }

    if (!point || !this.isValidVector(point)) {
      throw new Error('Point must be a valid Vec3');
    }

    if (!normal || !this.isValidVector(normal)) {
      throw new Error('Normal must be a valid Vec3');
    }

    if (!isFinite(penetration)) {
      throw new Error('Penetration must be a finite number');
    }

    if (!isFinite(impulse)) {
      throw new Error('Impulse must be a finite number');
    }
  }

  /**
   * Validates if a vector is valid (not NaN or infinite)
   * @private
   */
  private isValidVector(v: Vec3): boolean {
    return v && isFinite(v.x) && isFinite(v.y) && isFinite(v.z);
  }
}
