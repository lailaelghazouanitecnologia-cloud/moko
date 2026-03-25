/**
 * Timer utility for scheduling delayed and repeating actions.
 * Integrated with the game loop's tick-based time.
 */

interface TimerEntry {
  readonly id: number;
  readonly callback: () => void;
  readonly interval: number;
  readonly repeating: boolean;
  remaining: number;
  cancelled: boolean;
}

export class Timer {
  private static _nextId = 0;
  private readonly _timers: Map<number, TimerEntry> = new Map();

  /**
   * Schedule a one-shot callback after `delay` seconds of game time.
   * Returns a handle that can be used to cancel.
   */
  after(delay: number, callback: () => void): number {
    const id = Timer._nextId++;
    this._timers.set(id, {
      id,
      callback,
      interval: delay,
      repeating: false,
      remaining: delay,
      cancelled: false,
    });
    return id;
  }

  /**
   * Schedule a repeating callback every `interval` seconds of game time.
   * Returns a handle that can be used to cancel.
   */
  every(interval: number, callback: () => void): number {
    const id = Timer._nextId++;
    this._timers.set(id, {
      id,
      callback,
      interval,
      repeating: true,
      remaining: interval,
      cancelled: false,
    });
    return id;
  }

  /** Cancel a scheduled timer by handle */
  cancel(id: number): boolean {
    const entry = this._timers.get(id);
    if (entry) {
      entry.cancelled = true;
      this._timers.delete(id);
      return true;
    }
    return false;
  }

  /** Cancel all timers */
  cancelAll(): void {
    this._timers.clear();
  }

  /**
   * Advance all timers by deltaTime seconds.
   * Should be called once per game loop tick.
   */
  update(deltaTime: number): void {
    const toRemove: number[] = [];

    for (const [id, entry] of this._timers) {
      if (entry.cancelled) {
        toRemove.push(id);
        continue;
      }

      entry.remaining -= deltaTime;

      if (entry.remaining <= 0) {
        entry.callback();

        if (entry.repeating) {
          // Reset with any leftover time carried forward
          entry.remaining += entry.interval;
        } else {
          toRemove.push(id);
        }
      }
    }

    for (const id of toRemove) {
      this._timers.delete(id);
    }
  }

  /** Number of active timers */
  get activeCount(): number {
    return this._timers.size;
  }
}
