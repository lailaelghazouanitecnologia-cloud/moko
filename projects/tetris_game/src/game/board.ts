import { Logger, Config, EventType } from '../core';
import { Game } from './game';
import { Player } from './player';
import { Cell } from './cell';

export class Board {
  private cells: Cell[];

  constructor(cells: Cell[]) {
    this.cells = cells;
  }

  public reset(): void {
    this.cells.forEach((cell) => {
      cell.update('');
    });
  }

  public getCell(index: number): Cell {
    if (index < 0 || index >= this.cells.length) {
      throw new Error('Index out of bounds');
    }
    return this.cells[index];
  }
}
