import { MutationStrategy } from './mutation-strategy';
import { TrainingResults } from '../training-results';
import { AST } from '../ast';

/**
 * Parses and modifies training scripts based on mutation rules.
 */
export class ScriptMutator {
  private parser: any;
  private strategies: Map<string, MutationStrategy>;
  private results: TrainingResults;

  /**
   * Creates a new ScriptMutator instance.
   * @param parser - The parser used to parse and generate code.
   * @param results - The training results to guide mutations.
   */
  constructor(parser: any, results: TrainingResults) {
    if (!parser) {
      throw new Error('Parser is required');
    }
    if (!results) {
      throw new Error('Training results are required');
    }
    this.parser = parser;
    this.strategies = new Map();
    this.results = results;
  }

  /**
   * Registers a mutation strategy.
   * @param name - The unique name of the strategy.
   * @param strategy - The mutation strategy implementation.
   * @throws {Error} If name is empty or strategy is invalid.
   */
  registerStrategy(name: string, strategy: MutationStrategy): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Strategy name must be a non-empty string');
    }
    if (!strategy) {
      throw new Error('Strategy is required');
    }
    if (typeof strategy.canApply !== 'function' ||
        typeof strategy.apply !== 'function' ||
        typeof strategy.validate !== 'function' ||
        typeof strategy.getPriority !== 'function' ||
        typeof strategy.getName !== 'function') {
      throw new Error('Invalid strategy: missing required methods');
    }
    this.strategies.set(name, strategy);
  }

  /**
   * Applies registered mutation strategies to the provided script.
   * @param script - The script to mutate.
   * @returns The mutated script.
   * @throws {Error} If script is invalid or mutation fails.
   */
  mutate(script: string): string {
    if (typeof script !== 'string') {
      throw new Error('Script must be a string');
    }
    if (script.trim().length === 0) {
      throw new Error('Script cannot be empty');
    }
    const ast = this.parseScript(script);
    const mutatedAst = this.applyStrategies(ast);
    return this.generateCode(mutatedAst);
  }

  /**
   * Parses a script into an AST.
   * @param script - The script to parse.
   * @returns The parsed AST.
   * @throws {Error} If parsing fails.
   */
  parseScript(script: string): AST {
    if (typeof script !== 'string') {
      throw new Error('Script must be a string');
    }
    try {
      const ast = this.parser.parse(script);
      if (!ast) {
        throw new Error('Parser returned null AST');
      }
      return ast;
    } catch (error) {
      throw new Error(`Failed to parse script: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Applies all registered strategies to the AST in priority order.
   * @param ast - The AST to mutate.
   * @returns The mutated AST.
   * @throws {Error} If validation fails after mutation.
   */
  applyStrategies(ast: AST): AST {
    if (!ast) {
      throw new Error('AST is required');
    }
    if (this.strategies.size === 0) {
      return ast;
    }
    const sortedStrategies = Array.from(this.strategies.values())
      .sort((a, b) => b.getPriority() - a.getPriority());
    
    let mutatedAst = ast;
    for (const strategy of sortedStrategies) {
      if (strategy.canApply(mutatedAst, this.results)) {
        mutatedAst = strategy.apply(mutatedAst, this.results);
        if (!strategy.validate(mutatedAst)) {
          throw new Error(`Strategy ${strategy.getName()} validation failed`);
        }
      }
    }
    return mutatedAst;
  }

  /**
   * Generates code from an AST.
   * @param ast - The AST to convert.
   * @returns The generated code string.
   * @throws {Error} If code generation fails.
   */
  generateCode(ast: AST): string {
    if (!ast) {
      throw new Error('AST is required');
    }
    try {
      const code = this.parser.generate(ast);
      if (typeof code !== 'string') {
        throw new Error('Parser generate must return a string');
      }
      return code;
    } catch (error) {
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets the current training results.
   * @returns The training results.
   */
  getResults(): TrainingResults {
    return this.results;
  }

  /**
   * Updates the training results.
   * @param results - The new training results.
   * @throws {Error} If results is invalid.
   */
  setResults(results: TrainingResults): void {
    if (!results) {
      throw new Error('Training results are required');
    }
    this.results = results;
  }

  /**
   * Removes a strategy by name.
   * @param name - The name of the strategy to remove.
   * @returns True if the strategy was removed, false if it did not exist.
   */
  removeStrategy(name: string): boolean {
    if (!name || typeof name !== 'string') {
      return false;
    }
    return this.strategies.delete(name);
  }

  /**
   * Gets all registered strategy names.
   * @returns An array of strategy names.
   */
  getStrategyNames(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Gets a strategy by name.
   * @param name - The name of the strategy.
   * @returns The strategy or undefined if not found.
   */
  getStrategy(name: string): MutationStrategy | undefined {
    if (!name || typeof name !== 'string') {
      return undefined;
    }
    return this.strategies.get(name);
  }

  /**
   * Clears all registered strategies.
   */
  clearStrategies(): void {
    this.strategies.clear();
  }

  /**
   * Gets the count of registered strategies.
   * @returns The number of strategies.
   */
  getStrategyCount(): number {
    return this.strategies.size;
  }
}
