import { HypothesisEvaluator } from './hypothesis-evaluator';
import { EvidenceRanker } from './evidence-ranker';

/**
 * Orchestrates the research process by planning, executing and validating research steps.
 * Manages hypotheses evaluation and evidence ranking throughout the research lifecycle.
 */
export class ResearchPlanner {
    private hypotheses: HypothesisEvaluator[];
    private evidencePool: EvidenceRanker[];
    private currentStep: number;
    private completedSteps: string[];

    constructor() {
        this.hypotheses = [];
        this.evidencePool = [];
        this.currentStep = 0;
        this.completedSteps = [];
    }

    /**
     * Generates a comprehensive sequence of research steps for the given topic.
     * @param topic - The research topic to plan for
     * @returns Array of research step descriptions
     * @throws {Error} If topic is invalid
     */
    planResearch(topic: string): string[] {
        if (typeof topic !== 'string' || topic.trim().length === 0) {
            throw new Error('Invalid topic: must be a non-empty string');
        }

        const steps: string[] = [];
        
        // Define research phases
        steps.push('Define research objectives');
        steps.push('Formulate initial hypotheses');
        steps.push('Gather preliminary evidence');
        steps.push('Evaluate hypotheses');
        steps.push('Collect supporting evidence');
        steps.push('Analyze evidence quality');
        steps.push('Refine hypotheses');
        steps.push('Validate findings');
        steps.push('Synthesize conclusions');
        steps.push('Document results');
        
        return steps;
    }

    /**
     * Registers a new hypothesis evaluator for the research process.
     * @param evaluator - The hypothesis evaluator to add
     * @throws {Error} If evaluator is invalid
     */
    addHypothesis(evaluator: HypothesisEvaluator): void {
        if (!evaluator || typeof evaluator.evaluate !== 'function') {
            throw new Error('Invalid hypothesis evaluator: must be a valid HypothesisEvaluator instance');
        }
        this.hypotheses.push(evaluator);
    }

    /**
     * Registers a new evidence ranker for evaluating evidence quality.
     * @param ranker - The evidence ranker to add
     * :throws {Error} If ranker is invalid
     */
    addEvidenceRanker(ranker: EvidenceRanker): void {
        if (!ranker || typeof ranker.rank !== 'function') {
            throw new Error('Invalid evidence ranker: must be a valid EvidenceRanker instance');
        }
        this.evidencePool.push(ranker);
    }

    /**
     * Executes a specific research step by index.
     * @param stepIndex - The index of the step to execute
     * @returns True if step was executed successfully, false otherwise
     * @throws {Error} If stepIndex is invalid
     */
    executeStep(stepIndex: number): boolean {
        if (!Number.isInteger(stepIndex) || stepIndex < 0) {
            throw new Error('Invalid stepIndex: must be a non-negative integer');
        }

        const remainingSteps = this.getRemainingSteps();
        if (stepIndex >= remainingSteps.length) {
            return false;
        }
        
        const step = remainingSteps[stepIndex];
        
        // Execute the step logic
        this.completedSteps.push(step);
        this.currentStep = this.completedSteps.length;
        
        return true;
    }

    /**
     * Advances to the next research step in the sequence.
     * @returns True if advanced successfully, false if no steps remain
     */
    advanceStep(): boolean {
        const remaining = this.getRemainingSteps();
        if (remaining.length === 0) {
            return false;
        }
        
        return this.executeStep(0);
    }

    /**
     * Gets the list of remaining research steps.
     * @returns Array of remaining step descriptions
     */
    getRemainingSteps(): string[] {
        const allSteps = this.planResearch('');
        return allSteps.slice(this.currentStep);
    }

    /**
     * Resets the research plan to the initial state.
     * Clears all completed steps and resets the current step counter.
     */
    resetPlan(): void {
        this.currentStep = 0;
        this.completedSteps = [];
    }

    /**
     * Validates that the research plan has required components.
     * @returns True if plan has at least one hypothesis and one evidence ranker
     */
    validatePlan(): boolean {
        return this.hypotheses.length > 0 && this.evidencePool.length > 0;
    }

    /**
     * Gets the current step number.
     * @returns Current step index
     */
    getCurrentStep(): number {
        return this.currentStep;
    }

    /**
     * Gets the list of completed steps.
     * @returns Array of completed step descriptions
     */
    getCompletedSteps(): string[] {
        return [...this.completedSteps];
    }

    /**
     * Gets the total number of steps in the research plan.
     * @returns Total number of steps
     */
    getTotalSteps(): number {
        return this.planResearch('').length;
    }

    /**
     * Checks if the research is complete.
     * @returns True if all steps are completed
     */
    isComplete(): boolean {
        return this.currentStep >= this.getTotalSteps();
    }

    /**
     * Gets the progress percentage of the research plan.
     * @returns Percentage complete (0-100)
     */
    getProgressPercentage(): number {
        const total = this.getTotalSteps();
        if (total === 0) return 0;
        return Math.min(100, Math.round((this.currentStep / total) * 100));
    }

    /**
     * Gets the next step to be executed.
     * @returns Next step description or null if complete
     */
    getNextStep(): string | null {
        const remaining = this.getRemainingSteps();
        return remaining.length > 0 ? remaining[0] : null;
    }

    /**
     * Gets the previous step that was completed.
     * @returns Previous step description or null if none completed
     */
    getPreviousStep(): string | null {
        return this.completedSteps.length > 0 ? this.completedSteps[this.completedSteps.length - 1] : null;
    }

    /**
     * Gets the number of remaining steps.
     * @returns Number of steps remaining
     */
    getRemainingStepCount(): number {
        return this.getRemainingSteps().length;
    }

    /**
     * Gets the number of completed steps.
     * :returns Number of completed steps
     */
    getCompletedStepCount(): number {
        return this.completedSteps.length;
    }

    /**
     * Gets the list of registered hypothesis evaluators.
     * @returns Array of hypothesis evaluators
     */
    getHypotheses(): HypothesisEvaluator[] {
        return [...this.hypotheses];
    }

    /**
     * Gets the list of registered evidence rankers.
     * @returns Array of evidence rankers
     */
    getEvidenceRankers(): EvidenceRanker[] {
        return [...this.evidencePool];
    }

    /**
     * Clears all hypotheses from the research plan.
     */
    clearHypotheses(): void {
        this.hypotheses = [];
    }

    /**
     * Clears all evidence rankers from the research plan.
     */
    clearEvidenceRankers(): void {
        this.evidencePool = [];
    }

    /**
     * Gets a summary of the current research state.
     * @returns Object containing current state information
     */
    getState(): {
        currentStep: number;
        completedSteps: string[];
        remainingSteps: string[];
        isComplete: boolean;
        progressPercentage: number;
        hasHypotheses: boolean;
        hasEvidenceRankers: boolean;
        isValid: boolean;
    } {
        return {
            currentStep: this.currentStep,
            completedSteps: [...this.completedSteps],
            remainingSteps: this.getRemainingSteps(),
            isComplete: this.isComplete(),
            progressPercentage: this.getProgressPercentage(),
            hasHypotheses: this.hypotheses.length > 0,
            hasEvidenceRankers: this.evidencePool.length > 0,
            isValid: this.validatePlan()
        };
    }
}
