import { RigidBody } from './rigid-body';
import { Vec3 } from '../math/vec3';

/**
 * Represents collision contact data between two rigid bodies.
 */
export class ContactResult {
    bodyA: RigidBody;
    bodyB: RigidBody;
    point: Vec3;
    normal: Vec3;
    penetration: number;

    /**
     * Creates a new ContactResult instance.
     * @param bodyA - The first colliding body
     * @param bodyB - The second colliding body
     * @param point - The contact point in world coordinates
     * @param normal - The contact normal vector
     * @param penetration - The penetration depth
     * @throws {Error} If any parameter is invalid
     */
    constructor(bodyA: RigidBody, bodyB: RigidBody, point: Vec3, normal: Vec3, penetration: number) {
        this.validateConstructorParams(bodyA, bodyB, point, normal, penetration);
        
        this.bodyA = bodyA;
        this.bodyB = bodyB;
        this.point = point.clone();
        this.normal = normal.clone();
        this.penetration = penetration;
    }

    /**
     * Validates constructor parameters.
     * @private
     */
    private validateConstructorParams(bodyA: RigidBody, bodyB: RigidBody, point: Vec3, normal: Vec3, penetration: number): void {
        if (!bodyA || !bodyB) {
            throw new Error('Both bodyA and bodyB must be valid RigidBody instances');
        }
        
        if (bodyA === bodyB) {
            throw new Error('BodyA and BodyB cannot be the same object');
        }
        
        if (!point) {
            throw new Error('Point must be a valid Vec3 instance');
        }
        
        if (!normal) {
            throw new Error('Normal must be a valid Vec3 instance');
        }
        
        if (isNaN(penetration) || !isFinite(penetration)) {
            throw new Error('Penetration must be a valid number');
        }
        
        if (penetration < 0) {
            throw new Error('Penetration cannot be negative');
        }
    }

    /**
     * Gets the first colliding body.
     * @returns The first rigid body in the collision
     */
    getBodyA(): RigidBody {
        return this.bodyA;
    }

    /**
     * Gets the second colliding body.
     * @returns The second rigid body in the collision
     */
    getBodyB(): RigidBody {
        return this.bodyB;
    }

    /**
     * Gets the contact point in world coordinates.
     * @returns A clone of the contact point vector
     */
    getPoint(): Vec3 {
        return this.point.clone();
    }

    /**
     * Gets the contact normal vector.
     * @returns A clone of the contact normal vector
     */
    getNormal(): Vec3 {
        return this.normal.clone();
    }

    /**
     * Gets the penetration depth.
     * @returns The penetration depth
     */
    getPenetration(): number {
        return this.penetration;
    }

    /**
     * Checks if this contact result is valid.
     * @returns True if the contact data is valid
     */
    isValid(): boolean {
        return this.bodyA && this.bodyB && this.point && this.normal && 
               isFinite(this.penetration) && this.penetration >= 0;
    }

    /**
     * Creates a copy of this contact result.
     * @returns A new ContactResult instance with the same data
     */
    clone(): ContactResult {
        return new ContactResult(this.bodyA, this.bodyB, this.point, this.normal, this.penetration);
    }

    /**
     * Checks if this contact is between two specific bodies.
     * @param bodyA - First body to check
     * @param bodyB - Second body to check
     * @returns True if this contact involves both bodies
     */
    involvesBodies(bodyA: RigidBody, bodyB: RrectBody): boolean {
        if (!bodyA || !bodyB) {
            return false;
        }
        return (this.bodyA === bodyA && this.bodyB === bodyB) || 
               (this.bodyA === bodyB && this.bodyB === bodyA);
    }

    /**
     * Gets the relative velocity at the contact point.
     * @returns The relative velocity vector
     */
    getRelativeVelocity(): Vec3 {
        const va = this.bodyA.getLinearVelocity();
        const vb = this.bodyB.getLinearVelocity();
        return va.sub(vb);
    }

    /**
     * Gets the separating velocity (negative if approaching).
     * @returns The separating velocity
     */
    getSeparatingVelocity(): number {
        const relativeVel = this.getRelativeVelocity();
        return relativeVel.dot(this.normal);
    }
}
