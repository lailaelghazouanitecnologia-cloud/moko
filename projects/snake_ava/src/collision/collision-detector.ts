import { Snake } from '../domain/snake';
import { Food } from '../domain/food';

/**
 * Bounds type for collision detection
 */
type Bounds = { width: number; height: number };

/**
 * Point type for collision coordinates
 */
type Point = { x: number; y: number };

/**
 * CollisionDetector - Detects snake-food and self collisions
 */
export class CollisionDetector {
  private snake: Snake;
  private food: Food;
  private collisionPoint: Point | null = null;

  /**
   * Creates an instance of CollisionDetector
   * @param {Snake} snake - The snake instance to monitor
   * @param {Food} food - The food instance to check against
   * @throws {Error} If snake or food is null/undefined
   */
  constructor(snake: Snake, food: Food) {
    this.validateConstructorInputs(snake, food);
    
    this.snake = snake;
    this.food = food;
    
    // Bind methods to this instance
    this.checkSnakeFoodCollision = this.checkSnakeFoodCollision.bind(this);
    this.checkSelfCollision = this.checkSelfCollision.bind(this);
    this.checkWallCollision = this.checkWallCollision.bind(this);
    this.getCollisionPoint = this.getCollisionPoint.bind(this);
    this.reset = this.reset.bind(this);
  }

  /**
   * Validates constructor inputs
   * @private
   * @param {Snake} snake - The snake instance
   * @param {Food} food - The food instance
   * @throws {Error} If inputs are invalid
   */
  private validateConstructorInputs(snake: Snake, food: Food): void {
    if (!snake) {
      throw new Error('Snake is required for CollisionDetector');
    }
    if (!food) {
      throw new Error('Food is required for CollisionDetector');
    }
  }

  /**
   * Checks if snake head hits food
   * @returns {boolean} True if collision detected
   * @throws {Error} If snake has no segments
   */
  checkSnakeFoodCollision(): boolean {
    this.validateSnakeHasSegments();
    
    const head = this.snake.segments[0];
    const foodPos = this.food.getPosition();
    
    if (!foodPos) {
      return false;
    }
    
    if (head.x === foodPos.x && head.y === foodPos.y) {
      this.collisionPoint = { x: head.x, y: head.y };
      return true;
    }
    return false;
  }

  /**
   * Checks if snake collides with itself
   * @returns {boolean} True if collision detected
   * @throws {Error} If snake has no segments
   */
  checkSelfCollision(): boolean {
    this.validateSnakeHasSegments();
    
    const head = this.snake.segments[0];
    
    // Start from index 1 to check body segments
    for (let i = 1; i < this.snake.segments.length; i++) {
      const segment = this.snake.segments[i];
      if (head.x === segment.x && head.y === segment.y) {
        this.collisionPoint = { x: head.x, y: head.y };
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if snake hits walls
   * @param {Bounds} bounds - The boundary dimensions
   * @returns {boolean} True if collision detected
   * @throws {Error} If bounds are invalid
   */
  checkWallCollision(bounds: Bounds): boolean {
    this.validateBounds(bounds);
    
    const head = this.snake.segments[0];
    
    if (head.x < 0 || head.x >= bounds.width || head.y < 0 || head.y >= bounds.height) {
      this.collisionPoint = { x: head.x, y: head.y };
      return true;
    }
    return false;
  }

  /**
   * Returns collision coordinates
   * @returns {Point | null} The collision point or null if no collision
   */
  getCollisionPoint(): Point | null {
    return this.collisionPoint;
  }

  /**
   * Clears collision state
   */
  reset(): void {
    this.collisionPoint = null;
  }

  /**
   * Validates that snake has segments
   * @private
   * @throws {Error} If snake has no segments
   */
  private validateSnakeHasSegments(): void {
    if (!this.snake || !this.snake.segments || this.snake.segments.length === 0) {
      throw new Error('Snake must have at least one segment for collision detection');
    }
  }

  /**
   * Validates bounds parameter
   * @private
   * @param {Bounds} bounds - The bounds to validate
   * @throws {Error} If bounds are invalid
   */
  private validateBounds(bounds: Bounds): void {
    if (!bounds) {
      throw new Error('Bounds is required for wall collision detection');
    }
    if (typeof bounds.width !== 'number' || bounds.width <= 0) {
      throw new Error('Bounds width must be a positive number');
    }
    if (typeof bounds.height !== 'number' || bounds.height <= 0) {
      throw new Error('Bounds height must be a positive number');
    }
  }
}
