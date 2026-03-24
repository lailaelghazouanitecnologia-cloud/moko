/**
 * High-precision timer with pause/resume capabilities.
 * Tracks elapsed time in milliseconds with sub-millisecond precision.
 */
export class Timer {
  private startTime: number = 0;
  private pausedAt: number = 0;
  private running: boolean = false;

  /**
   * Starts the timer. If already running, resets and starts anew.
   * @throws {Error} If performance.now() is not available
   */
  start(): void {
    this.validatePerformanceAPI();
    this.startTime = performance.now();
    this.running = true;
    this.pausedAt = 0;
  }

  /**
   * Stops the timer and returns the total elapsed time in milliseconds.
   * @returns {number} Total elapsed time in milliseconds
   * @throws {Error} If timer has not been started
   */
  stop(): number {
    if (!this.hasStarted()) {
      throw new Error('Timer has not been started');
    }
    const elapsed = this.elapsed();
    this.reset();
    return elapsed;
  }

  /**
   * Pauses the timer if currently running.
   * @throws {Error} If timer has not been started
   */
  pause(): void {
    if (!this.hasStarted()) {
      throw new Error('Timer has not been started');
    }
    if (!this.running) return;
    this.pausedAt = performance.now();
    this.running = false;
  }

  /**
   * Resumes the timer from a paused state.
   * @throws {Error} If timer has not been started or is not paused
   */
  resume(): void {
    if (!this.hasStarted()) {
      throw new Error('Timer has not been started');
    }
    if (this.running) return;
    if (!this.isPaused()) {
      throw new Error('Timer is not paused');
    }
    const pausedDuration = performance.now() - this.pausedAt;
    this.startTime += pausedDuration;
    this.running = true;
    this.pausedAt = 0;
  }

  /**
   * Resets the timer to its initial state.
   */
  reset(): void {
    this.startTime = 0;
    this.pausedAt = 0;
    this.running = false;
  }

  /**
   * Gets the elapsed time in milliseconds since the timer started.
   * @returns {number} Elapsed time in milliseconds
   * @throws {Error} If timer has not been started
   */
  elapsed(): number {
    if (!this.hasStarted()) {
      throw new Error('Timer has not been started');
    }
    if (!this.running) {
      return this.pausedAt > 0 ? this.pausedAt - this.startTime : 0;
    }
    return performance.now() - this.startTime;
  }

  /**
   * Checks if the timer is currently paused.
   * @returns {boolean} True if paused, false otherwise
   */
  isPaused(): boolean {
    return !this.running && this.pausedAt > 0;
  }

  /**
   * Checks if the timer is currently running.
   * @returns {boolean} True if running, false otherwise
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Gets the current state of the timer.
   * @returns {{isRunning: boolean, isPaused: boolean, elapsed: number}} Current state
   */
  getState(): { isRunning: boolean; isPaused: boolean; elapsed: number } {
    return {
      isRunning: this.running,
      isPaused: this.isPaused(),
      elapsed: this.hasStarted() ? this.elapsed() : 0
    };
  }

  /**
   * Validates that the performance API is available.
   * @private
   * @throws {Error} If performance.now() is not available
   */
  private validatePerformanceAPI(): void {
    if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
      throw new Error('Performance API is not available in this environment');
    }
  }

  /**
   * Checks if the timer has been started.
   * @private
   * @returns {boolean} True if started, false otherwise
   */
  private hasStarted(): boolean {
    return this.startTime > 0;
  }
}
