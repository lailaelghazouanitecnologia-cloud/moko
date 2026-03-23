import { Vec3, Quat } from '../math';
import { RigidBody } from './rigid-body';
import { Collider } from './collider';
import { ContactResult } from './contact-result';
import { RaycastResult } from './raycast-result';
import { RaycastOptions } from './raycast-options';

export class PhysicsWorld {
    gravity: Vec3 = new Vec3(0, -9.8, 0);
    bodies: RigidBody[] = [];
    colliders: Collider[] = [];
    contacts: ContactResult[] = [];
    timeStep: number = 1 / 60;
    maxSubSteps: number = 4;
    solverIterations: number = 10;

    step(deltaTime: number): void {
        const subStep = Math.min(deltaTime / this.maxSubSteps, this.timeStep);
        for (let i = 0; i < this.maxSubSteps; i++) {
            this.clearForces();
            this.integrateBodies(subStep);
            this.detectCollisions();
            this.resolveCollisions();
        }
    }

    private integrateBodies(dt: number): void {
        for (const body of this.bodies) {
            if (!body.isStatic) {
                body.velocity.add(this.gravity.clone().scale(dt));
                body.position.add(body.velocity.clone().scale(dt));
                body.angularVelocity.scale(0.98);
                body.rotation.mul(Quat.fromEuler(
                    body.angularVelocity.x * dt,
                    body.angularVelocity.y * dt,
                    body.angularVelocity.z * dt
                ));
            }
        }
    }

    private detectCollisions(): void {
        this.contacts = [];
        for (let i = 0; i < this.colliders.length; i++) {
            for (let j = i + 1; j < this.colliders.length; j++) {
                const contact = this.colliders[i].intersects(this.colliders[j]);
                if (contact) {
                    this.contacts.push(contact);
                }
            }
        }
    }

    private resolveCollisions(): void {
        for (const contact of this.contacts) {
            const bodyA = contact.bodyA;
            const bodyB = contact.bodyB;
            if (bodyA.isStatic && bodyB.isStatic) continue;

            const relativeVelocity = bodyB.velocity.clone().sub(bodyA.velocity);
            const separatingVelocity = relativeVelocity.dot(contact.normal);
            if (separatingVelocity > 0) continue;

            const restitution = Math.min(bodyA.restitution, bodyB.restitution);
            const deltaVelocity = -separatingVelocity * (1 + restitution);

            const totalInvMass = (bodyA.isStatic ? 0 : 1 / bodyA.mass) + (bodyB.isStatic ? 0 : 1 / bodyB.mass);
            if (totalInvMass === 0) continue;

            const impulse = deltaVelocity / totalInvMass;
            const impulseVector = contact.normal.clone().scale(impulse);

            if (!bodyA.isStatic) {
                bodyA.velocity.sub(impulseVector.clone().scale(1 / bodyA.mass));
            }
            if (!bodyB.isStatic) {
                bodyB.velocity.add(impulseVector.clone().scale(1 / bodyB.mass));
            }

            const separation = contact.penetration;
            if (separation > 0) {
                const totalInvMassSep = (bodyA.isStatic ? 0 : 1 / bodyA.mass) + (bodyB.isStatic ? 0 : 1 / bodyB.mass);
                const sepImpulse = separation / totalInvMassSep;
                const sepVector = contact.normal.clone().scale(sepImpulse * 0.5);

                if (!bodyA.isStatic) {
                    bodyA.position.sub(sepVector.clone().scale(1 / bodyA.mass));
                }
                if (!bodyB.isStatic) {
                    bodyB.position.add(sepVector.clone().scale(1 / bodyB.mass));
                }
            }
        }
    }

    addRigidBody(body: RigidBody): void {
        if (!this.bodies.includes(body)) {
            this.bodies.push(body);
        }
    }

    removeRigidBody(body: RigidBody): void {
        const index = this.bodies.indexOf(body);
        if (index !== -1) {
            this.bodies.splice(index, 1);
        }
    }

    addCollider(collider: Collider): void {
        if (!this.colliders.includes(collider)) {
            this.colliders.push(collider);
        }
    }

    removeCollider(collider: Collider): void {
        const index = this.colliders.indexOf(collider);
        if (index !== -1) {
            this.colliders.splice(index, 1);
        }
    }

    raycast(from: Vec3, to: Vec3, options?: RaycastOptions): RaycastResult[] {
        const results: RaycastResult[] = [];
        const direction = to.clone().sub(from);
        const distance = direction.length();
        direction.normalize();

        for (const collider of this.colliders) {
            const hit = collider.rayIntersect(from, direction, distance);
            if (hit && (!options?.filter || options.filter(hit))) {
                results.push(hit);
            }
        }

        results.sort((a, b) => a.distance - b.distance);
        return options?.maxHits ? results.slice(0, options.maxHits) : results;
    }

    raycastFirst(from: Vec3, to: Vec3, options?: RaycastOptions): RaycastResult | null {
        const results = this.raycast(from, to, options);
        return results.length > 0 ? results[0] : null;
    }

    sphereCast(center: Vec3, radius: number, direction: Vec3, distance: number): RaycastResult[] {
        const results: RaycastResult[] = [];
        direction.normalize();

        for (const collider of this.colliders) {
            const hits = collider.sphereIntersect(center, radius, direction, distance);
            results.push(...hits);
        }

        results.sort((a, b) => a.distance - b.distance);
        return results;
    }

    boxCast(center: Vec3, halfExtents: Vec3, orientation: Quat, direction: Vec3, distance: number): RaycastResult[] {
        const results: RaycastResult[] = [];
        direction.normalize();

        for (const collider of this.colliders) {
            const hits = collider.boxIntersect(center, halfExtents, orientation, direction, distance);
            results.push(...hits);
        }

        results.sort((a, b) => a.distance - b.distance);
        return results;
    }

    overlapSphere(center: Vec3, radius: number): Collider[] {
        const results: Collider[] = [];

        for (const collider of this.colliders) {
            if (collider.overlapsSphere(center, radius)) {
                results.push(collider);
            }
        }

        return results;
    }

    overlapBox(center: Vec3, halfExtents: Vec3, orientation: Quat): Collider[] {
        const results: Collider[] = [];

        for (const collider of this.colliders) {
            if (collider.overlapsBox(center, halfExtents, orientation)) {
                results.push(collider);
            }
        }

        return results;
    }

    setGravity(gravity: Vec3): void {
        this.gravity.copy(gravity);
    }

    getGravity(): Vec3 {
        return this.gravity.clone();
    }

    enableCCD(enabled: boolean): void {
        // Continuous collision detection placeholder
        // Implementation depends on physics backend
    }

    setSolverIterations(iterations: number): void {
        this.solverIterations = Math.max(1, iterations);
    }

    getContacts(): ContactResult[] {
        return [...this.contacts];
    }

    clearForces(): void {
        for (const body of this.bodies) {
            body.force.set(0, 0, 0);
            body.torque.set(0, 0, 0);
        }
    }
}
