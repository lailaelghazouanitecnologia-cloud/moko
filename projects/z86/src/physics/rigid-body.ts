import { Vec3 } from '../math';
import { EventEmitter } from '../core';

export class RigidBody extends EventEmitter {
    mass: number;
    position: Vec3;
    velocity: Vec3;
    force: Vec3;

    constructor(mass: number = 1.0, position: Vec3 = new Vec3()) {
        super();
        this.mass = mass;
        this.position = position.clone();
        this.velocity = new Vec3();
        this.force = new Vec3();
    }

    integrate(dt: number): void {
        const acceleration = new Vec3();
        if (this.mass > 0) {
            acceleration.copy(this.force).mulScalar(1 / this.mass);
        }
        this.velocity.add(acceleration.mulScalar(dt));
        this.position.add(this.velocity.clone().mulScalar(dt));
    }

    applyForce(force: Vec3): void {
        this.force.add(force);
    }
}
