import { Vec3 } from '../math/vec3';

/**
 * 3D audio listener
 */
export class Listener {
    position: Vec3;
    forward: Vec3;
    up: Vec3;
    velocity: Vec3;
    volume: number;

    constructor() {
        this.position = new Vec3();
        this.forward = new Vec3(0, 0, -1);
        this.up = new Vec3(0, 1, 0);
        this.velocity = new Vec3();
        this.volume = 1.0;
    }

    /**
     * Update position
     * @param pos - The new position vector
     * @throws {TypeError} If pos is not a valid Vec3 instance
     */
    setPosition(pos: Vec3): void {
        if (!pos || !(pos instanceof Vec3)) {
            throw new TypeError('Position must be a valid Vec3 instance');
        }
        this.position.copy(pos);
    }

    /**
     * Set facing
     * @param fwd - The forward direction vector
     * @param up - The up direction vector
     * @throws {TypeError} If fwd or up are not valid Vec3 instances
     * @throws {Error} If fwd and up are parallel
     */
    setOrientation(fwd: Vec3, up: Vec3): void {
        if (!fwd || !(fwd instanceof Vec3)) {
            throw new TypeError('Forward vector must be a valid Vec3 instance');
        }
        if (!up || !(up instanceof Vec3)) {
            throw new TypeError('Up vector must be a valid Vec3 instance');
        }
        
        // Check if vectors are parallel (cross product should not be zero vector)
        const cross = new Vec3();
        Vec3.cross(cross, fwd, up);
        if (cross.length() < 0.0001) {
            throw new Error('Forward and up vectors cannot be parallel');
        }
        
        this.forward.copy(fwd);
        this.up.copy(up);
    }

    /**
     * Update velocity
     * @param vel - The velocity vector
     * @throws {TypeError} If vel is not a valid Vec3 instance
     */
    setVelocity(vel: Vec3): void {
        if (!vel || !(vel instanceof Vec3)) {
            throw new TypeError('Velocity must be a valid Vec3 instance');
        }
        this.velocity.copy(vel);
    }

    /**
     * Master volume
     * @param vol - The volume value (0.0 to 1.0+)
     * @throws {TypeError} If vol is not a number
     * @throws {RangeError} If vol is negative
     */
    setVolume(vol: number): void {
        if (typeof vol !== 'number') {
            throw new TypeError('Volume must be a number');
        }
        if (vol < 0) {
            throw new RangeError('Volume cannot be negative');
        }
        this.volume = vol;
    }

    /**
     * Get position
     * @returns A clone of the current position vector
     */
    getPosition(): Vec3 {
        return this.position.clone();
    }

    /**
     * Get forward
     * @returns A clone of the forward direction vector
     */
    getForward(): Vec3 {
        return this.forward.clone();
    }

    /**
     * Get up
     * @returns A clone of the up direction vector
     */
    getUp(): Vec3 {
        return this.up.clone();
    }

    /**
     * Get velocity
     * @returns A clone of the velocity vector
     */
    getVelocity(): Vec3 {
        return this.velocity.clone();
    }

    /**
     * Get volume
     * @returns The current volume value
     */
    getVolume(): number {
        return this.volume;
    }

    /**
     * Reset listener to default state
     */
    reset(): void {
        this.position.set(0, 0, 0);
        this.forward.set(0, 0, -1);
        this.up.set(0, 1, 0);
        this.velocity.set(0, 0, 0);
        this.volume = 1.0;
    }

    /**
     * Clone this listener
     * @returns A new Listener instance with copied values
     */
    clone(): Listener {
        const listener = new Listener();
        listener.position.copy(this.position);
        listener.forward.copy(this.forward);
        listener.up.copy(this.up);
        listener.velocity.copy(this.velocity);
        listener.volume = this.volume;
        return listener;
    }

    /**
     * Linearly interpolate between two listener states
     * @param target - The target listener state
     * @param t - Interpolation factor (0.0 to 1.0)
     * @throws {TypeError} If target is not a Listener instance
     * @throws {RangeError} If t is not between 0 and 1
     */
    lerp(target: Listener, t: number): void {
        if (!target || !(target instanceof Listener)) {
            throw new TypeError('Target must be a valid Listener instance');
        }
        if (typeof t !== 'number' || t < 0 || t > 1) {
            throw new RangeError('Interpolation factor must be between 0 and 1');
        }

        this.position.lerp(target.position, t);
        this.forward.lerp(target.forward, t);
        this.up.lerp(target.up, t);
        this.velocity.lerp(target.velocity, t);
        this.volume = this.volume + (target.volume - this.volume) * t;
    }

    /**
     * Check if this listener equals another
     * @param other - The other listener to compare
     * @param epsilon - Numerical tolerance for comparison
     * @returns True if all fields are equal within epsilon
     */
    equals(other: Listener, epsilon: number = 0.0001): boolean {
        if (!other || !(other instanceof Listener)) {
            return false;
        }
        return this.position.equals(other.position, epsilon) &&
               this.forward.equals(other.forward, epsilon) &&
               this.up.equals(other.up, epsilon) &&
               this.velocity.equals(other.velocity, epsilon) &&
               Math.abs(this.volume - other.volume) < epsilon;
    }

    /**
     * Get a string representation of the listener
     * @returns Formatted string with all values
     */
    toString(): string {
        return `Listener{
  position: ${this.position.toString()},
  forward: ${this.forward.toString()},
  up: ${this.up.toString()},
  velocity: ${this.velocity.toString()},
  volume: ${this.volume.toFixed(3)}
}`;
    }
}