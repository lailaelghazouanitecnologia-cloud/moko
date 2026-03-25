import { Vec3 } from '../math/vec3';
import { Listener } from './listener';

/**
 * 3D spatialized audio channel that supports positional audio, velocity-based
 * doppler simulation, directional cones, and distance-based attenuation.
 */
export class Channel3d {
    private position: Vec3;
    private velocity: Vec3;
    private direction: Vec3;
    private minDistance: number;
    private maxDistance: number;
    private coneInnerAngle: number;
    private coneOuterAngle: number;
    private coneOuterGain: number;

    private sound: any;
    private audioContext: AudioContext;
    private panner: PannerNode;
    private gain: GainNode;
    private volume: number;

    /**
     * Creates a new 3D audio channel.
     * @param sound - The sound resource to be played
     * @param audioContext - The AudioContext instance
     * @param position - Initial 3D position
     * @param velocity - Initial 3D velocity
     * @param direction - Initial facing direction
     */
    constructor(sound: any, audioContext: AudioContext, position: Vec3, velocity: Vec3, direction: Vec3) {
        if (!sound) throw new Error('Sound resource is required');
        if (!audioContext) throw new Error('AudioContext is required');
        if (!position || !velocity || !direction) throw new Error('Position, velocity, and direction vectors are required');

        this.sound = sound;
        this.audioContext = audioContext;
        this.volume = 1.0;

        this.position = new Vec3().copy(position);
        this.velocity = new Vec3().copy(velocity);
        this.direction = new Vec3().copy(direction);

        this.minDistance = 1.0;
        this.maxDistance = 10000.0;
        this.coneInnerAngle = 360.0;
        this.coneOuterAngle = 360.0;
        this.coneOuterGain = 0.0;

        this.initializeNodes();
    }

    /**
     * Initializes the Web Audio nodes required for 3D spatialization.
     */
    private initializeNodes(): void {
        this.panner = this.audioContext.createPanner();
        this.gain = this.audioContext.createGain();

        this.panner.panningModel = 'HRTF';
        this.panner.distanceModel = 'linear';
        this.panner.refDistance = this.minDistance;
        this.panner.maxDistance = this.maxDistance;
        this.panner.rolloffFactor = 1.0;
        this.panner.coneInnerAngle = this.coneInnerAngle;
        this.panner.coneOuterAngle = this.coneOuterAngle;
        this.panner.coneOuterGain = this.coneOuterGain;

        this.panner.positionX.setValueAtTime(this.position.x, this.audioContext.currentTime);
        this.panner.positionY.setValueAtTime(this.position.y, this.audioContext.currentTime);
        this.panner.positionZ.setValueAtTime(this.position.z, this.audioContext.currentTime);

        this.panner.orientationX.setValueAtTime(this.direction.data[0], this.audioContext.currentTime);
        this.panner.orientationY.setValueAtTime(this.direction.data[1], this.audioContext.currentTime);
        this.panner.orientationZ.setValueAtTime(this.direction.data[2], this.audioContext.currentTime);

        this.gain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    }

    /**
     * Sets the 3D position of the sound source.
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param z - Z coordinate
     */
    setPosition(x: number, y: number, z: number): void {
        if (!this.isValidCoordinate(x, y, z)) {
            throw new Error('Invalid coordinates provided');
        }

        this.position.set(x, y, z);
        this.panner.positionX.setValueAtTime(x, this.audioContext.currentTime);
        this.panner.positionY.setValueAtTime(y, this.audioContext.currentTime);
        this.panner.positionZ.setValueAtTime(z, this.audioContext.currentTime);
    }

    /**
     * Sets the doppler velocity of the sound source.
     * @param x - X velocity component
     * @param y - Y velocity component
     * @param z - Z velocity component
     */
    setVelocity(x: number, y: number, z: number): void {
        if (!this.isValidCoordinate(x, y, z)) {
            throw new Error('Invalid velocity components provided');
        }

        this.velocity.set(x, y, z);
        if (this.panner.positionX) {
            this.panner.positionX.setValueAtTime(x, this.audioContext.currentTime);
            this.panner.positionY.setValueAtTime(y, this.audioContext.currentTime);
            this.panner.positionZ.setValueAtTime(z, this.audioContext.currentTime);
        }
    }

    /**
     * Sets the facing direction of the sound source.
     * @param x - X direction component
     * @param y - Y direction component
     * @param z - Z direction component
     */
    setDirection(x: number, y: number, z: number): void {
        if (!this.isValidCoordinate(x, y, z)) {
            throw new Error('Invalid direction components provided');
        }

        this.direction.set(x, y, z);
        this.direction.normalize();
        this.panner.orientationX.setValueAtTime(this.direction.data[0], this.audioContext.currentTime);
        this.panner.orientationY.setValueAtTime(this.direction.data[1], this.audioContext.currentTime);
        this.panner.orientationZ.setValueAtTime(this.direction.data[2], this.audioContext.currentTime);
    }

    /**
     * Configures the sound cone for directional audio.
     * @param inner - Inner cone angle in degrees (0-360)
     * @param outer - Outer cone angle in degrees (0-360)
     * @param gain - Gain reduction for outer cone (0-1)
     */
    setCone(inner: number, outer: number, gain: number): void {
        if (!this.isValidAngle(inner) || !this.isValidAngle(outer)) {
            throw new Error('Cone angles must be between 0 and 360 degrees');
        }
        if (!this.isValidGain(gain)) {
            throw new Error('Cone outer gain must be between 0 and 1');
        }

        this.coneInnerAngle = inner;
        this.coneOuterAngle = outer;
        this.coneOuterGain = gain;

        this.panner.coneInnerAngle = this.coneInnerAngle;
        this.panner.coneOuterAngle = this.coneOuterAngle;
        this.panner.coneOuterGain = this.coneOuterGain;
    }

    /**
     * Sets the distance model parameters for falloff calculation.
     * @param min - Minimum distance (must be > 0)
     * @param max - Maximum distance (must be >= min)
     */
    setDistanceModel(min: number, max: number): void {
        if (!this.isValidDistance(min)) {
            throw new Error('Minimum distance must be greater than 0');
        }
        if (!this.isValidDistance(max) || max < min) {
            throw new Error('Maximum distance must be greater than or equal to minimum distance');
        }

        this.minDistance = min;
        this.maxDistance = max;

        this.panner.refDistance = this.minDistance;
        this.panner.maxDistance = this.maxDistance;
    }

    /**
     * Updates the 3D audio calculations based on listener position.
     * @param listener - The audio listener
     */
    update(listener: Listener): void {
        if (!listener) {
            throw new Error('Listener is required');
        }

        const listenerPos = listener.getPosition();
        if (!listenerPos) {
            throw new Error('Invalid listener position');
        }

        const distance = this.position.distance(listenerPos);
        
        if (distance > this.maxDistance) {
            this.gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            return;
        }
        
        if (distance < this.minDistance) {
            this.gain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            return;
        }
        
        const range = this.maxDistance - this.minDistance;
        const normalizedDistance = (distance - this.minDistance) / range;
        const attenuation = 1.0 - normalizedDistance;
        const finalGain = this.volume * attenuation;
        
        this.gain.gain.setValueAtTime(finalGain, this.audioContext.currentTime);
    }

    /**
     * Validates coordinate values.
     */
    private isValidCoordinate(x: number, y: number, z: number): boolean {
        return this.isValidNumber(x) && this.isValidNumber(y) && this.isValidNumber(z);
    }

    /**
     * Validates a single number value.
     */
    private isValidNumber(value: number): boolean {
        return typeof value === 'number' && isFinite(value);
    }

    /**
     * Validates angle values.
     */
    private isValidAngle(angle: number): boolean {
        return this.isValidNumber(angle) && angle >= 0 && angle <= 360;
    }

    /**
     * Validates gain values.
     */
    private isValidGain(gain: number): boolean {
        return this.isValidNumber(gain) && gain >= 0 && gain <= 1;
    }

    /**
     * Validates distance values.
     */
    private isValidDistance(distance: number): boolean {
        return this.isValidNumber(distance) && distance > 0;
    }

    /**
     * Gets the current position.
     */
    getPosition(): Vec3 {
        return this.position.clone();
    }

    /**
     * Gets the current velocity.
     */
    getVelocity(): Vec3 {
        return this.velocity.clone();
    }

    /**
     * Gets the current direction.
     */
    getDirection(): Vec3 {
        return this.direction.clone();
    }

    /**
     * Gets the minimum distance.
     */
    getMinDistance(): number {
        return this.minDistance;
    }

    /**
     * Gets the maximum distance.
     */
    getMaxDistance(): number {
        return this.maxDistance;
    }

    /**
     * Gets the cone inner angle.
     */
    getConeInnerAngle(): number {
        return this.coneInnerAngle;
    }

    /**
     * Gets the cone outer angle.
     */
    getConeOuterAngle(): number {
        return this.coneOuterAngle;
    }

    /**
     * Gets the cone outer gain.
     */
    getConeOuterGain(): number {
        return this.coneOuterGain;
    }

    /**
     * Sets the master volume for this channel.
     */
    setVolume(volume: number): void {
        if (!this.isValidGain(volume)) {
            throw new Error('Volume must be between 0 and 1');
        }
        this.volume = volume;
    }

    /**
     * Gets the master volume for this channel.
     */
    getVolume(): number {
        return this.volume;
    }

    /**
     * Connects this channel to an audio destination.
     */
    connect(destination: AudioNode): void {
        if (!destination) {
            throw new Error('Destination is required');
        }
        this.gain.connect(destination);
    }

    /**
     * Disconnects this channel from its current destination.
     */
    disconnect(): void {
        this.gain.disconnect();
    }

    /**
     * Gets the internal panner node for advanced configuration.
     */
    getPanner(): PannerNode {
        return this.panner;
    }

    /**
     * Gets the internal gain node for advanced configuration.
     */
    getGain(): GainNode {
        return this.gain;
    }
}
