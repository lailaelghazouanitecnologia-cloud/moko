import { Player } from './player';
import { Logger, Config, EventType } from '../core';

export class Game {
  private players: Player[];
  private board: Board;
  private turn: number;
  private static MAX_TURNS: number;
  private logger: Logger;

  constructor(players: Player[], board: Board, logger: Logger) {
    this.players = players;
    this.board = board;
    this.turn = 0;
    this.logger = logger;
    Game.MAX_TURNS = 100; // assuming max turns is 100
  }

  start(): void {
    this.board.reset();
    this.turn = 0;
    this.logger.log('Game started');
  }

  end(): void {
    this.logger.log('Game ended');
  }

  updateTurn(player: Player): void {
    this.turn++;
    if (this.turn >= this.players.length) {
      this.turn = 0;
    }
    this.logger.log(`Turn updated to player ${player.getName()}`);
  }

  checkWin(): boolean {
    // implement win condition logic here
    // for example:
    return this.board.getCell(0).getValue() === this.board.getCell(1).getValue() && this.board.getCell(1).getValue() === this.board.getCell(2).getValue();
  }

  isValidMove(move: Move): boolean {
    // implement move validation logic here
    // for example:
    return move.getFrom() >= 0 && move.getFrom() < this.board.getCellCount() && move.getTo() >= 0 && move.getTo() < this.board.getCellCount();
  }

  makeMove(move: Move): void {
    // implement move application logic here
    // for example:
    this.board.getCell(move.getFrom()).update(this.board.getCell(move.getTo()).getValue());
    this.logger.log(`Move made from ${move.getFrom()} to ${move.getTo()}`);
  }
}

class Move {
  private from: number;
  private to: number;

  constructor(from: number, to: number) {
    this.from = from;
    this.to = to;
  }

  getFrom(): number {
    return this.from;
  }

  getTo(): number {
    return this.to;
  }

  isValid(): boolean {
    // implement move validation logic here
    return true;
  }
}

class Cell {
  private value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }

  getValue(): unknown {
    return this.value;
  }

  update(value: unknown): void {
    this.value = value;
  }
}

class Board {
  private cells: Cell[];

  constructor(cells: Cell[]) {
    this.cells = cells;
  }

  reset(): void {
    // implement reset logic here
  }

  getCell(index: number): Cell {
    return this.cells[index];
  }

  getCellCount(): number {
    return this.cells.length;
  }
}
