/**
 * Represents an audio asset with playback controls
 */
export class Sound {
    name: string;
    duration: number;
    sampleRate: number;
    channels: number;
    private audioBuffer: AudioBuffer | null = null;
    private audioManager: AudioManager;
    private instances: Set<Channel> = new Set();
    private _volume: number = 1.0;
    private _pitch: number = 1.0;

    constructor(name: string, duration: number, sampleRate: number, channels: number, audioBuffer: AudioBuffer, audioManager: AudioManager) {
        this.validateConstructorParams(name, duration, sampleRate, channels, audioBuffer, audioManager);
        
        this.name = name;
        this.duration = duration;
        this.sampleRate = sampleRate;
        this.channels = channels;
        this.audioBuffer = audioBuffer;
        this.audioManager = audioManager;
    }

    /**
     * Start playback
     * @returns {Channel} The channel instance for this playback
     * @throws {Error} If audio manager fails to play the sound
     */
    play(): Channel {
        try {
            const channel = this.audioManager.play(this);
            if (!channel) {
                throw new Error('Failed to create playback channel');
            }
            this.instances.add(channel);
            return channel;
        } catch (error) {
            throw new Error(`Failed to play sound '${this.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Start 3D playback
     * @param {number} x - X coordinate in 3D space
     * @param {number} y - Y coordinate in 3D space
     * @param {number} z - Z coordinate in 3D space
     * @returns {Channel3d} The 3D channel instance for this playback
     * @throws {Error} If audio manager fails to play the sound in 3D
     */
    play3d(x: number, y: number, z: number): Channel3d {
        this.validateCoordinates(x, y, z);
        
        try {
            const channel = this.audioManager.play3d(this, x, y, z);
            if (!channel) {
                throw new Error('Failed to create 3D playback channel');
            }
            this.instances.add(channel);
            return channel as Channel3d;
        } catch (error) {
            throw new Error(`Failed to play sound '${this.name}' in 3D: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Stop all instances
     */
    stop(): void {
        try {
            for (const channel of this.instances) {
                try {
                    channel.stop();
                } catch (error) {
                    console.warn(`Failed to stop channel for sound '${this.name}':`, error);
                }
            }
            this.instances.clear();
        } catch (error) {
            console.error(`Error stopping sound '${this.name}':`, error);
        }
    }

    /**
     * Adjust loudness
     * @param {number} volume - Volume level (0.0 to 1.0+)
     */
    setVolume(volume: number): void {
        this.validateVolume(volume);
        
        this._volume = Math.max(0, volume);
        for (const channel of this.instances) {
            try {
                channel.setVolume(this._volume);
            } catch (error) {
                console.warn(`Failed to set volume for channel:`, error);
            }
        }
    }

    /**
     * Adjust speed
     * @param {number} pitch - Pitch multiplier (0.1 to 4.0+)
     */
    setPitch(pitch: number): void {
        this.validatePitch(pitch);
        
        this._pitch = Math.max(0.1, pitch);
        for (const channel of this.instances) {
            try {
                channel.setPitch(this._pitch);
            } catch (error) {
                console.warn(`Failed to set pitch for channel:`, error);
            }
        }
    }

    /**
     * Get duration
     * @returns {number} Duration in seconds
     */
    getLength(): number {
        return this.duration;
    }

    /**
     * Check active
     * @returns {boolean} True if any instance is playing
     */
    isPlaying(): boolean {
        try {
            for (const channel of this.instances) {
                if (channel && channel.isPlaying && channel.isPlaying()) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.warn(`Error checking if sound '${this.name}' is playing:`, error);
            return false;
        }
    }

    /**
     * Get the audio buffer
     * @returns {AudioBuffer | null} The audio buffer or null if not loaded
     */
    getAudioBuffer(): AudioBuffer | null {
        return this.audioBuffer;
    }

    /**
     * Remove an instance from tracking
     * @param {Channel} channel - The channel to remove
     */
    removeInstance(channel: Channel): void {
        if (channel) {
            this.instances.delete(channel);
        }
    }

    /**
     * Get the current volume
     * @returns {number} Current volume level
     */
    getVolume(): number {
        return this._volume;
    }

    /**
     * Get the current pitch
     * @returns {number} Current pitch multiplier
     */
    getPitch(): number {
        return this._pitch;
    }

    /**
     * Get the number of active instances
     * @returns {number} Number of playing instances
     */
    getInstanceCount(): number {
        return this.instances.size;
    }

    /**
     * Stop and remove a specific instance
     * @param {Channel} channel - The channel to stop and remove
     */
    stopInstance(channel: Channel): void {
        if (channel && this.instances.has(channel)) {
            try {
                channel.stop();
                this.instances.delete(channel);
            } catch (error) {
                console.warn(`Failed to stop instance:`, error);
            }
        }
    }

    /**
     * Stop all instances and clear the buffer
     */
    dispose(): void {
        this.stop();
        this.audioBuffer = null;
        this.instances.clear();
    }

    /**
     * Validate constructor parameters
     */
    private validateConstructorParams(name: string, duration: number, sampleRate: number, channels: number, audioBuffer: AudioBuffer, audioManager: AudioManager): void {
        if (!name || typeof name !== 'string') {
            throw new Error('Invalid sound name: must be a non-empty string');
        }
        if (typeof duration !== 'number' || duration <= 0 || !isFinite(duration)) {
            throw new Error('Invalid duration: must be a positive finite number');
        }
        if (typeof sampleRate !== 'number' || sampleRate <= 0 || !isFinite(sampleRate)) {
            throw new Error('Invalid sample rate: must be a positive finite number');
        }
        if (typeof channels !== 'number' || channels < 1 || !Number.isInteger(channels)) {
            throw new Error('Invalid channels: must be a positive integer');
        }
        if (!audioBuffer) {
            throw new Error('Invalid audio buffer: cannot be null');
        }
        if (!audioManager) {
            throw new Error('Invalid audio manager: cannot be null');
        }
    }

    /**
     * Validate volume parameter
     */
    private validateVolume(volume: number): void {
        if (typeof volume !== 'number' || !isFinite(volume)) {
            throw new Error('Invalid volume: must be a finite number');
        }
    }

    /**
     * Validate pitch parameter
     */
    private validatePitch(pitch: number): void {
        if (typeof pitch !== 'number' || !isFinite(pitch)) {
            throw new Error('Invalid pitch: must be a finite number');
        }
    }

    /**
     * Validate 3D coordinates
     */
    private validateCoordinates(x: number, y: number, z: number): void {
        if (![x, y, z].every(coord => typeof coord === 'number' && isFinite(coord))) {
            throw new Error('Invalid coordinates: all must be finite numbers');
        }
    }
}
