import { Direction, Position } from '../core/types';
import { Vector2D } from '../core/vector';

/**
 * Represents the snake entity on the game grid.
 * Manages body segments, movement, growth, and self-collision detection.
 */
export class Snake {
  private _body: Vector2D[];
  private _direction: Direction;
  private _growing: boolean;

  constructor(startPosition: Position, initialLength: number, startDirection: Direction) {
    this._direction = startDirection;
    this._growing = false;
    this._body = [];

    // Build the initial body extending opposite to the start direction.
    const offset = Vector2D.fromDirection(startDirection).scale(-1);
    for (let i = 0; i < initialLength; i++) {
      this._body.push(Vector2D.from(startPosition).add(offset.scale(i)));
    }
  }

  /** The head position (first segment). */
  get head(): Readonly<Vector2D> {
    return this._body[0];
  }

  /** A readonly view of the full body (head first). */
  get body(): readonly Readonly<Vector2D>[] {
    return this._body;
  }

  /** Current travel direction. */
  get direction(): Direction {
    return this._direction;
  }

  /** Number of segments. */
  get length(): number {
    return this._body.length;
  }

  /**
   * Set the snake's direction.
   * The caller is responsible for preventing reverse (180-degree) turns.
   */
  setDirection(direction: Direction): void {
    this._direction = direction;
  }

  /**
   * Mark the snake to grow by one segment on the next move.
   * The tail will not be removed during the next {@link move} call.
   */
  grow(): void {
    this._growing = true;
  }

  /**
   * Advance the snake one cell in the current direction.
   * If the snake is growing, the tail is retained; otherwise it is dropped.
   * @returns The new head position after moving.
   */
  move(): Vector2D {
    const delta = Vector2D.fromDirection(this._direction);
    const newHead = this._body[0].add(delta);

    this._body.unshift(newHead);

    if (this._growing) {
      this._growing = false;
    } else {
      this._body.pop();
    }

    return newHead;
  }

  /**
   * Check whether the snake's head overlaps any of its own body segments.
   * @returns `true` if the head collides with the body.
   */
  checkSelfCollision(): boolean {
    const [head, ...tail] = this._body;
    return tail.some((segment) => head.equals(segment));
  }

  /**
   * Check whether a given position overlaps any segment of the snake.
   * @param position - The position to test.
   * @returns `true` if the position is occupied by the snake.
   */
  occupies(position: Position): boolean {
    return this._body.some((segment) => segment.equals(position));
  }

  /** Reset the snake to a fresh state. */
  reset(startPosition: Position, initialLength: number, startDirection: Direction): void {
    this._direction = startDirection;
    this._growing = false;
    this._body = [];

    const offset = Vector2D.fromDirection(startDirection).scale(-1);
    for (let i = 0; i < initialLength; i++) {
      this._body.push(Vector2D.from(startPosition).add(offset.scale(i)));
    }
  }
}
