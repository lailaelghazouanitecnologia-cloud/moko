import { AnimClip } from './anim-clip';
import { AnimState } from './anim-state';

/**
 * Manages playback of animation clips.
 */
export class AnimController {
    private currentClip: AnimClip | null = null;
    private currentState: AnimState = AnimState.Stopped;
    private playbackSpeed: number = 1.0;
    private loop: boolean = false;
    private time: number = 0.0;

    /**
     * Start playing the specified animation clip.
     * @param clip - The animation clip to play.
     * @throws {TypeError} If the provided clip is not a valid AnimClip instance.
     */
    play(clip: AnimClip): void {
        if (!(clip instanceof AnimClip)) {
            throw new TypeError('Invalid AnimClip provided to play().');
        }
        this.currentClip = clip;
        this.currentState = AnimState.Playing;
        this.time = 0.0;
        this.loop = clip.loop;
    }

    /**
     * Pause the current animation if it is playing.
     */
    pause(): void {
        if (this.currentState === AnimState.Playing) {
            this.currentState = AnimState.Paused;
        }
    }

    /**
     * Stop the animation and reset the playback time to 0.
     */
    stop(): void {
        this.currentState = AnimState.Stopped;
        this.time = 0.0;
    }

    /**
     * Advance the animation by the given delta time.
     * @param deltaTime - Time in seconds to advance the animation.
     * @throws {TypeError} If deltaTime is not a finite number.
     */
    update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime)) {
            throw new TypeError('deltaTime must be a finite number.');
        }

        if (this.currentState !== AnimState.Playing || !this.currentClip) {
            return;
        }

        const duration = this.currentClip.duration;
        if (duration <= 0) {
            return;
        }

        this.time += deltaTime * this.playbackSpeed;

        if (this.loop) {
            this.time = this.time % duration;
            if (this.time < 0) {
                this.time += duration;
            }
        } else {
            if (this.time >= duration) {
                this.time = duration;
                this.currentState = AnimState.Stopped;
            } else if (this.time < 0) {
                this.time = 0;
                this.currentState = AnimState.Stopped;
            }
        }
    }

    /**
     * Enable or disable looping for the current or future clips.
     * @param loop - True to enable looping, false to disable.
     * @throws {TypeError} If loop is not a boolean.
     */
    setLoop(loop: boolean): void {
        if (typeof loop !== 'boolean') {
            throw new TypeError('Loop must be a boolean value.');
        }
        this.loop = loop;
    }

    /**
     * Get the current playback time in seconds.
     * @returns The current time.
     */
    getTime(): number {
        return this.time;
    }

    /**
     * Seek to a specific time in the animation.
     * @param time - Time in seconds to seek to.
     * @throws {TypeError} If time is not a finite number.
     */
    setTime(time: number): void {
        if (!Number.isFinite(time)) {
            throw new TypeError('Time must be a finite number.');
        }

        if (!this.currentClip) {
            return;
        }

        const duration = this.currentClip.duration;
        if (duration <= 0) {
            this.time = 0;
            return;
        }

        if (this.loop) {
            this.time = ((time % duration) + duration) % duration;
        } else {
            this.time = Math.max(0, Math.min(time, duration));
        }
    }

    /**
     * Get the duration of the current clip in seconds.
     * @returns Duration of the current clip, or 0 if no clip is loaded.
     */
    getDuration(): number {
        return this.currentClip ? this.currentClip.duration : 0;
    }

    /**
     * Get the playback speed of the animation.
     * @returns The current playback speed multiplier.
     */
    getPlaybackSpeed(): number {
        return this.playbackSpeed;
    }

    /**
     * Set the playback speed of the animation.
     * @param speed - The speed multiplier. Must be finite.
     * @throws {TypeError} If speed is not a finite number.
     */
    setPlaybackSpeed(speed: number): void {
        if (!Number.isFinite(speed)) {
            throw new TypeError('Playback speed must be a finite number.');
        }
        this.playbackSpeed = speed;
    }

    /**
     * Get the current animation state.
     * @returns The current state of the animation controller.
     */
    getCurrentState(): AnimState {
        return this.currentState;
    }

    /**
     * Get the currently loaded animation clip.
     * @returns The current clip, or null if none is loaded.
     */
    getCurrentClip(): AnimClip | null {
        return this.currentClip;
    }

    /**
     * Resume playback if paused.
     */
    resume(): void {
        if (this.currentState === AnimState.Paused) {
            this.currentState = AnimState.Playing;
        }
    }

    /**
     * Check if the animation is currently playing.
     * @returns True if playing, false otherwise.
     */
    isPlaying(): boolean {
        return this.currentState === AnimState.Playing;
    }

    /**
     * Check if the animation is paused.
     * @returns True if paused, false otherwise.
     */
    isPaused(): boolean {
        return this.currentState === AnimState.Paused;
    }

    /**
     * Check if the animation is stopped.
     * @returns True if stopped, false otherwise.
     */
    isStopped(): boolean {
        return this.currentState === AnimState.Stopped;
    }

    /**
     * Get the remaining time in the current animation.
     * @returns Remaining time in seconds, or 0 if no clip is loaded.
     */
    getRemainingTime(): number {
        const duration = this.getDuration();
        if (duration <= 0) {
            return 0;
        }
        return Math.max(0, duration - this.time);
    }

    /**
     * Get the progress of the current animation as a percentage.
     * @returns Progress from 0 to 1, or 0 if no clip is loaded.
     */
    getProgress(): number {
        const duration = this.getDuration();
        if (duration <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(1, this.time / duration));
    }

    /**
     * Set the progress of the current animation as a percentage.
     * @param progress - Progress from 0 to 1.
     * @throws {TypeError} If progress is not a finite number.
     */
    setProgress(progress: number): void {
        if (!Number.isFinite(progress)) {
            throw new TypeError('Progress must be a finite number.');
        }
        const duration = this.getDuration();
        if (duration <= 0) {
            return;
        }
        const time = Math.max(0, Math.min(1, progress)) * duration;
        this.setTime(time);
    }
}
