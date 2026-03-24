import { CodeContext, Experiment, Hypothesis } from './index';

/**
 * Generates testable hypotheses from code analysis for performance and error-handling improvements.
 * Focuses on script edits only and integrates with experiment history to avoid repeated failures.
 */
export class HypothesisGenerator {
  private context: CodeContext;
  private history: ExperimentHistory;

  constructor(context: CodeContext, history: ExperimentHistory) {
    if (!context) {
      throw new Error('CodeContext is required');
    }
    if (!history) {
      throw new Error('ExperimentHistory is required');
    }
    this.context = context;
    this.history = history;
  }

  /**
   * Analyzes the provided code context and generates a ranked list of testable hypotheses.
   * Only script files are considered for performance and error-handling improvements.
   * @param context The code context to analyze
   * @returns Array of ranked hypotheses
   * @throws Error if context is invalid or analysis fails
   */
  generate(context: CodeContext): Hypothesis[] {
    if (!context || !context.files || !Array.isArray(context.files)) {
      throw new Error('Invalid code context provided');
    }

    const hypotheses: Hypothesis[] = [];
    const files = context.files;

    for (const file of files) {
      if (file.type === 'script') {
        const loops = this.analyzeLoops(file);
        for (const loop of loops) {
          hypotheses.push({
            id: `perf-${file.name}-${loop.line}`,
            description: `Optimize loop at line ${loop.line} in ${file.name} for better performance`,
            test: this.createLoopTest(file, loop),
            confidence: this.calculateConfidence(loop)
          });
        }

        const errorPrones = this.analyzeErrorHandling(file);
        for (const errorProne of errorPrones) {
          hypotheses.push({
            id: `error-${file.name}-${errorProne.line}`,
            description: `Improve error handling at line ${errorProne.line} in ${file.name}`,
            test: this.createErrorTest(file, errorProne),
            confidence: this.calculateConfidence(errorProne)
          });
        }
      }
    }

    return this.rank(hypotheses);
  }

  /**
   * Validates whether a hypothesis is feasible for implementation.
   * Checks target type, refactoring requirements, and recent failure history.
   * @param hypothesis The hypothesis to validate
   * @returns True if hypothesis is feasible
   * @throws Error if hypothesis is invalid
   */
  validate(hypothesis: Hypothesis): boolean {
    if (!hypothesis || !hypothesis.test || !hypothesis.id) {
      throw new Error('Invalid hypothesis provided');
    }

    if (!hypothesis.test.target || hypothesis.test.target.type !== 'script') {
      return false;
    }

    if (this.requiresMajorRefactor(hypothesis.test)) {
      return false;
    }

    try {
      const recentFailures = this.history.getRecentFailures(hypothesis.id, 7);
      if (recentFailures.length > 2) {
        return false;
      }
    } catch (error) {
      console.warn('Failed to check recent failures, allowing hypothesis:', error);
    }

    return true;
  }

  /**
   * Ranks hypotheses by calculated score in descending order.
   * @param hypotheses Array of hypotheses to rank
   * @returns Ranked array of hypotheses
   * @throws Error if hypotheses array is invalid
   */
  rank(hypocrites: Hypothesis[]): Hypothesis[] {
    if (!Array.isArray(hypocrites)) {
      throw new Error('Hypotheses must be an array');
    }

    return hypocrites
      .map(h => ({
        ...h,
        score: this.calculateScore(h)
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  /**
   * Merges two similar hypotheses, combining their variants and taking the higher confidence.
   * @param old Original hypothesis
   * @param newNew New hypothesis to merge
   * @returns Merged hypothesis
   * @throws Error if either hypothesis is invalid
   */
  merge(old: Hypothesis, newNew: Hypothesis): Hypothesis {
    if (!old || !newNew) {
      throw new Error('Both hypotheses are required for merging');
    }

    const mergedVariants = [
      ...(old.test?.variants || []),
      ...(newNew.test?.variants || [])
    ];

    return {
      id: newNew.id,
      description: newNew.description,
      test: {
        ...newNew.test,
        variants: mergedVariants
      },
      confidence: Math.max(old.confidence || 0, newNew.confidence || 0)
    };
  }

  /**
   * Filters out invalid hypotheses using the validate method.
   * @param hypotheses Array of hypotheses to filter
   * @returns Array of valid hypotheses
   * @throws Error if hypotheses array is invalid
   */
  filter(hypotheses: Hypothesis[]): Hypothesis[] {
    if (!Array.isArray(hypotheses)) {
      throw new Error('Hypotheses must be an array');
    }

    return hypotheses.filter(h => this.validate(h));
  }

  private calculateScore(hypothesis: Hypothesis): number {
    if (!hypothesis || typeof hypothesis.confidence !== 'number') {
      return 0;
    }

    let score = hypothesis.confidence;

    if (this.isQueueFriendly(hypothesis)) {
      score += 0.2;
    }

    if (hypothesis.test?.target?.type === 'script') {
      score += 0.1;
    }

    try {
      const failures = this.history.getFailures(hypothesis.id);
      score -= (failures.length * 0.1);
    } catch (error) {
      console.warn('Failed to check failures for scoring:', error);
    }

    return Math.max(0, Math.min(1, score));
  }

  private analyzeLoops(file: CodeFile): LoopAnalysis[] {
    if (!file || typeof file.content !== 'string') {
      return [];
    }

    const loops: LoopAnalysis[] = [];
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('for') || line.includes('while') || line.includes('forEach')) {
        loops.push({
          line: i + 1,
          complexity: this.calculateComplexity(line),
          nested: this.isNested(lines, i)
        });
      }
    }

    return loops;
  }

  private analyzeErrorHandling(file: CodeFile): ErrorAnalysis[] {
    if (!file || typeof file.content !== 'string') {
      return [];
    }

    const errors: ErrorAnalysis[] = [];
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('try') || line.includes('catch') || line.includes('throw')) {
        errors.push({
          line: i + 1,
          type: this.getErrorType(line),
          severity: this.calculateSeverity(lines, i)
        });
      }
    }

    return errors;
  }

  private createLoopTest(file: CodeFile, loop: LoopAnalysis): TestCase {
    return {
      target: { file: file.path, type: 'script', line: loop.line },
      variants: [
        { id: 'control', changes: [] },
        { id: 'optimized', changes: this.optimizeLoop(loop) }
      ]
    };
  }

  private createErrorTest(file: CodeFile, error: ErrorAnalysis): TestCase {
    return {
      target: { file: file.path, type: 'script', line: error.line },
      variants: [
        { id: 'control', changes: [] },
        { id: 'improved', changes: this.improveErrorHandling(error) }
      ]
    };
  }

  private calculateConfidence(analysis: LoopAnalysis | ErrorAnalysis): number {
    if (!analysis) return 0;

    if ('complexity' in analysis) {
      return Math.min(0.9, 0.5 + (analysis.complexity * 0.1));
    } else {
      return Math.min(0.8, 0.4 + (analysis.severity * 0.1));
    }
  }

  private requiresMajorRefactor(test: TestCase): boolean {
    if (!test || !test.variants) return false;

    return test.variants.some(v =>
      v.changes.some(c => c.type === 'refactor' && c.scope === 'major')
    );
  }

  private isQueueFriendly(hypothesis: Hypothesis): boolean {
    if (!hypothesis || !hypothesis.test || !hypothesis.test.variants) return false;

    return hypothesis.test.variants.length <= 2 &&
           hypothesis.test.target?.type === 'script';
  }

  private calculateComplexity(line: string): number {
    if (typeof line !== 'string') return 1;

    let complexity = 1;
    if (line.includes('nested')) complexity += 1;
    if (line.includes('array')) complexity += 0.5;
    return complexity;
  }

  private isNested(lines: string[], index: number): boolean {
    if (!Array.isArray(lines) || typeof index !== 'number' || index < 0 || index >= lines.length) {
      return false;
    }

    const indent = lines[index].search(/\S/);
    for (let i = index - 1; i >= 0; i--) {
      if (lines[i].search(/\S/) < indent && (lines[i].includes('for') || lines[i].includes('while'))) {
        return true;
      }
    }
    return false;
  }

  private getErrorType(line: string): string {
    if (typeof line !== 'string') return 'unknown';

    if (line.includes('catch')) return 'catch';
    if (line.includes('throw')) return 'throw';
    return 'try';
  }

  private calculateSeverity(lines: string[], index: number): number {
    if (!Array.isArray(lines) || typeof index !== 'number' || index < 0 || index >= lines.length) {
      return 1;
    }

    let severity = 1;
    const start = Math.max(0, index - 5);
    const end = Math.min(lines.length, index + 5);

    for (let i = start; i < end; i++) {
      if (lines[i].includes('critical') || lines[i].includes('fatal')) {
        severity += 2;
      }
    }
    return severity;
  }

  private optimizeLoop(loop: LoopAnalysis): Change[] {
    if (!loop || typeof loop.line !== 'number') return [];

    return [{
      type: 'optimization',
      scope: 'local',
      line: loop.line,
      description: 'Optimize loop iteration'
    }];
  }

  private improveErrorHandling(error: ErrorAnalysis): Change[] {
    if (!error || typeof error.line !== 'number') return [];

    return [{
      type: 'error-handling',
      scope: 'local',
      line: error.line,
      description: 'Improve error handling'
    }];
  }
}