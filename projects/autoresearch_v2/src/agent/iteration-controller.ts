import { MutationStrategy } from '../mutation/mutation-strategy';
import { ExperimentResult } from '../experiment/experiment-result';

interface MutationHistory {
  strategy: MutationStrategy;
  result: ExperimentResult;
  timestamp: number;
}

/**
 * Manages iteration state and mutation history for the evolutionary agent.
 * Tracks the best performing mutations and provides statistics for analysis.
 */
export class IterationController {
  private history: MutationHistory[] = [];
  private bestScore: number = 0;
  private mutationCount: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Records a mutation attempt with its strategy and result.
   * @param strategy - The mutation strategy used for this attempt
   * @param result - The result of the mutation experiment
   * @throws {Error} If strategy or result is invalid
   */
  recordMutation(strategy: MutationStrategy, result: ExperimentResult): void {
    if (!strategy) {
      throw new Error('Strategy is required');
    }
    if (!result) {
      throw new Error('Result is required');
    }
    if (typeof result.getMetrics !== 'function') {
      throw new Error('Invalid result: missing getMetrics method');
    }

    this.history.push({
      strategy,
      result,
      timestamp: Date.now()
    });
    this.mutationCount++;
  }

  /**
   * Retrieves the best performing mutation strategy from history.
   * @returns The strategy that achieved the highest F1 score
   * @throws {Error} If no mutations have been recorded
   */
  getBestStrategy(): MutationStrategy {
    if (this.history.length === 0) {
      throw new Error('No mutations recorded');
    }

    let bestStrategy = this.history[0].strategy;
    let bestScore = this.getF1ScoreFromEntry(this.history[0]);

    for (const entry of this.history) {
      const score = this.getF1ScoreFromEntry(entry);
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = entry.strategy;
      }
    }

    return bestStrategy;
  }

  /**
   * Gets mutation statistics including total and successful count.
   * A mutation is considered successful if it improved the best score.
   * @returns Object containing total and successful mutation counts
   */
  getMutationStats(): { total: number; successful: number } {
    let successful = 0;
    
    for (const entry of this.history) {
      const score = this.getF1ScoreFromEntry(entry);
      if (score > this.bestScore) {
        successful++;
      }
    }

    return {
      total: this.mutationCount,
      successful
    };
  }

  /**
   * Resets the controller state by clearing history and counters.
   */
  reset(): void {
    this.history = [];
    this.bestScore = 0;
    this.mutationCount = 0;
  }

  /**
   * Updates the best score if the provided score is higher.
   * @param score - The new score to evaluate
   * @throws {Error} If score is not a valid number
   */
  updateBestScore(score: number): void {
    if (typeof score !== 'number' || isNaN(score)) {
      throw new Error('Score must be a valid number');
    }
    if (score > this.bestScore) {
      this.bestScore = score;
    }
  }

  /**
   * Gets the F1 score from a mutation history entry.
   * @private
   * @param entry - The mutation history entry
   * @returns The F1 score value
   * @throws {Error} If metrics are invalid
   */
  private getF1ScoreFromEntry(entry: MutationHistory): number {
    try {
      const metrics = entry.result.getMetrics();
      if (typeof metrics?.f1Score !== 'number' || isNaN(metrics.f1Score)) {
        throw new Error('Invalid F1 score in metrics');
      }
      return metrics.f1Score;
    } catch (error) {
      throw new Error(`Failed to get F1 score from entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the current best score.
   * @returns The best score recorded so far
   */
  getBestScore(): number {
    return this.bestScore;
  }

  /**
   * Gets the mutation history.
   * @returns Copy of the mutation history array
   */
  getHistory(): MutationHistory[] {
    return [...this.history];
  }

  /**
   * Gets the total number of mutations recorded.
   * @returns The mutation count
   */
  getMutationCount(): number {
    return this.mutationCount;
  }

  /**
   * Checks if any mutations have been recorded.
   * @returns True if mutations exist, false otherwise
   */
  hasMutations(): boolean {
    return this.history.length > 0;
  }

  /**
   * Gets the most recent mutation entry.
   * @returns The latest mutation history entry
   * @throws {Error} If no mutations have been recorded
   */
  getLatestMutation(): MutationHistory {
    if (this.history.length === 0) {
      throw new Error('No mutations recorded');
    }
    return this.history[this.history.length - 1];
  }
}