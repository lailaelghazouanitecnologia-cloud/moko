import { EventEmitter } from '../core/eventemitter';
import { RigidBody } from './rigidbody';
import { Collider } from './collider';
import { ContactResult } from './contactresult';
import { RaycastResult } from './raycastresult';
import { CollisionMesh } from './collisionmesh';
import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';

export class PhysicsWorld extends EventEmitter {
    private bodies: RigidBody[] = [];
    private gravity: Vec3 = new Vec3(0, -9.81, 0);
    private timeStep: number = 1 / 60;
    private maxSubSteps: number = 4;
    private fixedTimeStep: number = 1 / 60;

    constructor() {
        super();
    }

    step(deltaTime: number): void {
        let subSteps = 0;
        let remainingTime = deltaTime;

        while (remainingTime > 0 && subSteps < this.maxSubSteps) {
            const dt = Math.min(remainingTime, this.fixedTimeStep);
            this.integrate(dt);
            remainingTime -= dt;
            subSteps++;
        }
    }

    private integrate(dt: number): void {
        for (const body of this.bodies) {
            if (!body.isDynamic()) continue;

            const linearDamping = 0.995;
            const angularDamping = 0.995;

            const force = body.getForce().clone().add(this.gravity.clone().mulScalar(body.getMass()));
            const acceleration = force.divScalar(body.getMass());

            const velocity = body.getLinearVelocity().clone().add(acceleration.mulScalar(dt));
            velocity.mulScalar(linearDamping);
            body.setLinearVelocity(velocity);

            const position = body.getPosition().clone().add(velocity.mulScalar(dt));
            body.setPosition(position);

            const angularVelocity = body.getAngularVelocity().clone();
            angularVelocity.mulScalar(angularDamping);
            body.setAngularVelocity(angularVelocity);

            const rotation = body.getRotation().clone();
            const q = new Quat();
            q.setFromEulerAngles(angularVelocity.x * dt, angularVelocity.y * dt, angularVelocity.z * dt);
            rotation.mul(q).normalize();
            body.setRotation(rotation);
        }

        this.detectCollisions();
    }

    private detectCollisions(): void {
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const bodyA = this.bodies[i];
                const bodyB = this.bodies[j];

                if (!bodyA.isDynamic() && !bodyB.isDynamic()) continue;

                const contacts = this.narrowPhase(bodyA, bodyB);
                if (contacts.length > 0) {
                    this.resolveCollisions(contacts);
                }
            }
        }
    }

    private narrowPhase(bodyA: RigidBody, bodyB: RigidBody): ContactResult[] {
        const contacts: ContactResult[] = [];

        const collidersA = bodyA.getColliders();
        const collidersB = bodyB.getColliders();

        for (const colliderA of collidersA) {
            for (const colliderB of collidersB) {
                const contact = this.testCollision(colliderA, colliderB);
                if (contact) {
                    contacts.push(contact);
                }
            }
        }

        return contacts;
    }

    private testCollision(colliderA: Collider, colliderB: Collider): ContactResult | null {
        const posA = colliderA.getPosition();
        const posB = colliderB.getPosition();
        const distance = Vec3.distance(posA, posB);
        const radiusA = colliderA.getRadius();
        const radiusB = colliderB.getRadius();

        if (distance < radiusA + radiusB) {
            const normal = posB.clone().sub(posA).normalize();
            const penetration = radiusA + radiusB - distance;
            const contactPoint = posA.clone().add(normal.clone().mulScalar(radiusA - penetration * 0.5));
            return new ContactResult(colliderA, colliderB, contactPoint, normal, penetration);
        }

        return null;
    }

    private resolveCollisions(contacts: ContactResult[]): void {
        for (const contact of contacts) {
            const bodyA = contact.colliderA.getBody();
            const bodyB = contact.colliderB.getBody();

            if (!bodyA.isDynamic() && !bodyB.isDynamic()) continue;

            const relativeVelocity = bodyB.getLinearVelocity().clone().sub(bodyA.getLinearVelocity());
            const separatingVelocity = relativeVelocity.dot(contact.normal);

            if (separatingVelocity > 0) continue;

            const restitution = 0.5;
            const newSeparatingVelocity = -separatingVelocity * restitution;

            const deltaVelocity = newSeparatingVelocity - separatingVelocity;

            const massA = bodyA.isDynamic() ? bodyA.getMass() : Infinity;
            const massB = bodyB.isDynamic() ? bodyB.getMass() : Infinity;
            const totalMass = massA + massB;

            const impulse = deltaVelocity / totalMass;

            if (bodyA.isDynamic()) {
                const velocityA = bodyA.getLinearVelocity().clone().sub(contact.normal.clone().mulScalar(impulse * massB));
                bodyA.setLinearVelocity(velocityA);
            }

            if (bodyB.isDynamic()) {
                const velocityB = bodyB.getLinearVelocity().clone().add(contact.normal.clone().mulScalar(impulse * massA));
                bodyB.setLinearVelocity(velocityB);
            }

            const totalRadius = contact.colliderA.getRadius() + contact.colliderB.getRadius();
            const separationDist = contact.penetration / totalRadius;

            if (bodyA.isDynamic()) {
                const posA = bodyA.getPosition().clone().sub(contact.normal.clone().mulScalar(separationDist * massB / totalMass));
                bodyA.setPosition(posA);
            }

            if (bodyB.isDynamic()) {
                const posB = bodyB.getPosition().clone().add(contact.normal.clone().mulScalar(separationDist * massA / totalMass));
                bodyB.setPosition(posB);
            }
        }
    }

    addBody(body: RigidBody): void {
        if (this.bodies.includes(body)) return;
        this.bodies.push(body);
        body.setWorld(this);
    }

    removeBody(body: RigidBody): void {
        const index = this.bodies.indexOf(body);
        if (index !== -1) {
            this.bodies.splice(index, 1);
            body.setWorld(null);
        }
    }

    clear(): void {
        for (const body of this.bodies) {
            body.setWorld(null);
        }
        this.bodies.length = 0;
    }

    raycast(origin: Vec3, direction: Vec3): RaycastResult | null {
        direction.normalize();
        let closestHit: RaycastResult | null = null;
        let closestDistance = Infinity;

        for (const body of this.bodies) {
            const colliders = body.getColliders();
            for (const collider of colliders) {
                const center = collider.getPosition();
                const radius = collider.getRadius();

                const oc = origin.clone().sub(center);
                const a = direction.dot(direction);
                const b = 2.0 * oc.dot(direction);
                const c = oc.dot(oc) - radius * radius;
                const discriminant = b * b - 4 * a * c;

                if (discriminant >= 0) {
                    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
                    if (t >= 0 && t < closestDistance) {
                        closestDistance = t;
                        const hitPoint = origin.clone().add(direction.clone().mulScalar(t));
                        const normal = hitPoint.clone().sub(center).normalize();
                        closestHit = new RaycastResult(hitPoint, normal, t, body);
                    }
                }
            }
        }

        return closestHit;
    }

    setGravity(gravity: Vec3): void {
        this.gravity.copy(gravity);
    }

    getGravity(): Vec3 {
        return this.gravity.clone();
    }

    getBodies(): RigidBody[] {
        return this.bodies.slice();
    }
}
