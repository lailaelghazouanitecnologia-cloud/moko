export type GameConfig = {
  readonly boardWidth: number;
  readonly boardHeight: number;
};

export type Position = {
  x: number;
  y: number;
};

export enum Direction {
  Left,
  Right,
  Down,
  Up
}

export function toVector(dir: Direction): Position {
  switch (dir) {
    case Direction.Left: return { x: -1, y: 0 };
    case Direction.Right: return { x: 1, y: 0 };
    case Direction.Down: return { x: 0, y: 1 };
    case Direction.Up: return { x: 0, y: -1 };
  }
}

export class GameState {
  score: number;
  board: number[][];
  isPaused: boolean;
  isGameOver: boolean;
  currentShape: number[][];
  nextShape: number[][];
  position: Position;
  completedLines: number;

  constructor() {
    this.score = 0;
    this.board = [];
    this.isPaused = false;
    this.isGameOver = false;
    this.currentShape = [];
    this.nextShape = [];
    this.position = { x: 0, y: 0 };
    this.completedLines = 0;
  }

  /**
   * Initialize a new game with the given configuration.
   * @param config - Board dimensions and rules.
   * @throws {TypeError} If config is not an object.
   * @throws {RangeError} If boardWidth or boardHeight are not positive integers.
   */
  start(config: GameConfig): void {
    if (typeof config !== 'object' || config === null) {
      throw new TypeError('config must be an object');
    }
    if (!Number.isInteger(config.boardWidth) || config.boardWidth <= 0) {
      throw new RangeError('boardWidth must be a positive integer');
    }
    if (!Number.isInteger(config.boardHeight) || config.boardHeight <= 0) {
      throw new RangeError('boardHeight must be a positive integer');
    }

    this.score = 0;
    this.board = Array.from({ length: config.boardHeight }, () => Array(config.boardWidth).fill(0));
    this.isPaused = false;
    this.isGameOver = false;
    this.currentShape = this.generateShape();
    this.nextShape = this.generateShape();
    this.position = { x: Math.floor(config.boardWidth / 2), y: 0 };
    this.completedLines = 0;
  }

  /**
   * Toggle the pause state if the game is not over.
   */
  pause(): void {
    if (!this.isGameOver) {
      this.isPaused = !this.isPaused;
    }
  }

  /**
   * Clear the board and restart with the same dimensions.
   */
  reset(): void {
    const config: GameConfig = {
      boardWidth: this.board[0]?.length ?? 10,
      boardHeight: this.board.length ?? 20
    };
    this.start(config);
  }

  /**
   * Move the current shape in the specified direction.
   * @param dir - Direction to move.
   * @returns Whether the move was successful.
   */
  move(dir: Direction): boolean {
    if (this.isPaused || this.isGameOver) return false;

    const vector = toVector(dir);
    const newPos: Position = { x: this.position.x + vector.x, y: this.position.y + vector.y };

    if (this.isValidPosition(newPos, this.currentShape)) {
      this.position = newPos;
      return true;
    }
    return false;
  }

  /**
   * Rotate the current shape clockwise if the resulting position is valid.
   * @returns Whether the rotation was successful.
   */
  rotate(): boolean {
    if (this.isPaused || this.isGameOver) return false;

    const rotated = this.rotateMatrix(this.currentShape);
    if (this.isValidPosition(this.position, rotated)) {
      this.currentShape = rotated;
      return true;
    }
    return false;
  }

  /**
   * Drop the current shape as far down as possible.
   * @returns Number of rows dropped.
   */
  drop(): number {
    if (this.isPaused || this.isGameOver) return 0;

    let dropped = 0;
    while (this.move(Direction.Down)) {
      dropped++;
    }
    return dropped;
  }

  /**
   * Advance the game by one tick.
   * @returns Number of lines cleared this tick.
   */
  update(): number {
    if (this.isPaused || this.isGameOver) return 0;

    if (this.move(Direction.Down)) {
      return 0;
    }

    this.mergeShape();
    const lines = this.clearLines();
    this.completedLines += lines;
    this.score += lines * 100;

    if (this.checkGameOver()) {
      this.isGameOver = true;
      return lines;
    }

    this.currentShape = this.nextShape;
    this.nextShape = this.generateShape();
    this.position = { x: Math.floor(this.board[0].length / 2), y: 0 };

    return lines;
  }

  /**
   * Check if the current shape collides at the top.
   * @returns Whether the game is over.
   */
  checkGameOver(): boolean {
    return !this.isValidPosition(this.position, this.currentShape);
  }

  private generateShape(): number[][] {
    const shapes: readonly number[][][] = [
      [[1, 1], [1, 1]],
      [[1, 1, 1], [0, 1, 0]],
      [[0, 1, 1], [1, 1, 0]],
      [[1, 1, 0], [0, 1, 1]],
      [[1, 0, 0], [1, 1, 1]],
      [[0, 0, 1], [1, 1, 1]],
      [[1, 1, 1, 1]]
    ];
    return shapes[Math.floor(Math.random() * shapes.length)];
  }

  private rotateMatrix(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        rotated[j][rows - 1 - i] = matrix[i][j];
      }
    }
    return rotated;
  }

  private isValidPosition(pos: Position, shape: number[][]): boolean {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = pos.x + x;
          const boardY = pos.y + y;

          if (
            boardX < 0 ||
            boardX >= this.board[0].length ||
            boardY >= this.board.length ||
            (boardY >= 0 && this.board[boardY][boardX])
          ) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private mergeShape(): void {
    for (let y = 0; y < this.currentShape.length; y++) {
      for (let x = 0; x < this.currentShape[y].length; x++) {
        if (this.currentShape[y][x]) {
          const boardY = this.position.y + y;
          const boardX = this.position.x + x;
          if (boardY >= 0) {
            this.board[boardY][boardX] = 1;
          }
        }
      }
    }
  }

  private clearLines(): number {
    let cleared = 0;
    for (let y = this.board.length - 1; y >= 0; y--) {
      if (this.board[y].every(cell => cell === 1)) {
        this.board.splice(y, 1);
        this.board.unshift(Array(this.board[0].length).fill(0));
        cleared++;
        y++;
      }
    }
    return cleared;
  }
}
