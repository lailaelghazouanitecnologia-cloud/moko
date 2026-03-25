import { AnimTrack } from './anim-track';

/**
 * Container for animation tracks that manages playback and evaluation of multiple animation tracks.
 */
export class AnimClip {
    name: string;
    duration: number;
    tracks: AnimTrack[];
    loop: boolean;

    /**
     * Creates a new animation clip.
     * @param name - The name of the animation clip
     * @param duration - The duration of the animation in seconds
     * @param tracks - Array of animation tracks
     * @param loop - Whether the animation should loop
     */
    constructor(name: string = '', duration: number = 0, tracks: AnimTrack[] = [], loop: boolean = false) {
        this.name = name;
        this.duration = duration;
        this.tracks = tracks;
        this.loop = loop;
    }

    /**
     * Appends a track to the animation clip.
     * @param track - The animation track to add
     * @throws {Error} If track is null or undefined
     */
    addTrack(track: AnimTrack): void {
        if (!track) {
            throw new Error('Cannot add null or undefined track');
        }
        this.tracks.push(track);
        this.updateDuration();
    }

    /**
     * Deletes a track at the specified index.
     * @param index - The index of the track to remove
     * @throws {Error} If index is out of bounds
     */
    removeTrack(index: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.tracks.length) {
            throw new Error(`Track index out of bounds. Valid range: 0-${this.tracks.length - 1}`);
        }
        this.tracks.splice(index, 1);
        this.updateDuration();
    }

    /**
     * Retrieves a track at the specified index.
     * @param index - The index of the track to retrieve
     * @returns The animation track at the specified index
     * @throws {Error} If index is out of bounds
     */
    getTrack(index: number): AnimTrack {
        if (!Number.isInteger(index) || index < 0 || index >= this.tracks.length) {
            throw new Error(`Track index out of bounds. Valid range: 0-${this.tracks.length - 1}`);
        }
        return this.tracks[index];
    }

    /**
     * Samples all tracks at the specified time.
     * @param time - The time at which to evaluate the tracks
     * @returns Array of evaluation results from each track
     * @throws {Error} If time is not a valid number
     */
    evaluate(time: number): any[] {
        if (!Number.isFinite(time)) {
            throw new Error('Time must be a finite number');
        }
        
        const results: any[] = [];
        const clampedTime = this.loop ? this.wrapTime(time) : Math.max(0, Math.min(time, this.duration));
        
        for (const track of this.tracks) {
            results.push(track.evaluate(clampedTime));
        }
        
        return results;
    }

    /**
     * Toggles looping for the animation clip.
     * @param loop - Whether the animation should loop
     */
    setLoop(loop: boolean): void {
        this.loop = Boolean(loop);
    }

    /**
     * Creates a deep copy of the animation clip.
     * @returns A new AnimClip instance with cloned tracks
     */
    clone(): AnimClip {
        const clonedTracks = this.tracks.map(track => track.clone());
        return new AnimClip(this.name, this.duration, clonedTracks, this.loop);
    }

    /**
     * Updates the duration based on the longest track.
     * @private
     */
    private updateDuration(): void {
        if (this.tracks.length === 0) {
            this.duration = 0;
            return;
        }
        
        let maxDuration = 0;
        for (const track of this.tracks) {
            const trackDuration = track.getDuration();
            if (trackDuration > maxDuration) {
                maxDuration = trackDuration;
            }
        }
        this.duration = maxDuration;
    }

    /**
     * Wraps time within the duration bounds for looping animations.
     * @param time - The time to wrap
     * @returns The wrapped time value
     * @private
     */
    private wrapTime(time: number): number {
        if (this.duration === 0) return 0;
        
        const wrapped = time % this.duration;
        return wrapped < 0 ? wrapped + this.duration : wrapped;
    }
}
