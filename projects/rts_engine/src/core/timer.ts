/**
 * Simple high-resolution timer for measuring elapsed time in milliseconds.
 */
export class Timer {
    private startTime: number = 0;
    private endTime: number = 0;
    private running: boolean = false;

    /**
     * Starts the timer if it is not already running.
     * If the timer was previously stopped, calling start again will restart timing from the current moment.
     */
    start(): void {
        if (!this.running) {
            this.startTime = performance.now();
            this.running = true;
        }
    }

    /**
     * Stops the timer if it is currently running.
     * Once stopped, the elapsed time is fixed until the timer is reset or restarted.
     */
    stop(): void {
        if (this.running) {
            this.endTime = performance.now();
            this.running = false;
        }
    }

    /**
     * Resets the timer to its initial state.
     * All timing data is cleared and the timer is stopped.
     */
    reset(): void {
        this.startTime = 0;
        this.endTime = 0;
        this.running = false;
    }

    /**
     * Returns the elapsed time in milliseconds.
     * - If the timer is running, returns the time elapsed since the last start.
     * - If the timer is stopped, returns the time elapsed between the last start and stop.
     *
     * @returns Elapsed time in milliseconds. Returns 0 if the timer has never been started.
     */
    elapsed(): number {
        if (!this.startTime) return 0;
        if (this.running) {
            return performance.now() - this.startTime;
        } else {
            return this.endTime - this.startTime;
        }
    }

    /**
     * Checks whether the timer is currently running.
     *
     * @returns `true` if the timer is running; otherwise, `false`.
     */
    isRunning(): boolean {
        return this.running;
    }
}
