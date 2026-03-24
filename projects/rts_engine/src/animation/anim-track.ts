import { AnimCurve } from './anim-curve';
import { InterpolationType } from './interpolation-type';

/**
 * Represents an animated property path with curves.
 * Each track targets a specific property on a specific path and contains
 * one or more curves for multi-dimensional properties.
 */
export class AnimTrack {
    /**
     * Path to the target object (e.g., "node/skeleton/bone").
     */
    path: string;

    /**
     * Name of the property being animated (e.g., "position", "rotation").
     */
    property: string;

    /**
     * Curves for each component of the property.
     * For example, a 3D position property will have 3 curves (x, y, z).
     */
    curves: AnimCurve[];

    /**
     * Interpolation method used between keyframes.
     */
    interpolation: InterpolationType;

    /**
     * Creates a new AnimTrack instance.
     * @param path - Path to the target object.
     * @param property - Name of the property being animated.
     * @param curves - Curves for each component of the property.
     * @param interpolation - Interpolation method for keyframes.
     * @throws {TypeError} If curves is not an array or interpolation is invalid.
     */
    constructor(
        path: string = '',
        property: string = '',
        curves: AnimCurve[] = [],
        interpolation: InterpolationType = InterpolationType.Linear
    ) {
        if (!Array.isArray(curves)) {
            throw new TypeError('curves must be an array of AnimCurve');
        }
        if (!this.isValidInterpolation(interpolation)) {
            throw new TypeError('Invalid interpolation type');
        }

        this.path = path;
        this.property = property;
        this.curves = curves;
        this.interpolation = interpolation;
    }

    /**
     * Adds or updates a keyframe at the specified time with the given values.
     * Each value in the array corresponds to a curve component.
     * @param time - The time in seconds for the keyframe.
     * @param value - Array of values for each curve component.
     * @throws {TypeError} If time is not a number or value is not an array.
     * @throws {RangeError} If time is negative or value array is empty.
     */
    setKeyframe(time: number, value: number[]): void {
        this.validateTime(time);
        this.validateValueArray(value);

        const currentLength = this.curves.length;
        const targetLength = value.length;

        if (currentLength !== targetLength) {
            const diff = targetLength - currentLength;
            if (diff > 0) {
                for (let i = 0; i < diff; i++) {
                    this.curves.push(new AnimCurve());
                }
            } else {
                this.curves.splice(targetLength);
            }
        }

        for (let i = 0; i < value.length; i++) {
            this.curves[i].addKey(time, value[i]);
        }
    }

    /**
     * Samples the curves at the specified time and returns the interpolated values.
     * @param time - The time in seconds to sample.
     * @returns Array of values for each curve component.
     * @throws {TypeError} If time is not a number.
     * @throws {RangeError} If time is negative.
     */
    evaluate(time: number): number[] {
        this.validateTime(time);

        const result: number[] = [];
        for (let i = 0; i < this.curves.length; i++) {
            result.push(this.curves[i].evaluate(time));
        }
        return result;
    }

    /**
     * Gets the maximum duration of all curves in the track.
     * @returns The maximum time in seconds across all curves, or 0 if no curves exist.
     */
    getDuration(): number {
        let maxDuration = 0;
        for (let i = 0; i < this.curves.length; i++) {
            const curve = this.curves[i];
            if (curve.keys && curve.keys.length > 0) {
                const lastKey = curve.keys[curve.keys.length - 1];
                if (lastKey && typeof lastKey.time === 'number' && lastKey.time > maxDuration) {
                    maxDuration = lastKey.time;
                }
            }
        }
        return maxDuration;
    }

    /**
     * Creates a deep copy of this track.
     * @returns A new AnimTrack with cloned curves and identical properties.
     */
    clone(): AnimTrack {
        const clonedCurves: AnimCurve[] = [];
        for (let i = 0; i < this.curves.length; i++) {
            clonedCurves.push(this.curves[i].clone());
        }
        return new AnimTrack(this.path, this.property, clonedCurves, this.interpolation);
    }

    /**
     * Validates that the interpolation type is a valid enum value.
     * @param interpolation - The interpolation type to validate.
     * @returns True if valid, false otherwise.
     */
    private isValidInterpolation(interpolation: InterpolationType): boolean {
        return Object.values(InterpolationType).includes(interpolation);
    }

    /**
     * Validates that the time is a non-negative number.
     * @param time - The time value to validate.
     * @throws {TypeError} If time is not a number.
     * @throws {RangeError} If time is negative.
     */
    private validateTime(time: number): void {
        if (typeof time !== 'number' || isNaN(time)) {
            throw new TypeError('time must be a valid number');
        }
        if (time < 0) {
            throw new RangeError('time must be non-negative');
        }
    }

    /**
     * Validates that the value array is valid.
     * @param value - The value array to validate.
     * @throws {TypeError} If value is not an array.
     * @throws {RangeError} If value array is empty.
     */
    private validateValueArray(value: number[]): void {
        if (!Array.isArray(value)) {
            throw new TypeError('value must be an array of numbers');
        }
        if (value.length === 0) {
            throw new RangeError('value array cannot be empty');
        }
        for (let i = 0; i < value.length; i++) {
            if (typeof value[i] !== 'number' || isNaN(value[i])) {
                throw new TypeError(`value[${i}] must be a valid number`);
            }
        }
    }
}
