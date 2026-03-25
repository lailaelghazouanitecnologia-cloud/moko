import { Position } from '../core/position';
import { Direction } from './direction';

export class Snake {
  private readonly _body: Position[];
  private _direction: Direction;
  0: number;
  1: number;

  constructor(head: Position, direction: Direction) {
    if (!head) throw new TypeError('head is required');
    if (!direction) throw new TypeError('direction is required');
    this._body = [head];
    this._direction = direction;
  }

  get head(): Position {
    return this._body[0];
  }

  get body(): readonly Position[] {
    return this._body;
  }

  get direction(): Direction {
    return this._direction;
  }

  get length(): number {
    return this._body.length;
  }

  /**
   * Moves the snake one step forward.
   * @param grow - If true, the snake grows by keeping its tail; otherwise, the tail is removed.
   */
  move(grow: boolean): void {
    if (typeof grow !== 'boolean') throw new TypeError('grow must be a boolean');
    const newHead = this.head.add(new Position(this._direction[0], this._direction[1]));
    this._body.unshift(newHead);
    if (!grow) {
      this._body.pop();
    }
  }

  /**
   * Turns the snake left relative to its current direction.
   */
  turnLeft(): void {
    this._direction = Direction.left(this._direction);
  }

  /**
   * Turns the snake right relative to its current direction.
   */
  turnRight(): void {
    this._direction = Direction.right(this._direction);
  }

  /**
   * Turns the snake upwards if not currently moving vertically.
   */
  turnUp(): void {
    if (this._direction[1] !== 0) return;
    this._direction = new Direction(0, -1);
  }

  /**
   * Turns the snake downwards if not currently moving vertically.
   */
  turnDown(): void {
    if (this._direction[1] !== 0) return;
    this._direction = new Direction(0, 1);
  }

  /**
   * Checks if the provided direction is opposite to the current direction.
   * @param direction - The direction to compare.
   * @returns True if the directions are opposite.
   */
  isOpposite(direction: Direction): boolean {
    if (!direction) throw new TypeError('direction is required');
    return Direction.isOpposite(this._direction, direction);
  }

  /**
   * Creates a deep copy of the snake.
   * @returns A new Snake instance with the same state.
   */
  clone(): Snake {
    const newSnake = new Snake(this.head.clone(), this._direction);
    newSnake._body = this._body.map(p => p.clone());
    return newSnake;
  }

  /**
   * Checks equality with another snake.
   * @param other - The object to compare.
   * @returns True if both snakes are identical in body and direction.
   */
  equals(other: unknown): boolean {
    if (!(other instanceof Snake)) return false;
    if (this.length !== other.length) return false;
    if (!this.head.equals(other.head)) return false;
    return this._body.every((p, i) => p.equals(other._body[i]));
  }
}