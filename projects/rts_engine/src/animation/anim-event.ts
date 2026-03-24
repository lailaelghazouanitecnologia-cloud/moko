/**
 * Represents a single event that occurs at a specific point in time during an animation.
 * @interface AnimEvent
 */
export interface AnimEvent {
  /**
   * The time (in seconds) from the start of the animation at which this event should fire.
   * Must be a non-negative finite number.
   */
  time: number;

  /**
   * The name of the event. Used to dispatch or filter events.
   * Must be a non-empty string.
   */
  name: string;

  /**
   * Arbitrary data payload associated with this event.
   * Can be used to pass parameters to event handlers.
   */
  data: any;
}

/**
 * Validates that a given object conforms to the AnimEvent interface.
 * @param value - The object to validate.
 * @returns True if the object is a valid AnimEvent, false otherwise.
 */
export function isAnimEvent(value: any): value is AnimEvent {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }

  if (typeof value.time !== 'number' || !isFinite(value.time) || value.time < 0) {
    return false;
  }

  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    return false;
  }

  return true;
}

/**
 * Creates a new AnimEvent instance with the given parameters.
 * @param time - The time in seconds when the event should fire.
 * @param name - The name of the event.
 * @param data - Optional data payload for the event.
 * @returns A new AnimEvent instance.
 * @throws {TypeError} If time is not a non-negative finite number or name is empty.
 */
export function createAnimEvent(time: number, name: string, data?: any): AnimEvent {
  if (typeof time !== 'number' || !isFinite(time) || time < 0) {
    throw new TypeError('time must be a non-negative finite number');
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new TypeError('name must be a non-empty string');
  }

  return { time, name, data };
}

/**
 * Clones an existing AnimEvent.
 * @param event - The AnimEvent to clone.
 * @returns A new AnimEvent instance with the same values.
 * @throws {TypeError} If the provided event is not a valid AnimEvent.
 */
export function cloneAnimEvent(event: AnimEvent): AnimEvent {
  if (!isAnimEvent(event)) {
    throw new TypeError('Invalid AnimEvent provided');
  }

  return { ...event };
}

/**
 * Compares two AnimEvent instances for equality.
 * @param a - First AnimEvent.
 * @param b - Second AnimEvent.
 * @returns True if both events have the same time, name, and data (using strict equality).
 */
export function areAnimEventsEqual(a: AnimEvent, b: AnimEvent): boolean {
  return (
    isAnimEvent(a) &&
    isAnimEvent(b) &&
    a.time === b.time &&
    a.name === b.name &&
    a.data === b.data
  );
}
