// UNRESOLVED: import { CodeAnalyzer } from '../analyzer/code-analyzer';
// UNRESOLVED: import { EditValidator } from '../validator/edit-validator';
import { Hypothesis } from './hypothesis';
// UNRESOLVED: import { FileTarget } from '../types/file-target';
import { EditPlan } from './edit-plan';
// UNRESOLVED: import { Change } from '../types/change';
import { ValidationResult } from './hypothesis';
// UNRESOLVED: import { DiffView } from '../types/diff-view';

/**
 * Plans code edits for experiments.
 */
export class EditPlanner {
  private analyzer: CodeAnalyzer;
  private validator: EditValidator;

  constructor(analyzer: CodeAnalyzer, validator: EditValidator) {
    if (!analyzer) {
      throw new Error('CodeAnalyzer is required');
    }
    if (!validator) {
      throw new Error('EditValidator is required');
    }
    this.analyzer = analyzer;
    this.validator = validator;
  }

  /**
   * Creates an edit plan based on the provided hypothesis and target file.
   * @param hypothesis The hypothesis to test.
   * @param target The target file to modify.
   * @returns The generated edit plan.
   * @throws Error if hypothesis or target is invalid.
   */
  plan(hypothesis: Hypothesis, target: FileTarget): EditPlan {
    if (!hypothesis) {
      throw new Error('Hypothesis is required');
    }
    if (!target) {
      throw new Error('FileTarget is required');
    }
    if (!target.content) {
      throw new Error('FileTarget content is required');
    }

    const analysis = this.analyzer.analyze(target);
    const changes: Change[] = [];

    // Generate changes based on hypothesis
    if (hypothesis.test.type === 'loop-optimization') {
      changes.push(...this.generateLoopChanges(target, hypothesis));
    } else if (hypothesis.test.type === 'error-handling') {
      changes.push(...this.generateErrorChanges(target, hypothesis));
    } else if (hypothesis.test.type === 'script-only') {
      changes.push(...this.generateScriptChanges(target, hypothesis));
    } else {
      throw new Error(`Unsupported hypothesis test type: ${hypothesis.test.type}`);
    }

    const validation = this.validator.validate(changes, target);

    return {
      target,
      changes,
      validation
    };
  }

  /**
   * Validates the provided edit plan.
   * @param plan The edit plan to validate.
   * @returns The validation result.
   * @throws Error if plan is invalid.
   */
  validatePlan(plan: EditPlan): ValidationResult {
    if (!plan) {
      throw new Error('EditPlan is required');
    }
    if (!plan.changes) {
      throw new Error('EditPlan changes are required');
    }
    if (!plan.target) {
      throw new Error('EditPlan target is required');
    }

    return this.validator.validate(plan.changes, plan.target);
  }

  /**
   * Optimizes the provided edit plan by minimizing changes.
   * @param plan The edit plan to optimize.
   * @returns The optimized edit plan.
   * @throws Error if plan is invalid.
   */
  optimize(plan: EditPlan): EditPlan {
    if (!plan) {
      throw new Error('EditPlan is required');
    }
    if (!plan.changes) {
      throw new Error('EditPlan changes are required');
    }
    if (!plan.target) {
      throw new Error('EditPlan target is required');
    }

    const optimizedChanges = this.minimizeChanges(plan.changes);
    const validation = this.validator.validate(optimizedChanges, plan.target);

    return {
      target: plan.target,
      changes: optimizedChanges,
      validation
    };
  }

  /**
   * Creates a rollback plan for the provided edit plan.
   * @param plan The edit plan to rollback.
   * @returns The rollback edit plan.
   * @throws Error if plan is invalid.
   */
  rollback(plan: EditPlan): EditPlan {
    if (!plan) {
      throw new Error('EditPlan is required');
    }
    if (!plan.changes) {
      throw new Error('EditPlan changes are required');
    }
    if (!plan.target) {
      throw new Error('EditPlan target is required');
    }

    const rollbackChanges = plan.changes.map(change => {
      if (!change) {
        throw new Error('Invalid change in plan');
      }
      return {
        ...change,
        type: 'deletion',
        original: change.modified,
        modified: change.original
      } as Change;
    });

    const validation = this.validator.validate(rollbackChanges, plan.target);

    return {
      target: plan.target,
      changes: rollbackChanges,
      validation
    };
  }

  /**
   * Generates a diff preview for the provided edit plan.
   * @param plan The edit plan to preview.
   * @returns The diff view.
   * @throws Error if plan is invalid.
   */
  preview(plan: EditPlan): DiffView {
    if (!plan) {
      throw new Error('EditPlan is required');
    }
    if (!plan.changes) {
      throw new Error('EditPlan changes are required');
    }
    if (!plan.target) {
      throw new Error('EditPlan target is required');
    }

    const diffLines: string[] = [];

    for (const change of plan.changes) {
      if (!change) {
        throw new Error('Invalid change in plan');
      }
      if (change.type === 'addition') {
        diffLines.push(`+${change.modified}`);
      } else if (change.type === 'deletion') {
        diffLines.push(`-${change.original}`);
      } else if (change.type === 'modification') {
        diffLines.push(`-${change.original}`);
        diffLines.push(`+${change.modified}`);
      } else {
        throw new Error(`Unsupported change type: ${change.type}`);
      }
    }

    return {
      file: plan.target.path,
      diff: diffLines.join('\n'),
      additions: plan.changes.filter(c => c && c.type === 'addition').length,
      deletions: plan.changes.filter(c => c && c.type === 'deletion').length,
      modifications: plan.changes.filter(c => c && c.type === 'modification').length
    };
  }

  private generateLoopChanges(target: FileTarget, hypothesis: Hypothesis): Change[] {
    if (!target.content) {
      throw new Error('FileTarget content is required');
    }
    if (!hypothesis) {
      throw new Error('Hypothesis is required');
    }

    const changes: Change[] = [];
    const lines = target.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (this.isLoopLine(line) && this.matchesHypothesis(line, hypothesis)) {
        const optimized = this.optimizeLoop(line);
        changes.push({
          type: 'modification',
          line: i + 1,
          original: line,
          modified: optimized
        });
      }
    }

    return changes;
  }

  private generateErrorChanges(target: FileTarget, hypothesis: Hypothesis): Change[] {
    if (!target.content) {
      throw new Error('FileTarget content is required');
    }
    if (!hypothesis) {
      throw new Error('Hypothesis is required');
    }

    const changes: Change[] = [];
    const lines = target.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (this.isErrorLine(line) && this.matchesHypothesis(line, hypothesis)) {
        const improved = this.improveErrorHandling(line);
        changes.push({
          type: 'modification',
          line: i + 1,
          original: line,
          modified: improved
        });
      }
    }

    return changes;
  }

  private generateScriptChanges(target: FileTarget, hypothesis: Hypothesis): Change[] {
    if (!target.content) {
      throw new Error('FileTarget content is required');
    }
    if (!hypothesis) {
      throw new Error('Hypothesis is required');
    }

    const changes: Change[] = [];
    const lines = target.content.split('\n');

    // Script-only edits - prioritize next experiment
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (this.isScriptLine(line) && this.matchesHypothesis(line, hypothesis)) {
        const modified = this.modifyScript(line, hypothesis);
        changes.push({
          type: 'modification',
          line: i + 1,
          original: line,
          modified
        });
      }
    }

    return changes;
  }

  private minimizeChanges(changes: Change[]): Change[] {
    if (!changes) {
      throw new Error('Changes array is required');
    }

    const optimized: Change[] = [];
    const byLine = new Map<number, Change[]>();

    // Group changes by line
    for (const change of changes) {
      if (!change) continue;
      if (!byLine.has(change.line)) {
        byLine.set(change.line, []);
      }
      byLine.get(change.line)!.push(change);
    }

    // Merge changes on same line
    for (const [line, lineChanges] of byLine) {
      if (lineChanges.length === 0) continue;
      if (lineChanges.length === 1) {
        optimized.push(lineChanges[0]);
      } else {
        // Merge multiple changes into single modification
        const first = lineChanges[0];
        const last = lineChanges[lineChanges.length - 1];
        optimized.push({
          type: 'modification',
          line,
          original: first.original,
          modified: last.modified
        });
      }
    }

    return optimized;
  }

  private isLoopLine(line: string): boolean {
    if (typeof line !== 'string') {
      return false;
    }
    return /for\s*\(|while\s*\(|do\s*\{/.test(line);
  }

  private isErrorLine(line: string): boolean {
    if (typeof line !== 'string') {
      return false;
    }
    return /catch\s*\(|throw\s+|Error|Exception/.test(line);
  }

  private isScriptLine(line: string): boolean {
    if (typeof line !== 'string') {
      return false;
    }
    return !this.isLoopLine(line) && !this.isErrorLine(line) && line.trim().length > 0;
  }

  private matchesHypothesis(line: string, hypothesis: Hypothesis): boolean {
    if (typeof line !== 'string') {
      return false;
    }
    if (!hypothesis) {
      return false;
    }
    if (!hypothesis.description) {
      return false;
    }
    return line.includes(hypothesis.description.split(' ')[0]) ||
           hypothesis.confidence > 0.7;
  }

  private optimizeLoop(line: string): string {
    if (typeof line !== 'string') {
      throw new Error('Line must be a string');
    }

    // Simple loop optimization - cache length
    if (line.includes('for') && line.includes('.length')) {
      return line.replace(/(\w+)\.length/g, (match, varName) => {
        return `${varName}Len`;
      });
    }
    return line;
  }

  private improveErrorHandling(line: string): string {
    if (typeof line !== 'string') {
      throw new Error('Line must be a string');
    }

    // Add specific error types
    if (line.includes('catch')) {
      return line.replace(/catch\s*\(/, 'catch (SpecificError ');
    }
    return line;
  }

  private modifyScript(line: string, hypothesis: Hypothesis): string {
    if (typeof line !== 'string') {
      throw new Error('Line must be a string');
    }
    if (!hypothesis) {
      throw new Error('Hypothesis is required');
    }
    if (!hypothesis.description) {
      throw new Error('Hypothesis description is required');
    }

    // Script modifications based on hypothesis
    if (hypothesis.description.includes('queue')) {
      return line + ' // Queue-friendly';
    }
    return line;
  }
}