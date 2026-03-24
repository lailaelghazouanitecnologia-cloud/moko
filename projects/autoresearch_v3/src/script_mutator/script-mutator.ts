import { PatchSet } from './patch-set';

export class ScriptMutator {
  private ast: any;
  private rules: Map<string, Function>;
  private mutated: boolean;

  constructor() {
    this.ast = null;
    this.rules = new Map<string, Function>();
    this.mutated = false;
  }

  /**
   * Parse source to AST
   * @param source - JSON string representing the AST
   * @throws {SyntaxError} If source is not valid JSON
   * @throws {Error} If source is empty or not a string
   */
  loadScript(source: string): void {
    if (typeof source !== 'string') {
      throw new Error('Source must be a string');
    }
    if (source.trim() === '') {
      throw new Error('Source cannot be empty');
    }
    try {
      this.ast = JSON.parse(source);
    } catch (error) {
      throw new SyntaxError(`Failed to parse source as JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Apply patch set
   * @param patches - PatchSet instance to apply
   * @throws {Error} If patches is not a valid PatchSet or AST is not loaded
   */
  applyPatchSet(patches: PatchSet): void {
    if (!patches || typeof patches.applyAll !== 'function') {
      throw new Error('Invalid PatchSet provided');
    }
    if (!this.ast) {
      throw new Error('No AST loaded. Call loadScript first.');
    }
    try {
      this.ast = patches.applyAll(this.ast);
    } catch (error) {
      throw new Error(`Failed to apply patches: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Register mutation rule
   * @param name - Unique name for the rule
   * @param rule - Function that transforms the AST
   * @throws {Error} If name is not a non-empty string or rule is not a function
   */
  addRule(name: string, rule: Function): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Rule name must be a non-empty string');
    }
    if (typeof rule !== 'function') {
      throw new Error('Rule must be a function');
    }
    this.rules.set(name, rule);
  }

  /**
   * Run all rules
   * @throws {Error} If no AST is loaded or if any rule fails
   */
  mutate(): void {
    if (!this.ast) {
      throw new Error('No AST loaded. Call loadScript first.');
    }
    if (this.rules.size === 0) {
      console.warn('No mutation rules registered');
      return;
    }
    for (const [name, rule] of this.rules) {
      try {
        const result = rule(this.ast);
        if (result === undefined || result === null) {
          throw new Error(`Rule "${name}" returned invalid result`);
        }
        this.ast = result;
      } catch (error) {
        throw new Error(`Rule "${name}" failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.mutated = true;
  }

  /**
   * Save mutated code
   * @param outPath - File path to write the mutated AST
   * @throws {Error} If outPath is invalid, no mutations were applied, or write fails
   */
  writeBack(outPath: string): void {
    if (typeof outPath !== 'string' || outPath.trim() === '') {
      throw new Error('Output path must be a non-empty string');
    }
    if (!this.mutated) {
      throw new Error('No mutations applied. Call mutate() before writing back.');
    }
    if (!this.ast) {
      throw new Error('No AST to write');
    }
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(outPath);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outPath, JSON.stringify(this.ast, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List applied mutations
   * @returns Array of mutation rule names
   */
  getMutations(): string[] {
    return Array.from(this.rules.keys());
  }

  /**
   * Check if mutations have been applied
   * @returns True if mutate() has been called
   */
  hasMutated(): boolean {
    return this.mutated;
  }

  /**
   * Get the current AST
   * @returns The current AST or null if not loaded
   */
  getAST(): any {
    return this.ast;
  }

  /**
   * Remove a mutation rule
   * @param name - Name of the rule to remove
   * @returns True if the rule existed and was removed
   */
  removeRule(name: string): boolean {
    if (typeof name !== 'string') {
      return false;
    }
    return this.rules.delete(name);
  }

  /**
   * Clear all mutation rules
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * Get count of registered rules
   * @returns Number of rules
   */
  getRuleCount(): number {
    return this.rules.size;
  }

  /**
   * Reset the mutator state
   */
  reset(): void {
    this.ast = null;
    this.mutated = false;
  }
}
