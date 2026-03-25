import { Listener } from './listener';
import { Channel } from './channel';
import { Channel3d } from './channel3d';
import { Sound } from './sound';

/**
 * Central 3D audio orchestrator.
 * Manages loading, playback, and spatialization of audio assets.
 */
export class AudioManager {
    masterVolume: number;
    listener: Listener;
    channels: Map<string, Channel>;
    channels3d: Map<string, Channel3d>;
    sounds: Map<string, Sound>;
    private audioContext: AudioContext | null;

    constructor() {
        this.masterVolume = 1.0;
        this.listener = new Listener();
        this.channels = new Map<string, Channel>();
        this.channels3d = new Map<string, Channel3d>();
        this.sounds = new Map<string, Sound>();
        this.audioContext = null;
    }

    /**
     * Load an audio asset from a URL and store it under the given ID.
     * @param id Unique identifier for the sound.
     * @param url URL of the audio file.
     * @returns Promise resolving to the loaded Sound instance.
     * @throws {TypeError} If id or url is not a non-empty string.
     * @throws {Error} If fetch or audio decoding fails.
     */
    async loadSound(id: string, url: string): Promise<Sound> {
        if (typeof id !== 'string' || id.trim().length === 0) {
            throw new TypeError('loadSound: id must be a non-empty string');
        }
        if (typeof url !== 'string' || url.trim().length === 0) {
            throw new TypeError('loadSound: url must be a non-empty string');
        }

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        let response: Response;
        try {
            response = await fetch(url);
        } catch (fetchError) {
            throw new Error(`Failed to fetch audio from ${url}: ${fetchError}`);
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let arrayBuffer: ArrayBuffer;
        try {
            arrayBuffer = await response.arrayBuffer();
        } catch (arrayBufferError) {
            throw new Error(`Failed to read array buffer from ${url}: ${arrayBufferError}`);
        }

        let audioBuffer: AudioBuffer;
        try {
            audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (decodeError) {
            throw new Error(`Failed to decode audio data from ${url}: ${decodeError}`);
        }

        const sound = new Sound(audioBuffer);
        this.sounds.set(id, sound);
        return sound;
    }

    /**
     * Create a new audio channel.
     * @param id Unique identifier for the channel.
     * @param spatial Whether to create a 3D spatial channel.
     * @returns The created Channel or Channel3d instance.
     * @throws {TypeError} If id is not a non-empty string.
     */
    createChannel(id: string, spatial: boolean): Channel | Channel3d {
        if (typeof id !== 'string' || id.trim().length === 0) {
            throw new TypeError('createChannel: id must be a non-empty string');
        }

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (spatial) {
            const channel3d = new Channel3d(this.audioContext);
            this.channels3d.set(id, channel3d);
            return channel3d;
        } else {
            const channel = new Channel(this.audioContext);
            this.channels.set(id, channel);
            return channel;
        }
    }

    /**
     * Start playback of a sound on the specified channel, or on the first available channel if none specified.
     * @param soundId ID of the sound to play.
     * @param channelId Optional ID of the channel to use.
     * @throws {TypeError} If soundId is not a non-empty string.
     */
    play(soundId: string, channelId?: string): void {
        if (typeof soundId !== 'string' || soundId.trim().length === 0) {
            throw new TypeError('play: soundId must be a non-empty string');
        }
        if (channelId !== undefined && (typeof channelId !== 'string' || channelId.trim().length === 0)) {
            throw new TypeError('play: channelId must be a non-empty string if provided');
        }

        const sound = this.sounds.get(soundId);
        if (!sound) {
            console.warn(`Sound ${soundId} not found`);
            return;
        }

        if (channelId) {
            const channel = this.channels.get(channelId) || this.channels3d.get(channelId);
            if (channel) {
                if (channel instanceof Channel3d) {
                    channel.play(sound);
                } else {
                    channel.play();
                }
            } else {
                console.warn(`Channel ${channelId} not found`);
            }
        } else {
            // Play on first available channel
            for (const channel of this.channels.values()) {
                channel.play();
                return;
            }
            for (const channel of this.channels3d.values()) {
                channel.play(sound);
                return;
            }
        }
    }

    /**
     * Pause playback on the specified channel.
     * @param channelId ID of the channel to pause.
     * @throws {TypeError} If channelId is not a non-empty string.
     */
    pause(channelId: string): void {
        if (typeof channelId !== 'string' || channelId.trim().length === 0) {
            throw new TypeError('pause: channelId must be a non-empty string');
        }

        const channel = this.channels.get(channelId) || this.channels3d.get(channelId);
        if (channel) {
            channel.pause();
        } else {
            console.warn(`Channel ${channelId} not found`);
        }
    }

    /**
     * Stop playback on the specified channel.
     * @param channelId ID of the channel to stop.
     * @throws {TypeError} If channelId is not a non-empty string.
     */
    stop(channelId: string): void {
        if (typeof channelId !== 'string' || channelId.trim().length === 0) {
            throw new TypeError('stop: channelId must be a non-empty string');
        }

        const channel = this.channels.get(channelId) || this.channels3d.get(channelId);
        if (channel) {
            channel.stop();
        } else {
            console.warn(`Channel ${channelId} not found`);
        }
    }

    /**
     * Set the global master volume.
     * @param volume Desired volume between 0 and 1.
     * @throws {TypeError} If volume is not a number.
     */
    setMasterVolume(volume: number): void {
        if (typeof volume !== 'number' || isNaN(volume)) {
            throw new TypeError('setMasterVolume: volume must be a valid number');
        }
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.listener) {
            this.listener.setGain(this.masterVolume);
        }
    }

    /**
     * Update 3D audio positioning and attenuation.
     * @param dt Delta time in seconds since last update.
     * @throws {TypeError} If dt is not a number.
     */
    update(dt: number): void {
        if (typeof dt !== 'number' || isNaN(dt) || dt < 0) {
            throw new TypeError('update: dt must be a non-negative number');
        }

        // Update 3D audio positioning and attenuation
        for (const [id, channel] of this.channels3d) {
            if (channel.isPlaying) {
                // Calculate distance-based attenuation
                const listenerPos = this.listener.getPosition();
                const channelPos = channel.getPosition();
                const distance = listenerPos.distance(channelPos);

                // Apply distance attenuation based on min/max distance settings
                const minDistance = channel.minDistance || 1;
                const maxDistance = channel.maxDistance || 100;
                const clampedDistance = Math.max(minDistance, Math.min(maxDistance, distance));
                const distanceRatio = (clampedDistance - minDistance) / (maxDistance - minDistance);
                const attenuation = Math.max(0, 1 - distanceRatio);

                channel.setVolume(attenuation * this.masterVolume);
            }
        }
    }

    /**
     * Unload a sound and stop all channels currently playing it.
     * @param soundId ID of the sound to unload.
     * @throws {TypeError} If soundId is not a non-empty string.
     */
    unloadSound(soundId: string): void {
        if (typeof soundId !== 'string' || soundId.trim().length === 0) {
            throw new TypeError('unloadSound: soundId must be a non-empty string');
        }

        const sound = this.sounds.get(soundId);
        if (sound) {
            // Stop all channels playing this sound
            for (const channel of this.channels.values()) {
                if (channel.sound === sound) {
                    channel.stop();
                }
            }
            for (const channel of this.channels3d.values()) {
                if (channel.sound === sound) {
                    channel.stop();
                }
            }

            this.sounds.delete(soundId);
        }
    }

    /**
     * Get the AudioContext instance, creating it if necessary.
     * @returns The AudioContext instance.
     * @private
     */
    private getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * Dispose of all resources managed by this AudioManager.
     */
    dispose(): void {
        // Stop and clear all channels
        for (const channel of this.channels.values()) {
            channel.stop();
        }
        for (const channel of this.channels3d.values()) {
            channel.stop();
        }
        this.channels.clear();
        this.channels3d.clear();

        // Clear sounds
        this.sounds.clear();

        // Close AudioContext if possible
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(() => {
                // Ignore errors on close
            });
        }
        this.audioContext = null;
    }
}
