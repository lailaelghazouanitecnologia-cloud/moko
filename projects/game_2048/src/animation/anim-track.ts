import { AnimCurve } from './anim-curve';

/**
 * Single animated property channel.
 * Holds a curve and knows how to apply it to a named property on a target object.
 */
export class AnimTrack {
    property: string;
    curve: AnimCurve;
    target: any;

    /**
     * Creates a new animation track.
     * @param property  The name of the property to animate on the target object.
     * @param curve     The curve that drives the animation values.
     * @param target    The object whose property will be animated.
     */
    constructor(property: string = '', curve: AnimCurve = new AnimCurve(), target: any = null) {
        this.property = property;
        this.curve = curve;
        this.target = target;
    }

    /**
     * Samples the curve at the given time.
     * @param time  Normalized time in the range [0, 1].
     * @returns The curve value at the requested time.
     * @throws {TypeError} If time is not a finite number.
     */
    evaluate(time: number): number {
        if (!Number.isFinite(time)) {
            throw new TypeError('Time must be a finite number');
        }
        return this.curve.evaluate(time);
    }

    /**
     * Binds (or re-binds) the target object for this track.
     * @param obj  The object whose property will be animated.
     * @throws {TypeError} If obj is null or undefined (use null to unbind).
     */
    setTarget(obj: any): void {
        if (arguments.length === 0) {
            throw new TypeError('setTarget expects exactly one argument');
        }
        this.target = obj;
    }

    /**
     * Returns the duration of the underlying curve.
     * @returns The curve duration.
     */
    getDuration(): number {
        return this.curve.getDuration();
    }

    /**
     * Applies the curve value at the given time to the bound target property.
     * @param time  Normalized time in the range [0, 1].
     * @throws {TypeError} If time is not a finite number.
     */
    apply(time: number): void {
        if (!Number.isFinite(time)) {
            throw new TypeError('Time must be a finite number');
        }
        if (!this.target) return;
        const value = this.evaluate(time);
        this.target[this.property] = value;
    }

    /**
     * Performs a deep copy of this track.
     * @returns A new AnimTrack with cloned curve and the same property name.
     *          The target reference is copied as-is (shallow).
     */
    clone(): AnimTrack {
        const cloned = new AnimTrack();
        cloned.property = this.property;
        cloned.curve = this.curve.clone();
        cloned.target = this.target;
        return cloned;
    }

    /**
     * Validates that the current state is internally consistent.
     * @returns True if the track is valid, false otherwise.
     */
    isValid(): boolean {
        return (
            typeof this.property === 'string' &&
            this.curve !== null &&
            typeof this.curve.evaluate === 'function' &&
            typeof this.curve.getDuration === 'function' &&
            typeof this.curve.clone === 'function'
        );
    }

    /**
     * Checks whether this track can meaningfully apply values.
     * @returns True if both target and property are available.
     */
    canApply(): boolean {
        return !!(this.target && this.property);
    }

    /**
     * Resets the track to its initial state (clears target and resets curve).
     */
    reset(): void {
        this.target = null;
        this.curve.reset();
    }
}
