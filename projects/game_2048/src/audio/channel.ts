import { Sound } from './sound';

/**
 * Controls playback of a single sound
 */
export class Channel {
    private sound: Sound;
    private gain: GainNode;
    private panner: PannerNode;
    private isPlaying: boolean;
    private volume: number;
    private loop: boolean;
    private audioContext: AudioContext;
    private source: AudioBufferSourceNode | null = null;
    private startTime: number = 0;
    private pauseTime: number = 0;

    constructor(sound: Sound, audioContext: AudioContext) {
        if (!sound) {
            throw new Error('Sound parameter is required');
        }
        if (!audioContext) {
            throw new Error('AudioContext parameter is required');
        }

        this.sound = sound;
        this.audioContext = audioContext;
        this.volume = 1.0;
        this.loop = false;
        this.isPlaying = false;

        this.gain = audioContext.createGain();
        this.panner = audioContext.createPanner();
        
        this.gain.connect(this.panner);
        this.panner.connect(audioContext.destination);
    }

    /**
     * Start playback
     */
    play(): void {
        if (this.isPlaying) {
            this.stop();
        }

        if (!this.sound || !(this.sound as any).audioBuffer) {
            throw new Error('Invalid or missing audio buffer');
        }

        this.source = this.audioContext.createBufferSource();
        this.source.buffer = (this.sound as any).audioBuffer;
        this.source.loop = this.loop;
        this.source.playbackRate.value = 1.0;
        
        this.source.connect(this.gain);
        
        const offset = this.pauseTime;
        this.source.start(0, offset);
        this.startTime = this.audioContext.currentTime - offset;
        this.isPlaying = true;
        this.pauseTime = 0;

        this.source.onended = () => {
            if (!this.loop) {
                this.isPlaying = false;
                this.pauseTime = 0;
            }
        };
    }

    /**
     * Pause playback
     */
    pause(): void {
        if (!this.isPlaying || !this.source) return;
        
        this.pauseTime = this.getCurrentTime();
        this.source.stop();
        this.source = null;
        this.isPlaying = false;
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
    }

    /**
     * Set gain level
     * @param value Volume level (0.0 to 1.0+)
     */
    setVolume(value: number): void {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Volume must be a valid number');
        }
        this.volume = Math.max(0, value);
        this.gain.gain.value = this.volume;
    }

    /**
     * Toggle looping
     * @param enabled Enable or disable looping
     */
    setLoop(enabled: boolean): void {
        if (typeof enabled !== 'boolean') {
            throw new Error('Loop parameter must be a boolean');
        }
        this.loop = enabled;
        if (this.source) {
            this.source.loop = enabled;
        }
    }

    /**
     * Adjust playback rate
     * @param value Playback rate (1.0 = normal, 0.5 = half speed, 2.0 = double speed)
     */
    setPitch(value: number): void {
        if (typeof value !== 'number' || isNaN(value) || value <= 0) {
            throw new Error('Pitch must be a valid positive number');
        }
        if (this.source) {
            this.source.playbackRate.value = value;
        }
    }

    /**
     * Place in 3D space
     * @param x X-coordinate
     * @param y Y-coordinate
     * @param z Z-coordinate
     */
    setPosition(x: number, y: number, z: number): void {
        if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
            throw new Error('Position coordinates must be valid numbers');
        }
        this.panner.setPosition(x, y, z);
    }

    /**
     * Check playback state
     * @returns True if currently playing
     */
    isPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Get length in seconds
     * @returns Duration of the sound in seconds
     */
    getDuration(): number {
        return this.sound.getLength();
    }

    /**
     * Get playhead seconds
     * @returns Current playback position in seconds
     */
    getCurrentTime(): number {
        if (!this.isPlaying) {
            return this.pauseTime;
        }
        return this.audioContext.currentTime - this.startTime;
    }

    /**
     * Get the current volume
     * @returns Current volume level
     */
    getVolume(): number {
        return this.volume;
    }

    /**
     * Get the current loop state
     * @returns True if looping is enabled
     */
    getLoop(): boolean {
        return this.loop;
    }

    /**
     * Get the current playback rate
     * @returns Current playback rate
     */
    getPitch(): number {
        return this.source ? this.source.playbackRate.value : 1.0;
    }

    /**
     * Get the current position in 3D space
     * @returns Object with x, y, z coordinates
     */
    getPosition(): { x: number, y: number, z: number } {
        // Note: Web Audio API doesn't provide a direct getter for panner position
        // This is a limitation of the API
        return { x: 0, y:  0, z: 0 };
    }

    /**
     * Destroy the channel and clean up resources
     */
    destroy(): void {
        this.stop();
        this.gain.disconnect();
        this.panner.disconnect();
        this.source = null;
    }
}
