/**
 * Fixed-timestep game loop with accumulator pattern.
 * Ensures deterministic simulation regardless of frame rate.
 */

export interface GameLoopCallbacks {
  /** Called each fixed-step update with deltaTime in seconds */
  update(deltaTime: number): void;
  /** Called after all updates for the current frame */
  render(): void;
}

export class GameLoop {
  /** Fixed timestep in seconds (default: 100ms per tick for an RTS) */
  private readonly _tickRate: number;
  private _accumulator: number = 0;
  private _lastTime: number = 0;
  private _running: boolean = false;
  private _tick: number = 0;
  private _timer: NodeJS.Timeout | null = null;
  private readonly _callbacks: GameLoopCallbacks;

  constructor(callbacks: GameLoopCallbacks, ticksPerSecond: number = 10) {
    this._tickRate = 1.0 / ticksPerSecond;
    this._callbacks = callbacks;
  }

  /** Current simulation tick count */
  get tick(): number {
    return this._tick;
  }

  /** Whether the loop is currently running */
  get running(): boolean {
    return this._running;
  }

  /** Seconds per tick */
  get tickRate(): number {
    return this._tickRate;
  }

  /** Start the game loop */
  start(): void {
    if (this._running) return;
    this._running = true;
    this._lastTime = Date.now();

    // Use setInterval for a node-based loop (no requestAnimationFrame)
    const intervalMs = Math.max(1, Math.floor(this._tickRate * 1000));
    this._timer = setInterval(() => this._frame(), intervalMs);
  }

  /** Stop the game loop */
  stop(): void {
    this._running = false;
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Manually advance one tick. Useful for turn-based or step-through debugging.
   */
  stepOnce(): void {
    this._callbacks.update(this._tickRate);
    this._tick++;
    this._callbacks.render();
  }

  /** Internal frame handler */
  private _frame(): void {
    if (!this._running) return;

    const now = Date.now();
    const elapsed = (now - this._lastTime) / 1000; // convert to seconds
    this._lastTime = now;

    // Clamp to prevent spiral of death
    this._accumulator += Math.min(elapsed, 0.25);

    while (this._accumulator >= this._tickRate) {
      this._callbacks.update(this._tickRate);
      this._tick++;
      this._accumulator -= this._tickRate;
    }

    this._callbacks.render();
  }
}
