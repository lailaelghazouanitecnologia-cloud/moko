export class Position {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError('Position coordinates must be integers');
    }
    if (x < 0 || y < 0) {
      throw new RangeError('Position coordinates must be non-negative');
    }
  }

  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }

  toString(): string {
    return `Position(${this.x}, ${this.y})`;
  }
}

export class Cell {
  constructor(
    public type: 'empty' | 'player1' | 'player2' | 'wall' = 'empty',
    public value: number = 0
  ) {
    if (!Number.isInteger(value)) {
      throw new TypeError('Cell value must be an integer');
    }
  }

  clone(): Cell {
    return new Cell(this.type, this.value);
  }

  equals(other: Cell): boolean {
    return this.type === other.type && this.value === other.value;
  }
}

export class Grid {
  private readonly _width: number;
  private readonly _height: number;
  private _cells: Cell[][];

  constructor(width: number, height: number) {
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      throw new TypeError('Grid dimensions must be integers');
    }
    if (width <= 0 || height <= 0) {
      throw new RangeError('Grid dimensions must be positive');
    }

    this._width = width;
    this._height = height;
    this._cells = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => new Cell())
    );
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  /**
   * Retrieve cell at position
   * @param pos Position to query
   * @returns Cell at the given position
   * @throws {TypeError} If pos is not a Position instance
   * @throws {RangeError} If pos is outside grid bounds
   */
  getCell(pos: Position): Cell {
    if (!(pos instanceof Position)) {
      throw new TypeError('Expected Position instance');
    }
    if (!this.isInside(pos)) {
      throw new RangeError(`Position ${pos} is outside grid bounds`);
    }
    return this._cells[pos.y][pos.x];
  }

  /**
   * Update cell at position
   * @param pos Position to update
   * @param cell New cell state
   * @throws {TypeError} If pos is not a Position instance or cell is not a Cell instance
   * @throws {RangeError} If pos is outside grid bounds
   */
  setCell(pos: Position, cell: Cell): void {
    if (!(pos instanceof Position)) {
      throw new TypeError('Expected Position instance');
    }
    if (!(cell instanceof Cell)) {
      throw new TypeError('Expected Cell instance');
    }
    if (!this.isInside(pos)) {
      throw new RangeError(`Position ${pos} is outside grid bounds`);
    }
    this._cells[pos.y][pos.x] = cell.clone();
  }

  /**
   * Check bounds
   * @param pos Position to check
   * @returns true if pos is within grid bounds
   * @throws {TypeError} If pos is not a Position instance
   */
  isInside(pos: Position): boolean {
    if (!(pos instanceof Position)) {
      throw new TypeError('Expected Position instance');
    }
    return pos.x >= 0 && pos.x < this._width && pos.y >= 0 && pos.y < this._height;
  }

  /**
   * Adjacent positions
   * @param pos Center position
   * @returns Array of valid neighbor positions
   * @throws {TypeError} If pos is not a Position instance
   * @throws {RangeError} If pos is outside grid bounds
   */
  getNeighbors(pos: Position): Position[] {
    if (!(pos instanceof Position)) {
      throw new TypeError('Expected Position instance');
    }
    if (!this.isInside(pos)) {
      throw new RangeError(`Position ${pos} is outside grid bounds`);
    }

    const neighbors: Position[] = [];
    const directions = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 },                  { x: 1, y: 0 },
      { x: -1, y: 1 },  { x: 0, y: 1 }, { x: 1, y: 1 }
    ];

    for (const dir of directions) {
      const newPos = new Position(pos.x + dir.x, pos.y + dir.y);
      if (this.isInside(newPos)) {
        neighbors.push(newPos);
      }
    }

    return neighbors;
  }

  /**
   * Reset all cells
   */
  clear(): void {
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        this._cells[y][x] = new Cell();
      }
    }
  }

  /**
   * Change grid size
   * @param w New width
   * @param h New height
   * @throws {TypeError} If dimensions are not integers
   * @throws {RangeError} If dimensions are not positive
   */
  resize(w: number, h: number): void {
    if (!Number.isInteger(w) || !Number.isInteger(h)) {
      throw new TypeError('Grid dimensions must be integers');
    }
    if (w <= 0 || h <= 0) {
      throw new RangeError('Grid dimensions must be positive');
    }

    const newCells: Cell[][] = Array.from({ length: h }, () =>
      Array.from({ length: w }, () => new Cell())
    );

    const minHeight = Math.min(this._height, h);
    const minWidth = Math.min(this._width, w);

    for (let y = 0; y < minHeight; y++) {
      for (let x = 0; x < minWidth; x++) {
        newCells[y][x] = this._cells[y][x].clone();
      }
    }

    this._cells = newCells;
  }

  /**
   * Deep copy grid
   * @returns New Grid instance with identical state
   */
  clone(): Grid {
    const newGrid = new Grid(this._width, this._height);
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        newGrid.setCell(new Position(x, y), this.getCell(new Position(x, y)));
      }
    }
    return newGrid;
  }
}
