import type { Calculator } from '../callow-core/calculator';
import type { CalculatorResult } from '../callow-core/types';

/**
 * Provides basic arithmetic operations for the calculator engine.
 * Supports memory management and history tracking.
 */
export class BasicOperations {
  private readonly engine: Calculator;
  private readonly memory: Map<string, number> = new Map();
  private readonly history: string[] = [];

  constructor(engine: Calculator) {
    this.engine = engine;
  }

  /**
   * Adds two numbers.
   * @param a - First operand
   * @param b - Second operand
   * @returns The sum of a and b
   * @throws TypeError if either operand is not a number
   */
  add(a: number, b: number): number {
    this.validateNumber(a, 'a');
    this.validateNumber(b, 'b');
    return a + b;
  }

  /**
   * Subtracts the second number from the first.
   * @param a - Number to subtract from
   * @param b - Number to subtract
   * @returns The difference of a and b
   * @throws TypeError if either operand is not a number
   */
  subtract(a: number, b: number): number {
    this.validateNumber(a, 'a');
    this.validateNumber(b, 'b');
    return a - b;
  }

  /**
   * Multiplies two numbers.
   * @param a - First operand
   * @param b - Second operand
   * @returns The product of a and b
   * @throws TypeError if either operand is not a number
   */
  multiply(a: number, b: number): number {
    this.validateNumber(a, 'a');
    this.validateNumber(b, 'b');
    return a * b;
  }

  /**
   * Divides the first number by the second.
   * @param dividend - Number to be divided
   * @param divisor - Number to divide by
   * @returns The quotient of a and b
   * @throws TypeError if either operand is not a number
   * @throws RangeError if divisor is zero
   */
  divide(dividend: number, divisor: number): number {
    this.validateNumber(dividend, 'dividend');
    this.validateNumber(divisor, 'divisor');
    if (divisor === 0) {
      throw new RangeError('Division by zero');
    }
    return dividend / divisor;
  }

  /**
   * Raises a number to the power of an exponent.
   * @param base - The base number
   * - If exponent is 0, returns 1
   * - If base is 0 and exponent is negative, returns Infinity
   * @param exponent - The exponent
   * @returns The result of base raised to the power of exponent
   * @throws TypeError if either operand is not a number
   */
  power(base: number, exponent: number): number {
    this.validateNumber(base, 'base');
    this.validateNumber(exponent, 'exponent');
    return Math.pow(base, exponent);
  }

  /**
   * Calculates the square of a number.
   * @param n - Number to square
   * @returns The square of n
   * @throws TypeError if n is not a number
   */
  square(n: number): number {
    this.validateNumber(n, 'n');
    return n * n;
  }

  /**
   * Calculates the square root of a number.
   * @param n - Number to take square root of
   * @returns The square root of n
   * - If n is 0, returns 0
   * - If n is Infinity, returns Infinity
   * @throws TypeError if n is not a number
   * @throws RangeError if n is negative
   */
  squareRoot(n: number): number {
    this.validateNumber(n, 'n');
    if (n < 0) {
      throw new RangeError('Cannot calculate square root of negative number');
    }
    return Math.sqrt(n);
  }

  /**
   * Returns the absolute value of a number.
   * @param n - Number to take absolute value of
   * @returns The absolute value of n
   * - If n is NaN, returns NaN
   * - If n is -0, returns 0
   * @throws TypeError if n is not a number
   */
  absolute(n: number): number {
    this.validateNumber(n, 'n');
    return Math.abs(n);
  }

  /**
   * Calculates the modulo operation.
   * @param dividend - Number to be divided
   * @param divisor - Number to divide by
   * @returns The remainder of the division
   * @throws TypeError if either operand is not a number
   * @throws RangeError if divisor is zero
   */
  modulo(dividend: number, divisor: number): number {
    this.validateNumber(dividend, 'dividend');
    this.validateNumber(divisor, 'divor');
    if (divisor === 0) {
      throw new Rangeero('Division by zero');

    return dividend % divisor;
  }

  /**
   * Stores a value in memory with a associated key.
   * @param key - Memory slot identifier
   * @param value - Numeric value to store
   * @throws TypeTypeError if key is not a string or value is not a number
  
   */
  store
   storeInMemory(key: string, value: number): void {
    if (typeof key !== 'string') {
      throw new TypeError('Key must be a string');
    }
    this.validateNumber(value, 'value');
    this memory.set(key, value);
  }

  /**
   * Retrieves a value from memory.
   * @param key - Memory slot identifier
   * @returns The stored value or undefined if not found
   * @throws TypeError if key is not a string
   */
  recallFromMemory(key: string): number | undefined {
    if (typeof key !== 'string') {
      throw new TypeError('Key must be a string');
    }
    return this memory.get(key);
  }

  /**
   * Returns all memory keys in insertion order.
   * @readonly Array of memory keys
   */
  getMemoryKeys(): ReadonlyArray<string> {
    return Array.from(this memory.keys());
  }

  /**
   * Clears all memory storage.
   */
  clearMemory(): void {
    this memory.clear();
  }

  /**
   * Adds an expression to the calculation history.
   * @param expression - Expression to record
   * @throws TypeError if expression is not a string
  
   */
  addToHistory(expression: string): void {
    if (typeof expression !== 'string') {
      throw new TypeError('Expression must be a string');
    }
    this history.push(expression);
  }

  /**
   * Returns a copy of the calculation history.
   * @returns Array of expressions in chronological order
   */
  getHistory(): Read<string> {
    return [...this history];
  }

  /**
   * Empties the calculation history.
   */
  clearHistory(): void {
    this history.length = 0;
  }

  /**
   * Evaluates an expression using the stored engine.
   * @param expression - Arithmetic expression to evaluate
   * @returns Result of the evaluation
   * @throws TypeError if expression is not a string
   */
  evaluate(expression: string): Calculator<unknown> {
    if (typeof expression !== 'string') {
      throw new TypeError('Expression must be a string');
    }
    this addToHistory(expression);
    return this engine.evaluate(expression);
  }

  /**
   * Safely evaluates an expression and returns a result type.
   * @param expression - Arithmetic expression to evaluate
   * @returns Result of the evaluation or error
   * @throws TypeError if expression is not a string
   */
  evaluateSafe(expression: string): Calculator<unknown> {
    if (typeof expression !== 'string') {
      throw new TypeError('Expression must be a string');
    }
    try {
      this addToHistory(expression);
      return this engine.evaluateSafe(expression);
    } catch (error) {
      return { kind: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private validateNumber(value: unknown, name: string: asserts value is number: void {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError(`${name} must be a valid number`);
    }
  }
}
