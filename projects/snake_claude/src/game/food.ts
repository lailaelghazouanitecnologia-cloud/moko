import { Position } from '../core/types';
import { Vector2D } from '../core/vector';

/**
 * Responsible for spawning food at random positions on the grid
 * while avoiding cells occupied by the snake.
 */
export class FoodSpawner {
  private readonly gridWidth: number;
  private readonly gridHeight: number;

  constructor(gridWidth: number, gridHeight: number) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
  }

  /**
   * Spawn food at a random empty cell.
   * @param occupiedCells - Positions that are currently occupied (e.g., by the snake).
   * @returns A new food position, or `null` if no empty cell exists.
   */
  spawn(occupiedCells: readonly Position[]): Vector2D | null {
    const emptyCells = this.getEmptyCells(occupiedCells);

    if (emptyCells.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[index];
  }

  /**
   * Compute all grid cells that are not currently occupied.
   * @param occupiedCells - Positions to exclude.
   * @returns Array of empty cell positions.
   */
  private getEmptyCells(occupiedCells: readonly Position[]): Vector2D[] {
    const occupiedSet = new Set(
      occupiedCells.map((pos) => `${pos.x},${pos.y}`),
    );

    const empty: Vector2D[] = [];
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const key = `${x},${y}`;
        if (!occupiedSet.has(key)) {
          empty.push(new Vector2D(x, y));
        }
      }
    }

    return empty;
  }
}
