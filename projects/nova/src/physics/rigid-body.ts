import { Entity } from '../scene';
import { Vec3, Mat4, BoundingBox } from '../math';

export class RigidBody {
    entity: Entity | null = null;
    mass: number = 1.0;
    linearVelocity: Vec3 = { x: 0, y: 0, z: 0 };
    angularVelocity: Vec3 = { x: 0, y: 0, z: 0 };
    linearDamping: number = 0.01;
    angularDamping: number = 0.01;
    restitution: number = 0.5;
    friction: number = 0.5;
    rollingFriction: number = 0.0;
    spinningFriction: number = 0.0;
    isKinematic: boolean = false;
    isStatic: boolean = false;
    isTrigger: boolean = false;
    linearFactor: Vec3 = { x: 1, y: 1, z: 1 };
    angularFactor: Vec3 = { x: 1, y: 1, z: 1 };

    private _sleeping: boolean = false;

    applyForce(force: Vec3, point?: Vec3): void {
        if (this.isStatic || this.isKinematic) return;
        
        if (point) {
            const r = {
                x: point.x - (this.entity?.getPosition()?.x || 0),
                y: point.y - (this.entity?.getPosition()?.y || 0),
                z: point.z - (this.entity?.getPosition()?.z || 0)
            };
            
            const torque = {
                x: r.y * force.z - r.z * force.y,
                y: r.z * force.x - r.x * force.z,
                z: r.x * force.y - r.y * force.x
            };
            
            this.applyTorque(torque);
        }
        
        const forceWithFactor = {
            x: force.x * this.linearFactor.x,
            y: force.y * this.linearFactor.y,
            z: force.z * this.linearFactor.z
        };
        
        const acceleration = {
            x: forceWithFactor.x / this.mass,
            y: forceWithFactor.y / this.mass,
            z: forceWithFactor.z / this.mass
        };
        
        this.linearVelocity.x += acceleration.x;
        this.linearVelocity.y += acceleration.y;
        this.linearVelocity.z += acceleration.z;
        
        this._sleeping = false;
    }

    applyImpulse(impulse: Vec3, point?: Vec3): void {
        if (this.isStatic || this.isKinematic) return;
        
        if (point) {
            const r = {
                x: point.x - (this.entity?.getPosition()?.x || 0),
                y: point.y - (this.entity?.getPosition()?.y || 0),
                z: point.z - (this.entity?.getPosition()?.z || 0)
            };
            
            const torqueImpulse = {
                x: r.y * impulse.z - r.z * impulse.y,
                y: r.z * impulse.x - r.x * impulse.z,
                z: r.x * impulse.y - r.y * impulse.x
            };
            
            this.applyTorqueImpulse(torqueImpulse);
        }
        
        const impulseWithFactor = {
            x: impulse.x * this.linearFactor.x,
            y: impulse.y * this.linearFactor.y,
            z: impulse.z * this.linearFactor.z
        };
        
        const velocityChange = {
            x: impulseWithFactor.x / this.mass,
            y: impulseWithFactor.y / this.mass,
            z: impulseWithFactor.z / this.mass
        };
        
        this.linearVelocity.x += velocityChange.x;
        this.linearVelocity.y += velocityChange.y;
        this.linearVelocity.z += velocityChange.z;
        
        this._sleeping = false;
    }

    applyTorque(torque: Vec3): void {
        if (this.isStatic || this.isKinematic) return;
        
        const torqueWithFactor = {
            x: torque.x * this.angularFactor.x,
            y: torque.y * this.angularFactor.y,
            z: torque.z * this.angularFactor.z
        };
        
        const angularAcceleration = {
            x: torqueWithFactor.x / this.mass,
            y: torqueWithFactor.y / this.mass,
            z: torqueWithFactor.z / this.mass
        };
        
        this.angularVelocity.x += angularAcceleration.x;
        this.angularVelocity.y += angularAcceleration.y;
        this.angularVelocity.z += angularAcceleration.z;
        
        this._sleeping = false;
    }

    applyTorqueImpulse(torque: Vec3): void {
        if (this.isStatic || this.isKinematic) return;
        
        const torqueWithFactor = {
            x: torque.x * this.angularFactor.x,
            y: torque.y * this.angularFactor.y,
            z: torque.z * this.angularFactor.z
        };
        
        const angularVelocityChange = {
            x: torqueWithFactor.x / this.mass,
            y: torqueWithFactor.y / this.mass,
            z: torqueWithFactor.z / this.mass
        };
        
        this.angularVelocity.x += angularVelocityChange.x;
        this.angularVelocity.y += angularVelocityChange.y;
        this.angularVelocity.z += angularVelocityChange.z;
        
        this._sleeping = false;
    }

    setLinearVelocity(velocity: Vec3): void {
        this.linearVelocity.x = velocity.x;
        this.linearVelocity.y = velocity.y;
        this.linearVelocity.z = velocity.z;
        this._sleeping = false;
    }

    setAngularVelocity(velocity: Vec3): void {
        this.angularVelocity.x = velocity.x;
        this.angularVelocity.y = velocity.y;
        this.angularVelocity.z = velocity.z;
        this._sleeping = false;
    }

    getLinearVelocity(): Vec3 {
        return { ...this.linearVelocity };
    }

    getAngularVelocity(): Vec3 {
        return { ...this.angularVelocity };
    }

    setMass(mass: number): void {
        this.mass = Math.max(0.001, mass);
    }

    getMass(): number {
        return this.mass;
    }

    setKinematic(kinematic: boolean): void {
        this.isKinematic = kinematic;
        if (kinematic) {
            this.isStatic = false;
            this.linearVelocity = { x: 0, y: 0, z: 0 };
            this.angularVelocity = { x: 0, y: 0, z: 0 };
        }
    }

    isKinematicBody(): boolean {
        return this.isKinematic;
    }

    setStatic(staticBody: boolean): void {
        this.isStatic = staticBody;
        if (staticBody) {
            this.isKinematic = false;
            this.linearVelocity = { x: 0, y: 0, z: 0 };
            this.angularVelocity = { x: 0, y: 0, z: 0 };
        }
    }

    isStaticBody(): boolean {
        return this.isStatic;
    }

    setTrigger(trigger: boolean): void {
        this.isTrigger = trigger;
    }

    isTriggerBody(): boolean {
        return this.isTrigger;
    }

    wakeUp(): void {
        this._sleeping = false;
    }

    putToSleep(): void {
        this._sleeping = true;
        this.linearVelocity = { x: 0, y: 0, z: 0 };
        this.angularVelocity = { x: 0, y: 0, z: 0 };
    }

    isSleeping(): boolean {
        return this._sleeping;
    }

    getWorldTransform(): Mat4 {
        if (!this.entity) {
            return new Mat4();
        }
        
        const pos = this.entity.getPosition();
        const rot = this.entity.getRotation();
        
        const transform = new Mat4();
        transform.setTRS(
            pos || { x: 0, y: 0, z: 0 },
            rot || { x: 0, y: 0, z: 0, w: 1 },
            { x: 1, y: 1, z: 1 }
        );
        
        return transform;
    }

    setWorldTransform(transform: Mat4): void {
        if (!this.entity) return;
        
        const translation = transform.getTranslation();
        const rotation = transform.getEulerAngles();
        
        this.entity.setPosition(translation);
        this.entity.setEulerAngles(rotation);
    }

    getAABB(): BoundingBox {
        if (!this.entity) {
            return new BoundingBox();
        }
        
        const pos = this.entity.getPosition() || { x: 0, y: 0, z: 0 };
        
        const aabb = new BoundingBox();
        aabb.center = { ...pos };
        aabb.halfExtents = { x: 0.5, y: 0.5, z: 0.5 };
        
        return aabb;
    }
}
