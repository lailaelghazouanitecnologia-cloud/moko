import { Vec3 } from '../math/vec3';

/**
 * 3D audio listener that represents the position and orientation
 * of the listener in 3D space for spatial audio calculations.
 */
export class Listener {
    private _position: Vec3;
    private _forward: Vec3;
    private _up: Vec3;
    private _velocity: Vec3;
    private _volume: number;

    constructor() {
        this._position = new Vec3(0, 0, 0);
        this._forward = new Vec3(0, 0, -1);
        this._up = new Vec3(0, 1, 0);
        this._velocity = new Vec3(0, 0, 0);
        this._volume = 1.0;
    }

    /**
     * Update the position of the listener in 3D space.
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param z - Z coordinate
     * @throws {TypeError} If any coordinate is not a finite number
     */
    setPosition(x: number, y: number, z: number): void {
        this._validateCoordinate(x, 'x');
        this._validateCoordinate(y, 'y');
        this._validateCoordinate(z, 'z');
        this._position.set(x, y, z);
    }

    /**
     * Set the orientation of the listener.
     * @param fx - Forward vector X component
     * @param fy - Forward vector Y component
     * @param fz - Forward vector Z component
     * @param ux - Up vector X component
     * @param uy - Up vector Y component
     * @param uz - Up vector Z component
     * @throws {TypeError} If any component is not a finite number
     * @throws {Error} If forward and up vectors are parallel
     */
    setOrientation(fx: number, fy: number, fz: number, ux: number, uy: number, uz: number): void {
        this._validateCoordinate(fx, 'fx');
        this._validateCoordinate(fy, 'fy');
        this._validateCoordinate(fz, 'fz');
        this._validateCoordinate(ux, 'ux');
        this._validateCoordinate(uy, 'uy');
        this._validateCoordinate(uz, 'uz');

        const forward = new Vec3(fx, fy, fz);
        const up = new Vec3(ux, uy, uz);

        if (forward.length() === 0) {
            throw new Error('Forward vector cannot be zero');
        }
        if (up.length() === 0) {
            throw new Error('Up vector cannot be zero');
        }

        // Normalize vectors
        forward.normalize();
        up.normalize();

        // Check if vectors are parallel
        const dot = Math.abs(forward.dot(up));
        if (dot > 0.999) {
            throw new Error('Forward and up vectors cannot be parallel');
        }

        this._forward.copy(forward);
        this._up.copy(up);
    }

    /**
     * Update the velocity of the listener for Doppler effects.
     * @param vx - Velocity X component
     * @param vy - Velocity Y component
     * @param vz - Velocity Z component
     * @throws {TypeError} If any component is not a finite number
     */
    setVelocity(vx: number, vy: number, vz: number): void {
        this._validateCoordinate(vx, 'vx');
        this._validateCoordinate(vy, 'vy');
        this._validateCoordinate(vz, 'vz');
        this._velocity.set(vx, vy, vz);
    }

    /**
     * Adjust the master volume gain.
     * @param gain - Volume gain (0.0 to 1.0+)
     * @throws {TypeError} If gain is not a finite number
     * @throws {RangeError} If gain is negative
     */
    setVolume(gain: number): void {
        this._validateCoordinate(gain, 'gain');
        if (gain < 0) {
            throw new RangeError('Volume gain cannot be negative');
        }
        this._volume = gain;
    }

    /**
     * Get the current position of the listener.
     * @returns Clone of the position vector
     */
    getPosition(): Vec3 {
        return this._position.clone();
    }

    /**
     * Get the forward facing direction of the listener.
     * @returns Clone of the forward vector
     */
    getForward(): Vec3 {
        return this._forward.clone();
    }

    /**
     * Get the up direction of the listener.
     * @returns Clone of the up vector
     */
    getUp(): Vec3 {
        return this._up.clone();
    }

    /**
     * Get the current velocity of the listener.
     * @returns Clone of the velocity vector
     */
    getVelocity(): Vec3 {
        return this._velocity.clone();
    }

    /**
     * Get the current volume gain.
     * @returns Volume gain value
     */
    getVolume(): number {
        return this._volume;
    }

    /**
     * Reset the listener to default values.
     */
    reset(): void {
        this._position.set(0, 0, 0);
        this._forward.set(0, 0, -1);
        this._up.set(0, 1, 0);
        this._velocity.set(0, 0, 0);
        this._volume = 1.0;
    }

    /**
     * Validate that a coordinate value is a finite number.
     * @param value - The value to validate
     * @param name - The parameter name for error messages
     * @throws {TypeError} If value is not a finite number
     */
    private _validateCoordinate(value: number, name: string): void {
        if (!Number.isFinite(value)) {
            throw new TypeError(`${name} must be a finite number`);
        }
    }
}
