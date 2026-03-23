import { Vec3 } from '../math/vec3';
import { RigidBody } from './rigidbody';

export class ContactResult {
    bodyA: RigidBody;
    bodyB: RigidBody;
    point: Vec3;
    normal: Vec3;
    impulse: number;
    distance: number;

    constructor(bodyA: RigidBody, bodyB: RigidBody, point: Vec3, normal: Vec3, impulse: number, distance: number) {
        this.bodyA = bodyA;
        this.bodyB = bodyB;
        this.point = point.clone();
        this.normal = normal.clone();
        this.impulse = impulse;
        this.distance = distance;
    }

    getBodyA(): RigidBody {
        return this.bodyA;
    }

    getBodyB(): RigidBody {
        return this.bodyB;
    }

    getPoint(): Vec3 {
        return this.point.clone();
    }

    getNormal(): Vec3 {
        return this.normal.clone();
    }

    getImpulse(): number {
        return this.impulse;
    }

    getDistance(): number {
        return this.distance;
    }

    setBodyA(body: RigidBody): void {
        this.bodyA = body;
    }

    setBodyB(body: RigidBody): void {
        this.bodyB = body;
    }

    setPoint(point: Vec3): void {
        this.point.copy(point);
    }

    setNormal(normal: Vec3): void {
        this.normal.copy(normal);
    }

    setImpulse(impulse: number): void {
        this.impulse = impulse;
    }

    setDistance(distance: number): void {
        this.distance = distance;
    }

    clone(): ContactResult {
        return new ContactResult(this.bodyA, this.bodyB, this.point, this.normal, this.impulse, this.distance);
    }

    copy(other: ContactResult): ContactResult {
        this.bodyA = other.bodyA;
        this.bodyB = other.bodyB;
        this.point.copy(other.point);
        this.normal.copy(other.normal);
        this.impulse = other.impulse;
        this.distance = other.distance;
        return this;
    }

    equals(other: ContactResult): boolean {
        return this.bodyA === other.bodyA &&
               this.bodyB === other.bodyB &&
               this.point.equals(other.point) &&
               this.normal.equals(other.normal) &&
               Math.abs(this.impulse - other.impulse) < 1e-6 &&
               Math.abs(this.distance - other.distance) < 1e-6;
    }

    toString(): string {
        return `ContactResult(bodyA: ${this.bodyA}, bodyB: ${this.bodyB}, point: ${this.point}, normal: ${this.normal}, impulse: ${this.impulse}, distance: ${this.distance})`;
    }
}
