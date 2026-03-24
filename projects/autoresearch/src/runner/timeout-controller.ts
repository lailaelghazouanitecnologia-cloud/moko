import { TimeoutCallback } from './timeout-callback';

/**
 * Enforces experiment duration limits by managing a countdown timer.
 * Provides methods to start, stop, extend, and check the timer status.
 */
export class TimeoutController {
  private duration: number = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isExpired: boolean = false;
  private startTime: number = 0;
  private timeoutCallbacks: TimeoutCallback[] = [];

  /**
   * Starts the countdown timer with the specified duration.
   * @param duration - The duration in milliseconds until timeout.
   * @throws {Error} If duration is not a positive number.
   */
  start(duration: number): void {
    this.validateDuration(duration);
    this.stop();
    this.duration = duration;
    this.startTime = Date.now();
    this.isExpired = false;
    this.timer = setTimeout(() => {
      this.isExpired = true;
      this.timeoutCallbacks.forEach(cb => cb());
      this.timeoutCallbacks = [];
    }, duration);
  }

  /**
   * Cancels the current timer if running.
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Adds more time to the current timer.
   * @param additional - Additional time in milliseconds.
   * @throws {Error} If additional is not a non-negative number.
   */
  extend(additional: number): void {
    this.validateAdditional(additional);
    if (this.isExpired || !this.timer) return;
    const remaining = this.getRemaining();
    this.stop();
    this.start(remaining + additional);
  }

  /**
   * Gets the remaining time in milliseconds until timeout.
   * @returns The remaining time in milliseconds.
   */
  getRemaining(): number {
    if (this.isExpired) return 0;
    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.duration - elapsed);
  }

  /**
   * Checks if the timer has expired.
   * @returns True if expired, otherwise false.
   */
  checkExpired(): boolean {
    return this.isExpired;
  }

  /**
   * Registers a callback to be invoked when the timer expires.
   * @param callback - The callback function to register.
   */
  onTimeout(callback: TimeoutCallback): void {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.timeoutCallbacks.push(callback);
  }

  /**
   * Validates the duration parameter.
   * @param duration - The duration to validate.
   * @throws {Error} If duration is not a positive number.
   */
  private validateDuration(duration: number): void {
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
      throw new Error('Duration must be a positive number');
    }
  }

  /**
   * Validates the additional time parameter.
   * @param additional - The additional time to validate.
   * @throws {Error} If additional is not a non-negative number.
   */
  private validateAdditional(additional: number): void {
    if (typeof additional !== 'number' || isNaN(additional) || additional < 0) {
      throw new Error('Additional time must be a non-negative number');
    }
  }
}
