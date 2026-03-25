import { Position } from '../core/position';

/**
 * Represents a food item in the game world.
 * Food has a fixed position and a nutritional value.
 */
export class Food {
  private readonly _position: Position;
  private readonly _value: number;

  /**
   * Creates a new Food instance.
   * @param position - The position where the food is located.
   * @param value - The nutritional value of the food. Must be a positive integer. Defaults to 10.
   * @throws {TypeError} If position is not an instance of Position.
   * @throws {RangeError} If value is not a positive integer.
   */
  constructor(position: Position, value: number = 10) {
    if (!(position instanceof Position)) {
      throw new TypeError('position must be an instance of Position');
    }
    if (!Number.isInteger(value) || value <= 0) {
      throw new RangeError('value must be a positive integer');
    }
    this._position = position;
    this._value = value;
  }

  /**
   * The position of the food.
   */
  get position(): Position {
    return this._position;
  }

  /**
   * The nutritional value of the food.
   */
  get value(): number {
    return this._value;
  }

  /**
   * Creates a copy of the food with the same position and value.
   * @returns A new Food instance with identical properties.
   */
  clone(): Food {
    return new Food(this._position.clone(), this._value);
  }

  /**
   * Checks if this food is equal to another food.
   * @param other - The food to compare against.
   * @returns True if both position and value are equal; otherwise false.
   */
  equals(other: unknown): boolean {
    return other instanceof Food &&
           this._position.equals(other._position) &&
           this._value === other._value;
  }

  /**
   * Returns a string representation of the food.
   * @returns A string in the format "Food(value) at (x, y)".
   */
  toString(): string {
    return `Food(${this._value}) at ${this._position.toString()}`;
  }
}