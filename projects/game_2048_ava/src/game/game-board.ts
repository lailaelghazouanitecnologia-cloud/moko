export interface Position {
  readonly x: number;
  readonly y: number;
  add(other: Position): Position;
  subtract(other: Position): Position;
  equals(other: Position): boolean;
  clone(): Position;
  manhattan(other: Position): number;
  toString(): string;
}

export interface Cell {
  readonly position: Position;
  piece: Piece | null;
}

export interface Piece {
  readonly id: string;
  readonly playerId: string;
  readonly type: string;
}

export interface Player {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export class GameBoard {
  public width: number;
  public height: number;
  public cells: Cell[][];
  public readonly currentPlayer: Player;

  constructor() {
    this.width = 0;
    this.height = 0;
    this.cells = [];
    this.currentPlayer = { id: '', name: '', color: '' };
  }

  /**
   * Initializes the game board with the specified dimensions.
   * @param width - The width of the board (must be positive)
   * @param height - The height of the board (must be positive)
   * @throws {RangeError} If width or height are not positive integers
   */
  public initialize(width: number, height: number): void {
    if (!Number.isInteger(width) || width <= 0) {
      throw new RangeError('Width must be a positive integer');
    }
    if (!Number.isInteger(height) || height <= 0) {
      throw new RangeError('Height must be a positive integer');
    }

    this.width = width;
    this.height = height;
    this.cells = [];

    for (let y = 0; y < height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < width; x++) {
        row.push({
          position: { x, y, add: (other) => ({ x: x + other.x, y: y + other.y } as Position), subtract: (other) => ({ x: x - other.x, y: y - other.y } as Position), equals: (other) => x === other.x && y === other.y, clone: () => ({ x, y } as Position), manhattan: (other) => Math.abs(x - other.x) + Math.abs(y - other.y), toString: () => `${x},${y}` },
          piece: null
        });
      }
      this.cells.push(row);
    }
  }

  /**
   * Places a piece on the board at the specified coordinates.
   * @param x - The x-coordinate
   * @param y - The y-coordinate
   * @param piece - The piece to place
   * @returns true if the piece was successfully placed, false otherwise
   * @throws {TypeError} If piece is null or undefined
   */
  public placePiece(x: number, y: number, piece: Piece): boolean {
    if (piece === null || piece === undefined) {
      throw new TypeError('Piece cannot be null or undefined');
    }

    if (!this.isValidMove(x, y)) {
      return false;
    }

    this.cells[y][x].piece = piece;
    return true;
  }

  /**
   * Retrieves the cell at the specified coordinates.
   * @param x - The x-coordinate
   * @param y - The y-coordinate
   * @returns The cell at the specified position
   * @throws {RangeError} If coordinates are out of bounds
   */
  public getCell(x: number, y: number): Cell {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError('Coordinates must be integers');
    }
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError(`Position (${x}, ${y}) is out of bounds`);
    }
    return this.cells[y][x];
  }

  /**
   * Checks if a move to the specified coordinates is valid.
   * @param x - The x-coordinate
   * @param y - The y-coordinate
   * @returns true if the move is valid, false otherwise
   */
  public isValidMove(x: number, y: number): boolean {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return false;
    }
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return this.cells[y][x].piece === null;
  }

  /**
   * Clears all pieces from the board.
   */
  public clearBoard(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cells[y][x].piece = null;
      }
    }
  }

  /**
   * Gets all available moves (empty cells) on the board.
   * @returns An array of positions representing valid moves
   */
  public getAvailableMoves(): Position[] {
    const moves: Position[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.isValidMove(x, y)) {
          moves.push({ x, y, add: (other) => ({ x: x + other.x, y: y + other.y } as Position), subtract: (other) => ({ x: x - other.x, y: y - other.y } as Position), equals: (other) => x === other.x && y === other.y, clone: () => ({ x, y } as Position), manhattan: (other) => Math.abs(x - other.x) + Math.abs(y - other.y), toString: () => `${x},${y}` });
        }
      }
    }
    return moves;
  }

  /**
   * Creates a deep copy of the game board.
   * @returns A new GameBoard instance with the same state
   */
  public clone(): GameBoard {
    const cloned = new GameBoard();
    cloned.width = this.width;
    cloned.height = this.height;
    cloned.currentPlayer = { ...this.currentPlayer };
    cloned.cells = this.cells.map(row =>
      row.map(cell => ({
        position: { ...cell.position },
        piece: cell.piece ? { ...cell.piece } : null
      }))
    );
    return cloned;
  }
}
