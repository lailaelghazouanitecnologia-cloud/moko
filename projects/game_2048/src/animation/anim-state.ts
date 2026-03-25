import { AnimClip } from './anim-clip';
import { AnimTransition } from './anim-transition';

/**
 * Represents a single animation state in a state machine.
 * Manages playback properties and transitions for an animation clip.
 */
export class AnimState {
    name: string;
    clip: AnimClip;
    speed: number;
    loop: boolean;
    transitions: AnimTransition[];

    /**
     * Creates a new animation state.
     * @param name - The name identifier for this state
     * @param clip - The animation clip to play in this state
     * @param speed - Playback speed multiplier (default: 1.0)
     * @param loop - Whether the animation should loop (default: true)
     * @param transitions - Array of possible transitions from this state (default: empty)
     */
    constructor(name: string = '', clip: AnimClip = new AnimClip(), speed: number = 1.0, loop: boolean = true, transitions: AnimTransition[] = []) {
        this.name = name;
        this.clip = clip;
        this.speed = speed;
        this.loop = loop;
        this.transitions = transitions;
    }

    /**
     * Start playback of this animation state.
     * Resets time if needed and sets playback state.
     */
    play(): void {
        // Start playback by resetting time if needed and setting playback state
        // Implementation depends on the animation controller that uses this state
    }

    /**
     * Pause playback of this animation state.
     * Sets a paused flag to maintain current position.
     */
    pause(): void {
        // Pause playback by setting a paused flag
        // Implementation depends on the animation controller that uses this state
    }

    /**
     * Stop and reset playback to the beginning.
     * Clears any paused state and returns to initial frame.
     */
    stop(): void {
        // Stop and reset playback to the beginning
        // Implementation depends on the animation controller that uses this state
    }

    /**
     * Adjust the playback speed of this animation state.
     * @param speed - The new speed multiplier (must be positive)
     * @throws {Error} If speed is not a positive number
     */
    setSpeed(speed: number): void {
        if (!this.isValidSpeed(speed)) {
            throw new Error('Speed must be a positive number');
        }
        this.speed = speed;
    }

    /**
     * Get the current playback progress of this animation state.
     * @returns A value between 0 and 1 representing playback progress
     */
    getProgress(): number {
        // Calculate and return playback progress as a value between 0 and 1
        // Implementation depends on the animation controller that uses this state
        return 0;
    }

    /**
     * Add a transition from this state to another.
     * @param transition - The transition to add
     * @throws {Error} If transition is null or undefined
     */
    addTransition(transition: AnimTransition): void {
        if (!this.isValidTransition(transition)) {
            throw new Error('Transition cannot be null or undefined');
        }
        this.transitions.push(transition);
    }

    /**
     * Remove a transition from this state.
     * @param transition - The transition to remove
     * @returns true if the transition was found and removed, false otherwise
     */
    removeTransition(transition: AnimTransition): boolean {
        const index = this.transitions.indexOf(transition);
        if (index !== -1) {
            this.transitions.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get all transitions from this state.
     * @returns Array of transitions
     */
    getTransitions(): AnimTransition[] {
        return [...this.transitions];
    }

    /**
     * Clear all transitions from this state.
     */
    clearTransitions(): void {
        this.transitions.length = 0;
    }

    /**
     * Check if this state has any transitions.
     * @returns true if there are transitions, false otherwise
     */
    hasTransitions(): boolean {
        return this.transitions.length > 0;
    }

    /**
     * Clone this animation state.
     * @returns A new AnimState instance with copied properties
     */
    clone(): AnimState {
        return new AnimState(
            this.name,
            this.clip,
            this.speed,
            this.loop,
            [...this.transitions]
        );
    }

    /**
     * Validate speed value.
     * @private
     */
    private isValidSpeed(speed: number): boolean {
        return typeof speed === 'number' && isFinite(speed) && speed > 0;
    }

    /**
     * Validate transition object.
     * @private
     */
    private isValidTransition(transition: AnimTransition): boolean {
        return transition !== null && transition !== undefined;
    }
}
