import { AudioManager } from './audio-manager';

/**
 * Container for decoded audio buffer
 */
export class Sound {
    public readonly id: string;
    public readonly buffer: AudioBuffer;
    public readonly duration: number;

    /**
     * Creates a new Sound instance
     * @param id - Unique identifier for this sound
     * @param buffer - Decoded audio buffer
     * @throws {TypeError} If invalid parameters are provided
     */
    constructor(id: string, buffer: AudioBuffer) {
        this.validateConstructorParams(id, buffer);
        this.id = id;
        this.buffer = buffer;
        this.duration = buffer.duration;
    }

    /**
     * Creates a new AudioBufferSourceNode for playback
     * @returns New AudioBufferSourceNode
     * @throws {Error} If AudioManager is not initialized or AudioContext is unavailable
     */
    createSource(): AudioBufferSourceNode {
        const manager = AudioManager.instance;
        if (!manager) {
            throw new Error('AudioManager not initialized');
        }
        
        const context = manager['context'] as AudioContext;
        if (!context) {
            throw new Error('AudioContext not initialized');
        }

        const source = context.createBufferSource();
        source.buffer = this.buffer;
        
        return source;
    }

    /**
     * Validates constructor parameters
     * @param id - The id to validate
     * @param buffer - The buffer to validate
     * @throws {TypeError} If validation fails
     */
    private validateConstructorParams(id: string, buffer: AudioBuffer): void {
        if (typeof id !== 'string' || id.trim().length === 0) {
            throw new TypeError('Sound id must be a non-empty string');
        }

        if (!buffer || !(buffer instanceof AudioBuffer)) {
            throw new TypeError('Sound buffer must be a valid AudioBuffer');
        }

        if (buffer.duration <= 0) {
            throw new TypeError('Sound buffer must have valid duration');
        }
    }
}
