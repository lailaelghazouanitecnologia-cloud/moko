import { AnimTrack } from './anim-track';
import { AnimEvent, AnimSample } from './index';

/**
 * Container for animation tracks.
 * Manages a collection of tracks that together form a single animation clip.
 */
export class AnimClip {
  name: string;
  duration: number;
  tracks: AnimTrack[];
  events: AnimEvent[];

  /**
   * Creates a new animation clip.
   * @param name - The name of the clip (default: empty string)
   * @param duration - Duration of the clip in seconds (default: 0)
   * @throws {Error} If duration is negative
   */
  constructor(name: string = '', duration: number = 0) {
    if (duration < 0) {
      throw new Error('Duration cannot be negative');
    }
    this.name = name;
    this.duration = duration;
    this.tracks = [];
    this.events = [];
  }

  /**
   * Appends a track to the clip.
   * @param track - The track to add
   * @throws {Error} If track is null or undefined
   */
  addTrack(track: AnimTrack): void {
    if (!track) {
      throw new Error('Track cannot be null or undefined');
    }

    this.tracks.push(track);
    const trackDuration = track.getDuration();
    if (trackDuration > this.duration) {
      this.duration = trackDuration;
    }
  }

  /**
   * Removes a track by name.
   * @param name - The path/name of the track to remove
   * @returns True if a track was removed, false if not found
   * @throws {Error} If name is empty or not a string
   */
  removeTrack(name: string): boolean {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Track name must be a non-empty string');
    }

    const index = this.tracks.findIndex(track => track.path === name);
    if (index !== -1) {
      this.tracks.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Samples all tracks at the given time.
   * @param time - Time in seconds
   * @returns An object containing the time and sampled values for each track
   * @throws {Error} If time is not a finite number
   */
  evaluate(time: number): AnimSample {
    if (!Number.isFinite(time)) {
      throw new Error('Time must be a finite number');
    }

    const values = new Map<string, number[]>();
    
    for (const track of this.tracks) {
      const trackValues = track.evaluate(time);
      values.set(track.path, trackValues);
    }
    
    return {
      time,
      values
    };
  }

  /**
   * Compresses keyframes on all tracks to reduce memory usage.
   */
  optimize(): void {
    for (const track of this.tracks) {
      track.optimize();
    }
  }

  /**
   * Creates a deep copy of this clip.
   * @returns A new AnimClip with cloned tracks and events
   */
  clone(): AnimClip {
    const clip = new AnimClip(this.name, this.duration);
    
    for (const track of this.tracks) {
      clip.addTrack(track.clone());
    }
    
    clip.events = this.events.map(event => ({
      time: event.time,
      name: event.name,
      data: event.data
    }));
    
    return clip;
  }

  /**
   * Gets the count of tracks in this clip.
   * @returns Number of tracks
   */
  getTrackCount(): number {
    return this.tracks.length;
  }

  /**
   * Finds a track by name.
   * @param name - Path/name of the track
   * @returns The track if found, null otherwise
   * @throws {Error} If name is empty or not a string
   */
  getTrack(name: string): AnimTrack | null {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Track name must be a non-empty string');
    }

    return this.tracks.find(track => track.path === name) ?? null;
  }

  /**
   * Adds an event to the clip.
   * @param time - Time in seconds when the event fires
   * @param name - Name of the event
   * @param data - Optional data payload
   * @throws {Error} If time is not finite or name is invalid
   */
  addEvent(time: number, name: string, data?: any): void {
    if (!Number.isFinite(time)) {
      throw new Error('Event time must be a finite number');
    }
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Event name must be a non-empty string');
    }

    this.events.push({ time, name, data });
    this.events.sort((a, b) => a.time - b.time);
  }

  /**
   * Removes all events with the given name.
   * @param name - Name of events to remove
   * @returns Number of events removed
   * @throws {Error} If name is invalid
   */
  removeEvents(name: string): number {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Event name must be a non-empty string');
    }

    const before = this.events.length;
    this.events = this.events.filter(event => event.name !== name);
    return before - this.events.length;
  }

  /**
   * Gets all events within a time range.
   * @param startTime - Start of range (inclusive)
   * @param endTime - End of range (inclusive)
   * @returns Array of events in range
   * @throws {Error} If time parameters are invalid
   */
  getEventsInRange(startTime: number, endTime: number): AnimEvent[] {
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      throw new Error('Start and end times must be finite numbers');
    }
    if (startTime > endTime) {
      throw new Error('Start time must be less than or equal to end time');
    }

    return this.events.filter(event => event.time >= startTime && event.time <= endTime);
  }

  /**
   * Clears all tracks and events.
   */
  clear(): void {
    this.tracks.length = 0;
    this.events.length = 0;
    this.duration = 0;
  }

  /**
   * Serializes the clip to a plain object.
   * @returns Plain object representation
   */
  toJSON(): any {
    return {
      name: this.name,
      duration: this.duration,
      tracks: this.tracks.map(track => track.toJSON()),
      events: this.events.map(event => ({
        time: event.time,
        name: event.name,
        data: event.data
      }))
    };
  }

  /**
   * Creates an AnimClip from a JSON object.
   * @param json - Serialized clip data
   * @returns New AnimClip instance
   * @throws {Error} If JSON is invalid
   */
  static fromJSON(json: any): AnimClip {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON data');
    }

    const clip = new AnimClip(json.name || '', json.duration || 0);

    if (Array.isArray(json.tracks)) {
      for (const trackData of json.tracks) {
        const track = AnimTrack.fromJSON(trackData);
        clip.addTrack(track);
      }
    }

    if (Array.isArray(json.events)) {
      for (const event of json.events) {
        if (typeof event.time === 'number' && typeof event.name === 'string') {
          clip.addEvent(event.time, event.name, event.data);
        }
      }
    }

    return clip;
  }
}
