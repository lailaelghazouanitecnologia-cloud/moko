/**
 * Represents a single keyframe in an animation curve.
 * A keyframe defines a specific point in time with an associated value,
 * and optional incoming/outgoing tangents for interpolation.
 */
export interface Keyframe {
  /**
   * Time in seconds at which this keyframe occurs.
   * Must be a finite number.
   */
  time: number;

  /**
   * Value of the animated property at this keyframe.
   * Must be a finite number.
   */
  value: number;

  /**
   * Tangent for the incoming curve segment (left-hand slope).
   * Used for cubic interpolation. Must be a finite number.
   */
  inTangent: number;

  /**
   * Tangent for the outgoing curve segment (right-hand slope).
   * Used for cubic interpolation. Must be a finite number.
   */
  outTangent: number;
}

/**
 * Utility namespace for Keyframe-related operations.
 */
export namespace Keyframe {
  /**
   * Validates that a keyframe-like object conforms to the interface
   * and contains only finite numeric values.
   *
   * @param k - The object to validate.
   * @returns `true` if the object is a valid Keyframe; otherwise `false`.
   */
  export function isValid(k: unknown): k is Keyframe {
    return (
      typeof k === 'object' &&
      k !== null &&
      'time' in k &&
      'value' in k &&
      'inTangent' in k &&
      'outTangent' in k &&
      Number.isFinite((k as any).time) &&
      Number.isFinite((k as any).value) &&
      Number.isFinite((k as any).inTangent) &&
      Number.isFinite((k as any).outTangent)
    );
  }

  /**
   * Creates a new Keyframe instance with the provided parameters.
   * All numeric inputs must be finite.
   *
   * @param time - Time in seconds.
   * @param value - Value at this keyframe.
   * @param inTangent - Incoming tangent.
   * @param outTangent - Outgoing tangent.
   * @returns A new Keyframe object.
   * @throws {TypeError} If any argument is not a finite number.
   */
  export function create(
    time: number,
    value: number,
    inTangent: number,
    outTangent: number
  ): Keyframe {
    if (!Number.isFinite(time)) {
      throw new TypeError('time must be a finite number');
    }
    if (!Number.isFinite(value)) {
      throw new TypeError('value must be a finite number');
    }
    if (!Number.isFinite(inTangent)) {
      throw new TypeError('inTangent must be a finite number');
    }
    if (!Number.isFinite(outTangent)) {
      throw new TypeError('outTangent must be a finite number');
    }
    return { time, value, inTangent, outTangent };
  }

  /**
   * Performs a deep equality check between two keyframes.
   *
   * @param a - First keyframe.
   * @param b - Second keyframe.
   * @returns `true` if all fields are strictly equal; otherwise `false`.
   */
  export function equals(a: Keyframe, b: Keyframe): boolean {
    return (
      a.time === b.time &&
      a.value === b.value &&
      a.inTangent === b.inTangent &&
      a.outTangent === b.outTangent
    );
  }

  /**
   * Returns a shallow copy of the provided keyframe.
   *
   * @param k - The keyframe to clone.
   * @returns A new Keyframe object with identical properties.
   */
  export function clone(k: Keyframe): Keyframe {
    return { ...k };
  }
}
