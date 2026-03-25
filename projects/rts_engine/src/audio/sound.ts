/**
 * Represents an audio sound resource that can be played through multiple channels.
 * Manages the lifecycle of audio playback and provides volume control.
 */
export class Sound {
    private _buffer: AudioBuffer;
    private _duration: number;
    private _sampleRate: number;
    private _channels: number;
    private _activeChannels: Set<Channel | Channel3d>;
    private _volume: number;

    /**
     * Creates a new Sound instance from an AudioBuffer.
     * @param buffer - The AudioBuffer containing the audio data
     * @throws {Error} If buffer is null, undefined, or invalid
     */
    constructor(buffer: AudioBuffer) {
        this._validateAudioBuffer(buffer);
        this._buffer = buffer;
        this._duration = buffer.duration;
        this._sampleRate = buffer.sampleRate;
        this._channels = buffer.numberOfChannels;
        this._activeChannels = new Set<Channel | Channel3d>();
        this._volume = 1.0;
    }

    /**
     * Gets the underlying AudioBuffer.
     */
    get buffer(): AudioBuffer {
        return this._buffer;
    }

    /**
     * Gets the duration of the sound in seconds.
     */
    get duration(): number {
        return this._duration;
    }

    /**
     * Gets the sample rate of the audio in Hz.
     */
    get sampleRate(): number {
        return this._sampleRate;
    }

    /**
     * Gets the number of audio channels.
     */
    get channels(): number {
        return this._channels;
    }

    /**
     * Gets the set of currently active channels playing this sound.
     */
    get activeChannels(): Set<Channel | Channel3d> {
        return this._activeChannels;
    }

    /**
     * Gets the master volume for this sound (0.0 to 1.0).
     */
    get volume(): number {
        return this._volume;
    }

    /**
     * Sets the master volume for this sound.
     * @param value - Volume level between 0.0 and 1.0
     * @throws {Error} If volume is not a valid number or outside valid range
     */
    set volume(value: number) {
        this._validateVolume(value);
        this._volume = value;
        this._updateAllChannelVolumes();
    }

    /**
     * Plays the sound through a standard channel.
     * @param channel - The channel to play the sound through
     * @throws {Error} If channel is null or undefined
     */
    play(channel: Channel): void {
        this._validateChannel(channel);
        this._activeChannels.add(channel);
        channel.play();
    }

    /**
     * Plays the sound through a 3D spatial audio channel.
     * @param channel - The 3D channel to play the sound through
     * @throws {Error} If channel is null or undefined
     */
    play3d(channel: Channel3d): void {
        this._validateChannel(channel);
        this._activeChannels.add(channel);
        channel.play(this);
    }

    /**
     * Stops playback on the specified channel.
     * @param channel - The channel to stop
     * @throws {Error} If channel is null or undefined
     */
    stop(channel: Channel | Channel3d): void {
        this._validateChannel(channel);
        channel.stop();
        this._activeChannels.delete(channel);
    }

    /**
     * Alias for stop() - maintains backward compatibility.
     * @param channel - The channel to stop
     * @throws {Error} If channel is null or undefined
     */
    originalStop(channel: Channel | Channel3d): void {
        this.stop(channel);
    }

    /**
     * Stops all active channels and clears the active channels set.
     */
    cleanup(): void {
        for (const channel of this._activeChannels) {
            try {
                channel.stop();
            } catch (error) {
                console.warn('Failed to stop channel during cleanup:', error);
            }
        }
        this._activeChannels.clear();
    }

    /**
     * Checks if the sound is currently playing on any channel.
     * @returns True if at least one channel is active
     */
    isPlaying(): boolean {
        return this._activeChannels.size > 0;
    }

    /**
     * Gets the number of active channels currently playing this sound.
     * @returns The count of active channels
     */
    getActiveChannelCount(): number {
        return this._activeChannels.size;
    }

    /**
     * Stops all channels and resets the volume to default.
     */
    reset(): void {
        this.cleanup();
        this._volume = 1.0;
    }

    /**
     * Validates that the provided AudioBuffer is valid.
     * @param buffer - The AudioBuffer to validate
     * @throws {Error} If buffer is invalid
     */
    private _validateAudioBuffer(buffer: AudioBuffer): void {
        if (!buffer) {
            throw new Error('AudioBuffer cannot be null or undefined');
        }
        if (!(buffer instanceof AudioBuffer)) {
            throw new Error('Invalid AudioBuffer: must be an instance of AudioBuffer');
        }
        if (buffer.numberOfChannels <= 0) {
            throw new Error('Invalid AudioBuffer: must have at least one channel');
        }
        if (buffer.duration <= 0) {
            throw new Error('Invalid AudioBuffer: duration must be positive');
        }
        if (buffer.sampleRate <= 0) {
            throw new Error('Invalid AudioBuffer: sample rate must be positive');
        }
    }

    /**
     * Validates that the volume is within acceptable range.
     * @param volume - The volume to validate
     * @throws {Error} If volume is invalid
     */
    private _validateVolume(volume: number): void {
        if (typeof volume !== 'number' || !isFinite(volume)) {
            throw new Error('Volume must be a valid finite number');
        }
        if (volume < 0.0 || volume > 1.0) {
            throw new Error('Volume must be between 0.0 and 1.0');
        }
    }

    /**
     * Validates that a channel is provided and not null/undefined.
     * @param channel - The channel to validate
     * @throws {Error} If channel is invalid
     */
    private _validateChannel(channel: Channel | Channel3d | null | undefined): void {
        if (!channel) {
            throw new Error('Channel cannot be null or undefined');
        }
    }

    /**
     * Updates the volume on all active channels.
     */
    private _updateAllChannelVolumes(): void {
        for (const channel of this._activeChannels) {
            try {
                if (typeof channel.setVolume === 'function') {
                    channel.setVolume(this._volume);
                }
            } catch (error) {
                console.warn('Failed to update channel volume:', error);
            }
        }
    }
}
