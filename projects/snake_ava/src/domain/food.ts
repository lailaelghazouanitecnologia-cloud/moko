// UNRESOLVED: import { Position } from '../types/position';
// UNRESOLVED: import { FoodType } from '../types/food-type';
import { Board } from './board';

/**
 * Represents a consumable food item on the board.
 */
export class Food {
  private position: Position;
  private energy: number;
  private type: FoodType;

  /**
   * Creates a new Food instance.
   * @param position - The initial position of the food.
   *  @param energy - The energy value the food provides when consumed.
   * @param type - The type of food.
   * @throws {Error} If position is invalid, energy is negative, or type is invalid.
   */
  constructor(position: Position, energy: number, type: FoodType) {
    if (!this.isValidPosition(position)) {
      throw new Error('Invalid position provided for Food');
    }
    if (energy < 0) {
      throw new Error('Energy must be non-negative');
    }
    if (!this.isValidFoodType(type)) {
      throw new Error('Invalid food type provided');
    }
    this.position = position;
    this.energy = energy;
    this.type = type;
  }

  /**
   * Gets the current position of the food.
   * @returns The position of the food.
   */
  getPosition(): Position {
    return this.position;
  }

  /**
   * Sets a new position for the food.
   * @param pos - The new position.
   * @throws {Error} If the new position is invalid.
   */
  setPosition(pos: Position): void {
    if (!this.isValidPosition(pos)) {
      throw new Error('Invalid position provided for Food');
    }
    this.position = pos;
  }

  /**
   * Gets the energy value of the food.
   * @returns The energy value.
   */
  getEnergy(): number {
    return this.energy;
  }

  /**
   * Gets the type of the food.
   * @returns The food type.
   */
  getType(): FoodType {
    return this.type;
  }

  /**
   * Checks if the food is at the specified position.
   * @param pos - The position to check.
   * @returns True if the food is at the given position, false otherwise.
   */
  isAt(pos: Position): boolean {
    if (!this.isValidPosition(pos)) {
      return false;
    }
    return this.position.x === pos.x && this.position.y === pos.y;
  }

  /**
   * Spawns the food at a random unoccupied location on the board.
   * @param board - The board on which to spawn the food.
   * @throws {Error} If the board is invalid or no free space is available.
   */
  spawn(board: Board): void {
    if (!board) {
      throw new Error('Board is required for spawning food');
    }
    const freePositions = this.getFreePositions(board);
    if (freePositions.length === 0) {
      throw new Error('No free space available on the board to spawn food');
    }
    const randomIndex = Math.floor(Math.random() * freePositions.length);
    const newPosition = freePositions[randomIndex];
    this.position = newPosition;
    board.placeFood(this);
  }

  /**
   * Validates if the given position is valid.
   * @param pos - The position to validate.
   * @returns True if valid, false otherwise.
   */
  private isValidPosition(pos: Position): boolean {
    return (
      pos !== null &&
      pos !== undefined &&
      typeof pos.x === 'number' &&
      typeof pos.y === 'number' &&
      pos.x >= 0 &&
      pos.y >= 0 &&
      Number.isInteger(pos.x) &&
      Number.isInteger(pos.y)
    );
  }

  /**
   * Validates if the given food type is valid.
   * @param type - The food type to validate.
   * @returns True if valid, false otherwise.
   */
  private isValidFoodType(type: FoodType): boolean {
    return Object.values(FoodType).includes(type);
  }

  /**
   * Gets all free positions on the board.
   * @param board - The board to check.
   * @returns Array of free positions.
   */
  private getFreePositions(board: Board): Position[] {
    const free: Position[] = [];
    for (let x = 0; x < board.width; x++) {
      for (let y = 0; y < board.height; y++) {
        if (!board.isOccupied(x, y)) {
          free.push({ x, y });
        }
      }
    }
    return free;
  }
}