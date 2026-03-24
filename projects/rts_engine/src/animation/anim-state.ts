import { AnimClip } from './anim-clip';
import { AnimSample } from './anim-sample';

interface Condition {
    evaluate(): boolean;
}

interface Transition {
    condition: Condition;
    target: string;
}

/**
 * Controller state with clip and transitions.
 */
export class AnimState {
    name: string;
    clip: AnimClip;
    speed: number;
    transitions: Transition[];

    /**
     * Creates an instance of AnimState.
     * @param name - The name of the state.
     * @param clip - The animation clip associated with this state.
     * @param speed - The playback speed multiplier.
     */
    constructor(name: string = '', clip: AnimClip = new AnimClip(), speed: number = 1.0) {
        this.name = name;
        this.clip = clip;
        this.speed = speed;
        this.transitions = [];
    }

    /**
     * Registers a transition from this state to another.
     * @param condition - The condition that must be met for the transition to occur.
     * @param target - The name of the target state.
     * @throws {TypeError} If condition is not an object or target is not a string.
     */
    addTransition(condition: Condition, target: string): void {
        if (typeof condition !== 'object' || condition === null || typeof condition.evaluate !== 'function') {
            throw new TypeError('Condition must be an object with an evaluate method');
        }
        if (typeof target !== 'string') {
            throw new TypeError('Target must be a string');
        }
        this.transitions.push({ condition, target });
    }

    /**
     * Samples the animation clip at the given time.
     * @param time - The time at which to sample the clip.
     * @returns The sampled animation data.
     * @throws {TypeError} If time is not a number.
     */
    evaluate(time: number): AnimSample {
        if (typeof time !== 'number' || isNaN(time)) {
            throw new TypeError('Time must be a valid number');
        }
        const normalizedTime = this.speed >= 0 ? time : this.clip.duration + time;
        return this.clip.evaluate(normalizedTime);
    }

    /**
     * Gets the normalized time of the current state.
     * @returns The normalized time (always 0 in this implementation).
     */
    getTime(): number {
        return 0;
    }

    /**
     * Finds the first transition whose condition is satisfied.
     * @returns The target state name of the first valid transition, or null if none.
     */
    findValidTransition(): string | null {
        for (const transition of this.transitions) {
            if (transition.condition.evaluate()) {
                return transition.target;
            }
        }
        return null;
    }

    /**
     * Removes all transitions from this state.
     */
    clearTransitions(): void {
        this.transitions.length = 0;
    }

    /**
     * Removes a specific transition by target name.
     * @param target - The target state name of the transition to remove.
     * @returns True if a transition was removed, false otherwise.
     */
    removeTransition(target: string): boolean {
        const index = this.transitions.findIndex(t => t.target === target);
        if (index !== -1) {
            this.transitions.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Gets the number of transitions from this state.
     * @returns The number of transitions.
     */
    getTransitionCount(): number {
        return this.transitions.length;
    }

    /**
     * Checks if this state has any transitions.
     * @returns True if there are no transitions, false otherwise.
     */
    isLeaf(): boolean {
        return this.transitions.length === 0;
    }

    /**
     * Clones this AnimState instance.
     * @returns A new AnimState with the same properties and transitions.
     */
    clone(): AnimState {
        const cloned = new AnimState(this.name, this.clip, this.speed);
        for (const transition of this.transitions) {
            cloned.addTransition(transition.condition, transition.target);
        }
        return cloned;
    }
}
