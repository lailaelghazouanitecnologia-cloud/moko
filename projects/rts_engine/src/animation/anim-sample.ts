/**
 * A snapshot of animated values at a specific point in time.
 * Used to store keyframe data for animation tracks.
 */
export interface AnimSample {
  /**
   * Time in seconds (or normalized 0-1) when this sample occurs.
   * Must be a finite number.
   */
  time: number;

  /**
   * Map of property names to their numeric values at this sample.
   * Each property can hold one or more numeric components (e.g., x,y,z or r,g,b,a).
   * The array must contain at least one element.
   */
  values: Map<string, number[]>;
}

/**
 * Utility functions for working with AnimSample instances.
 */
export namespace AnimSampleUtils {
  /**
   * Validates that the provided sample is well-formed.
   * @param sample The sample to validate.
   * @throws If the sample is invalid.
   */
  export function validate(sample: AnimSample): void {
    if (!sample) {
      throw new Error('AnimSample is required');
    }
    if (typeof sample.time !== 'number' || !isFinite(sample.time)) {
      throw new Error('AnimSample.time must be a finite number');
    }
    if (!(sample.values instanceof Map)) {
      throw new Error('AnimSample.values must be a Map');
    }
    if (sample.values.size === 0) {
      throw new Error('AnimSample.values cannot be empty');
    }
    for (const [key, arr] of sample.values.entries()) {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('AnimSample.values keys must be non-empty strings');
      }
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error(`AnimSample.values['${key}'] must be a non-empty array`);
      }
      for (let i = 0; i < arr.length; i++) {
        if (typeof arr[i] !== 'number' || !isFinite(arr[i])) {
          throw new Error(`AnimSample.values['${key}'][${i}] must be a finite number`);
        }
      }
    }
  }

  /**
   * Creates a deep clone of the sample.
   * @param sample The sample to clone.
   * @returns A new AnimSample with copied data.
   */
  export function clone(sample: AnimSample): AnimSample {
    validate(sample);
    const clonedValues = new Map<string, number[]>();
    for (const [k, v] of sample.values.entries()) {
      clonedValues.set(k, v.slice());
    }
    return { time: sample.time, values: clonedValues };
  }

  /**
   * Checks equality of two samples.
   * @param a First sample.
   * @param b Second sample.
   * @returns True if both time and values are identical.
   */
  export function equals(a: AnimSample, b: AnimSample): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.time !== b.time) return false;
    if (a.values.size !== b.values.size) return false;
    for (const [k, v] of a.values.entries()) {
      const other = b.values.get(k);
      if (!other || v.length !== other.length) return false;
      for (let i = 0; i < v.length; i++) {
        if (v[i] !== other[i]) return false;
      }
    }
    return true;
  }
}
