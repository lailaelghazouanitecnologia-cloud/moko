import { Vec3 } from '../math/vec3';
import { Sound } from './sound';
import { Channel } from './channel';

/**
 * 3D spatialized audio channel
 */
export class Channel3d extends Channel {
    position: Vec3 = new Vec3();
    velocity: Vec3 = new Vec3();
    direction: Vec3 = new Vec3(0, 0, 1);
    minDistance: number = 1;
    maxDistance: number = 10000;
    volume: number = 1;
    pitch: number = 1;
    isLooping: boolean = false;
    isPlaying: boolean = false;

    private panner: PannerNode;
    private gain: GainNode;

    constructor(sound: Sound, audioContext: AudioContext) {
        super(sound, audioContext);
        
        this.panner = audioContext.createPanner();
        this.panner.panningModel = 'HRTF';
        this.panner.distanceModel = 'inverse';
        this.panner.refDistance = this.minDistance;
        this.panner.maxDistance = this.maxDistance;
        this.panner.rolloffFactor = 1;
        this.panner.coneInnerAngle = 360;
        this.panner.coneOuterAngle = 0;
        this.panner.coneOuterGain = 0;
        
        this.gain = audioContext.createGain();
        this.gain.gain.value = this.volume;
        
        this.panner.connect(this.gain);
        this.gain.connect(audioContext.destination);
    }

    /**
     * Set 3D position
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param z - Z coordinate
     */
    setPosition(x: number, y: number, z: number): void {
        if (!this.isValidCoordinate(x) || !this.isValidCoordinate(y) || !this.isValidCoordinate(z)) {
            throw new Error('Invalid coordinates provided');
        }

        this.position.set(x, y, z);
        this.panner.positionX.setValueAtTime(x, this.audioContext.currentTime);
        this.panner.positionY.setValueAtTime(y, this.audioContext.currentTime);
        this.panner.positionZ.setValueAtTime(z, this.audioContext.currentTime);
    }

    /**
     * Set doppler velocity
     * @param x - X velocity component
     *param y - Y velocity component
     * @param z - Z velocity component
     */
    setVelocity(x: number, y: number, z: number): void {
        if (!this.isValidCoordinate(x) || !this.isValidCoordinate(y) || !this.isValidCoordinate(z)) {
            throw new Error('Invalid velocity components provided');
        }

        this.velocity.set(x, y, z);
        this.panner.setVelocity(x, y, z);
    }

    /**
     * Set orientation vector
     * @param x - X direction component
     * @param y - Y direction component
     * @param z - Z direction component
     */
    setDirection(x: number, y: number, z: number): void {
        if (!this.isValidCoordinate(x) || !this.isValidCoordinate(y) || !this.isValidCoordinate(z)) {
            throw new Error('Invalid direction components provided');
        }

        this.direction.set(x, y, z);
        this.panner.orientationX.setValueAtTime(x, this.audioContext.currentTime);
        this.panner.orientationY.setValueAtTime(y, this.audioContext.currentTime);
        this.panner.orientationZ.setValueAtTime(z, this.audioContext.currentTime);
    }

    /**
     * Set gain 0-1
     * @param volume - Volume level (0-1)
     */
    setVolume(volume: number): void {
        if (!this.isValidNumber(volume)) {
            throw new Error('Invalid volume provided');
        }

        this.volume = Math.max(0, Math.min(1, volume));
        this.gain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    }

    /**
     * Set playback speed
     * @param pitch - Pitch value (0.5-2)
     */
    setPitch(pitch: number): void {
        if (!this.isValidNumber(pitch)) {
            throw new Error('Invalid pitch provided');
        }

        this.pitch = Math.max(0.5, Math.min(2, pitch));
        if (this.source) {
            this.source.playbackRate.setValueAtTime(this.pitch, this.audioContext.currentTime);
        }
    }

    /**
     * Start playback
     * @param sound - Sound to play
     */
    play(sound: Sound): void {
        if (!sound || !sound.buffer) {
            throw new Error('Invalid sound provided');
        }

        if (this.isPlaying) {
            this.stop();
        }
        
        this.sound = sound;
        this.isPlaying = true;
        
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = sound.buffer;
        this.source.loop = this.isLooping;
        this.source.playbackRate.value = this.pitch;
        
        this.source.connect(this.panner);
        
        this.startTime = this.audioContext.currentTime;
        this.pauseTime = 0;
        
        this.source.start(0, this.pauseTime);
        
        this.source.onended = () => {
            if (!this.isLooping) {
                this.isPlaying = false;
                this.source = null;
            }
        };
    }

    /**
     * Pause playback
     */
    pause(): void {
        if (!this.isPlaying || !this.source) return;
        
        this.source.stop();
        this.pauseTime = this.audioContext.currentTime - this.startTime;
        this.isPlaying = false;
        this.source = null;
    }

    /**
     * Stop and reset
     */
    stop(): void {
        if (this.source) {
            try {
                this.source.stop();
            } catch (error) {
                // Ignore errors if source is already stopped
            }
            this.source = null;
        }
        
        this.isPlaying = false;
        this.pauseTime = 0;
        this.startTime = 0;
    }

    /**
     * Toggle loop mode
     * @param loop - Loop state
     */
    setLooping(loop: boolean): void {
        this.isLooping = loop;
        if (this.source) {
            this.source.loop = loop;
        }
    }

    /**
     * Set attenuation model
     * @param model - Distance model ('linear', 'inverse', 'exponential')
     */
    setDistanceModel(model: string): void {
        const validModels = ['linear', 'inverse', 'exponential'];
        const normalizedModel = model.toLowerCase();
        
        if (!validModels.includes(normalizedModel)) {
            console.warn(`Invalid distance model: ${model}. Using 'inverse' as fallback.`);
            this.panner.distanceModel = 'inverse';
            return;
        }
        
        this.panner.distanceModel = normalizedModel as DistanceModelType;
    }

    /**
     * Set minimum distance for attenuation
     * @param distance - Minimum distance
     */
    setMinDistance(distance: number): void {
        if (!this.isValidNumber(distance) || distance < 0) {
            throw new Error('Invalid min distance provided');
        }

        this.minDistance = distance;
        this.panner.refDistance = distance;
    }

    /**
     * Set maximum distance for attenuation
     * @param distance - Maximum distance
     */
    setMaxDistance(distance: number): void {
        if (!this.isValidNumber(distance) || distance < 0) {
            throw new Error('Invalid max distance provided');
        }

        this.maxDistance = distance;
        this.panner.maxDistance = distance;
    }

    /**
     * Set rolloff factor for attenuation
     * @param factor - Rolloff factor
     */
    setRolloffFactor(factor: number): void {
        if (!this.isValidNumber(factor) || factor < 0) {
            throw new Error('Invalid rolloff factor provided');
        }

        this.panner.rolloffFactor = factor;
    }

    /**
     * Set cone angles for directional audio
     * @param innerAngle - Inner cone angle in degrees
     * @param outerAngle - Outer cone angle in degrees
     * @param outerGain - Gain for outer cone (0-1)
     */
    setConeAngles(innerAngle: number, outerAngle: number, outerGain: number = 0): void {
        if (!this.isValidNumber(innerAngle) || innerAngle < 0 || innerAngle > 360) {
            throw new Error('Invalid inner cone angle provided');
        }
        if (!this.isValidNumber(outerAngle) || outerAngle < 0 || outerAngle > 360) {
            throw new Error('Invalid outer cone angle provided');
        }
        if (!this.isValidNumber(outerGain) || outerGain < 0 || outerGain > 1) {
            throw new Error('Invalid outer cone gain provided');
        }

        this.panner.coneInnerAngle = innerAngle;
        this.panner.coneOuterAngle = outerAngle;
        this.panner.coneOuterGain = outerGain;
    }

    /**
     * Get current playback position in seconds
     * @returns Current playback position
     */
    getCurrentTime(): number {
        if (!this.isPlaying) return this.pauseTime;
        return this.audioContext.currentTime - this.startTime + this.pauseTime;
    }

    /**
     * Get total duration of current sound
     * @returns Duration in seconds or 0 if no sound loaded
     */
    getDuration(): number {
        return this.sound?.buffer?.duration || 0;
    }

    /**
     * Check if audio is playing
     * @returns True if playing
     */
    isCurrentlyPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Check if audio is looping
     * @returns True if looping
     */
        isCurrentlyLooping(): boolean {
        return this.isLooping;
    }

    /**
     * Get current volume
     * @returns Current volume (0-1)
     */
    getCurrentVolume(): number {
        return this.volume;
    }

    /**
     * Get current pitch
     * @returns Current pitch (0.5-2)
     */
    getCurrentPitch(): number {
        return this.pitch;
    }

    /**
     * Get current position
     * @returns Current position as Vec3
     */
    getCurrentPosition(): Vec3 {
        return this.position.clone();
    }

    /**
     * Get current velocity
     * @returns Current velocity as Vec3
     */
    getCurrentVelocity(): Vec3 {
        return this.velocity.clone();
    }

    /**
     * Get current direction
     * @returns Current direction as Vec3
     */
    getCurrentDirection(): Vec3 {
        return this.direction.clone();
    }

    /**
     * Destroy the channel and clean up resources
     */
    destroy(): void {
        this.stop();
        
        if (this.panner) {
            this.panner.disconnect();
        }
        
        if (this.gain) {
            this.gain.disconnect();
        }
        
        this.panner = null as any;
        this.gain = null as any;
    }

    /**
     * Validate if a number is valid
     * @param value - Number to validate
     * @returns True if valid
     */
    private isValidNumber(value: number): boolean {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    /**
     * Validate if a coordinate value is valid
     * @param value - Coordinate value to validate
     * @returns True if valid
     */
    private isValidCoordinate(value: number): boolean {
        return this.isValidNumber(value) && isFinite(value);
    }
}
