import { Direction } from '../types';
import { Position, Size } from '../types';

/**
 * Represents the snake game entity
 */
export class Snake {
  segments: Position[];
  direction: Direction;
  speed: number;
  isAlive: boolean;

  constructor() {
    this.segments = [];
    this.direction = Direction.RIGHT;
    this.speed = 1;
    this.isAlive = true;
  }

  /**
   * Advance the snake by one step in the current direction
   */
  move(): void {
    if (!this.isAlive || this.segments.length === 0) {
      return;
    }

    const head = this.segments[0];
    let newHead: Position;

    switch (this.direction) {
      case Direction.UP:
        newHead = { x: head.x, y: head.y - 1 };
        break;
      case Direction.DOWN:
        newHead = { x: head.x, y: head.y + 1 };
        break;
      case Direction.LEFT:
        newHead = { x: head.x - 1, y: head.y };
        break;
      case Direction.RIGHT:
        newHead = { x: head.x + 1, y: head.y };
        break;
      default:
        return;
    }

    this.segments.unshift(newHead);
    this.segments.pop();
  }

  /**
   * Add a new segment to the tail of the snake
   */
  grow(): void {
    if (!this.isAlive || this.segments.length === 0) {
      return;
    }

    const tail = this.segments[this.segments.length - 1];
    const newSegment = { x: tail.x, y: tail.y };
    this.segments.push(newSegment);
  }

  /**
   * Change the direction of the snake
   * @param newDir - The new direction to turn to
   */
  turn(newDir: Direction): void {
    if (!this.isAlive || this.segments.length === 0) {
      return;
    }

    const opposites = {
      [Direction.UP]: Direction.DOWN,
      [Direction.DOWN]: Direction.UP,
      [Direction.LEFT]: Direction.RIGHT,
      [Direction.RIGHT]: Direction.LEFT
    };

    if (opposites[this.direction] !== newDir) {
      this.direction = newDir;
    }
  }

  /**
   * Check if the snake's head has collided with its body
   * @returns true if collision detected, false otherwise
   */
  checkSelfCollision(): boolean {
    if (this.segments.length < 2) {
      return false;
    }

    const head = this.segments[0];
    for (let i = 1; i < this.segments.length; i++) {
      const segment = this.segments[i];
      if (head.x === segment.x && head.y === segment.y) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the snake's head has collided with the walls
   * @param boardSize - The size of the game board
   * @returns true if collision detected, false otherwise
   */
  checkWallCollision(boardSize: Size): boolean {
    if (!boardSize || boardSize.width <= 0 || boardSize.height <= 0) {
      throw new Error('Invalid boardSize provided');
    }

    if (this.segments.length === 0) {
      return false;
    }

    const head = this.segments[0];
    return (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= boardSize.width ||
      head.y >= boardSize.height
    );
  }

  /**
   * Reset the snake to a starting position and direction
   * @param startPos - The starting position for the snake head
   * @param startDir - The starting direction
   */
  reset(startPos: Position, startDir: Direction): void {
    if (!startPos || typeof startPos.x !== 'number' || typeof startPos.y !== 'number') {
      throw new Error('Invalid startPos provided');
    }

    if (!startDir || !Object.values(Direction).includes(startDir)) {
      throw new Error('Invalid startDir provided');
    }

    this.segments = [{ x: startPos.x, y: startPos.y }];
    this.direction = startDir;
    this.isAlive = true;
  }

  /**
   * Get the current head position of the snake
   * @returns The position of the snake's head
   */
  getHead(): Position | null {
    if (this.sements.length === 0) {
      return null;
    }
    return { ...this.segments[0] };
  }

  /**
   * Get the current length of the snake
   * @returns The number of segments in the snake
   */
  getLength(): number {
    return this.segments.length;
  }

  /**
   * Check if the snake is alive
   * @returns true if alive, false otherwise
   */
  isSnakeAlive(): boolean {
    return this.isAlive;
  }

  /**
   * Kill the snake
   */
  die(): void {
    this.isAlive = false;
  }

  /**
   * Get the current direction of the snake
   * @returns The current direction
   */
  getDirection(): Direction {
    return this.direction;
  }

  /**
   * Get the current speed of the snake
   * @returns The current speed
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * Set the speed of the snake
   * @param newSpeed - The new speed value
   */
  setSpeed(newSpeed: number): void {
    if (newSpeed <= 0) {
      throw new Error('Speed must be greater than 0');
    }
    this.speed = newSpeed;
  }

  /**
   * Get a copy of all segments
   * @returns Array of positions representing all segments
   */
  getSegments(): Position[] {
    return this.segments.map(segment => ({ ...segment }));
  }

  /**
   * Check if a position is occupied by the snake
   * @param pos - The position to check
   * @returns true if position is part of the snake, false otherwise
   */
  occupiesPosition(pos: Position): boolean {
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      return false;
    }

    return this.segments.some(segment => segment.x === pos.x && segment.y === pos.y);
  }
}
