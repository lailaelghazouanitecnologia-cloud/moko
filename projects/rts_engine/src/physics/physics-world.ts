import { Vec3 } from '../math/vec3';
import { RigidBody } from './rigid-body';
import { RaycastResult } from './raycast-result';
import { ContactResult } from './contact-result';

/**
 * Main physics simulation container that manages rigid bodies and performs
 * physics simulation steps including collision detection and resolution.
 */
export class PhysicsWorld {
    private gravity: Vec3;
    private bodies: RigidBody[];
    private timeStep: number;
    private maxSubSteps: number;
    private accumulator: number;

    constructor() {
        this.gravity = new Vec3(0, -9.81, 0);
        this.bodies = [];
        this.timeStep = 1 / 60;
        this.maxSubSteps = 4;
        this.accumulator = 0;
    }

    /**
     * Advances the physics simulation by the given time delta.
     * Uses fixed timestep with accumulator for stable simulation.
     * @param dt - Time delta in seconds
     * @throws {Error} If dt is negative or invalid
     */
    step(dt: number): void {
        if (typeof dt !== 'number' || isNaN(dt) || dt < 0) {
            throw new Error('Time delta must be a non-negative number');
        }

        this.accumulator += dt;
        const maxFrameTime = this.timeStep * this.maxSubSteps;

        if (this.accumulator > maxFrameTime) {
            this.accumulator = maxFrameTime;
        }

        while (this.accumulator >= this.timeStep) {
            this.integrateMotion(this.timeStep);
            this.detectCollisions();
            this.resolveCollisions();
            this.accumulator -= this.timeStep;
        }
    }

    /**
     * Adds a rigid body to the physics world.
     * @param body - The rigid body to add
     * @throws {Error} If body is null or undefined
     */
    addBody(body: RigidBody): void {
        if (!body) {
            throw new Error('Cannot add null or undefined body to physics world');
        }

        if (!this.bodies.includes(body)) {
            this.bodies.push(body);
            body.world = this;
        }
    }

    /**
     * Removes a rigid body from the physics world.
     * @param body - The rigid body to remove
     * @throws {Error} If body is null or undefined
     */
    removeBody(body: RigidBody): void {
        if (!body) {
            throw new Error('Cannot remove null or undefined body from physics world');
        }

        const index = this.bodies.indexOf(body);
        if (index !== -1) {
            this.bodies.splice(index, 1);
            body.world = null;
        }
    }

    /**
     * Casts a ray through the physics world and returns the first hit.
     * @param origin - Ray origin point
     * @param direction - Ray direction vector (will be normalized)
     * @returns Raycast result containing hit information
     * @throws {Error} If origin or direction is invalid
     */
    raycast(origin: Vec3, direction: Vec3): RaycastResult {
        if (!origin || !direction) {
            throw new Error('Origin and direction must be valid Vec3 objects');
        }

        if (direction.length() === 0) {
            throw new Error('Direction vector cannot be zero');
        }

        const result = new RaycastResult();
        result.hit = false;
        result.point = new Vec3();
        result.normal = new Vec3();
        result.distance = Infinity;
        result.body = null;

        const dir = direction.clone().normalize();
        let closestHit = Infinity;

        for (const body of this.bodies) {
            if (!body.collider || !body.enabled) continue;

            const hitInfo = this.raycastAgainstBody(origin, dir, body);
            if (hitInfo.hit && hitInfo.distance < closestHit) {
                closestHit = hitInfo.distance;
                result.hit = true;
                result.distance = hitInfo.distance;
                result.point = hitInfo.point.clone();
                result.normal = hitInfo.normal.clone();
                result.body = body;
            }
        }

        return result;
    }

    /**
     * Gets all current contact points between bodies in the world.
     * @returns Array of contact results
     */
    getContacts(): ContactResult[] {
        const contacts: ContactResult[] = [];

        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const bodyA = this.bodies[i];
                const bodyB = this.bodies[j];

                if (!bodyA.enabled || !bodyB.enabled) continue;
                if (bodyA.isStatic && bodyB.isStatic) continue;
                if (!bodyA.collider || !bodyB.collider) continue;

                const contact = this.generateContact(bodyA, bodyB);
                if (contact) {
                    contacts.push(contact);
                }
            }
        }

        return contacts;
    }

    /**
     * Removes all bodies from the physics world.
     */
    clear(): void {
        for (const body of this.bodies) {
            body.world = null;
        }
        this.bodies.length = 0;
    }

    /**
     * Updates the gravity vector for the physics world.
     * @param gravity - New gravity vector
     * @throws {Error} If gravity is null or undefined
     */
    setGravity(gravity: Vec3): void {
        if (!gravity) {
            throw new Error('Gravity must be a valid Vec3 object');
        }
        this.gravity.copy(gravity);
    }

    /**
     * Finds a body by its unique identifier.
     * @param id - The unique identifier to search for
     * @returns The found body or null if not found
     * @throws {Error} If id is not a string
     */
    getBody(id: string): RigidBody | null {
        if (typeof id !== 'string') {
            throw new Error('Body ID must be a string');
        }

        for (const body of this.bodies) {
            if (body.id === id) {
                return body;
            }
        }
        return null;
    }

    /**
     * Gets the current gravity vector.
     * @returns Current gravity vector
     */
    getGravity(): Vec3 {
        return this.gravity.clone();
    }

    /**
     * Gets all bodies in the physics world.
     * @returns Array of all rigid bodies
     */
    getBodies(): RigidBody[] {
        return [...this.bodies];
    }

    /**
     * Gets the number of bodies in the physics world.
     * @returns Body count
     */
    getBodyCount(): number {
        return this.bodies.length;
    }

    /**
     * Sets the fixed timestep for physics simulation.
     * @param timestep - New timestep in seconds
     * @throws {Error} If timestep is not positive
     */
    setTimeStep(timestep: number): void {
        if (typeof timestep !== 'number' || timestep <= 0) {
            throw new Error('Timestep must be a positive number');
        }
        this.timeStep = timestep;
    }

    /**
     * Gets the current fixed timestep.
     * @returns Current timestep in seconds
     */
    getTimeStep(): number {
        return this.timeStep;
    }

    /**
     * Integrates motion for all bodies using semi-implicit Euler integration.
     * @param dt - Time step for integration
     */
    private integrateMotion(dt: number): void {
        for (const body of this.bodies) {
            if (!body.enabled || body.isStatic) continue;

            const acceleration = new Vec3().copy(this.gravity);
            if (body.useGravity) {
                acceleration.add(body.force.clone().mulScalar(1 / body.mass));
            }

            const velocity = new Vec3().copy(body.velocity);
            velocity.add(acceleration.clone().mulScalar(dt));
            body.setVelocity(velocity);

            const position = new Vec3().copy(body.position);
            position.add(velocity.clone().mulScalar(dt));
            body.setPosition(position);

            body.force.set(0, 0, 0);
        }
    }

    /**
     * Performs raycast intersection test against a specific body.
     * @param origin - Ray origin
     * @param dir - Normalized ray direction
     * @param body - Body to test against
     * @returns Hit information
     */
    private raycastAgainstBody(origin: Vec3, dir: Vec3, body: RigidBody): RaycastResult {
        const result = new RaycastResult();
        result.hit = false;

        if (!body.collider) return result;

        const toBody = new Vec3().sub2(body.position, origin);
        const dot = toBody.dot(dir);

        if (dot < 0) return result;

        const closest = origin.clone().add(dir.clone().mulScalar(dot));
        const diff = new Vec3().sub2(closest, body.position);
        const distance = diff.length();

        if (body.collider.type === 'SPHERE') {
            const radius = body.collider.radius || 1.0;
            if (distance < radius) {
                const hitDistance = dot - Math.sqrt(radius * radius - distance * distance);
                if (hitDistance >= 0) {
                    result.hit = true;
                    result.distance = hitDistance;
                    result.point = origin.clone().add(dir.clone().mulScalar(hitDistance));
                    result.normal = new Vec3().sub2(result.point, body.position).normalize();
                }
            }
        } else if (body.collider.type === 'BOX') {
            const halfExtents = body.collider.halfExtents || new Vec3(0.5, 0.5, 0.5);
            const localOrigin = origin.clone().sub(body.position);
            const localDir = dir.clone();

            const invDir = new Vec3(
                1 / (localDir.x || 1e-6),
                1 / (localDir.y || 1e-6),
                1 / (localDir.z || 1e-6)
            );

            const t1 = (-halfExtents.x - localOrigin.x) * invDir.x;
            const t2 = (halfExtents.x - localOrigin.x) * invDir.x;
            const t3 = (-halfExtents.y - localOrigin.y) * invDir.y;
            const t4 = (halfExtents.y - localOrigin.y) * invDir.y;
            const t5 = (-halfExtents.z - localOrigin.z) * invDir.z;
            const t6 = (halfExtents.z - localOrigin.z) * invDir.z;

            const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
            const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

            if (tmin <= tmax && tmin >= 0) {
                const hitDistance = tmin;
                result.hit = true;
                result.distance = hitDistance;
                result.point = origin.clone().add(dir.clone().mulScalar(hitDistance));
                
                const center = body.position;
                const delta = new Vec3().sub2(result.point, center);
                const absX = Math.abs(delta.x);
                const absY = Math.abs(delta.y);
                const absZ = Math.abs(delta.z);

                if (absX >= absY && absX >= absZ) {
                    result.normal = new Vec3(Math.sign(delta.x), 0, 0);
                } else if (absY >= absZ) {
                    result.normal = new Vec3(0, Math.sign(delta.y), 0);
                } else {
                    result.normal = new Vec3(0, 0, Math.sign(delta.z));
                }
            }
        }

        return result;
    }

    /**
     * Generates contact information between two bodies.
     * @param bodyA - First body
     * @param bodyB - Second body
     * @returns Contact result or null if no contact
     */
    private generateContact(bodyA: RigidBody, bodyB: RigidBody): ContactResult | null {
        const distance = new Vec3().sub2(bodyB.position, bodyA.position).length();
        const radiusA = bodyA.collider?.radius || 0.5;
        const radiusB = bodyB.collider?.radius || 0.5;
        const combinedRadius = radiusA + radiusB;

        if (distance < combinedRadius) {
            const contact = new ContactResult();
            contact.bodyA = bodyA;
            contact.bodyB = bodyB;
            contact.point = new Vec3().add2(bodyA.position, bodyB.position).mulScalar(0.5);
            contact.normal = new Vec3().sub2(bodyB.position, bodyA.position).normalize();
            contact.penetration = combinedRadius - distance;
            contact.impulse = 0;
            return contact;
        }

        return null;
    }

    /**
     * Detects collisions between bodies in the world.
     * Populates internal collision data structures.
     */
    private detectCollisions(): void {
        // Collision detection is handled in getContacts() method
        // This method exists for future expansion of collision detection systems
    }

    /**
     * Resolves collisions by applying impulses and positional corrections.
     * Processes all active contacts to prevent interpenetration.
     */
    private resolveCollisions(): void {
        const contacts = this.getContacts();
        
        for (const contact of contacts) {
            if (!contact.bodyA || !contact.bodyB) continue;

            const relativeVelocity = contact.getRelativeVelocity();
            const separatingVelocity = relativeVelocity.dot(contact.normal);

            if (separatingVelocity > 0) continue;

            const restitution = Math.min(contact.bodyA.restitution, contact.bodyB.restitution);
            const separatingSpeed = -separatingVelocity;
            const newSeparatingSpeed = separatingSpeed * restitution;
            const deltaVelocity = newSeparatingSpeed - separatingSpeed;

            const totalInverseMass = (contact.bodyA.isStatic ? 0 : 1 / contact.bodyA.mass) +
                                   (contact.bodyB.isStatic ? 0 : 1 / contact.bodyB.mass);

            if (totalInverseMass <= 0) continue;

            const impulse = deltaVelocity / totalInverseMass;
            contact.impulse = impulse;

            const impulsePerMass = contact.normal.clone().mulScalar(impulse);

            if (!contact.bodyA.isStatic) {
                const velocityA = new Vec3().copy(contact.bodyA.velocity);
                velocityA.sub(impulsePerMass.clone().mulScalar(1 / contact.bodyA.mass));
                contact.bodyA.setVelocity(velocityA);
            }

            if (!contact.bodyB.isStatic) {
                const velocityB = new Vec3().copy(contact.bodyB.velocity);
                velocityB.add(impulsePerMass.clone().mulScalar(1 / contact.bodyB.mass));
                contact.bodyB.setVelocity(velocityB);
            }

            const totalPenetration = contact.penetration;
            const moveRatio = contact.bodyA.isStatic ? 1.0 :
                            contact.bodyB.isStatic ? 0.0 :
                            (1 / contact.bodyA.mass) / totalInverseMass;

            const correction = contact.normal.clone().mulScalar(totalPenetration * moveRatio * 0.5);

            if (!contact.bodyA.isStatic) {
                const posA = new Vec3().copy(contact.bodyA.position);
                posA.sub(correction);
                contact.bodyA.setPosition(posA);
            }

            if (!contact.bodyB.isStatic) {
                const posB = new Vec3().copy(contact.bodyB.position);
                posB.add(correction);
                contact.bodyB.setPosition(posB);
            }
        }
    }
}
