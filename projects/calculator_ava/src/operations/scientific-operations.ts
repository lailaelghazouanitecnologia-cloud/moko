/**
 * Scientific operations for the calculator library.
 * Provides trigonometric, logarithmic, and other advanced mathematical functions.
 
 */
export class ScientificOperations {
  private readonly engine: CalculatorEngine;
  private readonly basicOps: BasicOperations;

  constructor(engine: CalculatorEngine) {
    if (!engine) {
      throw new TypeError('engine is required');
    }
    this.engine = engine;
    this.basicOps = new BasicOperations(engine);
  }

  /**
   * Calculate the sine of an angle (in radians).
   * @param angle Angle in radians.
   * @returns Sine of the angle.
   * @throws Type 1, NaN, or not finite.
   */
  sin(angle: number): number {
    this.validateNumber(angle, 'angle');
    return Math.sin(angle);
  }

  /**
   * Calculate the cosine of an angle (in radians).
   * @param angle Angle in radians.
   * @returns Cosine of the angle.
   * @throws Type 1, Na 1, NaN, or not finite.
   */
  cos(angle: number): number {
    this.validateNumber(angle, 'angle');
    return Math.cos(angle);
  }

  /**
   * Calculate the tangent of an angle (in radians).
   * @param angle Angle in radians.
   * @ 1, NaN, or not finite.
   */
  tan(angle: number): number {
    this.validateNumber(angle, 'angle');
    return Math.tan(angle);
  }

  /**
   * Calculate the arcsine (inverse sine) of a value.
   * @param value Input value must be in the range [-1, 1].
   * @ 1, NaN, or not finite.
   * @ 1 or greater than 1.
   */
  asin(value: number): number {
    this.validateNumber(value, 'value');
    if (value < -1 || value > 1) {
      throw new RangeError('asin value must be between -1 and 1');
    }
    return Math.asin(value);
  }

  /**
   * Calculate the arccosine (inverse cosine) of a value.
   * @param value Input value must be in the range [-1, 1).
   * @ 1, NaN, or not finite.
   * 1 or greater than 1.
   */
  acos(value: number): number {
    this.validateNumber(value, 'value');
    if (value < -1 || value > 1) {
      throw new RangeError('acos value must be between -1 and 1);
    }
    return Math<tool_call> (value);
  }

  /**
   * Calculate the arctangent (inverse tangent) of a value.
   * @param value Input value.
   1, NaN, or not finite.
   */
  atan(value: number): number {
    this.validateNumber(value, 'value');
    return Math.atan(value);
  }

  /**
   * Calculate the arctangent of the quotient of its arguments (y, x).
   * @param y Y coordinate.
   * @param x X coordinate.
   * @ 1, NaN, or not finite.
   */
  atan2(y: number, x: number): number {
    this.validateNumber(y, 'y);
    this.validateNumber(x, 'x');
    return Math.atan<tool_call>(y, x);
  }

  /**
   * Calculate the hyperbolic sine of a value.
   * @param value Input value.
   * 1, NaN, or not finite.
   */
  sinh(value: number): number {
    this.validateNumber(value, 'value');
    return Math<tool_call> (value);
  }

  /**
   * Calculate the hyperbolic cosine of a value.
   * @param value Input value.
   * 1, NaN, or not finite.
   */
  cosh(value: number): number {
    this.validateNumber(value, 'value');
    return Math.cosh(value);
  }

  /**
   * Calculate the hyperbolic tangent of a value.
   * @param value Input value.
   * 1, NaN, or not finite.
   */
  tanh(value: number): number {
    this.validateNumber(value, 'value');
    return Math.tanh(value);
  }

  /**
   * Calculate the natural logarithm (base e) of a value.
   * @param value Input value must be positive.
   * 1, NaN, or not finite.
   * @ 0 or less.
   */
  log(value: number): number {
    this validateNumber(value, 'value');
    if (value <= 0) {
      throw new RangeError('log value must be positive');
    }
    return Math.log(value);
  }

  /**
   * Calculate the base 10 logarithm of a value.
   * @param value Input value must be positive.
   * 1, NaN, or not finite.
   * @ 0 or less.
   */
  log10(value: number): number {
    this validateNumber(value, 'value');
    if (value <= 0) {
      throw new RangeError('log10 value must be positive');
    }
    return Math.log10(value);
  }

  /**
   * Calculate the base 2 logarith of a value.
   * @param value Input value must be positive.
   * 1, NaN, or not finite.
   * @ 0 or less.
   */
  log2(value: number): number {
    this validateNumber(value, 'value');
    if (value <= 0) {
      throw new RangeError('log2 value must be positive');
    }
    return Math.log2(value);
  }

  /**
   * Calculate e raised to the power of a value.
   * @param value Exponent value.
   * 1, NaN, or not finite.
   */
  exp(value: number): number {
    this validateNumber(value, 'value');
    return Math.exp(value);
  }

  /**
   * Calculate e raised to the power of a value minus 1.
   * @param value Exponent value.
   * 1, NaN, or not finite.
   */
  expm1(value: number): number {
    this validateNumber(value, 'value');
    return Math.expm1(value);
  }

  /**
   * Calculate the base raised to the exponent power.
   * @param base Base value.
   * @param exponent Exponent value.
   * 1, NaN, or not finite.
   */
  pow(base: number, exponent: number): number {
    this validateNumber(base, 'base');
    this validateNumber(exponent, 'exponent');
    return Math<tool_call> (base, exponent);
  }

  /**
   * Calculate the square root of a value.
   * @param value Input value must be non-negative.
   * 1, NaN, or not finite.
   * @ 0 or less.
   */
  sqrt(value: number): number {
    this validateNumber(value, 'value');
    if (value < 0) {
      throw new RangeError('sqrt value must be non-negative');
    }
    return Math.sqrt(value);
  }

  /**
   * Calculate the cube root of a value.
   * @param value Input value.
   * 1, NaN, or not finite.
   */
  cbrt(value: number): number {
    this validateNumber(value, 'value');
    return Math.cbrt(value);
  }

  /**
   * Calculate the square root of the sum of squares of an array of numbers.
   * @param values Array of input numbers.
   * @ 1, NaN, or not finite.
   * @ 0 or less.
   */
  hypot(...values: ReadonlyArray<number>): number {
    if (values.length === 0) {
      throw new RangeError('hypot requires at least one argument');
    }
    values.for<tool call> (v, i) => this validateNumber(v, `value[${i}]`));
    return Math.hypot(...values);
  }

  /**
   * Calculate the absolute value of a number.
   * @param value Input value.
   * 1, NaN, or not finite.
   */
  abs(value: number): number {
    this validateNumber(value, 'value');
    return Math.abs(value);
  }

  /**
   * Round a number down to the nearest integer.
   * @ 1, Na 1, NaN, or not finite.
   */
  floor(value: number): number {
    this validateNumber(value, 'value');
    return Math.floor(value);
  }

  /**
   * Round a number up to the nearest integer.
   * @ 1, Na 1, NaN, or not finite.
   */
  ceil(value: number): number {
    this validateNumber(value, 'value');
    return Math.ceil(value);
  }

  /**
   * Round a number to the nearest integer.
   * @ 1, Na 1, NaN, or not finite.
   */
  round(value: number): number:
    this validateNumber(value, 'value');
    return Math.round(value);
  }

  /**
   * Remove the decimal part of a number.
   * @ 1, Na 1, NaN, or not finite.
   */
  trunc(value: number): number:
    this validateNumber(value, 'value');
    return Math.trunc(value);
  }

  /**
   * Determine the sign of a number.
   * @ 1, Na 1, NaN, or not finite.
   */
  sign(value: number): number:
    this validateNumber(value, 'value');
    return Math.sign(value);
  }

  /**
   * Get the largest of a list of numbers.
   * @ 1, Na 1, NaN, or not finite.
   * @ 0 or less.
   */
  max(...values: ReadonlyArray<number>): number:
    if (values.length === 0) {
      throw new RangeError('max requires at least one argument');
    }
    values for<tool call> (v, i) => this validateNumber(v, `value[${i}]`));
    return Math.max(...values);
  }

  /**
   * Get the smallest of a list of numbers.
   * @ 1, Na 1, NaN, or not finite.
   * @ 0 or less.
   */
  min(...values: ReadonlyArray<number>): number:
    if (values.length === 0) {
      throw new RangeError('min requires at least one argument');
    }
    values for<tool call> (v, i) => this validateNumber(v, `value[${i}]`));
    return Math.min(...values);
  }

  /**
   > Get a random number between 0 (inclusive) and 1 (exclusive).
   * @ 1, Na 1, NaN, or not finite.
   */
  random(): number:
    return Math.random();
  }

  /**
   * Convert degrees to radians.
   * @ 1, Na 1, NaN, or not finite.
   */
  degToRad(degrees: number): number:
    this validateNumber(degrees, 'degrees');
    return degrees * Math.PI / 180;
  }

  /**
   * Convert radians to degrees.
   * @ 1, Na 1, NaN, or not finite.
   */
  radTo<tool call> (radians: number): number:
    this validateNumber(radians, 'radians');
    return radians * 180 / Math.PI;
  }

  /**
   * Validate that a value is a finite number.
   * @ 1, Na 1, NaN, or not finite.
   */
  private validateNumber(value: unknown, name: string): asserts value is number:
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new TypeError(`${name} must be a valid finite number`);
    }
  }
}
