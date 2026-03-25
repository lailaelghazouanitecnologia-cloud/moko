/**
 * FeedbackLoop — drives iterative refinement of a research artifact.
 *
 * Given an initial state, an evaluation function (returns a numeric score),
 * and a refinement function, the loop runs until convergence is detected
 * or the maximum iteration count is reached.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface IterationRecord<S> {
  iteration: number;
  state: S;
  score: number;
  delta: number;
  timestamp: number;
}

export interface FeedbackProgress {
  iteration: number;
  score: number;
  improving: boolean;
  converged: boolean;
}

export type EvaluateFn<S> = (state: S) => Promise<number> | number;
export type RefineFn<S> = (state: S, score: number) => Promise<S> | S;

// ── FeedbackLoop ─────────────────────────────────────────────────────

export class FeedbackLoop<S = unknown> {
  public maxIterations: number;
  public convergenceThreshold: number;
  public history: IterationRecord<S>[] = [];

  private stagnationWindow: number;

  /**
   * @param maxIterations        Upper bound on iterations.
   * @param convergenceThreshold Minimum score improvement between
   *                             consecutive iterations to be considered
   *                             "still improving".
   * @param stagnationWindow     How many consecutive non-improving
   *                             iterations are tolerated before stopping.
   */
  constructor(
    maxIterations = 10,
    convergenceThreshold = 0.01,
    stagnationWindow = 3
  ) {
    this.maxIterations = maxIterations;
    this.convergenceThreshold = convergenceThreshold;
    this.stagnationWindow = stagnationWindow;
  }

  // ── Core loop ───────────────────────────────────────────────────

  /**
   * Run the refinement loop.
   *
   * Returns the final state after the loop terminates (either by
   * convergence or by hitting the iteration cap).
   */
  async run(
    initialState: S,
    evaluateFn: EvaluateFn<S>,
    refineFn: RefineFn<S>
  ): Promise<S> {
    this.history = [];

    let state = initialState;
    let previousScore: number | null = null;
    let stagnationCount = 0;

    for (let i = 0; i < this.maxIterations; i++) {
      const score = await evaluateFn(state);
      const delta =
        previousScore !== null ? score - previousScore : score;

      this.history.push({
        iteration: i,
        state,
        score,
        delta,
        timestamp: Date.now(),
      });

      // Convergence / stagnation check (skip the first iteration)
      if (previousScore !== null) {
        if (!this.shouldContinue(score, previousScore)) {
          stagnationCount++;
          if (stagnationCount >= this.stagnationWindow) {
            // Converged — the score has plateaued.
            break;
          }
        } else {
          stagnationCount = 0;
        }
      }

      // Don't refine after the last allowed iteration
      if (i < this.maxIterations - 1) {
        state = await refineFn(state, score);
      }

      previousScore = score;
    }

    return state;
  }

  // ── Helpers ─────────────────────────────────────────────────────

  /**
   * Returns true if the improvement from `previous` to `current` is
   * large enough to justify continuing.
   */
  shouldContinue(current: number, previous: number): boolean {
    const improvement = current - previous;
    return improvement > this.convergenceThreshold;
  }

  /**
   * Snapshot of the loop's progress (safe to call while running if
   * the caller has access via a shared reference).
   */
  getProgress(): FeedbackProgress {
    if (this.history.length === 0) {
      return { iteration: 0, score: 0, improving: false, converged: false };
    }

    const latest = this.history[this.history.length - 1];
    const prev =
      this.history.length >= 2
        ? this.history[this.history.length - 2]
        : undefined;

    const improving = prev
      ? latest.score - prev.score > this.convergenceThreshold
      : true;

    // Determine convergence: count recent non-improving iterations
    let stagnation = 0;
    for (let i = this.history.length - 1; i >= 1; i--) {
      const delta = this.history[i].score - this.history[i - 1].score;
      if (delta <= this.convergenceThreshold) {
        stagnation++;
      } else {
        break;
      }
    }

    const converged = stagnation >= this.stagnationWindow;

    return {
      iteration: latest.iteration,
      score: latest.score,
      improving,
      converged,
    };
  }

  /**
   * Clear all iteration history.
   */
  reset(): void {
    this.history = [];
  }
}
