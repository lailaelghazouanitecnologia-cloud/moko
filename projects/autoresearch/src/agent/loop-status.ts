/**
 * Current status of the autonomous loop.
 * This interface tracks the runtime state of an agent's execution loop.
 */
export interface LoopStatus {
  /**
   * Indicates whether the loop is currently running.
   */
  running: boolean;

  /**
   * The number of iterations the loop has completed since it started.
   */
  iteration: number;

  /**
   * The last error encountered during loop execution, if any.
   * Reset to `null` on successful iteration.
   */
  lastError: Error | null;

  /**
   * The timestamp when the loop started.
   * Used to calculate total runtime.
   */
  startTime: Date;

  /**
   * The timestamp of the most recent iteration.
   * `null` if no iteration has completed yet.
   */
  lastIterationTime: Date | null;
}
