import { Vec3 } from '../math/Vec3';
import { Quat } from '../math/Quat';
import { Transform } from '../math/Transform';

export class RigidBody {
    private _mass: number = 1.0;
    private _inverseMass: number = 1.0;
    private _inertia: Vec3 = new Vec3(1, 1, 1);
    private _inverseInertia: Vec3 = new Vec3(1, 1, 1);
    private _linearDamping: number = 0.99;
    private _angularDamping: number = 0.99;
    private _position: Vec3 = new Vec3();
    private _orientation: Quat = new Quat();
    private _linearVelocity: Vec3 = new Vec3();
    private _angularVelocity: Vec3 = new Vec3();
    private _force: Vec3 = new Vec3();
    private _torque: Vec3 = new Vec3();
    private _isStatic: boolean = false;

    constructor(mass: number = 1.0) {
        this.mass = mass;
    }

    get mass(): number {
        return this._mass;
    }

    set mass(value: number) {
        this._mass = Math.max(0, value);
        this._inverseMass = this._mass > 0 ? 1.0 / this._mass : 0;
    }

    get inverseMass(): number {
        return this._inverseMass;
    }

    get inertia(): Vec3 {
        return this._inertia.clone();
    }

    set inertia(value: Vec3) {
        this._inertia = value.clone();
        this._inverseInertia = new Vec3(
            this._inertia.x !== 0 ? 1.0 / this._inertia.x : 0,
            this._inertia.y !== 0 ? 1.0 / this._inertia.y : 0,
            this._inertia.z !== 0 ? 1.0 / this._inertia.z : 0
        );
    }

    get inverseInertia(): Vec3 {
        return this._inverseInertia.clone();
    }

    get linearDamping(): number {
        return this._linearDamping;
    }

    set linearDamping(value: number) {
        this._linearDamping = Math.max(0, Math.min(1, value));
    }

    get angularDamping(): number {
        return this._angularDamping;
    }

    set angularDamping(value: number) {
        this._angularDamping = Math.max(0, Math.min(1, value));
    }

    get position(): Vec3 {
        return this._position.clone();
    }

    set position(value: Vec3) {
        this._position = value.clone();
    }

    get orientation(): Quat {
        return this._orientation.clone();
    }

    set orientation(value: Quat) {
        this._orientation = value.clone();
        this._orientation.normalize();
    }

    get linearVelocity(): Vec3 {
        return this._linearVelocity.clone();
    }

    set linearVelocity(value: Vec3) {
        this._linearVelocity = value.clone();
    }

    get angularVelocity(): Vec3 {
        return this._angularVelocity.clone();
    }

    set angularVelocity(value: Vec3) {
        this._angularVelocity = value.clone();
    }

    get isStatic(): boolean {
        return this._isStatic;
    }

    set isStatic(value: boolean) {
        this._isStatic = value;
        if (value) {
            this._mass = 0;
            this._inverseMass = 0;
            this._linearVelocity.set(0, 0, 0);
            this._angularVelocity.set(0, 0, 0);
        }
    }

    applyForce(force: Vec3, point?: Vec3): void {
        if (this._isStatic) return;

        this._force.add(force);

        if (point) {
            const r = point.sub(this._position);
            const torque = r.cross(force);
            this._torque.add(torque);
        }
    }

    applyTorque(torque: Vec3): void {
        if (this._isStatic) return;
        this._torque.add(torque);
    }

    applyImpulse(impulse: Vec3, point?: Vec3): void {
        if (this._isStatic) return;

        this._linearVelocity.add(impulse.mulScalar(this._inverseMass));

        if (point) {
            const r = point.sub(this._position);
            const angularImpulse = r.cross(impulse);
            angularImpulse.x *= this._inverseInertia.x;
            angularImpulse.y *= this._inverseInertia.y;
            angularImpulse.z *= this._inverseInertia.z;
            this._angularVelocity.add(angularImpulse);
        }
    }

    integrate(deltaTime: number): void {
        if (this._isStatic) return;

        const dt = deltaTime;

        const acceleration = this._force.mulScalar(this._inverseMass);
        this._linearVelocity.add(acceleration.mulScalar(dt));
        this._linearVelocity.mulScalar(this._linearDamping);

        const angularAcceleration = new Vec3(
            this._torque.x * this._inverseInertia.x,
            this._torque.y * this._inverseInertia.y,
            this._torque.z * this._inverseInertia.z
        );
        this._angularVelocity.add(angularAcceleration.mulScalar(dt));
        this._angularVelocity.mulScalar(this._angularDamping);

        this._position.add(this._linearVelocity.mulScalar(dt));

        if (this._angularVelocity.lengthSq() > 0) {
            const angle = this._angularVelocity.length() * dt;
            const axis = this._angularVelocity.clone().normalize();
            const rotation = new Quat();
            rotation.setFromAxisAngle(axis, angle);
            this._orientation = rotation.mul(this._orientation).normalize();
        }

        this._force.set(0, 0, 0);
        this._torque.set(0, 0, 0);
    }

    getTransform(): Transform {
        const transform = new Transform();
        transform.setPosition(this._position);
        transform.setRotation(this._orientation);
        return transform;
    }

    setTransform(transform: Transform): void {
        this._position = transform.getPosition().clone();
        this._orientation = transform.getRotation().clone();
    }

    getKineticEnergy(): number {
        if (this._isStatic) return 0;

        const linearKE = 0.5 * this._mass * this._linearVelocity.lengthSq();
        const angularKE = 0.5 * (
            this._inertia.x * this._angularVelocity.x * this._angularVelocity.x +
            this._inertia.y * this._angularVelocity.y * this._angularVelocity.y +
            this._inertia.z * this._angularVelocity.z * this._angularVelocity.z
        );
        return linearKE + angularKE;
    }

    setLinearDamping(damping: number): void {
        this.linearDamping = damping;
    }

    setAngularDamping(damping: number): void {
        this.angularDamping = damping;
    }

    getLinearDamping(): number {
        return this._linearDamping;
    }

    getAngularDamping(): number {
        return this._angularDamping;
    }

    getInertia(): Vec3 {
        return this.inertia;
    }

    setInertia(inertia: Vec3): void {
        this.inertia = inertia;
    }

    getMass(): number {
        return this._mass;
    }

    setMass(mass: number): void {
        this.mass = mass;
    }

    getLinearVelocity(): Vec3 {
        return this.linearVelocity;
    }

    setLinearVelocity(velocity: Vec3): void {
        this.linearVelocity = velocity;
    }

    getAngularVelocity(): Vec3 {
        return this.angularVelocity;
    }

    setAngularVelocity(velocity: Vec3): void {
        this.angularVelocity = velocity;
    }

    getPosition(): Vec3 {
        return this.position;
    }

    setPosition(position: Vec3): void {
        this.position = position;
    }

    getOrientation(): Quat {
        return this.orientation;
    }

    setOrientation(orientation: Quat): void {
        this.orientation = orientation;
    }
}
