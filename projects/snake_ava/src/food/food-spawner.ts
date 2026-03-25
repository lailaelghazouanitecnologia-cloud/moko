import { Food } from './food';
import { Vector } from '../math/vector';

/**
 * Manages food placement and lifecycle.
 */
export class FoodSpawner {
  private spawnRate: number;
  private readonly maxFood: number;
  private foodList: Food[];
  private spawnTimer: number = 0;

  constructor(spawnRate: number = 1.0, maxFood: number = 10) {
    if (typeof spawnRate !== 'number' || isNaN(spawnRate)) {
      throw new TypeError('spawnRate must be a valid number');
    }
    if (typeof maxFood !== 'number' || isNaN(maxFood) || maxFood < 0) {
      throw new RangeError('maxFood must be a non-negative number');
    }
    this.spawnRate = spawnRate;
    this.maxFood = maxFood;
    this.foodList = [];
  }

  /**
   * Create food instance at the specified position.
   * @param position - The position to spawn the food.
   * @returns The spawned Food instance.
   */
  spawn(position: Vector): Food {
    if (!(position instanceof Vector)) {
      throw new TypeError('position must be an instance of Vector');
    }
    const food = new Food();
    this.foodList.push(food);
    return food;
  }

  /**
   * Remove food instance from the spawner.
   * @param food - The Food instance to despawn.
   */
  despawn(food: Food): void {
    if (!(food instanceof Food)) {
      throw new TypeError('food must be an instance of Food');
    }
    const index = this.foodList.indexOf(food);
    if (index !== -1) {
      this.foodList.splice(index, 1);
    }
  }

  /**
   * Handle spawn timing based on delta time.
   * @param delta - Time elapsed since last update in seconds.
   */
  update(delta: number): void {
    if (typeof delta !== 'number' || isNaN(delta) || delta < 0) {
      throw new RangeError('delta must be a non-negative number');
    }
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnRate && this.foodList.length < this.maxFood) {
      this.spawnTimer = 0;
      const position = new Vector(0, 0, 0);
      this.spawn(position);
    }
  }

  /**
   * Count active food instances.
   * @returns The number of active food instances.
   */
  getFoodCount(): number {
    return this.foodList.length;
  }

  /**
   * Adjust spawn rate.
   * @param rate - New spawn rate in seconds.
   */
  setSpawnRate(rate: number): void {
    if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
      throw new RangeError('rate must be a positive number');
    }
    this.spawnRate = rate;
  }

  /**
   * Remove all food instances.
   */
  clearAll(): void {
    this.foodList = [];
  }
}
