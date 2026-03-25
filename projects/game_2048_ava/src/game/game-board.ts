import { Position } from '../core';

export class GameBoard {
  readonly size: number;
  private readonly grid: number[][];

  constructor(size: number) {
    this.size = size;
    this.grid = Array.from({ length: size }, () => Array(size).fill(0));
  }

  clone(): GameBoard {
    const board = new GameBoard(this.size);
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        board.grid[i][j] = this.grid[i][j];
      }
    }
    return board;
  }

  getTile(pos: Position): number {
    return this.grid[pos.row]?.[pos.col] ?? 0;
  }

  setTile(pos: Position, value: number): void {
    if (pos.row >= 0 && pos.row < this.size && pos.col >= 0 && pos.col < this.size) {
      this.grid[pos.row][pos.col] = value;
    }
  }

  isEmpty(pos: Position): boolean {
    return this.getTile(pos) === 0;
  }

  spawnRandom(): Position {
    const empties: Position[] = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) {
          empties.push(new Position(r, c));
        }
      }
    }
    if (empties.length === 0) throw new Error('Board is full');
    const pos = empties[Math.floor(Math.random() * empties.length)];
    this.grid[pos.row][pos.col] = Math.random() < 0.9 ? 2 : 4;
    return pos;
  }

  canMove(): boolean {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const v = this.grid[r][c];
        if (v === 0) return true;
        if (c < this.size - 1 && v === this.grid[r][c + 1]) return true;
        if (r < this.size - 1 && v === this.grid[r + 1][c]) return true;
      }
    }
    return false;
  }

  isFull(): boolean {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) return false;
      }
    }
    return true;
  }

  toString(): string {
    return this.grid.map(row => row.map(v => v || '.').join(' ')).join('\n');
  }
}
