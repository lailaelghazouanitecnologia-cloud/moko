import { Direction } from '../core/types';
import { OPPOSITE_DIRECTIONS } from '../core/constants';

/** A key-to-direction mapping entry. */
export interface KeyBinding {
  readonly key: string;
  readonly direction: Direction;
}

/** Default WASD + arrow key bindings. */
export const DEFAULT_KEY_BINDINGS: readonly KeyBinding[] = [
  { key: 'w', direction: Direction.Up },
  { key: 'a', direction: Direction.Left },
  { key: 's', direction: Direction.Down },
  { key: 'd', direction: Direction.Right },
  { key: 'ArrowUp', direction: Direction.Up },
  { key: 'ArrowLeft', direction: Direction.Left },
  { key: 'ArrowDown', direction: Direction.Down },
  { key: 'ArrowRight', direction: Direction.Right },
];

/**
 * Handles keyboard input and converts it to game directions.
 * Maintains a direction queue to buffer rapid inputs between ticks,
 * and prevents the snake from reversing into itself.
 */
export class InputHandler {
  private readonly keyMap: ReadonlyMap<string, Direction>;
  private readonly directionQueue: Direction[];
  private readonly maxQueueSize: number;
  private currentDirection: Direction;
  private _pauseRequested: boolean;
  private _restartRequested: boolean;
  private _listening: boolean;

  /**
   * @param initialDirection - The snake's starting direction.
   * @param bindings - Custom key bindings; defaults to WASD + arrows.
   * @param maxQueueSize - Maximum buffered direction changes per tick.
   */
  constructor(
    initialDirection: Direction,
    bindings: readonly KeyBinding[] = DEFAULT_KEY_BINDINGS,
    maxQueueSize: number = 2,
  ) {
    this.keyMap = new Map(bindings.map((b) => [b.key, b.direction]));
    this.directionQueue = [];
    this.maxQueueSize = maxQueueSize;
    this.currentDirection = initialDirection;
    this._pauseRequested = false;
    this._restartRequested = false;
    this._listening = false;
  }

  /** Whether a pause toggle was requested since the last drain. */
  get pauseRequested(): boolean {
    return this._pauseRequested;
  }

  /** Whether a restart was requested since the last drain. */
  get restartRequested(): boolean {
    return this._restartRequested;
  }

  /**
   * Start listening for keypress events on stdin (Node.js).
   * Configures raw mode so individual keys are captured.
   */
  startListening(): void {
    if (this._listening) return;
    this._listening = true;

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', this.onKeyPress);
  }

  /** Stop listening and restore stdin. */
  stopListening(): void {
    if (!this._listening) return;
    this._listening = false;

    process.stdin.removeListener('data', this.onKeyPress);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }

  /**
   * Process a key string (useful for testing or non-stdin input).
   * @param key - The key name or character pressed.
   */
  handleKey(key: string): void {
    // Ctrl-C — always allow exit.
    if (key === '\u0003') {
      process.exit();
    }

    // Pause toggle.
    if (key === 'p' || key === 'P') {
      this._pauseRequested = true;
      return;
    }

    // Restart.
    if (key === 'r' || key === 'R') {
      this._restartRequested = true;
      return;
    }

    // Escape sequences for arrow keys arrive as 3-byte strings.
    const mappedKey = this.resolveEscapeSequence(key) ?? key;
    const direction = this.keyMap.get(mappedKey);

    if (direction !== undefined) {
      this.enqueueDirection(direction);
    }
  }

  /**
   * Drain the next direction from the queue.
   * Should be called once per game tick.
   * @returns The next direction, or `null` if no input is queued.
   */
  drainDirection(): Direction | null {
    const next = this.directionQueue.shift() ?? null;
    if (next !== null) {
      this.currentDirection = next;
    }
    return next;
  }

  /** Drain and clear the pause flag. */
  drainPause(): boolean {
    const val = this._pauseRequested;
    this._pauseRequested = false;
    return val;
  }

  /** Drain and clear the restart flag. */
  drainRestart(): boolean {
    const val = this._restartRequested;
    this._restartRequested = false;
    return val;
  }

  /** Update the tracked current direction (e.g., after a game reset). */
  setCurrentDirection(direction: Direction): void {
    this.currentDirection = direction;
    this.directionQueue.length = 0;
  }

  // ── Private ───────────────────────────────────────────────────────

  /** Bound key press handler for stdin. */
  private onKeyPress = (data: string): void => {
    this.handleKey(data);
  };

  /**
   * Add a direction to the queue if it is valid (not a reverse of the
   * effective current direction).
   */
  private enqueueDirection(direction: Direction): void {
    if (this.directionQueue.length >= this.maxQueueSize) {
      return;
    }

    // The effective direction is the last queued one, or the current one.
    const effective =
      this.directionQueue.length > 0
        ? this.directionQueue[this.directionQueue.length - 1]
        : this.currentDirection;

    if (OPPOSITE_DIRECTIONS.get(effective) === direction) {
      return; // Prevent 180-degree reversal.
    }

    if (direction === effective) {
      return; // Ignore duplicate.
    }

    this.directionQueue.push(direction);
  }

  /**
   * Translate ANSI escape sequences (arrow keys) to their named equivalents.
   */
  private resolveEscapeSequence(data: string): string | null {
    if (data === '\u001b[A') return 'ArrowUp';
    if (data === '\u001b[B') return 'ArrowDown';
    if (data === '\u001b[C') return 'ArrowRight';
    if (data === '\u001b[D') return 'ArrowLeft';
    return null;
  }
}
