import { IterationController } from './iteration-controller';
import { MutationStrategy } from '../mutation/mutation-strategy';
import { ExperimentResult } from '../experiment/experiment-result';
import { ExperimentRunner } from '../experiment/experiment-runner';

/**
 * Orchestrates research loop with mutations and experiments.
 */
export class ResearchAgent {
  private controller: IterationController;
  private maxIterations: number;
  private currentIteration: number;

  /**
   * Creates an instance of ResearchAgent.
   * @param controller - The iteration controller for managing mutations and records.
   * @param maxIterations - The maximum number of iterations for the research loop.
   * @throws {Error} If controller is not provided or maxIterations is not a positive integer.
   */
  constructor(controller: IterationController, maxIterations: number) {
    if (!controller) {
      throw new Error('IterationController is required');
    }
    if (!Number.isInteger(maxIterations) || maxIterations <= 0) {
      throw new Error('maxIterations must be a positive integer');
    }

    this.controller = controller;
    this.maxIterations = maxIterations;
    this.currentIteration = 0;
  }

  /**
   * Runs the main research loop.
   * @returns A promise that resolves when the loop completes.
   * @throws {Error} If an error occurs during the experiment or mutation process.
   */
  async run(): Promise<void> {
    try {
      while (this.shouldContinue()) {
        this.currentIteration++;
        this.logProgress(this.currentIteration);

        const strategy = this.decideMutation();
        const result = await this.triggerExperiment(strategy);

        if (this.retainImprovement(result)) {
          this.updateState(result);
        }

        this.controller.recordMutation(strategy, result);
      }
    } catch (error) {
      this.handleError('run', error);
      throw error;
    }
  }

  /**
   * Decides the next mutation strategy based on historical success rates.
   * @returns The selected mutation strategy.
   * @throws {Error} If mutation stats cannot be retrieved.
   */
  decideMutation(): MutationStrategy {
    try {
      const stats = this.controller.getMutationStats();
      const total = stats.total;
      const successful = stats.successful;

      if (total === 0) {
        return { type: 'random', intensity: 0.5 };
      }

      const successRate = successful / total;
      if (successRate < 0.3) {
        return { type: 'conservative', intensity: 0.2 };
      } else if (successRate < 0.7) {
        return { type: 'balanced', intensity: 0.5 };
      } else {
        return { type: 'aggressive', intensity: 0.8 };
      }
    } catch (error) {
      this.handleError('decideMutation', error);
      return { type: 'random', intensity: 0.5 };
    }
  }

  /**
   * Triggers an experiment with the given mutation strategy.
   * @param strategy - The mutation strategy to test.
   * @returns A promise that resolves with the experiment result.
   * @throws {Error} If the experiment fails or parameters are invalid.
   */
  async triggerExperiment(strategy: MutationStrategy): Promise<ExperimentResult> {
    if (!strategy || typeof strategy.type !== 'string' || typeof strategy.intensity !== 'number') {
      throw new Error('Invalid MutationStrategy provided');
    }

    try {
      const runner = new ExperimentRunner({
        name: `experiment-${this.currentIteration}`,
        iterations: 100,
        timeout: 30000,
        parameters: { strategy },
        metrics: ['accuracy', 'f1Score']
      });

      return await runner.run();
    } catch (error) {
      this.handleError('triggerExperiment', error);
      throw new Error(`Experiment failed for strategy: ${strategy.type}`);
    }
  }

  /**
   * Determines whether to retain the improvement based on the experiment result.
   * @param result - The result of the experiment.
   * @returns True if the improvement should be retained, false otherwise.
   * @throws {Error} If the result is invalid or metrics are missing.
   */
  retainImprovement(result: ExperimentResult): boolean {
    if (!result || !result.metrics || typeof result.metrics.f1Score !== 'number') {
      throw new Error('Invalid ExperimentResult provided');
    }

    try {
      const currentBest = this.controller.getBestStrategy();
      if (!currentBest) return true;

      const currentMetrics = this.controller.getBestScore();
      return result.metrics.f1Score > currentMetrics;
    } catch (error) {
      this.handleError('retainImprovement', error);
      return false;
    }
  }

  /**
   * Updates the state with the new best score from the experiment result.
   * @param result - The result containing the new score.
   * @throws {Error} If the result is invalid or update fails.
   */
  updateState(result: ExperimentResult): void {
    if (!result || !result.metrics || typeof result.metrics.f1Score !== 'number') {
      throw new Error('Invalid ExperimentResult provided for update');
    }

    try {
      this.controller.updateBestScore(result.metrics.f1Score);
    } catch (error) {
      this.handleError('updateState', error);
      throw new Error('Failed to update state with new score');
    }
  }

  /**
   * Checks if the research loop should continue based on iteration limits.
   * @returns True if the loop should continue, false otherwise.
   */
  shouldContinue(): boolean {
    return this.currentIteration < this.maxIterations;
  }

  /**
   * Logs the current progress of the iteration.
   * @param iteration - The current iteration number.
   */
  logProgress(iteration: number): void {
    if (!Number.isInteger(iteration) || iteration < 0) {
      console.warn('[ResearchAgent] Invalid iteration number provided to logProgress');
      return;
    }
    console.log(`[ResearchAgent] Iteration ${iteration}/${this.maxIterations}`);
  }

  /**
   * Handles errors by logging them and optionally performing recovery actions.
   * @param context - The context in which the error occurred.
   * @param error - The error that occurred.
   */
  private handleError(context: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ResearchAgent] Error in ${context}: ${message}`);
  }

  /**
   * Gets the current iteration number.
   * @returns The current iteration number.
   */
  getCurrentIteration(): number {
    return this.currentIteration;
  }

  /**
   * Gets the maximum iteration limit.
   * @returns The maximum iteration limit.
   */
  getMaxIterations(): number {
    return this.maxIterations;
  }

  /**
   * Resets the agent to initial state for reuse.
   */
  reset(): void {
    this.currentIteration = 0;
  }
}