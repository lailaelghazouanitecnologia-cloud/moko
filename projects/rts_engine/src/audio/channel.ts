import { Sound } from './sound';

/**
 * Controls playback of a sound
 */
export class Channel {
    sound: Sound;
    volume: number;
    pitch: number;
    isPaused: boolean;
    isLooping: boolean;
    private audioContext: AudioContext;
    private source: AudioBufferSourceNode | null = null;
    private gain: GainNode;
    private startTime: number = 0;
    private pauseTime: number = 0;
    private isPlaying: boolean = false;

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
        this.pitch = 1.0;
        this.isPaused = false;
        this.isLooping = false;
        
        this.gain = this.audioContext.createGain();
        this.gain.connect(this.audioContext.destination);
        this.gain.gain.value = this.volume;
    }

    /**
     * Start playback
     */
    play(): void {
        if (!this.audioContext) {
            throw new Error('AudioContext is not available');
        }

        if (this.isPlaying && !this.isPaused) {
            return;
        }

        if (this.isPaused && this.source) {
            this.source.start(0, this.pauseTime);
            this.startTime = this.audioContext.currentTime - this.pauseTime;
            this.isPaused = false;
            this.isPlaying = true;
            return;
        }

        this.stop();

        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.sound.buffer;
        this.source.loop = this.isLooping;
        this.source.playbackRate.value = this.pitch;
        this.source.connect(this.gain);

        this.source.start();
        this.startTime = this.audioContext.currentTime;
        this.isPlaying = true;
        this.isPaused = false;

        this.source.onended = () => {
            if (!this.isLooping) {
                this.isPlaying = false;
                this.startTime = 0;
                this.pauseTime = 0;
            }
        };
    }

    /**
     * Pause playback
     */
    pause(): void {
        if (!this.isPlaying || this.isPaused) {
            return;
        }

        if (this.source) {
            this.pauseTime = this.audioContext.currentTime - this.startTime;
            this.source.stop();
            this.source = null;
        }

        this.isPaused = true;
        this.isPlaying = false;
    }

    /**
     * Stop and reset
     */
    stop(): void {
        if (this.source) {
            try {
                this.source.stop();
            } catch (e) {
                // Ignore errors if source is already stopped
            }
            this.source = null;
        }

        this.isPlaying = false;
        this.isPaused = false;
        this.startTime = 0;
        this.pauseTime = 0;
    }

    /**
     * Set volume 0-1
     * @param value - Volume level between 0 and 1
     */
    setVolume(value: number): void {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Volume must be a valid number');
        }
        this.volume = Math.max(0, Math.min(1, value));
        this.gain.gain.value = this.volume;
    }

    /**
     * Set pitch 0.5-2
     * @param value - Pitch multiplier between 0.5 and 2
     */
    setPitch(value: number): void {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Pitch must be a valid number');
        }
        this.pitch = Math.max(0.5, Math.min(2, value));
        if (this.source) {
            this.source.playbackRate.value = this.pitch;
        }
    }

    /**
     * Toggle looping
     * @param loop - Whether to enable looping
     */
    setLoop(loop: boolean): void {
        if (typeof loop !== 'boolean') {
            throw new Error('Loop parameter must be a boolean');
        }
        this.isLooping = loop;
        if (this.source) {
            this.source.loop = loop;
        }
    }

    /**
     * Get playback seconds
     * @returns Current playback position in seconds
     */
    getPosition(): number {
        if (!this.isPlaying || this.isPaused) {
            return this.pauseTime;
        }
        return this.audioContext.currentTime - this.startTime;
    }

    /**
     * Seek playback
     * @param seconds - Position in seconds to seek to
     */
    setPosition(seconds: number): void {
        if (typeof seconds !== 'number' || isNaN(seconds)) {
            throw new Error('Position must be a valid number');
        }
        if (seconds < 0) {
            throw new Error('Position cannot be negative');
        }

        const wasPlaying = this.isPlaying;
        const wasPaused = this.isPaused;
        const targetTime = Math.max(0, Math.min(seconds, this.sound.duration));

        if (wasPlaying || wasPaused) {
            this.stop();
            this.pauseTime = targetTime;
            
            if (wasPlaying) {
                this.play();
            } else if (wasPaused) {
                this.isPaused = true;
                this.pauseTime = targetTime;
            }
        } else {
            this.pauseTime = targetTime;
        }
    }

    /**
     * Get the duration of the sound
     * @returns Duration in seconds
     */
    getDuration(): number {
        return this.sound.duration;
    }

    /**
     * Check if currently playing
     * @returns True if playing and not paused
     */
    getIsPlaying(): boolean {
        return this.isPlaying && !this.isPaused;
    }

    /**
     * Destroy the channel and clean up resources
     */
    destroy(): void {
        this.stop();
        if (this.gain) {
            this.gain.disconnect();
        }
    }
}
