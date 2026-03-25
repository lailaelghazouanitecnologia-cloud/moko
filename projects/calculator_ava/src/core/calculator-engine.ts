import { ExpressionParser, ExpressionParser } from './expression-parser';

export type CalculatorResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: Error };

export class CalculatorEngine {
  private readonly parser: Expression;
  private readonly memory: Map<string, number> = new Map();
  private history: ReadonlyArray<string> = [];

  constructor(parser: ExpressionParser) {
    if (!parser) {
      throw new TypeError('parser is required');
    }
    this.parser = parser;
  }

  /**
   * Evaluates a mathematical expression and returns the numeric result.
   * @param expression - The expression string to evaluate.
   * @returns The numeric result of the expression.
   * @throws {Error} If the expression syntax is invalid.
   */
  evaluate(expression: string): number {
    if (typeof expression !== 'string') {
      throw new TypeError('expression must be a string');
    }
    if (!this.parser.validate(expression)) {
      throw new Error('Invalid expression syntax');
    }
    const result = this.parser.evaluate(this.parser.parse(expression));
    this.addToHistory(expression);
    return result;
  }

  /**
   * Safely evaluates an expression, returning a result discriminated union.
   * @param expression - The expression string to evaluate.
   * @returns A result object indicating success or failure.
   */
  evaluateSafe(expression: string): CalculatorResult<number> {
    try {
      const value = this.evaluate(expression);
      return { success: true, value };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Validates the syntax of an expression without evaluating it.
   * @param expression - The expression string to validate.
   * @returns True if the expression is syntactically valid, false otherwise.
   */
  validate(expression: string): boolean {
    if (typeof expression !== 'string') {
      throw new TypeError('expression must be a string');
    }
    return this.parser.validate(expression);
  }

  /**
   * Adds an expression string to the history log.
   * @param expression - The expression to record.
   */
  addToHistory(expression: string): void {
    if (typeof expression !== 'string') {
      throw new TypeError('expression must be a string');
    }
    this.history = [...this.history, expression];
  }

  /**
   * Retrieves the history of evaluated expressions.
   * @returns A readonly array of expression strings.
   */
  getHistory(): ReadonlyArray<string> {
    return this.history;
  }

  /**
   * Stores a named value in memory.
   * @param name - The variable name.
   * @param value - The numeric value to store.
   */
  storeInMemory(name: string, value: number): void {
    if (typeof name !== 'string') {
      throw new TypeError('name must be a string');
    }
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new TypeError('value must be a finite number');
    }
    this.memory.set(name, value);
  }

  /**
   * Retrieves a value from memory by name.
   * @param name - The variable name.
   * @returns The stored value, or undefined if not found.
   */
  recallFromMemory(name: string): number | undefined {
    if (typeof name !== 'string') {
      throw new TypeError('name must be a string');
    }
    return this.memory.get(name);
  }

  /**
   * Clears all stored memory values.
   */
  clearMemory(): void {
    this.memory.clear();
  }

  /**
   * Returns a readonly snapshot of all memory entries.
   * @returns An array of key-value tuples.
   */
  getMemory(): ReadonlyArray<[string, number]> {
    return Array.from(this.memory.entries());
  }

  /**
   * Sets a variable available during expression evaluation.
   * @param name - The variable name.
   * @param value - The numeric value.
   */
  setVariable(name: string, value: number): void {
    if (typeof name !== 'string') {
      throw new TypeError('name must be a string');
    }
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new TypeError('value must be a finite number');
    }
    this.parser.setVariable(name, value);
  }

  /**
   * Retrieves all currently set variables.
   * @returns A readonly map of variable names to values.
   */
  getVariables(): ReadonlyMap<string, number> {
    return this.parser.getVariables();
  }

  /**
   * Clears history, variables, and memory.
   */
  clear(): void {
    this.history = [];
    this.memory.clear();
    this.parser.clear();
  }
}