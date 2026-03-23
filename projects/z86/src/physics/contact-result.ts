import { Vec3 } from '../math';
import { RigidBody } from './rigid-body';

export class ContactResult {
    bodyA: RigidBody;
    bodyB: RigidBody;
    point: Vec3;
    normal: Vec3;
    distance: number;
    impulse: number;

    constructor(bodyA: RigidBody, bodyB: RigidBody, point: Vec3, normal: Vec3, distance: number, impulse: number = 0) {
        this.bodyA = bodyA;
        this.bodyB = bodyB;
        this.point = new Vec3(point.x, point.y, point.z);
        this.normal = new Vec3(normal.x, normal.y, normal.z).normalize();
        this.distance = distance;
        this.impulse = impulse;
    }

    getBodyA(): RigidBody {
        return this.bodyA;
    }

    getBodyB(): RigidBody {
        return this.bodyB;
    }

    getPoint(): Vec3 {
        return new Vec3(this.point.x, this.point.y, this.point.z);
    }

    getNormal(): Vec3 {
        return new Vec3(this.normal.x, this.normal.y, this.normal.z);
    }

    getDistance(): number {
        return this.distance;
    }

    getImpulse(): number {
        return this.impulse;
    }

    setImpulse(impulse: number): void {
        this.impulse = impulse;
    }

    toJSON(): any {
        return {
            bodyA: this.bodyA ? this.bodyA.entity._guid : null,
            bodyB: this.bodyB ? this.bodyB.entity._guid : null,
            point: { x: this.point.x, y: this.point.y, z: this.point.z },
            normal: { x: this.normal.x, y: this.normal.y, z: this.normal.z },
            distance: this.distance,
            impulse: this.impulse
        };
    }

    static fromJSON(data: any, world: any): ContactResult {
        const bodyA = world.bodies.find((b: RigidBody) => b.entity._guid === data.bodyA);
        const bodyB = world.bodies.find((b: RigidBody) => b.entity._guid === data.bodyB);
        const point = new Vec3(data.point.x, data.point.y, data.point.z);
        const normal = new Vec3(data.normal.x, data.normal.y, data.normal.z);
        return new ContactResult(bodyA, bodyB, point, normal, data.distance, data.impulse);
    }
}
