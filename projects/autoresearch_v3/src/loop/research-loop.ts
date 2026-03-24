import { VersionControl } from './version-control';
import { ScriptMutator } from '../script_mutator/script-mutator';
import { MetricComputer } from '../evaluator/metric-computer';

/**
 * Orchestrates the mutate-run-eval loop for script optimization.
 * Iteratively improves a script until the budget is exhausted.
 */
export class ResearchLoop {
  private budget: number;
  private iteration: number;
  private vc: VersionControl;
  private bestScript: string;

  /**
   * Creates a new ResearchLoop instance.
   * @param budget - Maximum number of iterations to run
   * @param initialScript - Starting script to optimize
   * @throws {Error} If budget is not a positive integer or initialScript is empty
   */
  constructor(budget: number, initialScript: string) {
    this.validateConstructorInputs(budget, initialScript);
    
    this.budget = budget;
    this.iteration = 0;
    this.vc = new VersionControl();
    this.bestScript = initialScript;
  }

  /**
   * Runs the optimization loop until budget is exhausted.
   * Each iteration mutates the best script, evaluates it, and keeps improvements.
   */
  run(): void {
    try {
      while (this.hasBudget()) {
        this.iteration++;
        
        const variant = this.mutate(this.bestScript);
        const score = this.evaluate(variant);
        
        const improved = this.commitIfImproved(variant, score);
        if (!improved) {
          this.discardIfFailed(variant, score);
        }
      }
    } catch (error) {
      this.handleLoopError(error);
    }
  }

  /**
   * Creates a mutated variant of the provided script.
   * @param script - Original script to mutate
   * @returns Mutated script variant
   * @throws {Error} If script is invalid or mutation fails
   */
  mutate(script: string): string {
    this.validateScriptInput(script, 'mutate');
    
    try {
      const mutator = new ScriptMutator();
      mutator.load(script);
      const patchSet = mutator.generate();
      return patchSet.apply(script);
    } catch (error) {
      throw new Error(`Failed to mutate script: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Evaluates a script and returns its performance score.
   * @param script - Script to evaluate
   * @returns Score value (higher is better)
   * @throws {Error} If script is invalid or evaluation fails
   */
  evaluate(script: string): number {
    this.validateScriptInput(script, 'evaluate');
    
    try {
      const computer = new MetricComputer();
      computer.setBaseline({ latency: 100, errors: 0 });
      computer.run(script);
      return computer.score();
    } catch (error) {
      throw new Error(`Failed to evaluate script: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Commits the script if its score improves upon the current best.
   * @param script - Script to potentially commit
   * @param score - Score of the script
   * @returns True if script was committed, false otherwise
   * @throws {Error} If score is invalid
   */
  commitIfImproved(script: string, score: number): boolean {
    this.validateScore(score, 'commitIfImproved');
    
    try {
      const baseline = this.evaluate(this.bestScript);
      if (score > baseline) {
        this.bestScript = script;
        this.vc.commitChanges(`Iteration ${this.iteration}: score ${score}`);
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to check improvement: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Discards scripts that failed evaluation (score <= 0).
   * @param script - Script to potentially discard
   * @param score - Score of the script
   * @throws {Error} If score is invalid
   */
  discardIfFailed(script: string, score: number): void {
    this.validateScore(score, 'discardIfFailed');
    
    // Script is discarded by not storing it
    if (score <= 0) {
      // Log discarded script for debugging if needed
      this.logDiscardedScript(script, score);
    }
  }

  /**
   * Checks if there is remaining budget for more iterations.
   * @returns True if budget remains, false otherwise
   */
  hasBudget(): boolean {
    return this.iteration < this.budget;
  }

  /**
   * Gets the current best script.
   * @returns The best script found so far
   */
  getBestScript(): string {
    return this.bestScript;
  }

  /**
   * Gets the current iteration count.
   * @returns Number of iterations completed
   */
  getIteration(): number {
    return this.iteration;
  }

  /**
   * Gets the remaining budget.
   * @returns Number of iterations remaining
   */
  getRemainingBudget(): number {
    return Math.max(0, this.budget - this.iteration);
  }

  /**
   * Validates constructor inputs.
   * @param budget - Budget to validate
   * @param initialScript - Initial script to validate
   * @throws {Error} If inputs are invalid
   */
  private validateConstructorInputs(budget: number, initialScript: string): void {
    if (!Number.isInteger(budget) || budget <= 0) {
      throw new Error('Budget must be a positive integer');
    }
    
    if (typeof initialScript !== 'string' || initialScript.trim().length === 0) {
      throw new Error('Initial script must be a non-empty string');
    }
  }

  /**
   * Validates script input for methods.
   * @param script - Script to validate
   * @param methodName - Name of the calling method for error context
   * @throws {Error} If script is invalid
   */
  private validateScriptInput(script: string, methodName: string): void {
    if (typeof script !== 'string' || script.trim().length === 0) {
      throw new Error(`${methodName} requires a non-empty script string`);
    }
  }

  /**
   * Validates score input.
   * @param score - Score to validate
   * @param methodName - Name of the calling method for error context
   * @throws {Error} If score is invalid
   */
  private validateScore(score: number, methodName: string): void {
    if (typeof score !== 'number' || !isFinite(score)) {
      throw new Error(`${methodName} requires a valid finite number score`);
    }
  }

  /**
   * Handles errors that occur during the main loop.
   * @param error - The error that occurred
   */
  private handleLoopError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`ResearchLoop terminated at iteration ${this.iteration} due to error: ${errorMessage}`);
    throw new Error(`ResearchLoop failed: ${errorMessage}`);
  }

  /**
   * Logs information about discarded scripts for debugging.
   * @param script - The discarded script
   * @param score - The score that led to discard
   */
  private logDiscardedScript(script: string, score: number): void {
    // In a real implementation, this might use a proper logger
    console.debug(`Discarded script at iteration ${this.iteration} with score ${score}`);
  }
}