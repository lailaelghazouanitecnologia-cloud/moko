import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';
import { Collider } from './collider';

/**
 * Physics-simulated object that responds to forces and collisions.
 * Supports both dynamic and static states.
 */
export class RigidBody {
  private id: string;
  private position: Vec3;
  private rotation: Quat;
  private velocity: Vec3;
  private angularVelocity: Vec3;
  private mass: number;
  private isStatic: boolean;
  private collider: Collider | null;

  /**
   * Creates a new RigidBody instance.
   * @param id Unique identifier for this body.
   * @throws {Error} If id is not a non-empty string.
   */
  constructor(id: string) {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('RigidBody id must be a non-empty string');
    }
    this.id = id;
    this.position = new Vec3(0, 0, 0);
    this.rotation = new Quat(0, 0, 0, 1);
    this.velocity = new Vec3(0, 0, 0);
    this.angularVelocity = new Vec3(0, 0, 0);
    this.mass = 1.0;
    this.isStatic = false;
    this.collider = null;
  }

  /**
   * Applies a force to the body, optionally at a specific point to generate torque.
   * @param force Force vector to apply.
   * @param point Optional world-space point to apply the force at.
   * @throws {Error} If force is not a Vec3 or point is provided but not a Vec3.
   */
  applyForce(force: Vec3, point?: Vec3): void {
    if (this.isStatic) return;
    this.validateVec3(force, 'force');
    if (point !== undefined) this.validateVec3(point, 'point');

    if (point) {
      const r = new Vec3();
      r.sub2(point, this.position);
      const torque = new Vec3();
      torque.cross(r, force);
      this.angularVelocity.add(torque);
    }

    const acceleration = new Vec3();
    acceleration.copy(force).mulScalar(1 / this.mass);
    this.velocity.add(acceleration);
  }

  /**
   * Applies an instantaneous impulse to the body, optionally at a specific point.
   * @param impulse Impulse vector to apply.
   * @param point Optional world-space point to apply the impulse at.
   * @throws {Error} If impulse is not a Vec3 or point is provided but not a Vec3.
   */
  applyImpulse(impulse: Vec3, point?: Vec3): void {
    if (this.isStatic) return;
    this.validateVec3(impulse, 'impulse');
    if (point !== undefined) this.validateVec3(point, 'point');

    const deltaV = new Vec3();
    deltaV.copy(impulse).mulScalar(1 / this.mass);
    this.velocity.add(deltaV);

    if (point) {
      const r = new Vec3();
      r.sub2(point, this.position);
      const angularImpulse = new Vec3();
      angularImpulse.cross(r, impulse);
      this.angularVelocity.add(angularImpulse);
    }
  }

  /**
   * Teleports the body to a new position.
   * @param pos New world-space position.
   * @throws {Error} If pos is not a Vec3.
   */
  setPosition(pos: Vec3): void {
    this.validateVec3(pos, 'pos');
    this.position.copy(pos);
  }

  /**
   * Sets the body's rotation.
   * @param rot New rotation quaternion.
   * @throws {Error} If rot is not a Quat.
   */
  setRotation(rot: Quat): void {
    if (!(rot instanceof Quat)) {
      throw new Error('Rotation must be a Quat');
    }
    this.rotation.copy(rot);
  }

  /**
   * Sets the linear velocity of the body.
   * @param vel New velocity vector.
   * @throws {Error} If vel is not a Vec3.
   */
  setVelocity(vel: Vec3): void {
    this.validateVec3(vel, 'vel');
    this.velocity.copy(vel);
  }

  /**
   * Updates the mass of the body.
   * @param mass New mass value (clamped to minimum 0.001).
   * @throws {Error} If mass is not a finite number.
   */
  setMass(mass: number): void {
    if (!Number.isFinite(mass)) {
      throw new Error('Mass must be a finite number');
    }
    this.mass = Math.max(0.001, mass);
  }

  /**
   * Toggles the static state of the body.
   * When set to true, clears all current velocities.
   * @param isStatic New static state.
   */
  setStatic(isStatic: boolean): void {
    this.isStatic = Boolean(isStatic);
    if (this.isStatic) {
      this.velocity.set(0, 0, 0);
      this.angularVelocity.set(0, 0, 0);
    }
  }

  /**
   * Calculates the total kinetic energy of the body (linear + angular).
   * @returns Kinetic energy value.
   */
  getKineticEnergy(): number {
    const linearKE = 0.5 * this.mass * this.velocity.lengthSq();
    const angularKE = 0.5 * this.angularVelocity.lengthSq();
    return linearKE + angularKE;
  }

  /**
   * Clears all linear and angular velocities.
   */
  resetForces(): void {
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
  }

  /**
   * Returns the unique identifier of this body.
   * @returns The id string.
   */
  getId(): string {
    return this.id;
  }

  /**
   * Returns a clone of the current position vector.
   * @returns Copy of the position.
   */
  getPosition(): Vec3 {
    return this.position.clone();
  }

  /**
   * Returns a clone of the current rotation quaternion.
   * @returns Copy of the rotation.
   */
  getRotation(): Quat {
    return this.rotation.clone();
  }

  /**
   * Returns a clone of the current velocity vector.
   * @returns Copy of the velocity.
   */
  getVelocity(): Vec3 {
    return this.velocity.clone();
  }

  /**
   * Returns a clone of the current angular velocity vector.
   * @returns Copy of the angular velocity.
   */
  getAngularVelocity(): Vec3 {
    return this.angularVelocity.clone();
  }

  /**
   * Returns the mass of the body.
   * @returns Mass value.
   */
  getMass(): number {
    return this.mass;
  }

  /**
   * Returns whether the body is static.
   * @returns True if static, false otherwise.
   */
  getStatic(): boolean {
    return this.isStatic;
  }

  /**
   * Assigns a collider to this body.
   * @param collider Collider instance or null to remove.
   */
  setCollider(collider: Collider | null): void {
    this.collider = collider;
  }

  /**
   * Returns the current collider, if any.
   * @returns Collider or null.
   */
  getCollider(): Colller | null {
    return this.collider;
  }

  /**
   * Validates that a value is a Vec3 instance.
   * @param value Value to validate.
   * @param name Name of the parameter for error messages.
   * @throws {Error} If value is not a Vec3.
   */
  private validateVec3(value: any, name: string): void {
    if (!(value instanceof Vec3)) {
      throw new Error(`${name} must be a Vec3`);
    }
  }
}
