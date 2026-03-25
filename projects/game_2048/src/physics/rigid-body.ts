import { Vec3 } from '../math/vec3';

/**
 * A physical object with mass, position, velocity, and acceleration.
 * Supports basic Newtonian dynamics: forces, impulses, and integration.
 */
export class RigidBody {
    mass: number;
    position: Vec3;
    velocity: Vec3;
    acceleration: Vec3;
    angularVelocity: Vec3;
    isStatic: boolean;

    constructor() {
        this.mass = 1.0;
        this.position = new Vec3();
        this.velocity = new Vec3();
        this.acceleration = new Vec3();
        this.angularVelocity = new Vec3();
        this.isStatic = false;
    }

    /**
     * Apply a force to the body for the current frame.
     * Accumulates into acceleration (F = m·a).
     * @param force - Force vector in newtons
     * @throws {TypeError} If force is not a Vec3
     */
    applyForce(force: Vec3): void {
        if (!this.isValidVec3(force)) {
            throw new TypeError('force must be a Vec3');
        }
        if (this.isStatic) return;
        const forceOverMass = new Vec3();
        forceOverMass.copy(force).scale(1 / this.mass);
        this.acceleration.add(forceOverMass);
    }

    /**
     * Apply an instantaneous impulse to the body.
     * Directly modifies velocity (impulse = m·Δv).
     * @param impulse - Impulse vector in newton-seconds
     * @throws {TypeError} If impulse is not a Vec3
     */
    applyImpulse(impulse: Vec3): void {
        if (!this.isValidVec3(impulse)) {
            throw new TypeError('impulse must be a Vec3');
        }
        if (this.isStatic) return;
        const impulseOverMass = new Vec3();
        impulseOverMass.copy(impulse).scale(1 / this.mass);
        this.velocity.add(impulseOverMass);
    }

    /**
     * Integrate the body forward in time by dt seconds using Euler integration.
     * Updates position and velocity, then clears acceleration.
     * @param dt - Time step in seconds
     * @throws {RangeError} If dt is not finite or negative
     */
    integrate(dt: number): void {
        if (!Number.isFinite(dt) || dt < 0) {
            throw new RangeError('dt must be a non-negative finite number');
        }
        if (this.isStatic) return;
        const dtVec = new Vec3();
        dtVec.copy(this.velocity).scale(dt);
        this.position.add(dtVec);

        const dtAcc = new Vec3();
        dtAcc.copy(this.acceleration).scale(dt);
        this.velocity.add(dtAcc);

        this.acceleration.set(0, 0, 0);
    }

    /**
     * Set the mass of the body, clamped to a small positive value.
     * @param mass - New mass value
     * @throws {RangeError} If mass is not a finite positive number
     */
    setMass(mass: number): void {
        if (!Number.isFinite(mass) || mass <= 0) {
            throw new RangeError('mass must be a finite positive number');
        }
        this.mass = Math.max(0.0001, mass);
    }

    /**
     * Teleport the body to the given position.
     * @param pos - New position vector
     * @throws {TypeError} If pos is not a Vec3
     */
    setPosition(pos: Vec3): void {
        if (!this.isValidVec3(pos)) {
            throw new TypeError('pos must be a Vec3');
        }
        this.position.copy(pos);
    }

    /**
     * Override the current velocity.
     * @param vel - New velocity vector
     * @throws {TypeError} If vel is not a Vec3
     */
    setVelocity(vel: Vec3): void {
        if (!this.isValidVec3(vel)) {
            throw new TypeError('vel must be a Vec3');
        }
        this.velocity.copy(vel);
    }

    /**
     * Compute the kinetic energy of the body.
     * @returns Kinetic energy in joules
     */
    getKineticEnergy(): number {
        const v = this.velocity.length();
        return 0.5 * this.mass * v * v;
    }

    /**
     * Determine if the body is moving fast enough to be considered "awake".
     * @returns true if the squared speed exceeds a small threshold
     */
    isAwake(): boolean {
        const speedSq = this.velocity.lengthSquared();
        const threshold = 0.0001 * 0.0001;
        return speedSq > threshold;
    }

    /**
     * Validate that a value is a Vec3 instance.
     * @param obj - Object to check
     * @returns true if obj is a Vec3
     */
    private isValidVec3(obj: any): obj is Vec3 {
        return obj instanceof Vec3;
    }
}
