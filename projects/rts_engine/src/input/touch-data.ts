/**
 * Touch point data interface.
 * Describes a single touch point on a touch-enabled device.
 */
export interface TouchData {
  /**
   * Unique identifier for this touch point.
   * @type {number}
   */
  id: number;

  /**
   * Horizontal coordinate relative to the viewport.
   * @type {number}
   */
  x: number;

  /**
   * Vertical coordinate relative to the viewport.
   * @type {number}
   */
  y: number;

  /**
   * Pressure of the touch, normalized between 0.0 and 1.0.
   * @type {number}
   */
  force: number;
}

/**
 * Utility class for validating and manipulating TouchData objects.
 */
export class TouchDataValidator {
  /**
   * Validates that the provided object conforms to the TouchData interface.
   * @param {unknown} data - The object to validate.
   * @returns {boolean} True if the object is valid TouchData.
   */
  public static isValidTouchData(data: unknown): data is TouchData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'x' in data &&
      'y' in data &&
      'force' in data &&
      typeof (data as any).id === 'number' &&
      typeof (data as any).x === 'number' &&
      typeof (data as any).y === 'number' &&
      typeof (data as any).force === 'number' &&
      this.isValidCoordinate((data as any).x) &&
      this.isValidCoordinate((data as any).y) &&
      this.isValidForce((data as any).force)
    );
  }

  /**
   * Asserts that the provided object is valid TouchData.
   * @param {unknown} data - The object to validate.
   * @throws {TypeError} If the object is not valid TouchData.
   */
  public static assertValidTouchData(data: unknown): asserts data is TouchData {
    if (!this.isValidTouchData(data)) {
      throw new TypeError('Invalid TouchData: all fields must be numbers with valid ranges.');
    }
  }

  /**
   * Creates a new TouchData instance with default values.
   * @returns {TouchData} A new TouchData object.
   */
  public static createDefault(): TouchData {
    return {
      id: 0,
      x: 0,
      y: 0,
      force: 0,
    };
  }

  /**
   * Clones a TouchData object.
   * @param {TouchData} data - The TouchData to clone.
   * @returns {TouchData} A new TouchData instance with the same values.
   * @throws {TypeError} If the input is not valid TouchData.
   */
  public static clone(data: TouchData): TouchData {
    this.assertValidTouchData(data);
    return { ...data };
  }

  /**
   * Checks if two TouchData objects are equivalent.
   * @param {TouchData} a - First TouchData object.
   * @param {TouchData} b - Second TouchData object.
   * @returns {boolean} True if both objects have identical fields.
   */
  public static equals(a: TouchData, b: TouchData): boolean {
    return a.id === b.id && a.x === b.x && a.y === b.y && a.force === b.force;
  }

  /**
   * Validates that a coordinate is finite.
   * @private
   * @param {number} value - The coordinate to validate.
   * @returns {boolean} True if the coordinate is finite.
   */
  private static isValidCoordinate(value: number): boolean {
    return Number.isFinite(value);
  }

  /**
   * Validates that a force value is between 0.0 and 1.0.
   * @private
   * @param {number} value - The force value to validate.
   * @returns {boolean} True if the force is in range.
   */
  private static isValidForce(value: number): boolean {
    return Number.isFinite(value) && value >= 0 && value <= 1;
  }
}
