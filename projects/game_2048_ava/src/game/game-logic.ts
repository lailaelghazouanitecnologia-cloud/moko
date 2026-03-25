import { GameBoard } from './game-board';
import { ScoreTracker } from './score-tracker';
import { Position, Direction } from '../core';

export class GameLogic {
  private readonly board: GameBoard;
  private readonly scoreTracker: ScoreTracker;
  private state: 'idle' | 'playing' | 'won' | 'lost';

  constructor(boardSize: number = 4) {
    this.board = new GameBoard(boardSize);
    this.scoreTracker = new ScoreTracker();
    this.state = 'idle';
  }

  move(direction: Direction): boolean {
    if (this.state === 'won' || this.state === 'lost') return false;
    
    const moved = this.slideAndMerge(direction);
    if (moved) {
      this.spawnTile();
      if (this.checkWin()) {
        this.state = 'won';
      } else if (this.checkLoss()) {
        this.state = 'lost';
      } else {
        this.state = 'playing';
      }
    }
    return moved;
  }

  canMove(direction: Direction): boolean {
    const testBoard = this.board.clone();
    return this.simulateSlideAndMerge(testBoard, direction);
  }

  spawnTile(): void {
    this.board.spawnRandom();
  }

  checkWin(): boolean {
    const size = this.board.size;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const pos = new Position(row, col);
        if (this.board.getTile(pos) === 2048) {
          return true;
        }
      }
    }
    return false;
  }

  checkLoss(): boolean {
    return !this.board.canMove();
  }

  reset(): void {
    const size = this.board.size;
    this.board = new GameBoard(size);
    this.scoreTracker.resetScore();
    this.state = 'idle';
    this.spawnTile();
    this.spawnTile();
    this.state = 'playing';
  }

  getScore(): number {
    return this.scoreTracker.getCurrentScore();
  }

  getState(): 'idle' | 'playing' | 'won' | 'lost' {
    return this.state;
  }

  private slideAndMerge(direction: Direction): boolean {
    const size = this.board.size;
    let moved = false;
    const scoreDelta = 0;

    if (direction === Direction.Left) {
      for (let row = 0; row < size; row++) {
        const tiles: number[] = [];
        for (let col = 0; col < size; col++) {
          const pos = new Position(row, col);
          const value = this.board.getTile(pos);
          if (value !== 0) tiles.push(value);
        }
        const merged = this.mergeTiles(tiles);
        for (let col = 0; col < size; col++) {
          const pos = new Position(row, col);
          const newValue = col < merged.length ? merged[col] : 0;
          if (this.board.getTile(pos) !== newValue) moved = true;
          this.board.setTile(pos, newValue);
        }
      }
    } else if (direction === Direction.Right) {
      for (let row = 0; row < size; row++) {
        const tiles: number[] = [];
        for (let col = size - 1; col >= 0; col--) {
          const pos = new Position(row, col);
          const value = this.board.getTile(pos);
          if (value !== 0) tiles.push(value);
        }
        const merged = this.mergeTiles(tiles);
        for (let col = 0; col < size; col++) {
          const pos = new Position(row, size - 1 - col);
          const newValue = col < merged.length ? merged[col] : 0;
          if (this.board.getTile(pos) !== newValue) moved = true;
          this.board.setTile(pos, newValue);
        }
      }
    } else if (direction === Direction.Up) {
      for (let col = 0; col < size; col++) {
        const tiles: number[] = [];
        for (let row = 0; row < size; row++) {
          const pos = new Position(row, col);
          const value = this.board.getTile(pos);
          if (value !== 0) tiles.push(value);
        }
        const merged = this.mergeTiles(tiles);
        for (let row = 0; row < size; row++) {
          const pos = new Position(row, col);
          const newValue = row < merged.length ? merged[row] : 0;
          if (this.board.getTile(pos) !== newValue) moved = true;
          this.board.setTile(pos, newValue);
        }
      }
    } else if (direction === Direction.Down) {
      for (let col = 0; col < size; col++) {
        const tiles: number[] = [];
        for (let row = size - 1; row >= 0; row--) {
          const pos = new Position(row, col);
          const value = this.board.getTile(pos);
          if (value !== 0) tiles.push(value);
        }
        const merged = this.mergeTiles(tiles);
        for (let row = 0; row < size; row++) {
          const pos = new Position(size - 1 - row, col);
          const newValue = row < merged.length ? merged[row] : 0;
          if (this.board.getTile(pos) !== newValue) moved = true;
          this.board.setTile(pos, newValue);
        }
      }
    }

    return moved;
  }

  private simulateSlideAndMerge(board: GameBoard, direction: Direction): boolean {
    const size = board.size;
    let moved = false;

    if (direction === Direction.Left) {
      for (let row = 0; row < size; row++) {
        const tiles: number[] = [];
        for (let col = 0; col < size; col++) {
          const pos = new Position(row, col);
          const value = board.getTile(pos);
          if (value !== 0) tiles.push(value);
        }
        const merged = this.mergeTiles(tiles);
        for (let col = 0; col < size; col++) {
          const pos = new Position(row, col);
          const newValue = col < merged.length ? merged[col] : 0;
          if (board.getTile(pos) !== newValue) moved = true;
          board.setTile(pos, newValue);
        }
      }
    } else if (direction === Direction.Right) {
      for (let row = 0; row < size; row++) {
        const tiles: number[] = [];
        for (let col = size - 1; col >= 0; col--) {
          const pos = new Position(row, col);
          const value = board.getTile(pos);
          if (value !== 0) tiles.push(value);
        }
        const merged = this.mergeTiles(tiles);
        for (let col = 0; col < size; col++) {
          const pos = new Position(row, size - 1 - col);
          const newValue = col < merged.length ? merged[col] : 0;
          if (board.getTile(pos) !== newValue) moved = true;
          board.setTile(pos, newValue);
        }
      }
    } else if (direction === Direction.Up) {
      for (let col = 0; col < size; col++) {
        const tiles: number[] = [];
        for (let row = 0; row < size; row++) {
          const pos = new Position(row, col);
          const value = board.getTile(pos);
          if (value !== 0) tiles.push(value);
        }
        const merged = this.mergeTiles(tiles);
        for (let row = 0; row < size; row++) {
          const pos = new Position(row, col);
          const newValue = row < merged.length ? merged[row] : 0;
          if (board.getTile(pos) !== newValue) moved = true;
          board.setTile(pos, newValue);
        }
      }
    } else if (direction === Direction.Down) {
      for (let col = 0; col < size; col++) {
        const tiles: number[] = [];
        for (let row = size - 1; row >= 0; row--) {
          const pos = new Position(row, col);
          const value = board.getTile(pos);
          if (value !== 0) tiles.push(value);
        }
        const merged = this.mergeTiles(tiles);
        for (let row = 0; row < size; row++) {
          const pos = new Position(size - 1 - row, col);
          const newValue = row < merged.length ? merged[row] : 0;
          if (board.getTile(pos) !== newValue) moved = true;
          board.setTile(pos, newValue);
        }
      }
    }

    return moved;
  }

  private mergeTiles(tiles: number[]): number[] {
    const merged: number[] = [];
    let i = 0;
    
    while (i < tiles.length) {
      if (i < tiles.length - 1 && tiles[i] === tiles[i + 1]) {
        const mergedValue = tiles[i] * 2;
        merged.push(mergedValue);
        this.scoreTracker.addScore(mergedValue);
        i += 2;
      } else {
        merged.push(tiles[i]);
        i++;
      }
    }
    
    return merged;
  }
}
