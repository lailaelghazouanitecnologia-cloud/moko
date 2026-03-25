/**
 * High-precision timing control
 */
export class Timer {
  private id: number;
  private startTime: number;
  private duration: number;
  private running: boolean;
  private repeat: boolean;
  private timeoutId: NodeJS.Timeout | number | null = null;

  constructor() {
    this.id = Math.random();
    this.startTime = 0;
    this.duration = 0;
    this.running = false;
    this.repeat = false;
  }

  /**
   * Begin countdown
   * @param duration Time in milliseconds
   * @param repeat Whether to repeat the timer
   * @throws {TypeError} If duration is not a positive number
   */
  start(duration: number, repeat: boolean = false): void {
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
      throw new TypeError('Duration must be a positive number');
    }
    if (typeof repeat !== 'boolean') {
      throw new TypeError('Repeat must be a boolean');
    }

    this.stop();
    this.duration = duration;
    this.repeat = repeat;
    this.startTime = Date.now();
    this.running = true;

    const tick = () => {
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= this.duration) {
        if (this.repeat) {
          this.startTime = Date.now();
          this.timeoutId = setTimeout(tick, this.duration);
        } else {
          this.running = false;
        }
      } else {
        this.timeoutId = setTimeout(tick, this.duration - elapsed);
      }
    };

    this.timeoutId = setTimeout(tick, this.duration);
  }

  /**
   * Cancel timer
   */
  stop(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId as any);
      this.timeoutId = null;
    }
    this.running = false;
  }

  /**
   * Restart from zero
   */
  reset(): void {
    this.stop();
    this.startTime = Date.now();
    if (this.duration > 0) {
      this.start(this.duration, this.repeat);
    }
  }

  /**
   * Get time passed
   * @returns Time in milliseconds
   */
  elapsed(): number {
    if (!this.running) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Get time left
   * @returns Time in milliseconds
   */
  remaining(): number {
    if (!this.running) return 0;
    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.duration - elapsed);
  }

  /**
   * Check active state
   * @returns True if timer is running
   */
  isRunning(): boolean {
    return this.running;
  }
}
