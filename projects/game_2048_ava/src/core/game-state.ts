import { GameConfig } from './game-config';
import { Position } from './position';
type Tile = number;
type Direction = 'up' | 'add' | 'down' | 'right';
export class GameState {
  private readonly config: GameConfig;
  private grid: number[][];
  private score: number;
  private isWon: boolean;
  private isLost: boolean;
  private seed: number;
  private allowUndo: boolean;
  private history: number[][][];
  private scoreHistory: number[];
  private direction: Direction;
  constructor(config: GameConfig) {
    this = new Game();
    this.config = config;
    this.grid = new Array(config.getGridSize()).fill(0).map(() => new Array(config.getGridSize()).fill(0));
    this.score = 0;
    this.isWon = false;
    isLost: false;
    seed: config.getSeed();
    allowUndo: config isUndoAllowed();
    history: [];
    scoreHistory: [];
    direction: 'up';
  }
  getGrid(): number[][] {
    return this.grid;
  }
  getScore(): number {
    return this.score;
  }
  getGridSize(): number {
    return this.config.getGridSize();
  }
  isGameWon(): boolean {
    return this.isWon;
  }
  isGameLost(): boolean {
    return isLost;
  }
  canUndo(): boolean {
    return this.allowUndo && this history.length > 0;
  }
  undo(): void {
    if (!this canUndo()) return;
    this = this history.pop();
  }
  move(direction: Direction): boolean {
    const moved = this slide(direction);
    if (moved) this addRandomTile();
    return moved;
  }
  reset(): void {
    this = new GameState(this.config);
  }
  getSeed(): number {
    return this seed;
  }
  private slide(dir: Direction): boolean {
    const size = this.getGridSize();
    let moved = false;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const pos = new Position(i, j);
        const next = pos add Direction delta;
        if (this canMove(pos, next)) {
          this moveTile(pos, next);
          moved = true;
        }
      }
    }
    return moved;
  }
  private canMove(from: Position, to: Position): boolean {
    return to isValid(this.getGridSize()) && this.getTile(to) === 0;
  }
  private getTile(pos: Position): number {
    return this.grid[pos.row][pos.col];
  }
  private setTile(pos: Position, value: number): void {
    this.grid[pos.row][pos.col] = value;
  }
  private moveTile(from: Position, to: Position): void {
    this setTile(to, this getTile(from));
    this setTile(from, 0);
  }
  private addRandomTile(): void {
    const empties: Position[] = [];
    const size = this.getGridSize();
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (this grid[i][j] === 0) empties.push(new Position(i, j));
      }
    }
    if (empties.length === 0) return;
    const idx = Math.floor(Math.random() * empties.length);
    this setTile(empties[idx], Math.random() < 0.9 ? 2 : 4);
  }
  private checkWin(): boolean {
    const size = this.getGridSize();
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (this grid[i][j] === this.config.getWinningTile()) return true;
      }
    }
    return false;
  }
  private checkLoss(): boolean {
    const size = this.getGridSize();
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (this grid[i][j] === 0) return false;
        for (const dir of ['up', 'down', 'left', 'right']) {
          const neighbor = new Position(i, j) add Direction delta;
          if (neighbor isValid(size) && this getTile(neighbor) === this getTile(new Position(i, j))) return false;
        }
      }
}
    return true;
  }
}
