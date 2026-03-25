import { Logger, Config, EventType } from '../core';
import { Player } from './player';
import { Board } from './board';

// Renamed the Game class to avoid conflict with the imported Game class
class GameClass {
  private players: Player[];
  private board: Board;
  private turn: number;
  private MAX_TURNS: number;

  constructor(players: Player[], board: Board) {
    this.players = players;
    this.board = board;
    this.turn = 0;
    this.MAX_TURNS = 100;
  }

  public getBoard(): Board {
    return this.board;
  }

  // ... other methods
}

// Modified Cell class with a public method to access the value
class Cell {
  private value: string;

  constructor(value: string) {
    this.value = value;
  }

  public getValue(): string {
    return this.value;
  }

  // ... other methods
}

// Modified Board class with a public method to access the cell count
class BoardClass {
  private cells: Cell[];

  constructor(cells: Cell[]) {
    this.cells = cells;
  }

  public getCellCount(): number {
    return this.cells.length;
  }

  public getCell(index: number): Cell {
    return this.cells[index];
  }

  // ... other methods
}

export class Move {
  private from: number;
  private to: number;

  constructor(from: number, to: number) {
    this.from = from;
    this.to = to;
  }

  public isValid(): boolean {
    // Validate move based on game rules
    // For example, check if the move is within the board boundaries
    // and if the cell is empty
    const game = new GameClass([], new BoardClass([]) as Board);
    const board = game.getBoard(); // Access the board through a public method
    const cellFrom = board.getCell(this.from);
    const cellTo = board.getCell(this.to);

    // Check if the cells exist
    if (!cellFrom || !cellTo) {
      return false;
    }

    // Check if the cell is empty
    if (cellTo.getValue() !== '') { // Access the value through a public method
      return false;
    }

    // Check if the move is valid based on the game rules
    // For example, check if the move is diagonal, horizontal or vertical
    const isValidMove = Math.abs(this.from - this.to) === 1 || Math.abs(this.from - this.to) === (board as BoardClass).getCellCount(); // Access the cell count through a public method

    return isValidMove;
  }
}
