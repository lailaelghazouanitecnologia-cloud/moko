import { Vec3 } from '../math/vec3';
import { RigidBody } from './rigid-body';
import { Collider } from './collider';
import { RaycastResult } from './raycast-result';
import { ContactResult } from './contact-result';

/**
 * Manages physics simulation and bodies.
 */
export class PhysicsWorld {
    gravity: Vec3;
    timeStep: number;
    bodies: RigidBody[];
    colliders: Collider[];

    /**
     * Creates a new PhysicsWorld instance with default gravity and timestep.
     */
    constructor() {
        this.gravity = new Vec3(0, -9.81, 0);
        this.timeStep = 1 / 60;
        this.bodies = [];
        this.colliders = [];
    }

    /**
     * Adds a rigid body to the physics world.
     * @param body - The rigid body to add.
     * @throws {Error} If body is null or undefined.
     */
    addRigidBody(body: RigidBody): void {
        if (!body) {
            throw new Error('Cannot add null or undefined rigid body to physics world');
        }
        const index = this.bodies.indexOf(body);
        if (index === -1) {
            this.bodies.push(body);
        }
    }

    /**
     * Removes a rigid body from the physics world.
     * @param body - The rigid body to remove.
     * @throws {Error} If body is null or undefined.
     */
    removeRigidBody(body: RigidBody): void {
        if (!body) {
            throw new Error('Cannot remove null or undefined rigid body from physics world');
        }
        const index = this.bodies.indexOf(body);
        if (index !== -1) {
            this.bodies.splice(index, 1);
        }
    }

    /**
     * Adds a collider to the physics world.
     * @param collider - The collider to add.
     * @throws {Error} If collider is null or undefined.
     */
    addCollider(collider: Collider): void {
        if (!collider) {
            throw new Error('Cannot add null or undefined collider to physics world');
        }
        const index = this.colliders.indexOf(collider);
        if (index === -1) {
            this.colliders.push(collider);
        }
    }

    /**
     * Removes a collider from the physics world.
     * @param collider - The collider to remove.
     * @throws {Error} If collider is null or undefined.
     */
    removeCollider(collider: Collider): void {
        if (!collider) {
            throw new Error('Cannot remove null or undefined collider from physics world');
        }
        const index = this.colliders.indexOf(collider);
        if (index !== -1) {
            this.colliders.splice(index, 1);
        }
    }

    /**
     * Advances the physics simulation by the given delta time.
     * @param deltaTime - The time elapsed since the last step.
     * @throws {Error} If deltaTime is negative or not a finite number.
     */
    step(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime < 0) {
            throw new Error('deltaTime must be a non-negative finite number');
        }
        const dt = deltaTime * this.timeStep;

        for (let i = 0; i < this.bodies.length; i++) {
            const body = this.bodies[i];
            if (!body.isStatic && body.isAwake()) {
                body.acceleration.copy(this.gravity);
                body.integrate(dt);
            }
        }

        const contacts = this.checkCollisions();
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const bodyA = contact.bodyA;
            const bodyB = contact.bodyB;

            if (!bodyA.isStatic && bodyA.isAwake()) {
                const impulse = contact.normal.clone().scale(contact.penetration * 0.5);
                bodyA.position.sub(impulse);
            }
            if (!bodyB.isStatic && bodyB.isAwake()) {
                const impulse = contact.normal.clone().scale(contact.penetration * 0.5);
                bodyB.position.add(impulse);
            }
        }
    }

    /**
     * Casts a ray through the physics world and returns the first hit.
     * @param origin - The starting point of the ray.
     * @param direction - The direction of the ray (will be normalized).
     * @returns A RaycastResult containing hit information.
     * @throws {Error} If origin or direction is null/undefined.
     */
    raycast(origin: Vec3, direction: Vec3): RaycastResult {
        if (!origin) {
            throw new Error('raycast origin cannot be null or undefined');
        }
        if (!direction) {
            throw new Error('raycast direction cannot be null or undefined');
        }
        const result = new RaycastResult();
        result.hit = false;
        result.point = new Vec3();
        result.normal = new Vec3();
        result.distance = Infinity;
        result.collider = null;

        direction.normalize();

        for (let i = 0; i < this.colliders.length; i++) {
            const collider = this.colliders[i];
            const colliderResult = collider.raycast(origin, direction);
            if (colliderResult.hit && colliderResult.distance < result.distance) {
                result.hit = true;
                result.point.copy(colliderResult.point);
                result.normal.copy(colliderResult.normal);
                result.distance = colliderResult.distance;
                result.collider = collider;
            }
        }

        return result;
    }

    /**
     * Checks all colliders for overlapping pairs and returns contact results.
     * @returns An array of ContactResult for all overlapping collider pairs.
     */
    checkCollisions(): ContactResult[] {
        const contacts: ContactResult[] = [];

        for (let i = 0; i < this.colliders.length; i++) {
            for (let j = i + 1; j < this.colliders.length; j++) {
                const colliderA = this.colliders[i];
                const colliderB = this.colliders[j];

                if (colliderA.testOverlap(colliderB)) {
                    const contactPoints = colliderA.computeContacts(colliderB);
                    for (let k = 0; k < contactPoints.length; k++) {
                        contacts.push(contactPoints[k]);
                    }
                }
            }
        }

        return contacts;
    }

    /**
     * Updates the world's gravity vector.
     * @param gravity - The new gravity vector.
     * @throws {Error} If gravity is null or undefined.
     */
    setGravity(gravity: Vec3): void {
        if (!gravity) {
            throw new Error('gravity cannot be null or undefined');
        }
        this.gravity.copy(gravity);
    }

    /**
     * Returns the current gravity vector.
     * @returns A clone of the current gravity vector.
     */
    getGravity(): Vec3 {
        return this.gravity.clone();
    }

    /**
     * Returns the number of active rigid bodies in the world.
     * @returns The count of rigid bodies.
     */
    getBodyCount(): number {
        return this.bodies.length;
    }

    /**
     * Returns the number of active colliders in the world.
     * @returns The count of colliders.
     */
    getColliderCount(): number {
        return this.colliders.length;
    }

    /**
     * Clears all bodies and colliders from the world.
     */
    clear(): void {
        this.bodies.length = 0;
        this.colliders.length = 0;
    }

    /**
     * Sets the internal time step used for integration.
     * @param timeStep - The new time step value (must be positive).
     * @throws {Error} If timeStep is not positive or not finite.
     */
    setTimeStep(timeStep: number): void {
        if (!Number.isFinite(timeStep) || timeStep <= 0) {
            throw new Error('timeStep must be a positive finite number');
        }
        this.timeStep = timeStep;
    }

    /**
     * Returns the current time step.
     * @returns The current time step value.
     */
    getTimeStep(): number {
        return this.timeStep;
    }
}
