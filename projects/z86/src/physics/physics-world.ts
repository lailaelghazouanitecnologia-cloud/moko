import { EventEmitter } from '../core';
import { Vec3, Mat4 } from '../math';
import { RigidBody } from './rigid-body';
import { Collider } from './collider';
import { ContactResult } from './contact-result';
import { RaycastResult } from './raycast-result';
import { Constraint } from './constraint';

export class PhysicsWorld extends EventEmitter {
    private bodies: RigidBody[] = [];
    private constraints: Constraint[] = [];
    private gravity: Vec3 = new Vec3(0, -9.81, 0);
    private timeStep: number = 1 / 60;
    private iterations: number = 10;

    constructor() {
        super();
    }

    step(deltaTime: number): void {
        const dt = Math.min(deltaTime, 0.033) * this.timeStep;

        for (const body of this.bodies) {
            if (body.isDynamic()) {
                const force = new Vec3().copy(this.gravity).mulScalar(body.getMass());
                body.applyForce(force);
                body.integrate(dt);
            }
        }

        for (let i = 0; i < this.iterations; i++) {
            this.solveConstraints();
            this.solveCollisions();
        }

        this.emit('step', dt);
    }

    addBody(body: RigidBody): void {
        if (this.bodies.indexOf(body) !== -1) return;
        this.bodies.push(body);
        body.setWorld(this);
        this.emit('body:added', body);
    }

    removeBody(body: RigidBody): void {
        const idx = this.bodies.indexOf(body);
        if (idx === -1) return;
        this.bodies.splice(idx, 1);
        body.setWorld(null);
        this.emit('body:removed', body);
    }

    addConstraint(constraint: Constraint): void {
        if (this.constraints.indexOf(constraint) !== -1) return;
        this.constraints.push(constraint);
        this.emit('constraint:added', constraint);
    }

    removeConstraint(constraint: Constraint): void {
        const idx = this.constraints.indexOf(constraint);
        if (idx === -1) return;
        this.constraints.splice(idx, 1);
        this.emit('constraint:removed', constraint);
    }

    raycast(from: Vec3, to: Vec3, options?: { mask?: number; exclude?: RigidBody[] }): RaycastResult | null {
        let closestHit: RaycastResult | null = null;
        let minDistance = Infinity;

        for (const body of this.bodies) {
            if (options?.exclude?.includes(body)) continue;
            const collider = body.getCollider();
            if (!collider) continue;

            const hit = collider.raycast(from, to);
            if (hit && hit.distance < minDistance) {
                minDistance = hit.distance;
                closestHit = hit;
            }
        }

        return closestHit;
    }

    raycastAll(from: Vec3, to: Vec3, options?: { mask?: number; exclude?: RigidBody[] }): RaycastResult[] {
        const hits: RaycastResult[] = [];

        for (const body of this.bodies) {
            if (options?.exclude?.includes(body)) continue;
            const collider = body.getCollider();
            if (!collider) continue;

            const hit = collider.raycast(from, to);
            if (hit) hits.push(hit);
        }

        hits.sort((a, b) => a.distance - b.distance);
        return hits;
    }

    checkCollisions(): ContactResult[] {
        const contacts: ContactResult[] = [];

        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const bodyA = this.bodies[i];
                const bodyB = this.bodies[j];

                const colliderA = bodyA.getCollider();
                const colliderB = bodyB.getCollider();

                if (!colliderA || !colliderB) continue;

                const contact = colliderA.intersects(colliderB);
                if (contact) {
                    contacts.push(contact);
                }
            }
        }

        return contacts;
    }

    setGravity(gravity: Vec3): void {
        this.gravity.copy(gravity);
    }

    getGravity(): Vec3 {
        return this.gravity;
    }

    getBodies(): RigidBody[] {
        return [...this.bodies];
    }

    getConstraints(): Constraint[] {
        return [...this.constraints];
    }

    private solveConstraints(): void {
        for (const constraint of this.constraints) {
            constraint.solve();
        }
    }

    private solveCollisions(): void {
        const contacts = this.checkCollisions();

        for (const contact of contacts) {
            const bodyA = contact.bodyA;
            const bodyB = contact.bodyB;

            if (bodyA.isKinematic() && bodyB.isKinematic()) continue;

            const restitution = 0.5;
            const friction = 0.5;

            const relativeVelocity = new Vec3().sub2(bodyA.getLinearVelocity(), bodyB.getLinearVelocity());
            const separatingVelocity = relativeVelocity.dot(contact.normal);

            if (separatingVelocity > 0) continue;

            const newSeparatingVelocity = -separatingVelocity * restitution;

            const deltaVelocity = newSeparatingVelocity - separatingVelocity;

            const totalInverseMass = bodyA.getInverseMass() + bodyB.getInverseMass();
            if (totalInverseMass <= 0) continue;

            const impulse = deltaVelocity / totalInverseMass;
            const impulsePerMass = contact.normal.clone().mulScalar(impulse);

            if (!bodyA.isKinematic()) {
                bodyA.setLinearVelocity(bodyA.getLinearVelocity().add(impulsePerMass.clone().mulScalar(bodyA.getInverseMass())));
            }
            if (!bodyB.isKinematic()) {
                bodyB.setLinearVelocity(bodyB.getLinearVelocity().sub(impulsePerMass.clone().mulScalar(bodyB.getInverseMass())));
            }

            const separation = contact.distance;
            if (separation < 0) {
                const totalInverseMass2 = bodyA.getInverseMass() + bodyB.getInverseMass();
                const movePerInverseMass = -separation / totalInverseMass2;

                const moveA = movePerInverseMass * bodyA.getInverseMass();
                const moveB = movePerInverseMass * bodyB.getInverseMass();

                if (!bodyA.isKinematic()) {
                    bodyA.getPosition().add(contact.normal.clone().mulScalar(moveA));
                }
                if (!bodyB.isKinematic()) {
                    bodyB.getPosition().sub(contact.normal.clone().mulScalar(moveB));
                }
            }
        }
    }
}
