import { Position, CollisionResult } from '../core/types';
import { Vector2D } from '../core/vector';
import { Snake } from './snake';

/**
 * Checks for collisions between the snake and the game world.
 */
export class CollisionDetector {
  private readonly gridWidth: number;
  private readonly gridHeight: number;

  constructor(gridWidth: number, gridHeight: number) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
  }

  /**
   * Run all collision checks for the current game state.
   * @param snake - The snake entity.
   * @param foodPosition - The current food position (if any).
   * @returns A discriminated union describing what (if anything) was hit.
   */
  check(snake: Snake, foodPosition: Position | null): CollisionResult {
    if (this.checkWallCollision(snake.head)) {
      return { type: 'wall' };
    }

    if (snake.checkSelfCollision()) {
      return { type: 'self' };
    }

    if (foodPosition && this.checkFoodCollision(snake.head, foodPosition)) {
      return { type: 'food', position: foodPosition };
    }

    return { type: 'none' };
  }

  /**
   * Check if a position is outside the grid boundaries.
   * @param position - The position to test.
   * @returns `true` if the position is out of bounds.
   */
  checkWallCollision(position: Position): boolean {
    return !Vector2D.from(position).isInBounds(this.gridWidth, this.gridHeight);
  }

  /**
   * Check if the snake head is at the same position as the food.
   * @param head - The snake's head position.
   * @param food - The food position.
   * @returns `true` if they overlap.
   */
  checkFoodCollision(head: Position, food: Position): boolean {
    return Vector2D.from(head).equals(food);
  }
}
