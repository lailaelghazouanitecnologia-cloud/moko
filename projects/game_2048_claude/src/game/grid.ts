import {
  Direction,
  Position,
  GameState,
  MergeResult,
  MoveResult,
  GRID_SIZE,
  WIN_VALUE,
  INITIAL_TILES,
  FOUR_PROBABILITY,
} from "../core";

/**
 * Core game grid implementing 2048 merge logic, scoring, and win/lose detection.
 */
export class Grid {
  private readonly size: number;
  private cells: number[][];
  private _score: number;
  private _won: boolean;
  private _over: boolean;

  constructor(size: number = GRID_SIZE) {
    this.size = size;
    this.cells = Grid.emptyGrid(size);
    this._score = 0;
    this._won = false;
    this._over = false;
  }

  // ── Public API ──────────────────────────────────────────────

  get score(): number {
    return this._score;
  }

  get won(): boolean {
    return this._won;
  }

  get over(): boolean {
    return this._over;
  }

  /** Read-only snapshot of current cell values. */
  getCell(row: number, col: number): number {
    return this.cells[row][col];
  }

  /** Return the full grid as a 2D readonly array. */
  getCells(): ReadonlyArray<ReadonlyArray<number>> {
    return this.cells;
  }

  /** Initialise a new game: clear grid, place starting tiles. */
  init(): void {
    this.cells = Grid.emptyGrid(this.size);
    this._score = 0;
    this._won = false;
    this._over = false;
    for (let i = 0; i < INITIAL_TILES; i++) {
      this.spawnTile();
    }
  }

  /** Attempt a move. Returns true if the grid changed. */
  move(direction: Direction): boolean {
    if (this._over) return false;

    const result = this.applyMove(direction);
    if (!result.moved) return false;

    this.cells = result.grid;
    this._score += result.points;

    // Check win
    if (!this._won) {
      this._won = this.hasValue(WIN_VALUE);
    }

    this.spawnTile();

    // Check lose
    if (!this.hasAvailableMoves()) {
      this._over = true;
    }

    return true;
  }

  /** Serialise the full game state. */
  getState(): GameState {
    return {
      grid: this.cells.map((row) => [...row]),
      score: this._score,
      won: this._won,
      over: this._over,
    };
  }

  // ── Tile spawning ───────────────────────────────────────────

  private spawnTile(): void {
    const empty = this.emptyPositions();
    if (empty.length === 0) return;

    const pos = empty[Math.floor(Math.random() * empty.length)];
    this.cells[pos.row][pos.col] = Math.random() < FOUR_PROBABILITY ? 4 : 2;
  }

  private emptyPositions(): Position[] {
    const positions: Position[] = [];
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.cells[row][col] === 0) {
          positions.push({ row, col });
        }
      }
    }
    return positions;
  }

  // ── Move & merge logic ──────────────────────────────────────

  /**
   * Apply a move without mutating the current grid.
   * Extracts rows or columns depending on direction, merges each line,
   * and reconstructs the grid.
   */
  private applyMove(direction: Direction): MoveResult {
    const grid = this.cells.map((row) => [...row]);
    let totalPoints = 0;
    let moved = false;

    const lines = this.extractLines(grid, direction);

    for (let i = 0; i < lines.length; i++) {
      const result = Grid.mergeLine(lines[i]);
      totalPoints += result.points;

      if (!arraysEqual(lines[i], result.cells)) {
        moved = true;
      }
      lines[i] = [...result.cells];
    }

    const newGrid = this.reconstructGrid(lines, direction);
    return { grid: newGrid, points: totalPoints, moved };
  }

  /**
   * Extract the grid into lines oriented so that merging always
   * happens left-to-right.
   */
  private extractLines(grid: number[][], direction: Direction): number[][] {
    const lines: number[][] = [];

    switch (direction) {
      case Direction.Left:
        for (let r = 0; r < this.size; r++) {
          lines.push([...grid[r]]);
        }
        break;

      case Direction.Right:
        for (let r = 0; r < this.size; r++) {
          lines.push([...grid[r]].reverse());
        }
        break;

      case Direction.Up:
        for (let c = 0; c < this.size; c++) {
          const col: number[] = [];
          for (let r = 0; r < this.size; r++) col.push(grid[r][c]);
          lines.push(col);
        }
        break;

      case Direction.Down:
        for (let c = 0; c < this.size; c++) {
          const col: number[] = [];
          for (let r = this.size - 1; r >= 0; r--) col.push(grid[r][c]);
          lines.push(col);
        }
        break;
    }

    return lines;
  }

  /** Reconstruct a full grid from merged lines + direction. */
  private reconstructGrid(lines: number[][], direction: Direction): number[][] {
    const grid = Grid.emptyGrid(this.size);

    switch (direction) {
      case Direction.Left:
        for (let r = 0; r < this.size; r++) {
          grid[r] = [...lines[r]];
        }
        break;

      case Direction.Right:
        for (let r = 0; r < this.size; r++) {
          grid[r] = [...lines[r]].reverse();
        }
        break;

      case Direction.Up:
        for (let c = 0; c < this.size; c++) {
          for (let r = 0; r < this.size; r++) {
            grid[r][c] = lines[c][r];
          }
        }
        break;

      case Direction.Down:
        for (let c = 0; c < this.size; c++) {
          for (let r = 0; r < this.size; r++) {
            grid[this.size - 1 - r][c] = lines[c][r];
          }
        }
        break;
    }

    return grid;
  }

  /**
   * Core merge algorithm for a single line (always left-to-right).
   *
   * 1. Compact non-zero values to the left.
   * 2. Walk pairs: if adjacent equal, merge and score.
   * 3. Compact again to close gaps from merges.
   */
  static mergeLine(line: readonly number[]): MergeResult {
    // Step 1: compact
    let compacted = line.filter((v) => v !== 0);
    let points = 0;

    // Step 2: merge adjacent pairs
    const merged: number[] = [];
    let i = 0;
    while (i < compacted.length) {
      if (i + 1 < compacted.length && compacted[i] === compacted[i + 1]) {
        const sum = compacted[i] * 2;
        merged.push(sum);
        points += sum;
        i += 2;
      } else {
        merged.push(compacted[i]);
        i += 1;
      }
    }

    // Step 3: pad with zeros
    while (merged.length < line.length) {
      merged.push(0);
    }

    return { cells: merged, points };
  }

  // ── Win / lose helpers ──────────────────────────────────────

  private hasValue(target: number): boolean {
    for (const row of this.cells) {
      for (const cell of row) {
        if (cell === target) return true;
      }
    }
    return false;
  }

  private hasAvailableMoves(): boolean {
    // Any empty cell means a move is possible
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.cells[r][c] === 0) return true;
      }
    }
    // Check adjacent pairs for possible merges
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const val = this.cells[r][c];
        if (c + 1 < this.size && val === this.cells[r][c + 1]) return true;
        if (r + 1 < this.size && val === this.cells[r + 1][c]) return true;
      }
    }
    return false;
  }

  // ── Utility ─────────────────────────────────────────────────

  private static emptyGrid(size: number): number[][] {
    return Array.from({ length: size }, () => Array<number>(size).fill(0));
  }
}

/** Shallow array equality for primitive arrays. */
function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
